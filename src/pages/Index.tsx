import { useState, useEffect, useRef, useCallback } from 'react';
import PackageSelection from '@/components/PackageSelection';
import OrderForm from '@/components/OrderForm';
import PaymentQR from '@/components/PaymentQR';
import PaymentSuccess from '@/components/PaymentSuccess';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePushNotifications, isAdminDevice } from '@/hooks/usePushNotifications';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';

// Register service worker for push notifications
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered');
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};

interface Ad {
  id: string;
  title: string;
  media_url: string;
  media_type: string;
  link: string | null;
  link_url?: string | null;
  is_active: boolean;
}

interface Package {
  id: string;
  name: string;
  display_name: string;
  price_per_day: number;
  description: string | null;
  features: string[] | null;
  is_active: boolean;
}

interface PaymentData {
  transactionId: string;
  qr_string: string;
  qris_url: string;
  qr_fallback_url?: string;
  totalAmount: number;
  expiresAt: string;
}

interface FinalData {
  key: string;
  package: string;
  expired: string;
  expiredDisplay: string;
  days: number;
}

const STORAGE_KEY = 'arexans_payment_state';

interface StoredState {
  step: number;
  selectedPkg: 'NORMAL' | 'VIP' | null;
  formData: { key: string; duration: string };
  paymentData: PaymentData | null;
  finalData: FinalData | null;
  daysToAdd: number;
  claimable?: boolean;
}

