import { FC, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff, Smartphone, Check, X } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { supabase } from '@/integrations/supabase/client';

interface NotificationSettingsProps {
  className?: string;
}

const NotificationSettings: FC<NotificationSettingsProps> = ({ className }) => {
  const {
    isSupported,
    isSubscribed,
    permission,
    subscribe,
    unsubscribe,
    showNotification
  } = usePushNotifications();

  const lastNotifiedRef = useRef<string | null>(null);

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const sendTestNotification = () => {
    showNotification('Test Notifikasi', {
      body: 'Ini adalah test notifikasi dari AREXANS TOOLS!',
      tag: 'test-notification'
    });
  };

  // Listen for new orders in realtime (admin only)
  useEffect(() => {
    if (!isSubscribed || permission !== 'granted') return;

    const channel = supabase
      .channel('admin-order-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
        },
        (payload) => {
          const tx = payload.new as any;
          if (tx && tx.id !== lastNotifiedRef.current) {
            lastNotifiedRef.current = tx.id;
            const amount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(tx.total_amount || 0);
            showNotification('🛒 Orderan Baru Masuk!', {
              body: `${tx.customer_name} - ${tx.package_name} (${tx.package_duration} hari) - ${amount}`,
              tag: `order-${tx.transaction_id}`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
        },
        (payload) => {
          const tx = payload.new as any;
          const oldTx = payload.old as any;
          if (tx && oldTx && oldTx.status === 'pending' && (tx.status === 'claimable' || tx.status === 'paid')) {
            showNotification('💰 Pembayaran Diterima!', {
              body: `${tx.customer_name} telah membayar - ${tx.package_name}`,
              tag: `payment-${tx.transaction_id}`,
            });
          }
          if (tx && oldTx && oldTx.status === 'claimable' && tx.status === 'claimed') {
            showNotification('🎉 Key Diklaim!', {
              body: `${tx.customer_name} telah mengklaim key ${tx.package_name}`,
              tag: `claim-${tx.transaction_id}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSubscribed, permission, showNotification]);

  if (!isSupported) {
    return (
      <Card className={`glass-card border-yellow-500/30 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-yellow-400">
            <BellOff className="w-5 h-5" />
            <div>
              <p className="font-medium">Push Notification Tidak Didukung</p>
              <p className="text-xs text-muted-foreground">
                Browser ini tidak mendukung push notification. Gunakan Chrome atau Firefox.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`glass-card ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-primary" />
          Notifikasi Orderan (Owner Only)
        </CardTitle>
        <CardDescription className="text-xs">
          Terima notifikasi saat ada orderan baru, pembayaran masuk, atau key diklaim
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Permission Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            {permission === 'granted' ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : permission === 'denied' ? (
              <X className="w-4 h-4 text-red-500" />
            ) : (
              <Bell className="w-4 h-4 text-yellow-500" />
            )}
            <span className="text-sm">
              Status Izin: {
                permission === 'granted' ? 'Diizinkan' :
                permission === 'denied' ? 'Ditolak' :
                'Belum Diminta'
              }
            </span>
          </div>
        </div>

        {/* Toggle Subscription */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className={`w-5 h-5 ${isSubscribed ? 'text-primary' : 'text-muted-foreground'}`} />
            <div>
              <Label className="font-medium">Push Notification</Label>
              <p className="text-xs text-muted-foreground">
                {isSubscribed ? 'Aktif - Anda akan menerima notifikasi orderan' : 'Nonaktif'}
              </p>
            </div>
          </div>
          <Switch
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={permission === 'denied'}
          />
        </div>

        {/* Notification Types Info */}
        {isSubscribed && (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 space-y-1">
            <p className="text-xs font-medium text-primary">Notifikasi yang akan diterima:</p>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              <li>🛒 Orderan baru masuk</li>
              <li>💰 Pembayaran berhasil diterima</li>
              <li>🎉 Key diklaim oleh pengguna</li>
            </ul>
          </div>
        )}

        {/* Test Button */}
        {isSubscribed && (
          <Button
            variant="outline"
            size="sm"
            onClick={sendTestNotification}
            className="w-full"
          >
            <Bell className="w-4 h-4 mr-2" />
            Kirim Test Notifikasi
          </Button>
        )}

        {/* Instructions for denied permission */}
        {permission === 'denied' && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <p className="text-xs text-destructive">
              Izin notifikasi ditolak. Untuk mengaktifkan:
            </p>
            <ol className="text-xs text-muted-foreground mt-2 space-y-1">
              <li>1. Klik ikon gembok/info di address bar</li>
              <li>2. Cari pengaturan "Notifications"</li>
              <li>3. Ubah ke "Allow" dan refresh halaman</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;
