import { FC, useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { 
  Key, Plus, Trash2, Edit2, RefreshCw, Save, 
  Users, Calendar, Shield, Copy, AlertTriangle,
  Download, Upload, Pause, Play, Clock
} from 'lucide-react';
import BulkKeyActions from './BulkKeyActions';

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface KeyItem {
  key: string;
  expired: string;
  role: string;
  maxHwid: number;
  frozenUntil: string | null;
  frozenRemainingMs?: number;
  hwids: string[];
  robloxUsers: {
    hwid: string;
    username: string;
    registeredAt: string;
  }[];
}

interface KeyManagementProps {
  onRefresh?: () => void;
}

// Time unit mappings for flexible input parsing
const TIME_UNITS: Record<string, number> = {
  // Indonesian short
  'm': 60 * 1000, // menit
  'j': 60 * 60 * 1000, // jam
  'h': 24 * 60 * 60 * 1000, // hari
  'b': 30 * 24 * 60 * 60 * 1000, // bulan
  't': 365 * 24 * 60 * 60 * 1000, // tahun
  // Indonesian long
  'menit': 60 * 1000,
  'jam': 60 * 60 * 1000,
  'hari': 24 * 60 * 60 * 1000,
  'bulan': 30 * 24 * 60 * 60 * 1000,
  'tahun': 365 * 24 * 60 * 60 * 1000,
  // English short
  'min': 60 * 1000,
  'hr': 60 * 60 * 1000,
  'd': 24 * 60 * 60 * 1000,
  'mo': 30 * 24 * 60 * 60 * 1000,
  'y': 365 * 24 * 60 * 60 * 1000,
  // English long
  'minute': 60 * 1000,
  'minutes': 60 * 1000,
  'hour': 60 * 60 * 1000,
  'hours': 60 * 60 * 1000,
  'day': 24 * 60 * 60 * 1000,
  'days': 24 * 60 * 60 * 1000,
  'month': 30 * 24 * 60 * 60 * 1000,
  'months': 30 * 24 * 60 * 60 * 1000,
  'year': 365 * 24 * 60 * 60 * 1000,
  'years': 365 * 24 * 60 * 60 * 1000,
};

// Parse flexible time input like "1m, 2j" or "+ 1h 30m" or "- 2d"
const parseTimeInput = (input: string): { ms: number; isRelative: boolean; isAdd: boolean } => {
  const trimmed = input.trim();
  let isAdd = true;
  let isRelative = false;
  let workingInput = trimmed;

  // Check for +/- prefix
  if (workingInput.startsWith('+')) {
    isRelative = true;
    isAdd = true;
    workingInput = workingInput.substring(1).trim();
  } else if (workingInput.startsWith('-')) {
    isRelative = true;
    isAdd = false;
    workingInput = workingInput.substring(1).trim();
  }

  // Split by comma or space to handle combo inputs like "1m, 2j" or "1m 2j"
  const parts = workingInput.split(/[,\s]+/).filter(p => p.length > 0);
  
  let totalMs = 0;
  
  for (const part of parts) {
    // Match number followed by unit (e.g., "1m", "30menit", "2hours")
    const match = part.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)$/);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2].toLowerCase();
      const multiplier = TIME_UNITS[unit];
      if (multiplier) {
        totalMs += value * multiplier;
      }
    }
  }

  return { ms: totalMs, isRelative, isAdd };
};