const Index = () => {
  const [step, setStep] = useState(1);
  const [selectedPkg, setSelectedPkg] = useState<'NORMAL' | 'VIP' | null>(null);
  const [formData, setFormData] = useState({ key: '', duration: '' });
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [finalData, setFinalData] = useState<FinalData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [ads, setAds] = useState<Ad[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [daysToAdd, setDaysToAdd] = useState(0);
  const [claimable, setClaimable] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);

  const checkInterval = useRef<number | null>(null);
  
  // Push notifications hook
  const { showNotification, requestPermission, permission } = usePushNotifications();

  // Device detection for payment history tracking
  const { deviceId } = useDeviceDetection();

  const PRICES = {
    NORMAL: packages.find(p => p.name === 'NORMAL')?.price_per_day ?? 2000,
    VIP: packages.find(p => p.name === 'VIP')?.price_per_day ?? 3000
  };

  const saveState = (newStep: number, newPaymentData?: PaymentData | null, newFinalData?: FinalData | null, newDays?: number) => {
    const state: StoredState = {
      step: newStep,
      selectedPkg,
      formData,
      paymentData: newPaymentData !== undefined ? newPaymentData : paymentData,
      finalData: newFinalData !== undefined ? newFinalData : finalData,
      daysToAdd: newDays !== undefined ? newDays : daysToAdd
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  const clearStoredState = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  // Load stored state on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const state: StoredState = JSON.parse(stored);
        
        // Check if payment expired
        if (state.paymentData?.expiresAt) {
          const expiresAt = new Date(state.paymentData.expiresAt);
          if (expiresAt < new Date()) {
            clearStoredState();
            return;
          }
        }
        
        // Restore state based on step
        if (state.step === 4 && state.finalData) {
          setStep(4);
          setSelectedPkg(state.selectedPkg);
          setFormData(state.formData);
          setFinalData(state.finalData);
          setDaysToAdd(state.daysToAdd);
        } else if (state.step === 3 && state.paymentData) {
          setStep(3);
          setSelectedPkg(state.selectedPkg);
          setFormData(state.formData);
          setPaymentData(state.paymentData);
          setDaysToAdd(state.daysToAdd);
          setStatusMsg("Menunggu pembayaran...");
        }
      } catch {
        clearStoredState();
      }
    }
  }, []);

  // Load ads and packages (NO notification permission request for regular users)
  useEffect(() => {
    const loadAds = async () => {
      const { data } = await supabase.from('ads').select('*').eq('is_active', true).order('sort_order');
      if (data) setAds(data as Ad[]);
    };

    const loadPackages = async () => {
      const { data } = await supabase.from('packages').select('*').eq('is_active', true).order('sort_order');
      if (data) setPackages(data as Package[]);
    };

    loadAds();
    loadPackages();
    
    // Register service worker but DON'T request notification permission for regular users
    // Notifications are for developer/admin only
    registerServiceWorker();
  }, []);

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  const parseDuration = (input: string) => {
    if (!input) return null;
    const match = input.toLowerCase().match(/^(\d+)([hb])$/);
    if (!match) return null;
    const value = parseInt(match[1]);
    const unit = match[2];
    const days = unit === 'h' ? value : value * 30;
    const label = unit === 'h' ? `${value} Hari` : `${value} Bulan`;
    return { days, text: label };
  };

  // Handle payment success with notification
  const handlePaymentSuccess = useCallback((days: number) => {
    if (checkInterval.current) clearInterval(checkInterval.current);
    
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() + days);
    
    const newFinalData = {
      key: formData.key,
      package: selectedPkg || 'NORMAL',
      expired: expiredDate.toISOString(),
      expiredDisplay: expiredDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      days: days
    };
    
    setFinalData(newFinalData);
    setStep(4);
    saveState(4, null, newFinalData, days);
    setStatusMsg('');
    
    // Show toast notification
    toast({ 
      title: "💰 Pembayaran Berhasil!", 
      description: "Terima kasih atas pembelian Anda." 
    });
    
    // Show push notification ONLY to developer/admin devices
    if (isAdminDevice()) {
      showNotification("💰 Pembayaran Berhasil!", {
        body: `Key: ${formData.key} - ${selectedPkg || 'NORMAL'} (${days} hari)`,
        tag: 'payment-success'
      });
    }
  }, [formData.key, selectedPkg, showNotification]);

  // Check payment status via API (fallback polling)
  const checkPaymentStatus = useCallback(async (transactionId: string, days: number) => {
    try {
      const response = await supabase.functions.invoke('check-payment', {
        body: { transactionId }
      });

      if (response.error) {
        console.error('Check payment error:', response.error);
        return;
      }

      const data = response.data;

      if (data.expired) {
        if (checkInterval.current) clearInterval(checkInterval.current);
        setErrorMsg("Transaksi telah expired. Silakan buat pesanan baru.");
        setStatusMsg('');
        clearStoredState();
        return;
      }

      if (data.claimable) {
        if (checkInterval.current) clearInterval(checkInterval.current);
        setClaimable(true);
        setStatusMsg('');
        return;
      }

      if (data.paid) {
        handlePaymentSuccess(days);
      }
    } catch (error) {
      console.error('Check payment error:', error);
    }
  }, [handlePaymentSuccess]);

  // Realtime subscription for payment status + fallback polling
  useEffect(() => {
    if (step !== 3 || !paymentData) return;

    // Initial check
    checkPaymentStatus(paymentData.transactionId, daysToAdd);

    // Setup realtime subscription for instant updates
    const channel = supabase
      .channel(`payment-${paymentData.transactionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `transaction_id=eq.${paymentData.transactionId}`
        },
        (payload) => {
          console.log('Realtime payment update:', payload);
          const newStatus = (payload.new as { status: string }).status;
          
          if (newStatus === 'paid' || newStatus === 'claimed') {
            handlePaymentSuccess(daysToAdd);
          } else if (newStatus === 'claimable') {
            if (checkInterval.current) clearInterval(checkInterval.current);
            setClaimable(true);
            setStatusMsg('');
          } else if (newStatus === 'expired' || newStatus === 'cancelled') {
            if (checkInterval.current) clearInterval(checkInterval.current);
            setErrorMsg(newStatus === 'expired' 
              ? "Transaksi telah expired. Silakan buat pesanan baru."
              : "Transaksi dibatalkan.");
            setStatusMsg('');
            clearStoredState();
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    // Fallback polling every 5 seconds (slower since we have realtime)
    checkInterval.current = window.setInterval(() => {
      checkPaymentStatus(paymentData.transactionId, daysToAdd);
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
        checkInterval.current = null;
      }
    };
  }, [step, paymentData, daysToAdd, checkPaymentStatus, handlePaymentSuccess]);

  const handlePackageSelect = (pkg: 'NORMAL' | 'VIP') => {
    setSelectedPkg(pkg);
    setStep(2);
    setErrorMsg('');
  };

  const generateRandomKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randomStr = (length: number) => {
      let result = '';
      for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
      return result;
    };
    setFormData(prev => ({ ...prev, key: `AXSTOOLS-${randomStr(4)}-${randomStr(4)}` }));
  };

  const handleFormSubmit = async (e: React.FormEvent, promoCode?: string) => {
    e.preventDefault();
    setErrorMsg('');
    const durationData = parseDuration(formData.duration);

    if (!formData.key || formData.key.length < 4) {
      setErrorMsg(formData.key ? "Key minimal 4 karakter." : "Mohon isi key.");
      return;
    }
    if (!durationData) {
      setErrorMsg("Format durasi salah! Gunakan format: '1h' untuk 1 hari, '1b' untuk 1 bulan");
      return;
    }

    setLoading(true);
    const pricePerDay = selectedPkg === 'VIP' ? PRICES.VIP : PRICES.NORMAL;
    const calculatedAmount = pricePerDay * durationData.days;

    if (calculatedAmount < 1000) {
      setErrorMsg("Nominal terlalu kecil untuk QRIS (minimal Rp 1.000)");
      setLoading(false);
      return;
    }

    try {
      // Call create-payment edge function
      const response = await supabase.functions.invoke('create-payment', {
        body: {
          amount: calculatedAmount,
          customerName: formData.key,
          packageName: selectedPkg || 'NORMAL',
          packageDuration: durationData.days,
          licenseKey: formData.key,
          promoCode: promoCode || null,
          deviceId: deviceId || null
        }
      });

      if (response.error) {
        console.error('Create payment error:', response.error);
        setErrorMsg("Gagal membuat pembayaran: " + (response.error.message || "Unknown error"));
        setLoading(false);
        return;
      }

      const data = response.data;

      if (!data.success) {
        setErrorMsg(data.error || "Gagal membuat pembayaran");
        setLoading(false);
        return;
      }

      const newPaymentData: PaymentData = {
        transactionId: data.transactionId,
        qr_string: data.qr_string,
        qris_url: data.qris_url,
        qr_fallback_url: data.qr_fallback_url,
        totalAmount: data.totalAmount,
        expiresAt: data.expiresAt
      };

      setPaymentData(newPaymentData);
      setDaysToAdd(durationData.days);
      setStep(3);
      saveState(3, newPaymentData, null, durationData.days);
      setStatusMsg("Menunggu pembayaran...");

    } catch (error) {
      console.error('Form submit error:', error);
      setErrorMsg("Terjadi kesalahan. Silakan coba lagi.");
    }

    setLoading(false);
  };

  const handleCancelOrder = async () => {
    if (checkInterval.current) clearInterval(checkInterval.current);
    
    // Cancel payment in backend
    if (paymentData?.transactionId) {
      try {
        await supabase.functions.invoke('cancel-payment', {
          body: { transactionId: paymentData.transactionId }
        });
      } catch (error) {
        console.error('Cancel payment error:', error);
      }
    }
    
    clearStoredState();
    setPaymentData(null);
    setStep(1);
    setStatusMsg('');
    setErrorMsg('');
  };

  const handleClaimKey = async () => {
    if (!paymentData) return;
    setClaimLoading(true);
    try {
      const response = await supabase.functions.invoke('claim-key', {
        body: { transactionId: paymentData.transactionId, deviceId: deviceId || null }
      });

      if (response.error) {
        toast({ title: 'Error', description: 'Gagal mengklaim key', variant: 'destructive' });
        setClaimLoading(false);
        return;
      }

      const data = response.data;
      if (data.success) {
        const newFinalData = {
          key: data.key,
          package: data.package,
          expired: data.expired,
          expiredDisplay: data.expiredDisplay,
          days: data.days
        };
        setFinalData(newFinalData);
        setStep(4);
        saveState(4, null, newFinalData, data.days);
        setClaimable(false);
        toast({ title: '🎉 Key Berhasil Diklaim!', description: `Durasi ${data.days} hari dimulai dari sekarang` });
      } else {
        toast({ title: 'Error', description: data.error || 'Gagal mengklaim key', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Claim error:', error);
      toast({ title: 'Error', description: 'Gagal mengklaim key', variant: 'destructive' });
    } finally {
      setClaimLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Berhasil disalin!", description: "Teks telah disalin ke clipboard" });
  };

  if (step === 1) return <PackageSelection onSelect={handlePackageSelect} formatRupiah={formatRupiah} prices={PRICES} ads={ads} packages={packages} />;
  if (step === 2) return <OrderForm selectedPkg={selectedPkg} formData={formData} setFormData={setFormData} onSubmit={handleFormSubmit} onBack={() => { setStep(1); setErrorMsg(''); }} onGenerate={generateRandomKey} loading={loading} errorMsg={errorMsg} formatRupiah={formatRupiah} parseDuration={parseDuration} prices={PRICES} />;
  if (step === 3 && paymentData) return <PaymentQR paymentData={paymentData} statusMsg={statusMsg} errorMsg={errorMsg} onCancel={handleCancelOrder} onCopy={copyToClipboard} formatRupiah={formatRupiah} claimable={claimable} claimLoading={claimLoading} onClaim={handleClaimKey} />;
  if (step === 4 && finalData) return <PaymentSuccess finalData={finalData} onCopy={copyToClipboard} />;
  return null;
};

export default Index;
