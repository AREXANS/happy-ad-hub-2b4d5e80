import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Trash2, Plus, ArrowUp, ArrowDown, LogOut, Image, Video, Search, RefreshCw, X, Eye, DollarSign, Clock, CheckCircle, Palette, Copy, Pencil, Package, Volume2, VolumeX, AlertTriangle, Smartphone } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useBackground } from '@/contexts/BackgroundContext';

const STORAGE_KEY = 'arexans_admin_session';
const DEVICE_ID_KEY = 'arexans_device_id';

// Generate or get device ID
const getDeviceId = (): string => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = 'device_' + crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

// Get device info for detection
const getDeviceInfo = () => {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timestamp: new Date().toISOString()
  };
};

interface Ad {
  id: string;
  title: string;
  media_url: string;
  media_type: string;
  link: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface Transaction {
  id: string;
  transaction_id: string;
  customer_name: string;
  customer_whatsapp: string;
  package_name: string;
  package_duration: number;
  original_amount: number;
  total_amount: number;
  status: string;
  license_key: string | null;
  created_at: string;
  paid_at: string | null;
}

interface Background {
  id: string;
  title: string;
  background_type: 'image' | 'video';
  background_url: string;
  is_active: boolean;
  is_muted: boolean;
  sort_order: number;
  created_at: string;
}

interface PackageData {
  id: string;
  name: string;
  display_name: string;
  price_per_day: number;
  description: string | null;
  features: string[] | null;
  is_active: boolean;
  sort_order: number;
}

const Admin = () => {
  const { refetch: refetchBackground } = useBackground();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [ads, setAds] = useState<Ad[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [newDeviceWarning, setNewDeviceWarning] = useState<string | null>(null);

  // Edit dialogs
  const [editAdDialog, setEditAdDialog] = useState(false);
  const [editBgDialog, setEditBgDialog] = useState(false);
  const [editPkgDialog, setEditPkgDialog] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [editingBg, setEditingBg] = useState<Background | null>(null);
  const [editingPkg, setEditingPkg] = useState<PackageData | null>(null);

  // Background form
  const [bgForm, setBgForm] = useState({
    title: '',
    type: 'image' as 'image' | 'video',
    url: ''
  });

  // New ad form
  const [newAd, setNewAd] = useState({
    title: '',
    media_url: '',
    media_type: 'image' as 'image' | 'video',
    link: ''
  });

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      const savedSession = localStorage.getItem(STORAGE_KEY);
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          const currentDeviceId = getDeviceId();
          
          // Check if this is a different device
          if (session.deviceId && session.deviceId !== currentDeviceId) {
            setNewDeviceWarning(`Perangkat baru terdeteksi! Device ID: ${currentDeviceId.substring(0, 20)}...`);
          }
          
          // Session exists, auto-login
          setIsAuthenticated(true);
          loadData();
        } catch (e) {
          console.error('Session parse error:', e);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    };
    checkExistingSession();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [adsRes, txRes, bgRes, pkgRes] = await Promise.all([
        supabase.from('ads').select('*').order('sort_order'),
        supabase.from('transactions').select('*').order('created_at', { ascending: false }),
        supabase.from('backgrounds').select('*').order('sort_order'),
        supabase.from('packages').select('*').order('sort_order')
      ]);

      if (adsRes.error) throw adsRes.error;
      if (txRes.error) throw txRes.error;
      if (bgRes.error) throw bgRes.error;
      if (pkgRes.error) throw pkgRes.error;

      setAds(adsRes.data || []);
      setTransactions(txRes.data || []);
      setBackgrounds((bgRes.data || []) as Background[]);
      setPackages((pkgRes.data || []) as PackageData[]);
    } catch (error) {
      console.error('Load error:', error);
      toast({ title: "Error", description: "Gagal memuat data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      const deviceId = getDeviceId();
      const deviceInfo = getDeviceInfo();
      
      const response = await supabase.functions.invoke('admin-auth', {
        body: {
          action: 'login',
          password: adminKey,
          deviceId,
          deviceInfo
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        // Save session to localStorage (persistent)
        const session = {
          token: response.data.sessionToken,
          deviceId,
          loginTime: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        
        setIsAuthenticated(true);
        loadData();
        toast({ title: "Login berhasil", description: "Selamat datang, Admin!" });
      } else {
        toast({ title: "Error", description: response.data?.error || "Kunci admin salah!", variant: "destructive" });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({ title: "Error", description: "Gagal login. Coba lagi.", variant: "destructive" });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(STORAGE_KEY);
    setAdminKey('');
    setNewDeviceWarning(null);
    toast({ title: "Logout berhasil", description: "Anda telah keluar dari dashboard admin" });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Berhasil disalin!", description: "Link telah disalin ke clipboard" });
  };

  // Ad handlers
  const handleAddAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAd.title || !newAd.media_url) {
      toast({ title: "Error", description: "Judul dan URL media wajib diisi", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from('ads').insert({
        title: newAd.title,
        media_url: newAd.media_url,
        media_type: newAd.media_type,
        link: newAd.link || null,
        is_active: true,
        sort_order: ads.length
      });

      if (error) throw error;
      toast({ title: "Berhasil", description: "Iklan berhasil ditambahkan" });
      setNewAd({ title: '', media_url: '', media_type: 'image', link: '' });
      loadData();
    } catch (error) {
      console.error('Add ad error:', error);
      toast({ title: "Error", description: "Gagal menambah iklan", variant: "destructive" });
    }
  };

  const handleUpdateAd = async () => {
    if (!editingAd) return;
    try {
      const { error } = await supabase.from('ads').update({
        title: editingAd.title,
        media_url: editingAd.media_url,
        media_type: editingAd.media_type,
        link: editingAd.link || null
      }).eq('id', editingAd.id);

      if (error) throw error;
      toast({ title: "Berhasil", description: "Iklan berhasil diupdate" });
      setEditAdDialog(false);
      setEditingAd(null);
      loadData();
    } catch (error) {
      console.error('Update ad error:', error);
      toast({ title: "Error", description: "Gagal update iklan", variant: "destructive" });
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase.from('ads').update({ is_active: !isActive }).eq('id', id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Toggle error:', error);
    }
  };

  const handleDeleteAd = async (id: string) => {
    if (!confirm('Hapus iklan ini?')) return;
    try {
      const { error } = await supabase.from('ads').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Berhasil", description: "Iklan berhasil dihapus" });
      loadData();
    } catch (error) {
      console.error('Delete ad error:', error);
    }
  };

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    const index = ads.findIndex(ad => ad.id === id);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === ads.length - 1)) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newAds = [...ads];
    [newAds[index], newAds[newIndex]] = [newAds[newIndex], newAds[index]];

    try {
      for (let i = 0; i < newAds.length; i++) {
        await supabase.from('ads').update({ sort_order: i }).eq('id', newAds[i].id);
      }
      loadData();
    } catch (error) {
      console.error('Move error:', error);
    }
  };

  // Background handlers
  const handleAddBackground = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bgForm.title || !bgForm.url) {
      toast({ title: "Error", description: "Judul dan URL wajib diisi", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from('backgrounds').insert({
        title: bgForm.title,
        background_type: bgForm.type,
        background_url: bgForm.url,
        is_active: false,
        sort_order: backgrounds.length
      });

      if (error) throw error;
      toast({ title: "Berhasil", description: "Background berhasil ditambahkan" });
      setBgForm({ title: '', type: 'image', url: '' });
      loadData();
    } catch (error) {
      console.error('Add background error:', error);
      toast({ title: "Error", description: "Gagal menambah background", variant: "destructive" });
    }
  };

  const handleUpdateBackground = async () => {
    if (!editingBg) return;
    try {
      const { error } = await supabase.from('backgrounds').update({
        title: editingBg.title,
        background_type: editingBg.background_type,
        background_url: editingBg.background_url
      }).eq('id', editingBg.id);

      if (error) throw error;
      toast({ title: "Berhasil", description: "Background berhasil diupdate" });
      setEditBgDialog(false);
      setEditingBg(null);
      loadData();
    } catch (error) {
      console.error('Update background error:', error);
      toast({ title: "Error", description: "Gagal update background", variant: "destructive" });
    }
  };

  const handleToggleBackground = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase.from('backgrounds').update({ is_active: !isActive }).eq('id', id);
      if (error) throw error;
      loadData();
      refetchBackground();
    } catch (error) {
      console.error('Toggle background error:', error);
    }
  };

  const handleToggleMuteBackground = async (id: string, isMuted: boolean) => {
    try {
      const { error } = await supabase.from('backgrounds').update({ is_muted: !isMuted }).eq('id', id);
      if (error) throw error;
      loadData();
      refetchBackground();
    } catch (error) {
      console.error('Toggle mute error:', error);
    }
  };

  const handleDeleteBackground = async (id: string) => {
    if (!confirm('Hapus background ini?')) return;
    try {
      const { error } = await supabase.from('backgrounds').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Berhasil", description: "Background berhasil dihapus" });
      loadData();
    } catch (error) {
      console.error('Delete background error:', error);
    }
  };

  const handleMoveBackground = async (id: string, direction: 'up' | 'down') => {
    const index = backgrounds.findIndex(bg => bg.id === id);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === backgrounds.length - 1)) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newBgs = [...backgrounds];
    [newBgs[index], newBgs[newIndex]] = [newBgs[newIndex], newBgs[index]];

    try {
      for (let i = 0; i < newBgs.length; i++) {
        await supabase.from('backgrounds').update({ sort_order: i }).eq('id', newBgs[i].id);
      }
      loadData();
    } catch (error) {
      console.error('Move background error:', error);
    }
  };