// Format milliseconds to human readable string
const formatMsToReadable = (ms: number): string => {
  if (ms <= 0) return '0';
  
  const years = Math.floor(ms / (365 * 24 * 60 * 60 * 1000));
  const months = Math.floor((ms % (365 * 24 * 60 * 60 * 1000)) / (30 * 24 * 60 * 60 * 1000));
  const days = Math.floor((ms % (30 * 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  
  const parts = [];
  if (years > 0) parts.push(`${years}t`);
  if (months > 0) parts.push(`${months}b`);
  if (days > 0) parts.push(`${days}h`);
  if (hours > 0) parts.push(`${hours}j`);
  if (minutes > 0) parts.push(`${minutes}m`);
  
  return parts.join(' ') || '0m';
};

// Convert ISO string to datetime-local format (for input field)
const formatDatetimeLocal = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    
    // Format to YYYY-MM-DDTHH:mm in local timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return '';
  }
};

const KeyManagement: FC<KeyManagementProps> = ({ onRefresh }) => {
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingKey, setEditingKey] = useState<KeyItem | null>(null);
  const [isNewKey, setIsNewKey] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [timeInputValue, setTimeInputValue] = useState('');
  const [showTimeHelper, setShowTimeHelper] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Realtime countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/get-keys`);
      const data = await response.json();
      if (data.keys) {
        setKeys(data.keys);
      }
    } catch (error) {
      console.error('Failed to fetch keys:', error);
      toast({ title: 'Error', description: 'Gagal mengambil data keys', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const generateKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randomStr = (length: number) => {
      let result = '';
      for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
      return result;
    };
    return `AXSTOOLS-${randomStr(4)}-${randomStr(4)}`;
  };

  // Helper to apply time input and get final expired date
  const applyTimeInputToExpired = (currentExpired: string): string => {
    if (!timeInputValue.trim()) return currentExpired;
    
    const parsed = parseTimeInput(timeInputValue);
    if (parsed.ms === 0) return currentExpired;
    
    let newExpiry: Date;
    
    if (parsed.isRelative) {
      // Relative: add or subtract from current expiry
      const currentExpiryDate = new Date(currentExpired);
      if (parsed.isAdd) {
        newExpiry = new Date(currentExpiryDate.getTime() + parsed.ms);
      } else {
        newExpiry = new Date(currentExpiryDate.getTime() - parsed.ms);
      }
    } else {
      // Absolute: set from now
      newExpiry = new Date(Date.now() + parsed.ms);
    }
    
    return newExpiry.toISOString();
  };

  const handleCreateKey = async () => {
    if (!editingKey) return;
    
    setLoading(true);
    try {
      const keyToCreate = editingKey.key || generateKey();
      
      // Auto-apply time input if present
      const finalExpired = applyTimeInputToExpired(editingKey.expired);
      
      const response = await fetch(`${API_BASE}/create-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: keyToCreate,
          role: editingKey.role || 'VIP',
          expired: finalExpired,
          max_hwid: editingKey.maxHwid || 1
        })
      });
      
      const result = await response.json();
      if (result.success) {
        const action = timeInputValue.trim() ? ` (${formatMsToReadable(parseTimeInput(timeInputValue).ms)})` : '';
        toast({ title: 'Berhasil', description: `Key ${result.key} berhasil dibuat${action}` });
        setEditingKey(null);
        setIsNewKey(false);
        setTimeInputValue('');
        fetchKeys();
      } else {
        toast({ title: 'Error', description: result.error || 'Gagal membuat key', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to create key:', error);
      toast({ title: 'Error', description: 'Gagal membuat key', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateKey = async () => {
    if (!editingKey) return;
    
    setLoading(true);
    try {
      // Auto-apply time input if present
      const finalExpired = applyTimeInputToExpired(editingKey.expired);
      
      const response = await fetch(`${API_BASE}/update-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: editingKey.key,
          role: editingKey.role,
          expired: finalExpired,
          max_hwid: editingKey.maxHwid,
          frozenUntil: editingKey.frozenUntil,
          frozenRemainingMs: editingKey.frozenRemainingMs
        })
      });
      
      const result = await response.json();
      if (result.success) {
        const action = timeInputValue.trim() ? ` (${formatMsToReadable(parseTimeInput(timeInputValue).ms)})` : '';
        toast({ title: 'Berhasil', description: `Key berhasil diupdate${action}` });
        setEditingKey(null);
        setTimeInputValue('');
        fetchKeys();
      } else {
        toast({ title: 'Error', description: result.error || 'Gagal update key', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to update key:', error);
      toast({ title: 'Error', description: 'Gagal update key', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKey = async (key: string) => {
    if (!confirm(`Yakin ingin menghapus key "${key}"?`)) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/delete-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });
      
      const result = await response.json();
      if (result.success) {
        toast({ title: 'Berhasil', description: 'Key berhasil dihapus' });
        fetchKeys();
      } else {
        toast({ title: 'Error', description: result.error || 'Gagal menghapus key', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to delete key:', error);
      toast({ title: 'Error', description: 'Gagal menghapus key', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllKeys = async () => {
    if (!confirm(`⚠️ PERINGATAN!\n\nAnda akan menghapus SEMUA ${keys.length} keys!\n\nAksi ini tidak dapat dibatalkan.\n\nLanjutkan?`)) return;
    if (!confirm(`Ketik "HAPUS SEMUA" untuk konfirmasi:\n\nApakah Anda yakin ingin menghapus semua keys?`)) return;
    
    setLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const keyItem of keys) {
      try {
        const response = await fetch(`${API_BASE}/delete-key`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: keyItem.key })
        });
        
        const result = await response.json();
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    toast({ 
      title: 'Delete All Selesai', 
      description: `${successCount} berhasil dihapus, ${errorCount} gagal`,
      variant: errorCount > 0 ? 'destructive' : 'default'
    });
    fetchKeys();
    setLoading(false);
  };

  const toggleFreezeKey = async (keyItem: KeyItem) => {
    setLoading(true);
    try {
      const now = new Date();
      const expiredDate = new Date(keyItem.expired);
      
      let updateData: any = { key: keyItem.key };
      
      if (keyItem.frozenUntil) {
        // Unfreeze: Calculate new expiry based on remaining time
        const remainingMs = keyItem.frozenRemainingMs || 0;
        const newExpiry = new Date(now.getTime() + remainingMs);
        updateData.expired = newExpiry.toISOString();
        updateData.frozenUntil = null;
        updateData.frozenRemainingMs = null;
      } else {
        // Freeze: Store remaining time
        const remainingMs = expiredDate.getTime() - now.getTime();
        updateData.frozenUntil = now.toISOString();
        updateData.frozenRemainingMs = remainingMs > 0 ? remainingMs : 0;
      }

      const response = await fetch(`${API_BASE}/update-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      const result = await response.json();
      if (result.success) {
        toast({ 
          title: 'Berhasil', 
          description: keyItem.frozenUntil ? 'Key berhasil di-unfreeze' : 'Key berhasil di-freeze' 
        });
        fetchKeys();
      } else {
        toast({ title: 'Error', description: result.error || 'Gagal update key', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to toggle freeze:', error);
      toast({ title: 'Error', description: 'Gagal toggle freeze', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const freezeAllKeys = async (freeze: boolean) => {
    if (!confirm(freeze ? 'Freeze semua key?' : 'Unfreeze semua key?')) return;
    
    setLoading(true);
    const now = new Date();
    
    for (const key of keys) {
      if (freeze && !key.frozenUntil) {
        const expiredDate = new Date(key.expired);
        const remainingMs = expiredDate.getTime() - now.getTime();
        await fetch(`${API_BASE}/update-key`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: key.key,
            frozenUntil: now.toISOString(),
            frozenRemainingMs: remainingMs > 0 ? remainingMs : 0
          })
        });
      } else if (!freeze && key.frozenUntil) {
        const remainingMs = key.frozenRemainingMs || 0;
        const newExpiry = new Date(now.getTime() + remainingMs);
        await fetch(`${API_BASE}/update-key`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: key.key,
            expired: newExpiry.toISOString(),
            frozenUntil: null,
            frozenRemainingMs: null
          })
        });
      }
    }
    
    toast({ title: 'Berhasil', description: freeze ? 'Semua key di-freeze' : 'Semua key di-unfreeze' });
    fetchKeys();
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Key berhasil disalin' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'long'
    });
  };

  const getTimeRemaining = (keyItem: KeyItem) => {
    if (keyItem.frozenUntil) {
      const remainingMs = keyItem.frozenRemainingMs || 0;
      const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
      return { 
        text: `⏸️ ${days} hari ${hours} jam ${minutes} menit ${seconds} detik`, 
        className: 'text-blue-400',
        frozen: true 
      };
    }
    
    const now = currentTime;
    const expired = new Date(keyItem.expired);
    const diff = expired.getTime() - now.getTime();
    
    if (diff <= 0) {
      return { text: 'KADALUARSA', className: 'text-destructive', frozen: false };
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (days > 0) {
      return { text: `${days} hari ${hours} jam ${minutes} menit ${seconds} detik`, className: 'text-secondary', frozen: false };
    } else if (hours > 0) {
      return { text: `${hours} jam ${minutes} menit ${seconds} detik`, className: 'text-yellow-400', frozen: false };
    } else {
      return { text: `${minutes} menit ${seconds} detik`, className: 'text-destructive', frozen: false };
    }
  };

  const isExpired = (keyItem: KeyItem) => {
    if (keyItem.frozenUntil) return false;
    return new Date(keyItem.expired) < new Date();
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'developer':
        return 'bg-blue-500/20 text-blue-400';
      case 'vip':
        return 'bg-purple-500/20 text-purple-400';
      case 'normal':
        return 'bg-green-500/20 text-green-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const filteredKeys = keys.filter(k => 
    k.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.robloxUsers.some(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const frozenCount = keys.filter(k => k.frozenUntil).length;

  const startNewKey = () => {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    
    setEditingKey({
      key: '',
      expired: expiryDate.toISOString(), // Full ISO string with timezone
      role: 'VIP',
      maxHwid: 1,
      frozenUntil: null,
      hwids: [],
      robloxUsers: []
    });
    setIsNewKey(true);
    setTimeInputValue('');
  };

  // Export keys to JSON file with complete format
  const exportKeys = () => {
    const exportData = keys.map(k => ({
      key: k.key,
      expired: k.expired,
      created: new Date().toISOString(), // Add created field
      role: k.role,
      maxHwid: k.maxHwid,
      Freeze: k.frozenUntil ? true : false, // Add Freeze status
      frozenUntil: k.frozenUntil,
      frozenRemainingMs: k.frozenRemainingMs,
      hwids: k.hwids,
      robloxUsers: k.robloxUsers
    }));
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `axs-keys-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: 'Berhasil', description: `${keys.length} keys berhasil diekspor` });
  };

  // Import keys from JSON file
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedKeys: KeyItem[] = JSON.parse(text);
      
      if (!Array.isArray(importedKeys)) {
        toast({ title: 'Error', description: 'Format file tidak valid', variant: 'destructive' });
        return;
      }

      setLoading(true);
      let successCount = 0;
      let errorCount = 0;

      for (const keyData of importedKeys) {
        try {
          const response = await fetch(`${API_BASE}/create-key`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              key: keyData.key,
              role: keyData.role || 'VIP',
              expired: keyData.expired,
              max_hwid: keyData.maxHwid || 1
            })
          });
          
          const result = await response.json();
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch {
          errorCount++;
        }
      }

      toast({ 
        title: 'Import Selesai', 
        description: `${successCount} berhasil, ${errorCount} gagal` 
      });
      fetchKeys();
    } catch (error) {
      console.error('Import error:', error);
      toast({ title: 'Error', description: 'Gagal membaca file JSON', variant: 'destructive' });
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header dengan info */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <h2 className="text-lg md:text-xl font-display font-semibold flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              License Keys
            </h2>
            <span className="text-xs sm:text-sm text-muted-foreground">
              Total: {keys.length} | Frozen: {frozenCount}
            </span>
          </div>
          
          {/* Refresh button standalone untuk mobile */}
          <Button variant="outline" size="sm" onClick={fetchKeys} disabled={loading} className="w-fit">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        {/* Action buttons - scrollable on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          <Button variant="outline" size="sm" onClick={exportKeys} disabled={keys.length === 0} className="whitespace-nowrap">
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fileInputRef.current?.click()} 
            disabled={loading}
            className="whitespace-nowrap"
          >
            <Upload className="w-4 h-4 mr-1" />
            Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleDeleteAllKeys}
            disabled={loading || keys.length === 0}
            className="whitespace-nowrap"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete All
          </Button>
          <Button size="sm" onClick={startNewKey} className="whitespace-nowrap">
            <Plus className="w-4 h-4 mr-1" />
            Add Key
          </Button>
        </div>
      </div>

      {/* Freeze Control with Search */}
      <Card className="glass-card border-blue-500/30">
        <CardContent className="p-4 space-y-4">
          {/* Search bar integrated in freeze control */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.3-4.3"/>
              </svg>
            </div>
            <Input
              placeholder="Cari key, role, atau username Roblox..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50 border-blue-500/30 focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18"/>
                  <path d="m6 6 12 12"/>
                </svg>
              </button>
            )}
          </div>

          {/* Freeze controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Pause className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-medium text-sm sm:text-base">Freeze Control</h3>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Freeze menjeda countdown, unfreeze melanjutkan sisa waktu
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => freezeAllKeys(true)}
                disabled={loading || frozenCount === keys.length}
                className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20 flex-1 sm:flex-none"
              >
                <Pause className="w-4 h-4 mr-2" />
                Freeze All
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => freezeAllKeys(false)}
                disabled={loading || frozenCount === 0}
                className="border-green-500/50 text-green-400 hover:bg-green-500/20 flex-1 sm:flex-none"
              >
                <Play className="w-4 h-4 mr-2" />
                Unfreeze All
              </Button>
            </div>
          </div>

          {/* Search results info */}
          {searchQuery && (
            <div className="text-xs text-muted-foreground flex items-center gap-2 pt-1 border-t border-blue-500/20">
              <span>Menampilkan {filteredKeys.length} dari {keys.length} keys</span>
              {filteredKeys.length === 0 && (
                <span className="text-yellow-400">— Tidak ada hasil</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Key Actions */}
      <BulkKeyActions 
        keys={filteredKeys}
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        onRefresh={fetchKeys}
      />

      {/* Edit/Create Form */}
      {editingKey && (
        <Card className="glass-card border-primary/50">
          <CardHeader>
            <CardTitle>{isNewKey ? 'Create New Key' : 'Edit Key'}</CardTitle>
            <CardDescription>
              {isNewKey ? 'Buat license key baru (format: AXSTOOLS-XXXX-XXXX)' : 'Edit data license key'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Key {isNewKey && '(kosongkan untuk auto-generate)'}</Label>
                <Input
                  value={editingKey.key}
                  onChange={(e) => setEditingKey({ ...editingKey, key: e.target.value })}
                  placeholder="AXSTOOLS-XXXX-XXXX"
                  className="bg-background/50 font-mono"
                  disabled={!isNewKey}
                />
              </div>
              <div>
                <Label>Role</Label>
                <select
                  value={editingKey.role}
                  onChange={(e) => setEditingKey({ ...editingKey, role: e.target.value })}
                  className="w-full p-2 rounded-md bg-background/50 border border-border"
                >
                  <option value="Developer">Developer</option>
                  <option value="VIP">VIP</option>
                  <option value="NORMAL">NORMAL</option>
                  <option value="Free">Free</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Expired Date</Label>
                <Input
                  type="datetime-local"
                  value={formatDatetimeLocal(editingKey.expired)}
                  onChange={(e) => {
                    if (e.target.value) {
                      // Parse local datetime and convert to proper ISO string
                      const localDate = new Date(e.target.value);
                      setEditingKey({ ...editingKey, expired: localDate.toISOString() });
                    }
                  }}
                  className="bg-background/50"
                />
              </div>
              <div>
                <Label>Max HWID</Label>
                <Input
                  type="number"
                  min="1"
                  value={editingKey.maxHwid}
                  onChange={(e) => setEditingKey({ ...editingKey, maxHwid: parseInt(e.target.value) })}
                  className="bg-background/50"
                />
              </div>
            </div>

            {/* Flexible Time Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Adjust Expired (Optional)
                </Label>
                <button
                  type="button"
                  onClick={() => setShowTimeHelper(!showTimeHelper)}
                  className="text-xs text-muted-foreground hover:text-primary underline"
                >
                  {showTimeHelper ? 'Sembunyikan bantuan' : 'Lihat format'}
                </button>
              </div>
              
              {showTimeHelper && (
                <div className="bg-muted/30 rounded-lg p-3 text-xs space-y-2">
                  <p className="font-medium text-muted-foreground">Format yang didukung:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="font-semibold text-primary">Indonesia:</p>
                      <ul className="text-muted-foreground space-y-0.5">
                        <li>• <code className="bg-muted px-1 rounded">m</code> atau <code className="bg-muted px-1 rounded">menit</code> = Menit</li>
                        <li>• <code className="bg-muted px-1 rounded">j</code> atau <code className="bg-muted px-1 rounded">jam</code> = Jam</li>
                        <li>• <code className="bg-muted px-1 rounded">h</code> atau <code className="bg-muted px-1 rounded">hari</code> = Hari</li>
                        <li>• <code className="bg-muted px-1 rounded">b</code> atau <code className="bg-muted px-1 rounded">bulan</code> = Bulan</li>
                        <li>• <code className="bg-muted px-1 rounded">t</code> atau <code className="bg-muted px-1 rounded">tahun</code> = Tahun</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold text-primary">English:</p>
                      <ul className="text-muted-foreground space-y-0.5">
                        <li>• <code className="bg-muted px-1 rounded">min</code> / <code className="bg-muted px-1 rounded">minutes</code></li>
                        <li>• <code className="bg-muted px-1 rounded">hr</code> / <code className="bg-muted px-1 rounded">hours</code></li>
                        <li>• <code className="bg-muted px-1 rounded">d</code> / <code className="bg-muted px-1 rounded">days</code></li>
                        <li>• <code className="bg-muted px-1 rounded">mo</code> / <code className="bg-muted px-1 rounded">months</code></li>
                        <li>• <code className="bg-muted px-1 rounded">y</code> / <code className="bg-muted px-1 rounded">years</code></li>
                      </ul>
                    </div>
                  </div>
                  <p className="font-medium text-muted-foreground mt-2">Contoh:</p>
                  <ul className="text-muted-foreground space-y-0.5">
                    <li>• <code className="bg-muted px-1 rounded">30h</code> = Set 30 hari dari sekarang</li>
                    <li>• <code className="bg-muted px-1 rounded">+ 1b</code> = Tambah 1 bulan</li>
                    <li>• <code className="bg-muted px-1 rounded">- 7d</code> = Kurangi 7 hari</li>
                    <li>• <code className="bg-muted px-1 rounded">+ 1m, 2j</code> = Tambah 1 menit dan 2 jam</li>
                    <li>• <code className="bg-muted px-1 rounded">1t 6b</code> = Set 1 tahun 6 bulan dari sekarang</li>
                  </ul>
                </div>
              )}
              
              <div className="flex gap-2">
                <Input
                  value={timeInputValue}
                  onChange={(e) => setTimeInputValue(e.target.value)}
                  placeholder="Contoh: 30h, + 1b, - 7d, + 1m 2j"
                  className="bg-background/50 font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (!timeInputValue.trim()) {
                      toast({ title: 'Error', description: 'Masukkan format waktu', variant: 'destructive' });
                      return;
                    }
                    
                    const parsed = parseTimeInput(timeInputValue);
                    
                    if (parsed.ms === 0) {
                      toast({ title: 'Error', description: 'Format waktu tidak valid', variant: 'destructive' });
                      return;
                    }
                    
                    let newExpiry: Date;
                    
                    if (parsed.isRelative) {
                      // Relative: add or subtract from current expiry
                      const currentExpiry = new Date(editingKey.expired);
                      if (parsed.isAdd) {
                        newExpiry = new Date(currentExpiry.getTime() + parsed.ms);
                      } else {
                        newExpiry = new Date(currentExpiry.getTime() - parsed.ms);
                      }
                    } else {
                      // Absolute: set from now
                      newExpiry = new Date(Date.now() + parsed.ms);
                    }
                    
                    setEditingKey({ ...editingKey, expired: newExpiry.toISOString() });
                    setTimeInputValue('');
                    
                    const action = parsed.isRelative ? (parsed.isAdd ? 'ditambah' : 'dikurangi') : 'diset';
                    toast({ 
                      title: 'Berhasil', 
                      description: `Expired ${action} ${formatMsToReadable(parsed.ms)}` 
                    });
                  }}
                >
                  Apply
                </Button>
              </div>
              
              {/* Quick time buttons */}
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs text-muted-foreground mr-1">Quick:</span>
                {[
                  { label: '+1j', value: '+ 1j' },
                  { label: '+1h', value: '+ 1h' },
                  { label: '+7h', value: '+ 7h' },
                  { label: '+1b', value: '+ 1b' },
                  { label: '+1t', value: '+ 1t' },
                  { label: '-1j', value: '- 1j' },
                  { label: '-1h', value: '- 1h' },
                ].map(({ label, value }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTimeInputValue(value)}
                    className="px-2 py-0.5 text-xs rounded bg-muted hover:bg-muted/80 transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            
            {!isNewKey && editingKey.robloxUsers.length > 0 && (
              <div>
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Registered Users ({editingKey.robloxUsers.length}/{editingKey.maxHwid})
                </Label>
                <div className="mt-2 space-y-2">
                  {editingKey.robloxUsers.map((user, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-muted/30 p-2 rounded">
                      <span className="font-mono text-sm">{user.username}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(user.registeredAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={isNewKey ? handleCreateKey : handleUpdateKey} 
                disabled={loading}
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => { setEditingKey(null); setIsNewKey(false); }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keys List */}
      <div className="grid gap-3">
        {loading && keys.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-8 text-center text-muted-foreground">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
              Loading keys...
            </CardContent>
          </Card>
        ) : filteredKeys.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-8 text-center text-muted-foreground">
              <Key className="w-8 h-8 mx-auto mb-2 opacity-50" />
              {searchQuery ? 'Tidak ada key yang cocok' : 'Belum ada key'}
            </CardContent>
          </Card>
        ) : (
          filteredKeys.map((k) => {
            const timeRemaining = getTimeRemaining(k);
            return (
              <Card key={k.key} className={`glass-card transition-all hover:border-primary/50 ${isExpired(k) ? 'opacity-60' : ''} ${k.frozenUntil ? 'border-blue-500/30' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => copyToClipboard(k.key)}
                          className="font-mono text-sm bg-muted px-2 py-1 rounded truncate max-w-[300px] hover:bg-muted/80 transition-colors cursor-pointer flex items-center gap-1 group"
                          title="Klik untuk menyalin key"
                        >
                          {k.key}
                          <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleColor(k.role)}`}>
                          {k.role}
                        </span>
                        {k.frozenUntil && (
                          <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400 flex items-center gap-1">
                            <Pause className="w-3 h-3" />
                            FROZEN
                          </span>
                        )}
                        {isExpired(k) && (
                          <span className="px-2 py-0.5 rounded text-xs bg-destructive/20 text-destructive flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Expired
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(k.expired)}
                        </span>
                        <span className={`flex items-center gap-1 font-mono font-bold ${timeRemaining.className}`}>
                          <Clock className="w-4 h-4" />
                          {timeRemaining.text}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {k.robloxUsers.length}/{k.maxHwid} HWID
                        </span>
                        {k.robloxUsers.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Shield className="w-4 h-4" />
                            {k.robloxUsers.map(u => u.username).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => toggleFreezeKey(k)}
                        className={k.frozenUntil ? 'text-green-400 hover:text-green-300' : 'text-blue-400 hover:text-blue-300'}
                        title={k.frozenUntil ? 'Unfreeze' : 'Freeze'}
                      >
                        {k.frozenUntil ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { setEditingKey(k); setIsNewKey(false); }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteKey(k.key)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default KeyManagement;
