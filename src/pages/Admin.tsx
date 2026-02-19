import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Settings, Package, Image, List, CreditCard, LogOut, Save, 
  Plus, Trash2, Edit2, Eye, EyeOff, RefreshCw, MessageSquare, Shield, Key, FileText, FileCode,
  Check, CheckCircle, XCircle, Clock, DollarSign, ShoppingCart, Copy, Download, Upload, ImageIcon, X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import DiscountManagement from '@/components/DiscountManagement';
import GlobalBackground from '@/components/GlobalBackground';
import DeviceApprovalScreen from '@/components/DeviceApprovalScreen';
import DeviceManagement from '@/components/DeviceManagement';
import KeyManagement from '@/components/KeyManagement';
import ApiDocumentation from '@/components/ApiDocumentation';
import ScriptManagement from '@/components/ScriptManagement';
import NotificationSettings from '@/components/NotificationSettings';
import WhitelistManagement from '@/components/WhitelistManagement';
import LuaUploadManager from '@/components/LuaUploadManager';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';


interface SiteSetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
}

interface PackageItem {
  id: string;
  name: string;
  display_name: string;
  price_per_day: number;
  description: string | null;
  features: string[] | null;
  is_active: boolean;
  sort_order: number;
  duration_days: number | null;
  is_lifetime: boolean;
  fixed_price: number | null;
}

interface AdItem {
  id: string;
  title: string;
  media_url: string;
  media_type: string;
  link_url: string | null;
  is_active: boolean;
  sort_order: number;
}

interface BackgroundItem {
  id: string;
  title: string;
  background_url: string;
  background_type: string;
  is_muted: boolean;
  is_active: boolean;
  sort_order: number;
}

interface TransactionItem {
  id: string;
  transaction_id: string;
  customer_name: string;
  customer_whatsapp: string | null;
  package_name: string;
  package_duration: number;
  original_amount: number;
  total_amount: number;
  status: string;
  license_key: string | null;
  created_at: string;
  paid_at: string | null;
  proof_image: string | null;
}

interface SocialLink {
  id: string;
  name: string;
  icon_type: string;
  url: string;
  label: string;
  link_location: string;
  is_active: boolean;
  sort_order: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Device detection hook
  const {
    deviceId,
    deviceName,
    deviceStatus,
    allSessions,
    isChecking,
    isLoggedIn,
    registerDevice,
    loadAllSessions,
    approveDevice,
    removeDevice,
    persistLogin,
    clearLogin
  } = useDeviceDetection();
  
  // Use persistent login state
  const [authenticated, setAuthenticated] = useState(isLoggedIn);

  // Settings state
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  
  // Packages state
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [editingPackage, setEditingPackage] = useState<PackageItem | null>(null);
  
  // Ads state
  const [ads, setAds] = useState<AdItem[]>([]);
  const [editingAd, setEditingAd] = useState<AdItem | null>(null);
  
  // Backgrounds state
  const [backgrounds, setBackgrounds] = useState<BackgroundItem[]>([]);
  const [editingBackground, setEditingBackground] = useState<BackgroundItem | null>(null);
  
  // Transactions state
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);

  // Social Links state
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [editingSocialLink, setEditingSocialLink] = useState<SocialLink | null>(null);

  // Effect to load data on mount if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      setAuthenticated(true);
      loadAllData();
    }
  }, [isLoggedIn]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');
    
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'admin_password')
        .maybeSingle();
      
      if (error) {
        console.error('Login error:', error);
        setLoginError('Gagal mengambil data. Coba lagi.');
        toast({ title: "Error", description: "Gagal mengambil data: " + error.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      
      if (data && data.value === password) {
        setAuthenticated(true);
        persistLogin();
        loadAllData();
        toast({ title: "Berhasil", description: "Login berhasil!" });
      } else {
        setLoginError('Password salah!');
        toast({ title: "Error", description: "Password salah!", variant: "destructive" });
      }
    } catch (err) {
      console.error('Login exception:', err);
      setLoginError('Terjadi kesalahan. Coba lagi.');
      toast({ title: "Error", description: "Terjadi kesalahan", variant: "destructive" });
    }
    setLoading(false);
  };
  
  const handleLogout = () => {
    setAuthenticated(false);
    clearLogin();
  };

  const loadAllData = async () => {
    const [settingsRes, packagesRes, adsRes, backgroundsRes, transactionsRes, socialLinksRes] = await Promise.all([
      supabase.from('site_settings').select('*').order('key'),
      supabase.from('packages').select('*').order('sort_order'),
      supabase.from('ads').select('*').order('sort_order'),
      supabase.from('backgrounds').select('*').order('sort_order'),
      supabase.from('transactions').select('*').order('created_at', { ascending: false }),
      supabase.from('social_links').select('*').order('sort_order')
    ]);
    
    if (settingsRes.data) setSettings(settingsRes.data);
    if (packagesRes.data) setPackages(packagesRes.data);
    if (adsRes.data) setAds(adsRes.data);
    if (backgroundsRes.data) setBackgrounds(backgroundsRes.data);
    if (transactionsRes.data) setTransactions(transactionsRes.data);
    if (socialLinksRes.data) setSocialLinks(socialLinksRes.data);
  };

  const updateSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from('site_settings')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: `Setting ${key} berhasil diupdate` });
      setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
    }
  };

  const savePackage = async (pkg: PackageItem) => {
    const { error } = await supabase
      .from('packages')
      .upsert(pkg);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: "Package berhasil disimpan" });
      loadAllData();
      setEditingPackage(null);
    }
  };

  const deletePackage = async (id: string) => {
    const { error } = await supabase.from('packages').delete().eq('id', id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: "Package berhasil dihapus" });
      loadAllData();
    }
  };

  const saveAd = async (ad: AdItem) => {
    const { error } = await supabase.from('ads').upsert(ad);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: "Ad berhasil disimpan" });
      loadAllData();
      setEditingAd(null);
    }
  };

  const deleteAd = async (id: string) => {
    const { error } = await supabase.from('ads').delete().eq('id', id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: "Ad berhasil dihapus" });
      loadAllData();
    }
  };

  const saveBackground = async (bg: BackgroundItem) => {
    const { error } = await supabase.from('backgrounds').upsert(bg);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: "Background berhasil disimpan" });
      loadAllData();
      setEditingBackground(null);
    }
  };

  const deleteBackground = async (id: string) => {
    const { error } = await supabase.from('backgrounds').delete().eq('id', id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: "Background berhasil dihapus" });
      loadAllData();
    }
  };

  const saveSocialLink = async (link: SocialLink) => {
    const { error } = await supabase.from('social_links').upsert(link);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: "Social link berhasil disimpan" });
      loadAllData();
      setEditingSocialLink(null);
    }
  };

  const deleteSocialLink = async (id: string) => {
    const { error } = await supabase.from('social_links').delete().eq('id', id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: "Social link berhasil dihapus" });
      loadAllData();
    }
  };

  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const paymentKeys = ['cashify_license_key', 'cashify_qris_id', 'cashify_webhook_key', 'discord_webhook_url', 'payment_mode', 'payment_simulation'];
