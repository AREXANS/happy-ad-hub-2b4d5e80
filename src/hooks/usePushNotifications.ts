import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Check if current device is a developer device (has Developer role key)
export const checkIsDeveloperDevice = async (): Promise<boolean> => {
  try {
    const { data: settingData } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'license_keys')
      .maybeSingle();

    if (!settingData?.value) return false;

    const keys = JSON.parse(settingData.value);
    const deviceId = localStorage.getItem('admin_device_id');
    
    // Check if any developer key has this device's HWID registered
    return keys.some((k: any) => 
      k.role?.toLowerCase() === 'developer' && 
      (k.hwids?.includes(deviceId) || k.robloxUsers?.some((u: any) => u.hwid === deviceId))
    );
  } catch {
    return false;
  }
};

// Check if device is an approved admin device (which typically means developer)
export const isAdminDevice = (): boolean => {
  return localStorage.getItem('admin_logged_in') === 'true';
};

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscriptionJSON | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      checkExistingSubscription();
    }
  }, []);

  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSub = await (registration as any).pushManager.getSubscription();
      if (existingSub) {
        setSubscription(existingSub.toJSON());
        setIsSubscribed(true);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        title: 'Tidak Didukung',
        description: 'Browser ini tidak mendukung push notification',
        variant: 'destructive'
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast({
          title: 'Izin Diberikan',
          description: 'Anda akan menerima notifikasi pembayaran'
        });
        return true;
      } else if (result === 'denied') {
        toast({
          title: 'Izin Ditolak',
          description: 'Aktifkan notifikasi di pengaturan browser',
          variant: 'destructive'
        });
      }
      return false;
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    }
  };

  const subscribe = async (): Promise<boolean> => {
    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    try {
      // Register service worker if not already registered
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
      }

      // For demo purposes, we'll use browser notifications directly
      // In production, you'd use VAPID keys and a push service
      setIsSubscribed(true);
      
      // Save subscription status to localStorage
      localStorage.setItem('push_notifications_enabled', 'true');
      
      toast({
        title: 'Berhasil',
        description: 'Notifikasi push berhasil diaktifkan'
      });
      
      return true;
    } catch (error) {
      console.error('Error subscribing:', error);
      toast({
        title: 'Gagal',
        description: 'Gagal mengaktifkan notifikasi push',
        variant: 'destructive'
      });
      return false;
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSub = await (registration as any).pushManager.getSubscription();
      if (existingSub) {
        await existingSub.unsubscribe();
      }
      
      setIsSubscribed(false);
      setSubscription(null);
      localStorage.removeItem('push_notifications_enabled');
      
      toast({
        title: 'Berhasil',
        description: 'Notifikasi push dinonaktifkan'
      });
      
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      return false;
    }
  };

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (permission !== 'granted') {
      console.log('Notification permission not granted');
      return;
    }

    // Try to use service worker notification first (works in background)
    navigator.serviceWorker.ready.then((registration) => {
      // Use any to bypass TypeScript strict checking for vibrate
      const swOptions: any = {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [200, 100, 200],
        requireInteraction: true,
        ...options
      };
      registration.showNotification(title, swOptions);
    }).catch(() => {
      // Fallback to regular notification
      new Notification(title, {
        icon: '/favicon.ico',
        ...options
      });
    });
  }, [permission]);

  // Check localStorage for persisted subscription
  useEffect(() => {
    const enabled = localStorage.getItem('push_notifications_enabled');
    if (enabled === 'true' && permission === 'granted') {
      setIsSubscribed(true);
    }
  }, [permission]);

  return {
    isSupported,
    isSubscribed,
    permission,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification
  };
};