  // Package handlers
  const handleUpdatePackage = async () => {
    if (!editingPkg) return;
    try {
      const { error } = await supabase.from('packages').update({
        display_name: editingPkg.display_name,
        price_per_day: editingPkg.price_per_day,
        description: editingPkg.description,
        features: editingPkg.features
      }).eq('id', editingPkg.id);

      if (error) throw error;
      toast({ title: "Berhasil", description: "Paket berhasil diupdate" });
      setEditPkgDialog(false);
      setEditingPkg(null);
      loadData();
    } catch (error) {
      console.error('Update package error:', error);
      toast({ title: "Error", description: "Gagal update paket", variant: "destructive" });
    }
  };

  const handleTogglePackage = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase.from('packages').update({ is_active: !isActive }).eq('id', id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Toggle package error:', error);
    }
  };

  // Transaction handlers
  const handleClearTransactions = async (status: string) => {
    if (!confirm(`Hapus semua transaksi dengan status "${status}"?`)) return;
    try {
      const { error } = await supabase.from('transactions').delete().eq('status', status);
      if (error) throw error;
      toast({ title: "Berhasil", description: `Transaksi ${status} telah dihapus` });
      loadData();
    } catch (error) {
      console.error('Clear error:', error);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Hapus transaksi ini?')) return;
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Berhasil", description: "Transaksi berhasil dihapus" });
      loadData();
    } catch (error) {
      console.error('Delete tx error:', error);
    }
  };

  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
  const formatDate = (d: string) => new Date(d).toLocaleString('id-ID');

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tx.transaction_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: transactions.length,
    paid: transactions.filter(t => t.status === 'paid').length,
    pending: transactions.filter(t => t.status === 'pending').length,
    revenue: transactions.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.total_amount, 0)
  };

  const activeBackgroundsList = backgrounds.filter(bg => bg.is_active);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
        
        <div className="glass-card p-6 md:p-8 rounded-2xl max-w-md w-full relative z-10">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-display font-bold gradient-text mb-2">
              Admin Panel
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">Masukkan kunci admin untuk melanjutkan</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="adminKey" className="text-foreground">Kunci Admin</Label>
              <Input
                id="adminKey"
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Masukkan kunci admin"
                className="mt-1 bg-muted/50 border-border"
              />
            </div>
            <Button 
              type="submit" 
              disabled={loginLoading}
              className="w-full btn-primary text-primary-foreground font-display font-bold"
            >
              {loginLoading ? 'Memverifikasi...' : 'Masuk'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 md:p-8 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold gradient-text">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">Kelola iklan, background, paket dan transaksi</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive text-sm">
            <LogOut className="w-4 h-4 mr-2" /> Keluar
          </Button>
        </div>

        {/* New Device Warning */}
        {newDeviceWarning && (
          <div className="mb-6 p-4 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-warning font-medium text-sm">Perangkat Baru Terdeteksi!</p>
              <p className="text-muted-foreground text-xs mt-1">{newDeviceWarning}</p>
              <p className="text-muted-foreground text-xs mt-1">Jika ini bukan Anda, segera logout dan ganti password.</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setNewDeviceWarning(null)}
              className="ml-auto"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="stat-card">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1 md:mb-2">
                <Eye className="w-4 md:w-5 h-4 md:h-5 text-primary" />
                <span className="text-muted-foreground text-xs md:text-sm">Total Transaksi</span>
              </div>
              <p className="text-2xl md:text-3xl font-display font-bold text-foreground">{stats.total}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1 md:mb-2">
                <CheckCircle className="w-4 md:w-5 h-4 md:h-5 text-success" />
                <span className="text-muted-foreground text-xs md:text-sm">Berhasil</span>
              </div>
              <p className="text-2xl md:text-3xl font-display font-bold text-success">{stats.paid}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1 md:mb-2">
                <Clock className="w-4 md:w-5 h-4 md:h-5 text-warning" />
                <span className="text-muted-foreground text-xs md:text-sm">Pending</span>
              </div>
              <p className="text-2xl md:text-3xl font-display font-bold text-warning">{stats.pending}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1 md:mb-2">
                <DollarSign className="w-4 md:w-5 h-4 md:h-5 text-secondary" />
                <span className="text-muted-foreground text-xs md:text-sm">Pendapatan</span>
              </div>
              <p className="text-lg md:text-2xl font-display font-bold text-secondary">{formatRupiah(stats.revenue)}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="ads" className="space-y-4 md:space-y-6">
          <TabsList className="bg-muted/50 border border-border flex-wrap h-auto p-1">
            <TabsTrigger value="ads" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-display text-xs md:text-sm">
              <Image className="w-3 md:w-4 h-3 md:h-4 mr-1 md:mr-2" /> Iklan
            </TabsTrigger>
            <TabsTrigger value="background" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-display text-xs md:text-sm">
              <Palette className="w-3 md:w-4 h-3 md:h-4 mr-1 md:mr-2" /> Background
            </TabsTrigger>
            <TabsTrigger value="packages" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-display text-xs md:text-sm">
              <Package className="w-3 md:w-4 h-3 md:h-4 mr-1 md:mr-2" /> Paket
            </TabsTrigger>
            <TabsTrigger value="transactions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-display text-xs md:text-sm">
              <DollarSign className="w-3 md:w-4 h-3 md:h-4 mr-1 md:mr-2" /> Transaksi
            </TabsTrigger>
          </TabsList>

          {/* Ads Tab */}
          <TabsContent value="ads" className="space-y-4 md:space-y-6">
            {/* Add New Ad Form */}
            <div className="glass-card p-4 md:p-6 rounded-xl">
              <h2 className="text-base md:text-lg font-display font-semibold mb-4 text-foreground flex items-center gap-2">
                <Plus className="w-4 md:w-5 h-4 md:h-5 text-primary" /> Tambah Iklan Baru
              </h2>
              <form onSubmit={handleAddAd} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title" className="text-foreground text-sm">Judul</Label>
                    <Input
                      id="title"
                      value={newAd.title}
                      onChange={(e) => setNewAd(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Judul iklan"
                      className="bg-muted/50 border-border"
                    />
                  </div>
                  <div>
                    <Label htmlFor="media_type" className="text-foreground text-sm">Tipe Media</Label>
                    <select
                      id="media_type"
                      value={newAd.media_type}
                      onChange={(e) => setNewAd(prev => ({ ...prev, media_type: e.target.value as 'image' | 'video' }))}
                      className="w-full h-10 px-3 rounded-md border border-input bg-muted/50 text-foreground text-sm"
                    >
                      <option value="image">Gambar</option>
                      <option value="video">Video</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="media_url" className="text-foreground text-sm">URL Media</Label>
                  <Input
                    id="media_url"
                    value={newAd.media_url}
                    onChange={(e) => setNewAd(prev => ({ ...prev, media_url: e.target.value }))}
                    placeholder="https://example.com/image.jpg"
                    className="bg-muted/50 border-border"
                  />
                </div>
                <div>
                  <Label htmlFor="link" className="text-foreground text-sm">URL Link (opsional)</Label>
                  <Input
                    id="link"
                    value={newAd.link}
                    onChange={(e) => setNewAd(prev => ({ ...prev, link: e.target.value }))}
                    placeholder="https://example.com"
                    className="bg-muted/50 border-border"
                  />
                </div>
                <Button type="submit" className="btn-primary text-primary-foreground text-sm">
                  <Plus className="w-4 h-4 mr-2" /> Tambah Iklan
                </Button>
              </form>
            </div>

            {/* Ads List */}
            <div className="glass-card p-4 md:p-6 rounded-xl">
              <h2 className="text-base md:text-lg font-display font-semibold mb-4 text-foreground">
                Daftar Iklan ({ads.length})
              </h2>
              {loading ? (
                <p className="text-muted-foreground text-center py-8 text-sm">Memuat...</p>
              ) : ads.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">Belum ada iklan</p>
              ) : (
                <div className="space-y-3">
                  {ads.map((ad, index) => (
                    <div key={ad.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 p-3 md:p-4 bg-muted/30 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
                      <div className="w-full sm:w-24 h-20 sm:h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {ad.media_type === 'video' ? (
                          <video src={ad.media_url} className="w-full h-full object-cover" muted />
                        ) : (
                          <img src={ad.media_url} alt={ad.title} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate text-sm md:text-base">{ad.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          {ad.media_type === 'video' ? (
                            <><Video className="w-3 h-3" /> Video</>
                          ) : (
                            <><Image className="w-3 h-3" /> Gambar</>
                          )}
                          <span className={`px-2 py-0.5 rounded-full ${ad.is_active ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                            {ad.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                        <Button size="icon" variant="ghost" onClick={() => copyToClipboard(ad.media_url)} className="hover:bg-primary/10 h-8 w-8" title="Salin link media">
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => { setEditingAd(ad); setEditAdDialog(true); }} className="hover:bg-primary/10 h-8 w-8" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Switch checked={ad.is_active} onCheckedChange={() => handleToggleActive(ad.id, ad.is_active)} />
                        <Button size="icon" variant="ghost" onClick={() => handleMove(ad.id, 'up')} disabled={index === 0} className="hover:bg-primary/10 h-8 w-8">
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleMove(ad.id, 'down')} disabled={index === ads.length - 1} className="hover:bg-primary/10 h-8 w-8">
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10 h-8 w-8" onClick={() => handleDeleteAd(ad.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Background Tab */}
          <TabsContent value="background" className="space-y-4 md:space-y-6">
            {/* Add New Background Form */}
            <div className="glass-card p-4 md:p-6 rounded-xl">
              <h2 className="text-base md:text-lg font-display font-semibold mb-4 text-foreground flex items-center gap-2">
                <Plus className="w-4 md:w-5 h-4 md:h-5 text-primary" /> Tambah Background Baru
              </h2>
              <form onSubmit={handleAddBackground} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-foreground text-sm">Judul</Label>
                    <Input
                      value={bgForm.title}
                      onChange={(e) => setBgForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Nama background"
                      className="bg-muted/50 border-border mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground text-sm">Tipe</Label>
                    <select
                      value={bgForm.type}
                      onChange={(e) => setBgForm(prev => ({ ...prev, type: e.target.value as 'image' | 'video' }))}
                      className="w-full h-10 px-3 rounded-md border border-input bg-muted/50 text-foreground mt-1 text-sm"
                    >
                      <option value="image">Gambar</option>
                      <option value="video">Video</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label className="text-foreground text-sm">URL {bgForm.type === 'image' ? 'Gambar' : 'Video'}</Label>
                  <Input
                    value={bgForm.url}
                    onChange={(e) => setBgForm(prev => ({ ...prev, url: e.target.value }))}
                    placeholder={bgForm.type === 'image' ? 'https://example.com/background.jpg' : 'https://example.com/background.mp4'}
                    className="bg-muted/50 border-border mt-1"
                  />
                </div>
                {bgForm.url && (
                  <div>
                    <Label className="text-foreground text-sm mb-2 block">Preview</Label>
                    <div className="relative w-full h-32 md:h-40 rounded-lg overflow-hidden bg-muted">
                      {bgForm.type === 'image' ? (
                        <img src={bgForm.url} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <video src={bgForm.url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                      )}
                    </div>
                  </div>
                )}
                <Button type="submit" className="btn-primary text-primary-foreground text-sm">
                  <Plus className="w-4 h-4 mr-2" /> Tambah Background
                </Button>
              </form>
            </div>

            {/* Current Status */}
            <div className="glass-card p-3 md:p-4 rounded-xl">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Background aktif:</span>{' '}
                {activeBackgroundsList.length > 0 
                  ? activeBackgroundsList.map(bg => bg.title).join(', ') 
                  : 'Default (Gradient)'}
              </p>
              {activeBackgroundsList.length > 1 && (
                <p className="text-xs text-primary mt-1">
                  ✨ Mode rotasi otomatis aktif ({activeBackgroundsList.length} background)
                </p>
              )}
            </div>

            {/* Background List */}
            <div className="glass-card p-4 md:p-6 rounded-xl">
              <h2 className="text-base md:text-lg font-display font-semibold mb-4 text-foreground">
                Daftar Background ({backgrounds.length})
              </h2>
              {loading ? (
                <p className="text-muted-foreground text-center py-8 text-sm">Memuat...</p>
              ) : backgrounds.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">Belum ada background kustom</p>
              ) : (
                <div className="space-y-3">
                  {backgrounds.map((bg, index) => (
                    <div key={bg.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 p-3 md:p-4 bg-muted/30 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
                      <div className="w-full sm:w-24 h-20 sm:h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {bg.background_type === 'video' ? (
                          <video src={bg.background_url} className="w-full h-full object-cover" muted />
                        ) : (
                          <img src={bg.background_url} alt={bg.title} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate text-sm md:text-base">{bg.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          {bg.background_type === 'video' ? (
                            <><Video className="w-3 h-3" /> Video</>
                          ) : (
                            <><Image className="w-3 h-3" /> Gambar</>
                          )}
                          <span className={`px-2 py-0.5 rounded-full ${bg.is_active ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                            {bg.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                        <Button size="icon" variant="ghost" onClick={() => copyToClipboard(bg.background_url)} className="hover:bg-primary/10 h-8 w-8" title="Salin link">
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => { setEditingBg(bg); setEditBgDialog(true); }} className="hover:bg-primary/10 h-8 w-8" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {bg.background_type === 'video' && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => handleToggleMuteBackground(bg.id, bg.is_muted)} 
                            className={`h-8 w-8 ${bg.is_muted ? 'hover:bg-muted' : 'hover:bg-success/10 text-success'}`}
                            title={bg.is_muted ? 'Unmute' : 'Mute'}
                          >
                            {bg.is_muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                          </Button>
                        )}
                        <Switch checked={bg.is_active} onCheckedChange={() => handleToggleBackground(bg.id, bg.is_active)} />
                        <Button size="icon" variant="ghost" onClick={() => handleMoveBackground(bg.id, 'up')} disabled={index === 0} className="hover:bg-primary/10 h-8 w-8">
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleMoveBackground(bg.id, 'down')} disabled={index === backgrounds.length - 1} className="hover:bg-primary/10 h-8 w-8">
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10 h-8 w-8" onClick={() => handleDeleteBackground(bg.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Packages Tab */}
          <TabsContent value="packages" className="space-y-4 md:space-y-6">
            <div className="glass-card p-4 md:p-6 rounded-xl">
              <h2 className="text-base md:text-lg font-display font-semibold mb-4 text-foreground flex items-center gap-2">
                <Package className="w-4 md:w-5 h-4 md:h-5 text-primary" /> Kelola Paket Harga
              </h2>
              {loading ? (
                <p className="text-muted-foreground text-center py-8 text-sm">Memuat...</p>
              ) : packages.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">Belum ada paket</p>
              ) : (
                <div className="space-y-4">
                  {packages.map((pkg) => (
                    <div key={pkg.id} className={`p-4 md:p-6 rounded-xl border-2 ${pkg.name === 'VIP' ? 'border-secondary/50 bg-secondary/5' : 'border-primary/50 bg-primary/5'}`}>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className={`text-lg font-display font-bold ${pkg.name === 'VIP' ? 'text-secondary' : 'text-primary'}`}>
                              {pkg.display_name}
                            </h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${pkg.is_active ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                              {pkg.is_active ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </div>
                          <p className="text-2xl font-display font-black text-foreground mb-2">
                            {formatRupiah(pkg.price_per_day)} <span className="text-sm text-muted-foreground font-normal">/hari</span>
                          </p>
                          <p className="text-sm text-muted-foreground mb-3">{pkg.description}</p>
                          <div className="flex flex-wrap gap-2">
                            {pkg.features?.map((feature, idx) => (
                              <span key={idx} className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setEditingPkg(pkg); setEditPkgDialog(true); }} className="border-border">
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                          </Button>
                          <Switch checked={pkg.is_active} onCheckedChange={() => handleTogglePackage(pkg.id, pkg.is_active)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4 md:space-y-6">
            {/* Search & Filter */}
            <div className="glass-card p-3 md:p-4 rounded-xl">
              <div className="flex flex-col gap-3 md:gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari transaksi..."
                    className="pl-10 bg-muted/50 border-border text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 px-3 rounded-md border border-input bg-muted/50 text-foreground text-sm flex-1"
                  >
                    <option value="all">Semua Status</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <Button variant="outline" onClick={loadData} className="border-border" disabled={loading}>
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </div>

            {/* Clear Actions */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => handleClearTransactions('pending')} className="border-warning/50 text-warning hover:bg-warning/10 text-xs">
                <X className="w-3 h-3 mr-1" /> Pending
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleClearTransactions('expired')} className="border-muted-foreground/50 text-muted-foreground hover:bg-muted text-xs">
                <X className="w-3 h-3 mr-1" /> Expired
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleClearTransactions('cancelled')} className="border-destructive/50 text-destructive hover:bg-destructive/10 text-xs">
                <X className="w-3 h-3 mr-1" /> Cancelled
              </Button>
            </div>

            {/* Transactions List */}
            <div className="space-y-3">
              {filteredTransactions.length === 0 ? (
                <div className="glass-card p-8 text-center text-muted-foreground text-sm">
                  {loading ? 'Memuat...' : 'Tidak ada transaksi'}
                </div>
              ) : (
                filteredTransactions.map((tx) => (
                  <div key={tx.id} className="glass-card p-4 rounded-xl space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-mono text-primary text-sm font-medium">{tx.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{tx.transaction_id.slice(0, 20)}...</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${tx.package_name === 'VIP' ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'}`}>
                        {tx.package_name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-foreground font-medium">{formatRupiah(tx.total_amount)}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        tx.status === 'paid' ? 'bg-success/20 text-success' :
                        tx.status === 'pending' ? 'bg-warning/20 text-warning' :
                        tx.status === 'expired' ? 'bg-muted text-muted-foreground' :
                        'bg-destructive/20 text-destructive'
                      }`}>
                        {tx.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</span>
                      <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10 h-8 w-8" onClick={() => handleDeleteTransaction(tx.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Ad Dialog */}
      <Dialog open={editAdDialog} onOpenChange={setEditAdDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Iklan</DialogTitle>
          </DialogHeader>
          {editingAd && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm">Judul</Label>
                <Input
                  value={editingAd.title}
                  onChange={(e) => setEditingAd({ ...editingAd, title: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Tipe Media</Label>
                <select
                  value={editingAd.media_type}
                  onChange={(e) => setEditingAd({ ...editingAd, media_type: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background mt-1"
                >
                  <option value="image">Gambar</option>
                  <option value="video">Video</option>
                </select>
              </div>
              <div>
                <Label className="text-sm">URL Media</Label>
                <Input
                  value={editingAd.media_url}
                  onChange={(e) => setEditingAd({ ...editingAd, media_url: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">URL Link (opsional)</Label>
                <Input
                  value={editingAd.link || ''}
                  onChange={(e) => setEditingAd({ ...editingAd, link: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAdDialog(false)}>Batal</Button>
            <Button onClick={handleUpdateAd} className="btn-primary text-primary-foreground">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Background Dialog */}
      <Dialog open={editBgDialog} onOpenChange={setEditBgDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Background</DialogTitle>
          </DialogHeader>
          {editingBg && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm">Judul</Label>
                <Input
                  value={editingBg.title}
                  onChange={(e) => setEditingBg({ ...editingBg, title: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Tipe</Label>
                <select
                  value={editingBg.background_type}
                  onChange={(e) => setEditingBg({ ...editingBg, background_type: e.target.value as 'image' | 'video' })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background mt-1"
                >
                  <option value="image">Gambar</option>
                  <option value="video">Video</option>
                </select>
              </div>
              <div>
                <Label className="text-sm">URL</Label>
                <Input
                  value={editingBg.background_url}
                  onChange={(e) => setEditingBg({ ...editingBg, background_url: e.target.value })}
                  className="mt-1"
                />
              </div>
              {editingBg.background_url && (
                <div className="relative w-full h-32 rounded-lg overflow-hidden bg-muted">
                  {editingBg.background_type === 'image' ? (
                    <img src={editingBg.background_url} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <video src={editingBg.background_url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBgDialog(false)}>Batal</Button>
            <Button onClick={handleUpdateBackground} className="btn-primary text-primary-foreground">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Package Dialog */}
      <Dialog open={editPkgDialog} onOpenChange={setEditPkgDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Paket {editingPkg?.name}</DialogTitle>
          </DialogHeader>
          {editingPkg && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm">Nama Tampilan</Label>
                <Input
                  value={editingPkg.display_name}
                  onChange={(e) => setEditingPkg({ ...editingPkg, display_name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Harga per Hari (Rupiah)</Label>
                <Input
                  type="number"
                  value={editingPkg.price_per_day}
                  onChange={(e) => setEditingPkg({ ...editingPkg, price_per_day: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Deskripsi</Label>
                <Textarea
                  value={editingPkg.description || ''}
                  onChange={(e) => setEditingPkg({ ...editingPkg, description: e.target.value })}
                  className="mt-1"
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-sm">Fitur (pisahkan dengan enter)</Label>
                <Textarea
                  value={editingPkg.features?.join('\n') || ''}
                  onChange={(e) => setEditingPkg({ ...editingPkg, features: e.target.value.split('\n').filter(f => f.trim()) })}
                  className="mt-1"
                  rows={4}
                  placeholder="Fitur 1&#10;Fitur 2&#10;Fitur 3"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPkgDialog(false)}>Batal</Button>
            <Button onClick={handleUpdatePackage} className="btn-primary text-primary-foreground">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