// QR code URL settings
const qrUrlKeys = ['qr_primary_url', 'qr_fallback_url'];
// Hide license keys from General Settings (except Cashify which is in paymentKeys)
const hiddenGeneralKeys = ['license_key', 'license'];

  // Transaction filter state
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'pending' | 'paid' | 'cancelled' | 'proof'>('all');
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [transactionSearch, setTransactionSearch] = useState('');
  const [proofDialogTx, setProofDialogTx] = useState<TransactionItem | null>(null);
  const importFileRef = useState<HTMLInputElement | null>(null);

  // Export transactions as JSON
  const exportTransactions = () => {
    const dataStr = JSON.stringify(transactions, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Berhasil', description: `${transactions.length} transaksi berhasil diekspor` });
  };

  // Import transactions from JSON
  const handleImportTransactions = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) {
        toast({ title: 'Error', description: 'Format file tidak valid. Harus berupa array JSON.', variant: 'destructive' });
        return;
      }
      let imported = 0;
      for (const tx of data) {
        const row: any = {
          transaction_id: tx.transaction_id,
          customer_name: tx.customer_name,
          customer_whatsapp: tx.customer_whatsapp || null,
          package_name: tx.package_name,
          package_duration: tx.package_duration,
          original_amount: tx.original_amount,
          total_amount: tx.total_amount,
          status: tx.status || 'pending',
          license_key: tx.license_key || null,
          qr_string: tx.qr_string || null,
          paid_at: tx.paid_at || null,
          expires_at: tx.expires_at || null,
          created_at: tx.created_at || new Date().toISOString(),
          proof_image: tx.proof_image || null,
          device_id: tx.device_id || null,
        };
        const { error } = await supabase.from('transactions').upsert(row, { onConflict: 'transaction_id' });
        if (!error) imported++;
      }
      toast({ title: 'Berhasil', description: `${imported} dari ${data.length} transaksi berhasil diimpor` });
      loadAllData();
    } catch (err) {
      console.error('Import error:', err);
      toast({ title: 'Error', description: 'Gagal mengimpor file. Pastikan format JSON valid.', variant: 'destructive' });
    }
    e.target.value = '';
  };

  // Filtered transactions with search
  const filteredTransactions = transactions.filter(tx => {
    // First apply status filter
    let matchesFilter = true;
    if (transactionFilter === 'pending') matchesFilter = tx.status === 'pending';
    else if (transactionFilter === 'paid') matchesFilter = tx.status === 'paid' || tx.status === 'claimable' || tx.status === 'claimed';
    else if (transactionFilter === 'cancelled') matchesFilter = tx.status === 'cancelled' || tx.status === 'expired' || tx.status === 'cancel';
    else if (transactionFilter === 'proof') matchesFilter = !!tx.proof_image;
    
    if (!matchesFilter) return false;
    
    // Then apply search
    if (!transactionSearch.trim()) return true;
    
    const searchLower = transactionSearch.toLowerCase();
    return (
      tx.transaction_id.toLowerCase().includes(searchLower) ||
      tx.customer_name.toLowerCase().includes(searchLower) ||
      (tx.customer_whatsapp?.toLowerCase().includes(searchLower)) ||
      tx.package_name.toLowerCase().includes(searchLower) ||
      (tx.license_key?.toLowerCase().includes(searchLower))
    );
  });

  // Transaction statistics
  const transactionStats = {
    total: transactions.length,
    pending: transactions.filter(tx => tx.status === 'pending').length,
    paid: transactions.filter(tx => tx.status === 'paid' || tx.status === 'claimable' || tx.status === 'claimed').length,
    cancelled: transactions.filter(tx => tx.status === 'cancelled' || tx.status === 'expired' || tx.status === 'cancel').length,
    withProof: transactions.filter(tx => !!tx.proof_image).length,
    totalRevenue: transactions.filter(tx => tx.status === 'paid' || tx.status === 'claimed').reduce((sum, tx) => sum + tx.total_amount, 0),
  };

  // Recreate key for a transaction
  const recreateKey = async (tx: TransactionItem) => {
    if (!tx.transaction_id) return;
    try {
      const response = await supabase.functions.invoke('claim-key', {
        body: { transactionId: tx.transaction_id, forceRecreate: true }
      });
      if (response.error) {
        toast({ title: 'Error', description: 'Gagal membuat ulang key: ' + response.error.message, variant: 'destructive' });
        return;
      }
      const data = response.data;
      if (data.success) {
        toast({ title: 'Berhasil', description: `Key ${data.key} berhasil dibuat ulang. Expired: ${data.expiredDisplay}` });
        loadAllData();
      } else {
        toast({ title: 'Error', description: data.error || 'Gagal membuat ulang key', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Recreate key error:', err);
      toast({ title: 'Error', description: 'Gagal membuat ulang key', variant: 'destructive' });
    }
  };

  // Delete single transaction
  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: "Transaksi berhasil dihapus" });
      loadAllData();
      setSelectedTransactions(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Delete multiple transactions
  const deleteSelectedTransactions = async () => {
    if (selectedTransactions.size === 0) return;
    
    const { error } = await supabase
      .from('transactions')
      .delete()
      .in('id', Array.from(selectedTransactions));
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: `${selectedTransactions.size} transaksi berhasil dihapus` });
      loadAllData();
      setSelectedTransactions(new Set());
    }
  };

  // Delete all filtered transactions
  const deleteAllFilteredTransactions = async () => {
    if (filteredTransactions.length === 0) return;
    
    const ids = filteredTransactions.map(tx => tx.id);
    const { error } = await supabase
      .from('transactions')
      .delete()
      .in('id', ids);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: `${ids.length} transaksi berhasil dihapus` });
      loadAllData();
      setSelectedTransactions(new Set());
    }
  };

  // Mark transaction as claimable (user must claim to start expiry timer)
  const markAsPaid = async (id: string) => {
    const transaction = transactions.find(tx => tx.id === id);
    if (!transaction) {
      toast({ title: "Error", description: "Transaksi tidak ditemukan", variant: "destructive" });
      return;
    }

    // Update transaction status to claimable
    const { error } = await supabase
      .from('transactions')
      .update({ status: 'claimable' })
      .eq('id', id);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ 
      title: "Berhasil", 
      description: `Transaksi ${transaction.transaction_id} siap di-claim oleh pengguna. Expired key akan dimulai saat pengguna mengklaim.` 
    });
    
    loadAllData();
  };

  // Toggle transaction selection
  const toggleTransactionSelection = (id: string) => {
    setSelectedTransactions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all filtered transactions
  const selectAllFiltered = () => {
    if (selectedTransactions.size === filteredTransactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(filteredTransactions.map(tx => tx.id)));
    }
  };

  // Skip device approval - direct login

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
        <GlobalBackground />
        <Card className="w-full max-w-md z-10 glass-card">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-2xl text-primary">Developer Login</CardTitle>
            <CardDescription>Masukkan password admin untuk melanjutkan</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password admin"
                  className="bg-background/50"
                />
              </div>
              {loginError && (
                <p className="text-sm text-destructive text-center">{loginError}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⟳</span> Loading...
                  </span>
                ) : 'Login'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <GlobalBackground />
      
      <div className="relative z-10 p-3 sm:p-4 md:p-8">
        <div className="max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-primary">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Kelola toko AREXANS TOOLS</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/')}>
                Ke Toko
              </Button>
              <Button variant="destructive" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>

          <Tabs defaultValue="settings" className="space-y-6">
            <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
              <TabsList className="inline-flex w-max min-w-full md:w-auto bg-muted/50 gap-1">
                <TabsTrigger value="settings" className="gap-1.5 px-3 py-2 text-xs md:text-sm whitespace-nowrap">
                  <Settings className="w-4 h-4" />
                  <span className="hidden xs:inline">Settings</span>
                </TabsTrigger>
                <TabsTrigger value="packages" className="gap-1.5 px-3 py-2 text-xs md:text-sm whitespace-nowrap">
                  <Package className="w-4 h-4" />
                  <span className="hidden xs:inline">Packages</span>
                </TabsTrigger>
                <TabsTrigger value="keys" className="gap-1.5 px-3 py-2 text-xs md:text-sm whitespace-nowrap">
                  <Key className="w-4 h-4" />
                  <span className="hidden xs:inline">Keys</span>
                </TabsTrigger>
                <TabsTrigger value="docs" className="gap-1.5 px-3 py-2 text-xs md:text-sm whitespace-nowrap">
                  <FileText className="w-4 h-4" />
                  <span className="hidden xs:inline">API</span>
                </TabsTrigger>
                <TabsTrigger value="scripts" className="gap-1.5 px-3 py-2 text-xs md:text-sm whitespace-nowrap">
                  <FileCode className="w-4 h-4" />
                  <span className="hidden xs:inline">Scripts</span>
                </TabsTrigger>
                <TabsTrigger value="whitelist" className="gap-1.5 px-3 py-2 text-xs md:text-sm whitespace-nowrap">
                  <Shield className="w-4 h-4" />
                  <span className="hidden xs:inline">Whitelist</span>
                </TabsTrigger>
                <TabsTrigger value="upload" className="gap-1.5 px-3 py-2 text-xs md:text-sm whitespace-nowrap">
                  <Upload className="w-4 h-4" />
                  <span className="hidden xs:inline">Upload</span>
                </TabsTrigger>
                <TabsTrigger value="ads" className="gap-1.5 px-3 py-2 text-xs md:text-sm whitespace-nowrap">
                  <Image className="w-4 h-4" />
                  <span className="hidden xs:inline">Ads</span>
                </TabsTrigger>
                <TabsTrigger value="backgrounds" className="gap-1.5 px-3 py-2 text-xs md:text-sm whitespace-nowrap">
                  <Image className="w-4 h-4" />
                  <span className="hidden xs:inline">BG</span>
                </TabsTrigger>
                <TabsTrigger value="transactions" className="gap-1.5 px-3 py-2 text-xs md:text-sm whitespace-nowrap">
                  <CreditCard className="w-4 h-4" />
                  <span className="hidden xs:inline">Trans</span>
                </TabsTrigger>
                <TabsTrigger value="social" className="gap-1.5 px-3 py-2 text-xs md:text-sm whitespace-nowrap">
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden xs:inline">Social</span>
                </TabsTrigger>
                <TabsTrigger value="devices" className="gap-1.5 px-3 py-2 text-xs md:text-sm whitespace-nowrap">
                  <Shield className="w-4 h-4" />
                  <span className="hidden xs:inline">Devices</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              {/* Notification Settings */}
              <NotificationSettings />
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Payment Gateway (Cashify QRIS)
                  </CardTitle>
                  <CardDescription>Konfigurasi pembayaran QRIS otomatis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {settings.filter(s => paymentKeys.includes(s.key)).map(setting => (
                    <div key={setting.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={setting.key} className="capitalize">
                          {setting.key.replace(/_/g, ' ')}
                        </Label>
                        {setting.key !== 'payment_mode' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowSecrets(prev => ({ ...prev, [setting.key]: !prev[setting.key] }))}
                          >
                            {showSecrets[setting.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        )}
                      </div>
                      {setting.description && (
                        <p className="text-xs text-muted-foreground">{setting.description}</p>
                      )}
                      {setting.key === 'payment_mode' ? (
                        <div className="flex items-center gap-4">
                          <Button
                            variant={setting.value === 'demo' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => updateSetting(setting.key, 'demo')}
                          >
                            Demo Mode
                          </Button>
                          <Button
                            variant={setting.value === 'live' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => updateSetting(setting.key, 'live')}
                          >
                            Live Mode
                          </Button>
                        </div>
                      ) : setting.key === 'payment_simulation' ? (
                        <div className="flex items-center gap-4">
                          <Switch
                            checked={setting.value === 'on'}
                            onCheckedChange={(checked) => updateSetting(setting.key, checked ? 'on' : 'off')}
                          />
                          <span className={`text-sm font-medium ${setting.value === 'on' ? 'text-secondary' : 'text-muted-foreground'}`}>
                            {setting.value === 'on' ? 'Simulasi AKTIF - Pembayaran otomatis sukses' : 'Simulasi OFF - Pembayaran normal'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            id={setting.key}
                            type={showSecrets[setting.key] ? 'text' : 'password'}
                            value={setting.value}
                            onChange={(e) => setSettings(prev => 
                              prev.map(s => s.key === setting.key ? { ...s, value: e.target.value } : s)
                            )}
                            placeholder={`Masukkan ${setting.key.replace(/_/g, ' ')}`}
                            className="bg-background/50"
                          />
                          <Button onClick={() => updateSetting(setting.key, setting.value)}>
                            <Save className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* QR Code URL Settings */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="w-5 h-5 text-primary" />
                    QR Code Generator URLs
                  </CardTitle>
                  <CardDescription>URL untuk generate QR code dengan fallback otomatis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {settings.filter(s => qrUrlKeys.includes(s.key)).map(setting => (
                    <div key={setting.id} className="space-y-2">
                      <Label htmlFor={setting.key} className="capitalize">
                        {setting.key.replace(/_/g, ' ')}
                      </Label>
                      {setting.description && (
                        <p className="text-xs text-muted-foreground">{setting.description}</p>
                      )}
                      <div className="flex gap-2">
                        <Input
                          id={setting.key}
                          value={setting.value}
                          onChange={(e) => setSettings(prev => 
                            prev.map(s => s.key === setting.key ? { ...s, value: e.target.value } : s)
                          )}
                          placeholder={`Masukkan ${setting.key.replace(/_/g, ' ')}`}
                          className="bg-background/50"
                        />
                        <Button onClick={() => updateSetting(setting.key, setting.value)}>
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 Jika Primary URL gagal, sistem akan otomatis menggunakan Fallback URL
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    General Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {settings.filter(s => !paymentKeys.includes(s.key) && !qrUrlKeys.includes(s.key) && !hiddenGeneralKeys.some(h => s.key.toLowerCase().includes(h))).map(setting => (
                    <div key={setting.id} className="space-y-2">
                      <Label htmlFor={setting.key} className="capitalize">
                        {setting.key.replace(/_/g, ' ')}
                      </Label>
                      {setting.description && (
                        <p className="text-xs text-muted-foreground">{setting.description}</p>
                      )}
                      <div className="flex gap-2">
                        <Input
                          id={setting.key}
                          type={setting.key.includes('key') || setting.key.includes('password') ? 'password' : 'text'}
                          value={setting.value}
                          onChange={(e) => setSettings(prev => 
                            prev.map(s => s.key === setting.key ? { ...s, value: e.target.value } : s)
                          )}
                          className="bg-background/50"
                        />
                        <Button onClick={() => updateSetting(setting.key, setting.value)}>
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Packages Tab */}
            <TabsContent value="packages" className="space-y-4">
              {/* Discount Management */}
              <DiscountManagement />
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-display font-semibold">Manage Packages</h2>
                <Button onClick={() => setEditingPackage({
                  id: crypto.randomUUID(),
                  name: '',
                  display_name: '',
                  price_per_day: 2000,
                  description: '',
                  features: [],
                  is_active: true,
                  sort_order: packages.length,
                  duration_days: null,
                  is_lifetime: false,
                  fixed_price: null
                })}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Package
                </Button>
              </div>

              {editingPackage && (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>{editingPackage.name ? 'Edit' : 'New'} Package</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                      <div>
                        <Label>Name (ID)</Label>
                        <Input
                          value={editingPackage.name}
                          onChange={e => setEditingPackage({ ...editingPackage, name: e.target.value.toUpperCase() })}
                          placeholder="NORMAL"
                          className="bg-background/50"
                        />
                      </div>
                      <div>
                        <Label>Display Name</Label>
                        <Input
                          value={editingPackage.display_name}
                          onChange={e => setEditingPackage({ ...editingPackage, display_name: e.target.value })}
                          placeholder="Normal Script"
                          className="bg-background/50"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                      <div>
                        <Label>Price per Day (IDR)</Label>
                        <Input
                          type="number"
                          value={editingPackage.price_per_day}
                          onChange={e => setEditingPackage({ ...editingPackage, price_per_day: parseInt(e.target.value) || 0 })}
                          className="bg-background/50"
                        />
                      </div>
                      <div>
                        <Label>Sort Order</Label>
                        <Input
                          type="number"
                          value={editingPackage.sort_order}
                          onChange={e => setEditingPackage({ ...editingPackage, sort_order: parseInt(e.target.value) || 0 })}
                          className="bg-background/50"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                      <div>
                        <Label>Durasi Tetap (hari) — kosongkan jika per-hari</Label>
                        <Input
                          type="number"
                          value={editingPackage.duration_days ?? ''}
                          onChange={e => {
                            const val = e.target.value;
                            setEditingPackage({ ...editingPackage, duration_days: val ? parseInt(val) : null });
                          }}
                          placeholder="Contoh: 888"
                          className="bg-background/50"
                        />
                      </div>
                      <div>
                        <Label>Harga Tetap (IDR) — untuk paket durasi tetap</Label>
                        <Input
                          type="number"
                          value={editingPackage.fixed_price ?? ''}
                          onChange={e => {
                            const val = e.target.value;
                            setEditingPackage({ ...editingPackage, fixed_price: val ? parseInt(val) : null });
                          }}
                          placeholder="Contoh: 500000"
                          className="bg-background/50"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={editingPackage.is_lifetime}
                        onCheckedChange={checked => setEditingPackage({ ...editingPackage, is_lifetime: checked, duration_days: checked ? null : editingPackage.duration_days })}
                      />
                      <Label>Lifetime Package (tanpa expired)</Label>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={editingPackage.description || ''}
                        onChange={e => setEditingPackage({ ...editingPackage, description: e.target.value })}
                        className="bg-background/50"
                      />
                    </div>
                    <div>
                      <Label>Features (one per line)</Label>
                      <Textarea
                        value={(editingPackage.features || []).join('\n')}
                        onChange={e => setEditingPackage({ ...editingPackage, features: e.target.value.split('\n').filter(f => f.trim()) })}
                        className="bg-background/50"
                        rows={4}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPackage.is_active}
                        onCheckedChange={checked => setEditingPackage({ ...editingPackage, is_active: checked })}
                      />
                      <Label>Active</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => savePackage(editingPackage)}>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button variant="outline" onClick={() => setEditingPackage(null)}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-4">
                {packages.map(pkg => (
                  <Card key={pkg.id} className="glass-card">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{pkg.display_name}</span>
                          <span className="text-xs text-muted-foreground">({pkg.name})</span>
                          {!pkg.is_active && <span className="text-xs text-destructive">[Inactive]</span>}
                          {(pkg as any).is_lifetime && <span className="text-xs text-secondary font-bold">[LIFETIME]</span>}
                          {(pkg as any).duration_days && <span className="text-xs text-primary">[{(pkg as any).duration_days} hari]</span>}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {(pkg as any).is_lifetime 
                            ? ((pkg as any).fixed_price ? formatRupiah((pkg as any).fixed_price) + ' (lifetime)' : 'Lifetime')
                            : (pkg as any).duration_days && (pkg as any).fixed_price
                              ? formatRupiah((pkg as any).fixed_price) + ' / ' + (pkg as any).duration_days + ' hari'
                              : formatRupiah(pkg.price_per_day) + '/hari'
                          }
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingPackage(pkg)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deletePackage(pkg.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Keys Tab */}
            <TabsContent value="keys" className="space-y-4">
              <KeyManagement />
            </TabsContent>

            {/* API Documentation Tab */}
            <TabsContent value="docs" className="space-y-4">
              <ApiDocumentation />
            </TabsContent>

            {/* Scripts Tab */}
            <TabsContent value="scripts" className="space-y-4">
              <ScriptManagement />
            </TabsContent>

            {/* Whitelist Tab */}
            <TabsContent value="whitelist" className="space-y-4">
              <WhitelistManagement />
            </TabsContent>
            {/* Upload Tab */}
            <TabsContent value="upload" className="space-y-4">
              <LuaUploadManager />
            </TabsContent>

            {/* Ads Tab */}
            <TabsContent value="ads" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-display font-semibold">Manage Ads</h2>
                <Button onClick={() => setEditingAd({
                  id: crypto.randomUUID(),
                  title: '',
                  media_url: '',
                  media_type: 'image',
                  link_url: '',
                  is_active: true,
                  sort_order: ads.length
                })}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Ad
                </Button>
              </div>

              {editingAd && (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>{editingAd.title ? 'Edit' : 'New'} Ad</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={editingAd.title}
                        onChange={e => setEditingAd({ ...editingAd, title: e.target.value })}
                        className="bg-background/50"
                      />
                    </div>
                    <div>
                      <Label>Media URL</Label>
                      <Input
                        value={editingAd.media_url}
                        onChange={e => setEditingAd({ ...editingAd, media_url: e.target.value })}
                        placeholder="https://..."
                        className="bg-background/50"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Media Type</Label>
                        <select
                          value={editingAd.media_type}
                          onChange={e => setEditingAd({ ...editingAd, media_type: e.target.value })}
                          className="w-full p-2 rounded-md bg-background/50 border border-border"
                        >
                          <option value="image">Image</option>
                          <option value="video">Video</option>
                        </select>
                      </div>
                      <div>
                        <Label>Sort Order</Label>
                        <Input
                          type="number"
                          value={editingAd.sort_order}
                          onChange={e => setEditingAd({ ...editingAd, sort_order: parseInt(e.target.value) })}
                          className="bg-background/50"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Link URL (optional)</Label>
                      <Input
                        value={editingAd.link_url || ''}
                        onChange={e => setEditingAd({ ...editingAd, link_url: e.target.value })}
                        placeholder="https://..."
                        className="bg-background/50"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingAd.is_active}
                        onCheckedChange={checked => setEditingAd({ ...editingAd, is_active: checked })}
                      />
                      <Label>Active</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => saveAd(editingAd)}>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button variant="outline" onClick={() => setEditingAd(null)}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {ads.map(ad => (
                  <Card key={ad.id} className="glass-card overflow-hidden">
                    <div className="aspect-video bg-muted">
                      {ad.media_type === 'video' ? (
                        <video src={ad.media_url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={ad.media_url} alt={ad.title} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <span className="font-semibold">{ad.title}</span>
                        {!ad.is_active && <span className="text-xs text-destructive ml-2">[Inactive]</span>}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingAd(ad)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteAd(ad.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Backgrounds Tab */}
            <TabsContent value="backgrounds" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-display font-semibold">Manage Backgrounds</h2>
                <Button onClick={() => setEditingBackground({
                  id: crypto.randomUUID(),
                  title: '',
                  background_url: '',
                  background_type: 'image',
                  is_muted: true,
                  is_active: true,
                  sort_order: backgrounds.length
                })}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Background
                </Button>
              </div>

              {editingBackground && (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>{editingBackground.title ? 'Edit' : 'New'} Background</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={editingBackground.title}
                        onChange={e => setEditingBackground({ ...editingBackground, title: e.target.value })}
                        className="bg-background/50"
                      />
                    </div>
                    <div>
                      <Label>Background URL</Label>
                      <Input
                        value={editingBackground.background_url}
                        onChange={e => setEditingBackground({ ...editingBackground, background_url: e.target.value })}
                        placeholder="https://..."
                        className="bg-background/50"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Type</Label>
                        <select
                          value={editingBackground.background_type}
                          onChange={e => setEditingBackground({ ...editingBackground, background_type: e.target.value })}
                          className="w-full p-2 rounded-md bg-background/50 border border-border"
                        >
                          <option value="image">Image</option>
                          <option value="video">Video</option>
                        </select>
                      </div>
                      <div>
                        <Label>Sort Order</Label>
                        <Input
                          type="number"
                          value={editingBackground.sort_order}
                          onChange={e => setEditingBackground({ ...editingBackground, sort_order: parseInt(e.target.value) })}
                          className="bg-background/50"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={editingBackground.is_muted}
                          onCheckedChange={checked => setEditingBackground({ ...editingBackground, is_muted: checked })}
                        />
                        <Label>Muted (for video)</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={editingBackground.is_active}
                          onCheckedChange={checked => setEditingBackground({ ...editingBackground, is_active: checked })}
                        />
                        <Label>Active</Label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => saveBackground(editingBackground)}>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button variant="outline" onClick={() => setEditingBackground(null)}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {backgrounds.map(bg => (
                  <Card key={bg.id} className="glass-card overflow-hidden">
                    <div className="aspect-video bg-muted">
                      {bg.background_type === 'video' ? (
                        <video src={bg.background_url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={bg.background_url} alt={bg.title} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <span className="font-semibold">{bg.title}</span>
                        {!bg.is_active && <span className="text-xs text-destructive ml-2">[Inactive]</span>}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingBackground(bg)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteBackground(bg.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions" className="space-y-4">
              {/* Statistics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                <Card className="glass-card">
                  <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-primary/20 shrink-0">
                      <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Total Order</p>
                      <p className="text-base sm:text-lg font-bold">{transactionStats.total}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-warning/20 shrink-0">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Pending</p>
                      <p className="text-base sm:text-lg font-bold">{transactionStats.pending}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-success/20 shrink-0">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Paid</p>
                      <p className="text-base sm:text-lg font-bold">{transactionStats.paid}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-destructive/20 shrink-0">
                      <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Cancelled</p>
                      <p className="text-base sm:text-lg font-bold">{transactionStats.cancelled}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card col-span-2 sm:col-span-1">
                  <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-secondary/20 shrink-0">
                      <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Revenue</p>
                      <p className="text-sm sm:text-lg font-bold truncate">{formatRupiah(transactionStats.totalRevenue)}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Search Bar */}
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.3-4.3"/>
                      </svg>
                    </div>
                    <Input
                      placeholder="Cari ID transaksi, nama, WA, paket, atau license key..."
                      value={transactionSearch}
                      onChange={(e) => setTransactionSearch(e.target.value)}
                      className="pl-10 bg-background/50"
                    />
                    {transactionSearch && (
                      <button
                        onClick={() => setTransactionSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 6 6 18"/>
                          <path d="m6 6 12 12"/>
                        </svg>
                      </button>
                    )}
                  </div>
                  {transactionSearch && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Menampilkan {filteredTransactions.length} dari {transactions.length} transaksi
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Filters and Actions */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant={transactionFilter === 'all' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setTransactionFilter('all')}
                  >
                    Semua ({transactionStats.total})
                  </Button>
                  <Button 
                    variant={transactionFilter === 'pending' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setTransactionFilter('pending')}
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    Pending ({transactionStats.pending})
                  </Button>
                  <Button 
                    variant={transactionFilter === 'paid' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setTransactionFilter('paid')}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Paid ({transactionStats.paid})
                  </Button>
                    <Button 
                      variant={transactionFilter === 'cancelled' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setTransactionFilter('cancelled')}
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Cancelled ({transactionStats.cancelled})
                    </Button>
                    <Button 
                      variant={transactionFilter === 'proof' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setTransactionFilter('proof')}
                    >
                      <ImageIcon className="w-3 h-3 mr-1" />
                      Bukti ({transactionStats.withProof})
                    </Button>
                </div>
                <div className="flex gap-2">
                  {selectedTransactions.size > 0 && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={deleteSelectedTransactions}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Hapus ({selectedTransactions.size})
                    </Button>
                  )}
                  {filteredTransactions.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={deleteAllFilteredTransactions}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Hapus Semua
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={exportTransactions}>
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                  <label>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportTransactions}
                      className="hidden"
                    />
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-1" />
                        Import
                      </span>
                    </Button>
                  </label>
                  <Button variant="outline" size="sm" onClick={loadAllData}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3">
                        <Checkbox 
                          checked={selectedTransactions.size === filteredTransactions.length && filteredTransactions.length > 0}
                          onCheckedChange={selectAllFiltered}
                        />
                      </th>
                      <th className="text-left p-3">ID</th>
                      <th className="text-left p-3">Customer</th>
                      <th className="text-left p-3">Package</th>
                      <th className="text-left p-3">Amount</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Proof</th>
                      <th className="text-left p-3">Date</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map(tx => (
                      <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="p-3">
                          <Checkbox 
                            checked={selectedTransactions.has(tx.id)}
                            onCheckedChange={() => toggleTransactionSelection(tx.id)}
                          />
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(tx.transaction_id);
                              toast({ title: 'Disalin!', description: 'ID transaksi berhasil disalin' });
                            }}
                            className="font-mono text-xs hover:text-primary transition-colors flex items-center gap-1 group"
                            title="Klik untuk menyalin"
                          >
                            {tx.transaction_id}
                            <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </td>
                        <td className="p-3">
                          <div>{tx.customer_name}</div>
                          {tx.customer_whatsapp && (
                            <div className="text-xs text-muted-foreground">{tx.customer_whatsapp}</div>
                          )}
                        </td>
                        <td className="p-3">
                          <div>{tx.package_name}</div>
                          <div className="text-xs text-muted-foreground">{tx.package_duration} hari</div>
                        </td>
                        <td className="p-3">{formatRupiah(tx.total_amount)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            tx.status === 'paid' || tx.status === 'claimed' ? 'bg-success/20 text-success' :
                            tx.status === 'claimable' ? 'bg-blue-500/20 text-blue-400' :
                            tx.status === 'pending' ? 'bg-warning/20 text-warning' :
                            'bg-destructive/20 text-destructive'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="p-3">
                          {tx.proof_image ? (
                            <button onClick={() => setProofDialogTx(tx)} className="inline-block">
                              <img
                                src={tx.proof_image}
                                alt="Bukti"
                                className="w-10 h-10 object-cover rounded border border-primary/30 hover:border-primary transition-colors cursor-pointer"
                              />
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-3 text-xs">
                          {new Date(tx.created_at).toLocaleString('id-ID')}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            {(tx.status === 'pending' || tx.status === 'cancelled' || tx.status === 'expired' || tx.status === 'cancel') && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => markAsPaid(tx.id)}
                                title="Tandai sebagai Paid & Buat/Perpanjang Key"
                                className="h-7 w-7 p-0"
                              >
                                <Check className="w-4 h-4 text-success" />
                              </Button>
                            )}
                            {(tx.status === 'paid' || tx.status === 'claimable' || tx.status === 'claimed') && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => recreateKey(tx)}
                                title="Buat ulang key di daftar key system"
                                className="h-7 w-7 p-0"
                              >
                                <RefreshCw className="w-4 h-4 text-primary" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => deleteTransaction(tx.id)}
                              title="Hapus transaksi"
                              className="h-7 w-7 p-0"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredTransactions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Tidak ada transaksi {transactionFilter !== 'all' ? `dengan status ${transactionFilter}` : ''}
                  </div>
                )}
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <Checkbox 
                    checked={selectedTransactions.size === filteredTransactions.length && filteredTransactions.length > 0}
                    onCheckedChange={selectAllFiltered}
                  />
                  <span className="text-xs text-muted-foreground">Pilih Semua</span>
                </div>
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Tidak ada transaksi {transactionFilter !== 'all' ? `dengan status ${transactionFilter}` : ''}
                  </div>
                ) : (
                  filteredTransactions.map(tx => (
                    <Card key={tx.id} className="glass-card">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Checkbox 
                              checked={selectedTransactions.has(tx.id)}
                              onCheckedChange={() => toggleTransactionSelection(tx.id)}
                            />
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{tx.customer_name}</p>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(tx.transaction_id);
                                  toast({ title: 'Disalin!', description: 'ID transaksi berhasil disalin' });
                                }}
                                className="text-xs text-muted-foreground font-mono truncate flex items-center gap-1 hover:text-primary transition-colors"
                                title="Tap untuk menyalin ID"
                              >
                                {tx.transaction_id}
                              </button>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs shrink-0 ${
                            tx.status === 'paid' || tx.status === 'claimed' ? 'bg-success/20 text-success' :
                            tx.status === 'claimable' ? 'bg-blue-500/20 text-blue-400' :
                            tx.status === 'pending' ? 'bg-warning/20 text-warning' :
                            'bg-destructive/20 text-destructive'
                          }`}>
                            {tx.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Package</p>
                            <p className="truncate">{tx.package_name} ({tx.package_duration}h)</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Amount</p>
                            <p className="font-semibold">{formatRupiah(tx.total_amount)}</p>
                          </div>
                        </div>
                        {tx.proof_image && (
                          <button onClick={() => setProofDialogTx(tx)} className="mt-2">
                            <img src={tx.proof_image} alt="Bukti" className="w-full h-24 object-cover rounded border border-primary/30" />
                          </button>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-border/50">
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.created_at).toLocaleString('id-ID')}
                          </p>
                          <div className="flex gap-1">
                            {(tx.status === 'pending' || tx.status === 'cancelled' || tx.status === 'expired' || tx.status === 'cancel') && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => markAsPaid(tx.id)}
                                className="h-7 w-7 p-0"
                              >
                                <Check className="w-4 h-4 text-success" />
                              </Button>
                            )}
                            {(tx.status === 'paid' || tx.status === 'claimable' || tx.status === 'claimed') && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => recreateKey(tx)}
                                title="Buat ulang key"
                                className="h-7 w-7 p-0"
                              >
                                <RefreshCw className="w-4 h-4 text-primary" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => deleteTransaction(tx.id)}
                              className="h-7 w-7 p-0"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Proof Image Dialog */}
              <Dialog open={!!proofDialogTx} onOpenChange={(open) => !open && setProofDialogTx(null)}>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-primary" />
                      Bukti Pembayaran
                    </DialogTitle>
                  </DialogHeader>
                  {proofDialogTx && (
                    <div className="space-y-4">
                      {proofDialogTx.proof_image && (
                        <img
                          src={proofDialogTx.proof_image}
                          alt="Bukti Pembayaran"
                          className="w-full max-h-[400px] object-contain rounded-lg border border-border"
                        />
                      )}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">ID Transaksi</p>
                          <p className="font-mono text-xs break-all">{proofDialogTx.transaction_id}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Customer</p>
                          <p className="font-medium">{proofDialogTx.customer_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">WhatsApp</p>
                          <p>{proofDialogTx.customer_whatsapp || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Package</p>
                          <p>{proofDialogTx.package_name} ({proofDialogTx.package_duration} hari)</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="font-bold">{formatRupiah(proofDialogTx.total_amount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Status</p>
                          <span className={`px-2 py-1 rounded text-xs ${
                            proofDialogTx.status === 'paid' || proofDialogTx.status === 'claimed' ? 'bg-success/20 text-success' :
                            proofDialogTx.status === 'claimable' ? 'bg-blue-500/20 text-blue-400' :
                            proofDialogTx.status === 'pending' ? 'bg-warning/20 text-warning' :
                            'bg-destructive/20 text-destructive'
                          }`}>{proofDialogTx.status}</span>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Tanggal Order</p>
                          <p className="text-xs">{new Date(proofDialogTx.created_at).toLocaleString('id-ID')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">License Key</p>
                          <p className="font-mono text-xs">{proofDialogTx.license_key || '-'}</p>
                        </div>
                      </div>
                      {(proofDialogTx.status === 'pending') && (
                        <Button
                          className="w-full"
                          onClick={() => {
                            markAsPaid(proofDialogTx.id);
                            setProofDialogTx(null);
                          }}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Set Paid (Claimable)
                        </Button>
                      )}
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* Social Links Tab */}
            <TabsContent value="social" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-display font-semibold">Social Links</h2>
                <Button onClick={() => setEditingSocialLink({
                  id: crypto.randomUUID(),
                  name: '',
                  icon_type: 'link',
                  url: '',
                  label: '',
                  link_location: 'home',
                  is_active: true,
                  sort_order: socialLinks.length
                })}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Link
                </Button>
              </div>

              {editingSocialLink && (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>{editingSocialLink.name ? 'Edit' : 'New'} Social Link</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={editingSocialLink.name}
                          onChange={e => setEditingSocialLink({ ...editingSocialLink, name: e.target.value })}
                          className="bg-background/50"
                        />
                      </div>
                      <div>
                        <Label>Label</Label>
                        <Input
                          value={editingSocialLink.label}
                          onChange={e => setEditingSocialLink({ ...editingSocialLink, label: e.target.value })}
                          className="bg-background/50"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>URL</Label>
                      <Input
                        value={editingSocialLink.url}
                        onChange={e => setEditingSocialLink({ ...editingSocialLink, url: e.target.value })}
                        placeholder="https://..."
                        className="bg-background/50"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Icon Type</Label>
                        <select
                          value={editingSocialLink.icon_type}
                          onChange={e => setEditingSocialLink({ ...editingSocialLink, icon_type: e.target.value })}
                          className="w-full p-2 rounded-md bg-background/50 border border-border"
                        >
                          <option value="link">Link</option>
                          <option value="whatsapp">WhatsApp</option>
                          <option value="whatsapp-contact">WhatsApp Contact</option>
                          <option value="telegram">Telegram</option>
                          <option value="discord">Discord</option>
                          <option value="youtube">YouTube</option>
                          <option value="tiktok">TikTok</option>
                          <option value="instagram">Instagram</option>
                        </select>
                      </div>
                      <div>
                        <Label>Location</Label>
                        <select
                          value={editingSocialLink.link_location}
                          onChange={e => setEditingSocialLink({ ...editingSocialLink, link_location: e.target.value })}
                          className="w-full p-2 rounded-md bg-background/50 border border-border"
                        >
                          <option value="home">Home</option>
                          <option value="footer">Footer</option>
                          <option value="both">Both</option>
                        </select>
                      </div>
                      <div>
                        <Label>Sort Order</Label>
                        <Input
                          type="number"
                          value={editingSocialLink.sort_order}
                          onChange={e => setEditingSocialLink({ ...editingSocialLink, sort_order: parseInt(e.target.value) })}
                          className="bg-background/50"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingSocialLink.is_active}
                        onCheckedChange={checked => setEditingSocialLink({ ...editingSocialLink, is_active: checked })}
                      />
                      <Label>Active</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => saveSocialLink(editingSocialLink)}>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button variant="outline" onClick={() => setEditingSocialLink(null)}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-4">
                {socialLinks.map(link => (
                  <Card key={link.id} className="glass-card">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{link.name}</span>
                          <span className="text-xs text-muted-foreground">({link.icon_type})</span>
                          {!link.is_active && <span className="text-xs text-destructive">[Inactive]</span>}
                        </div>
                        <p className="text-sm text-muted-foreground truncate max-w-md">{link.url}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingSocialLink(link)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteSocialLink(link.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Devices Tab */}
            <TabsContent value="devices" className="space-y-4">
              <DeviceManagement
                sessions={allSessions}
                currentDeviceId={deviceId}
                onApprove={approveDevice}
                onRemove={removeDevice}
                onRefresh={loadAllSessions}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Admin;
