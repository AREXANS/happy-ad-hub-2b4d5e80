import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import GlobalBackground from '@/components/GlobalBackground';
import PaymentHistory from '@/components/PaymentHistory';
import { Key, RefreshCw, Copy, ArrowLeft, Shield, Calendar, Clock, User, ShoppingCart, Plus, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface KeyData {
  key: string;
  expired: string;
  role: string;
  maxHwid: number;
  frozenUntil: string | null;
  hwids: string[];
  robloxUsers: {
    hwid: string;
    username: string;
    registeredAt: string;
  }[];
}

interface Package {
  id: string;
  name: string;
  display_name: string;
  price_per_day: number;
  is_active: boolean;
}

const KEYSYSTEM_SESSION_KEY = 'arexans_keysystem_session';

const KeySystem = () => {
  const navigate = useNavigate();
  const { deviceId } = useDeviceDetection();
  const [keyInput, setKeyInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyData, setKeyData] = useState<KeyData | null>(null);
  const [loadstring, setLoadstring] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [timeRemaining, setTimeRemaining] = useState({ text: '', className: '' });
  const [isExpiredMessage, setIsExpiredMessage] = useState(false);
  
  // Purchase/Extension state
  const [showPurchase, setShowPurchase] = useState(false);
  const [packages, setPackages] = useState<Package[]>([]);
  const [purchaseDuration, setPurchaseDuration] = useState('7h');
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  // Load session from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem(KEYSYSTEM_SESSION_KEY);
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        if (session.key) {
          setKeyInput(session.key);
          // Auto-validate the saved key
          validateSavedKey(session.key);
        }
      } catch (e) {
        console.error('Error parsing saved session:', e);
        localStorage.removeItem(KEYSYSTEM_SESSION_KEY);
      }
    }
  }, []);

  // Save session when keyData changes
  useEffect(() => {
    if (keyData) {
      localStorage.setItem(KEYSYSTEM_SESSION_KEY, JSON.stringify({ key: keyData.key }));
    }
  }, [keyData]);

  // Check if key is expired and show message
  useEffect(() => {
    if (keyData) {
      const now = new Date();
      const expired = new Date(keyData.expired);
      if (expired < now && !keyData.frozenUntil) {
        setIsExpiredMessage(true);
        // Clear session on expired
        localStorage.removeItem(KEYSYSTEM_SESSION_KEY);
        setKeyData(null);
      }
    }
  }, [keyData]);

  const validateSavedKey = async (savedKey: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/get-keys`);
      const data = await response.json();
      
      let keys = data.keys || [];
      
      if (keys.length === 0) {
        const { data: settingsData } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'license_keys')
          .maybeSingle();
        
        if (settingsData?.value) {
          try {
            keys = JSON.parse(settingsData.value);
          } catch {
            keys = [];
          }
        }
      }
      
      const foundKey = keys.find((k: KeyData) => k.key === savedKey);
      
      if (foundKey) {
        const now = new Date();
        const expiredDate = new Date(foundKey.expired);
        
        if (expiredDate < now && !foundKey.frozenUntil) {
          setIsExpiredMessage(true);
          localStorage.removeItem(KEYSYSTEM_SESSION_KEY);
        } else {
          setKeyData(foundKey);
        }
      } else {
        // Key no longer exists
        localStorage.removeItem(KEYSYSTEM_SESSION_KEY);
      }
    } catch (error) {
      console.error('Auto validate error:', error);
      localStorage.removeItem(KEYSYSTEM_SESSION_KEY);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(KEYSYSTEM_SESSION_KEY);
    setKeyData(null);
    setKeyInput('');
    setShowPurchase(false);
    setIsExpiredMessage(false);
    toast({ title: 'Logout', description: 'Berhasil logout dari KeySystem' });
  };

  // Real-time countdown effect
  useEffect(() => {
    if (!keyData) return;

    const updateCountdown = () => {
      if (keyData.frozenUntil) {
        setTimeRemaining({ text: '⏸️ FROZEN', className: 'text-blue-400' });
        return;
      }

      const now = new Date();
      const expired = new Date(keyData.expired);
      const diff = expired.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining({ text: 'EXPIRED', className: 'text-destructive' });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeRemaining({ text: `${days}d ${hours}h ${minutes}m ${seconds}s`, className: 'text-secondary' });
      } else if (hours > 0) {
        setTimeRemaining({ text: `${hours}h ${minutes}m ${seconds}s`, className: 'text-yellow-400' });
      } else if (minutes > 0) {
        setTimeRemaining({ text: `${minutes}m ${seconds}s`, className: 'text-orange-400' });
      } else {
        setTimeRemaining({ text: `${seconds}s`, className: 'text-destructive' });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [keyData]);

  // Fetch loadstring and packages on mount + setup realtime subscriptions
  useEffect(() => {
    const fetchLoadstring = async () => {
      const { data: settings } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'loadstring_value')
        .maybeSingle();
      
      if (settings?.value) {
        setLoadstring(settings.value);
      }
    };

    const fetchPackages = async () => {
      const { data } = await supabase
        .from('packages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (data) setPackages(data);
    };

    fetchLoadstring();
    fetchPackages();

    // Setup realtime subscription for loadstring updates
    const loadstringChannel = supabase
      .channel('keysystem-loadstring-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'site_settings',
          filter: 'key=eq.loadstring_value'
        },
        (payload) => {
          if (payload.new && (payload.new as { value: string }).value) {
            setLoadstring((payload.new as { value: string }).value);
          }
        }
      )
      .subscribe();

    // Setup realtime subscription for license_keys updates (when admin changes key data)
    const keysChannel = supabase
      .channel('keysystem-keys-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'site_settings',
          filter: 'key=eq.license_keys'
        },
        async (payload) => {
          // If we have a keyData loaded, refresh it from the updated keys
          if (keyData && payload.new) {
            try {
              const keysJson = JSON.parse((payload.new as { value: string }).value || '[]');
              const updatedKey = keysJson.find((k: KeyData) => k.key === keyData.key);
              if (updatedKey) {
                setKeyData(updatedKey);
              }
            } catch (e) {
              console.error('Error parsing keys update:', e);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(loadstringChannel);
      supabase.removeChannel(keysChannel);
    };
  }, [keyData?.key]);

  const validateKey = async () => {
    if (!keyInput.trim()) {
      setErrorMsg('Masukkan key terlebih dahulu');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // First try edge function
      const response = await fetch(`${API_BASE}/get-keys`);
      const data = await response.json();
      
      let keys = data.keys || [];
      
      // If edge function returns empty, also check directly from database
      if (keys.length === 0) {
        const { data: settingsData } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'license_keys')
          .maybeSingle();
        
        if (settingsData?.value) {
          try {
            keys = JSON.parse(settingsData.value);
          } catch {
            keys = [];
          }
        }
      }
      
      if (keys.length === 0) {
        setErrorMsg('Database key kosong. Hubungi admin.');
        setKeyData(null);
        setLoading(false);
        return;
      }
      
      const foundKey = keys.find((k: KeyData) => k.key === keyInput.trim());
      
      if (foundKey) {
        const now = new Date();
        const expiredDate = new Date(foundKey.expired);
        
        if (expiredDate < now && !foundKey.frozenUntil) {
          setIsExpiredMessage(true);
          setKeyData(null);
          localStorage.removeItem(KEYSYSTEM_SESSION_KEY);
        } else {
          setKeyData(foundKey);
          setIsExpiredMessage(false);
          toast({ title: 'Berhasil', description: 'Key berhasil divalidasi!' });
        }
      } else {
        setErrorMsg('Key tidak ditemukan dalam sistem');
        setKeyData(null);
      }
    } catch (error) {
      console.error('Validate key error:', error);
      setErrorMsg('Gagal memvalidasi key. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const resetHwid = async () => {
    if (!keyData) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/update-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: keyData.key,
          hwids: [],
          robloxUsers: []
        })
      });
      
      const result = await response.json();
      if (result.success) {
        toast({ title: 'Berhasil', description: 'HWID berhasil direset' });
        setKeyData({ ...keyData, hwids: [], robloxUsers: [] });
      } else {
        toast({ title: 'Error', description: result.error || 'Gagal reset HWID', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Reset HWID error:', error);
      toast({ title: 'Error', description: 'Gagal reset HWID', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Disalin!', description: `${label} berhasil disalin ke clipboard` });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRupiah = (n: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  const parseDuration = (input: string) => {
    if (!input) return null;
    const match = input.toLowerCase().match(/^(\d+)([hb])$/);
    if (!match) return null;
    const value = parseInt(match[1]);
    const unit = match[2];
    const days = unit === 'h' ? value : value * 30;
    return { days, text: unit === 'h' ? `${value} Hari` : `${value} Bulan` };
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'developer':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'vip':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      case 'normal':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  };

  // Get package matching current role
  const getCurrentRolePackage = () => {
    if (!keyData) return null;
    return packages.find(p => p.name.toUpperCase() === keyData.role.toUpperCase());
  };

  // Handle purchase/extension
  const handlePurchaseExtension = async () => {
    if (!keyData) return;
    
    const durationData = parseDuration(purchaseDuration);
    if (!durationData) {
      toast({ title: 'Error', description: 'Format durasi salah! Gunakan format: 7h atau 1b', variant: 'destructive' });
      return;
    }

    const pkg = getCurrentRolePackage();
    if (!pkg) {
      toast({ title: 'Error', description: 'Package tidak ditemukan', variant: 'destructive' });
      return;
    }

    const amount = pkg.price_per_day * durationData.days;
    if (amount < 1000) {
      toast({ title: 'Error', description: 'Minimal pembelian Rp 1.000', variant: 'destructive' });
      return;
    }

    setPurchaseLoading(true);

    try {
      const response = await supabase.functions.invoke('create-payment', {
        body: {
          amount,
          customerName: keyData.key,
          packageName: keyData.role,
          packageDuration: durationData.days,
          licenseKey: keyData.key,
          deviceId: deviceId || null
        }
      });

      if (response.error) {
        toast({ title: 'Error', description: response.error.message, variant: 'destructive' });
        setPurchaseLoading(false);
        return;
      }

      const data = response.data;
      if (data.success) {
        // Redirect to home with payment data (use localStorage)
        localStorage.setItem('arexans_payment_state', JSON.stringify({
          step: 3,
          selectedPkg: keyData.role,
          formData: { key: keyData.key, duration: purchaseDuration },
          paymentData: {
            transactionId: data.transactionId,
            qr_string: data.qr_string,
            qris_url: data.qris_url,
            totalAmount: data.totalAmount,
            expiresAt: data.expiresAt
          },
          finalData: null,
          daysToAdd: durationData.days
        }));
        navigate('/');
      } else {
        toast({ title: 'Error', description: data.error || 'Gagal membuat pembayaran', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast({ title: 'Error', description: 'Gagal membuat pembayaran', variant: 'destructive' });
    } finally {
      setPurchaseLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <GlobalBackground />
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          </div>

          {!keyData ? (
            <>
              {/* Expired Message */}
              {isExpiredMessage && (
                <Card className="glass-card border-destructive/50 animate-slide-in">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/20 flex items-center justify-center">
                      <Clock className="w-8 h-8 text-destructive" />
                    </div>
                    <h3 className="text-xl font-bold text-destructive mb-2">Key Anda Telah Habis!</h3>
                    <p className="text-muted-foreground mb-4">
                      Silahkan order lagi atau perpanjang key Anda untuk melanjutkan menggunakan layanan.
                    </p>
                    <Button onClick={() => navigate('/')} className="w-full">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Order Sekarang
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Key Validation Form */}
              <Card className="glass-card border-primary/30">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                    <Key className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl font-display">Key System</CardTitle>
                  <CardDescription>Masukkan key Anda untuk mengakses fitur</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      placeholder="AXSTOOLS-XXXX-XXXX"
                      className="bg-background/50 font-mono"
                      onKeyDown={(e) => e.key === 'Enter' && validateKey()}
                    />
                    <Button onClick={validateKey} disabled={loading}>
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Validasi'}
                    </Button>
                  </div>
                  
                  {errorMsg && (
                    <p className="text-sm text-destructive text-center">{errorMsg}</p>
                  )}
                </CardContent>
              </Card>

              {/* Payment History */}
              {deviceId && <PaymentHistory deviceId={deviceId} />}
            </>
          ) : (
            /* Key Dashboard */
            <div className="space-y-4">
              {/* Key Info Card */}
              <Card className="glass-card border-primary/30">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Key className="w-5 h-5 text-primary" />
                      Key Dashboard
                    </CardTitle>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRoleColor(keyData.role)}`}>
                      {keyData.role}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Key Display */}
                  <div className="flex items-center gap-2 bg-muted/30 p-3 rounded-lg">
                    <code className="flex-1 font-mono text-sm truncate">{keyData.key}</code>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(keyData.key, 'Key')}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/20 p-4 rounded-lg">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs">Expired</span>
                      </div>
                      <p className="text-sm font-medium">{formatDate(keyData.expired)}</p>
                    </div>
                    <div className="bg-muted/20 p-4 rounded-lg">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs">Sisa Waktu</span>
                      </div>
                      <p className={`text-lg font-bold ${timeRemaining.className}`}>
                        {timeRemaining.text}
                      </p>
                    </div>
                  </div>

                  {/* HWID Info */}
                  <div className="bg-muted/20 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">HWID Terdaftar ({keyData.robloxUsers.length}/{keyData.maxHwid})</span>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={resetHwid} 
                        disabled={loading || keyData.robloxUsers.length === 0}
                      >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Reset HWID
                      </Button>
                    </div>
                    
                    {keyData.robloxUsers.length > 0 ? (
                      <div className="space-y-2">
                        {keyData.robloxUsers.map((user, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-background/30 p-2 rounded">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="font-mono text-sm">{user.username}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{formatDate(user.registeredAt)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-2">Belum ada HWID terdaftar</p>
                    )}
                  </div>

                  {/* Extension/Purchase Button */}
                  <Button 
                    className="w-full" 
                    onClick={() => setShowPurchase(!showPurchase)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Perpanjang Key
                  </Button>
                </CardContent>
              </Card>

              {/* Purchase/Extension Form */}
              {showPurchase && (
                <Card className="glass-card border-secondary/30 animate-slide-in">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-secondary">
                      <ShoppingCart className="w-5 h-5" />
                      Perpanjang Key
                    </CardTitle>
                    <CardDescription>
                      Tambah durasi untuk key {keyData.role} Anda
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {getCurrentRolePackage() && (
                      <div className="bg-muted/20 p-3 rounded-lg">
                        <p className="text-sm">
                          <span className="text-muted-foreground">Harga per hari:</span>{' '}
                          <span className="font-bold">{formatRupiah(getCurrentRolePackage()!.price_per_day)}</span>
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Durasi Perpanjangan</label>
                      <Input
                        value={purchaseDuration}
                        onChange={(e) => setPurchaseDuration(e.target.value)}
                        placeholder="7h (hari) atau 1b (bulan)"
                        className="bg-background/50 font-mono"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Format: 7h = 7 hari, 1b = 1 bulan
                      </p>
                    </div>

                    {parseDuration(purchaseDuration) && getCurrentRolePackage() && (
                      <div className="bg-muted/20 p-3 rounded-lg">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total:</span>
                          <span className="font-bold text-secondary">
                            {formatRupiah(getCurrentRolePackage()!.price_per_day * parseDuration(purchaseDuration)!.days)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button 
                        className="flex-1"
                        onClick={handlePurchaseExtension}
                        disabled={purchaseLoading || !parseDuration(purchaseDuration)}
                      >
                        {purchaseLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <ShoppingCart className="w-4 h-4 mr-2" />
                        )}
                        Bayar Sekarang
                      </Button>
                      <Button variant="outline" onClick={() => setShowPurchase(false)}>
                        Batal
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Loadstring Card */}
              {loadstring && (
                <Card className="glass-card border-secondary/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-secondary">
                      <Copy className="w-5 h-5" />
                      Loadstring Script
                    </CardTitle>
                    <CardDescription>Salin script ini ke executor Roblox Anda</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <pre className="bg-muted/30 p-4 rounded-lg overflow-x-auto text-xs font-mono whitespace-pre-wrap break-all max-h-40">
                        {loadstring}
                      </pre>
                      <Button 
                        className="absolute top-2 right-2" 
                        size="sm"
                        onClick={() => copyToClipboard(loadstring, 'Loadstring')}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Salin
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payment History */}
              {deviceId && <PaymentHistory deviceId={deviceId} />}

              {/* Logout Button */}
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleLogout}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KeySystem;
