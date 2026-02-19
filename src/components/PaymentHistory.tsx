import { FC, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { History, Clock, CheckCircle, XCircle, RefreshCw, Receipt, Copy, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Transaction {
  id: string;
  transaction_id: string;
  customer_name: string;
  package_name: string;
  package_duration: number;
  original_amount: number;
  total_amount: number;
  status: string;
  license_key: string | null;
  created_at: string;
  paid_at: string | null;
}

interface PaymentHistoryProps {
  deviceId: string;
}

const PaymentHistory: FC<PaymentHistoryProps> = ({ deviceId }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching history:', error);
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (deviceId) {
      fetchHistory();

      // Subscribe to realtime updates
      const channel = supabase
        .channel('payment-history-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `device_id=eq.${deviceId}`
          },
          () => {
            fetchHistory();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [deviceId]);

  const formatRupiah = (n: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
      case 'claimed':
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-success/20 text-success">
            <CheckCircle className="w-3 h-3" />
            {status === 'claimed' ? 'Claimed' : 'Paid'}
          </span>
        );
      case 'claimable':
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400">
            <CheckCircle className="w-3 h-3" />
            Siap Diklaim
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-warning/20 text-warning">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-destructive/20 text-destructive">
            <XCircle className="w-3 h-3" />
            {status}
          </span>
        );
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Disalin!', description: `${label} berhasil disalin ke clipboard` });
  };

  const clearHistory = async () => {
    setClearing(true);
    try {
      const response = await supabase.functions.invoke('clear-history', {
        body: { deviceId }
      });

      if (response.error) {
        toast({ title: 'Error', description: 'Gagal menghapus riwayat', variant: 'destructive' });
      } else {
        setTransactions([]);
        toast({ title: 'Berhasil', description: 'Riwayat transaksi berhasil dihapus' });
      }
    } catch (err) {
      console.error('Error clearing history:', err);
      toast({ title: 'Error', description: 'Gagal menghapus riwayat', variant: 'destructive' });
    }
    setClearing(false);
  };

  if (!deviceId) {
    return null;
  }

  return (
    <Card className="glass-card border-primary/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Riwayat Transaksi
            </CardTitle>
            <CardDescription>Transaksi dari perangkat ini</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" disabled={clearing || transactions.length === 0}>
                  <Trash2 className={`w-4 h-4 text-destructive ${clearing ? 'animate-spin' : ''}`} />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus Riwayat Transaksi?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Semua riwayat transaksi dari perangkat ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={clearHistory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Hapus Semua
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="ghost" size="sm" onClick={fetchHistory} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Memuat riwayat...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Belum ada transaksi dari perangkat ini</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {transactions.map((tx) => (
              <div key={tx.id} className="bg-muted/20 p-3 rounded-lg border border-border/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{tx.package_name}</span>
                      <span className="text-xs text-muted-foreground">• {tx.package_duration}h</span>
                      {getStatusBadge(tx.status)}
                    </div>
                    
                    {/* Transaction ID - 1 tap copy */}
                    <button
                      onClick={() => copyToClipboard(tx.transaction_id, 'ID Transaksi')}
                      className="flex items-center gap-1 mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors group"
                    >
                      <span className="font-mono truncate max-w-[180px]">{tx.transaction_id}</span>
                      <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(tx.created_at)}
                    </p>
                    
                    {tx.license_key && tx.status === 'paid' && (
                      <button
                        onClick={() => copyToClipboard(tx.license_key!, 'Key')}
                        className="flex items-center gap-2 mt-2 group"
                      >
                        <code className="text-xs bg-background/50 px-2 py-1 rounded font-mono truncate max-w-[200px]">
                          {tx.license_key}
                        </code>
                        <Copy className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </button>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{formatRupiah(tx.total_amount)}</p>
                    {tx.original_amount > tx.total_amount && (
                      <p className="text-xs text-muted-foreground line-through">
                        {formatRupiah(tx.original_amount)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentHistory;