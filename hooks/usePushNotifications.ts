'use client';

import { useEffect, useState } from 'react';
import { componentLogger } from '@/lib/logger';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      componentLogger.error('Browser does not support notifications');
      return false;
    }

    if (!('serviceWorker' in navigator)) {
      componentLogger.error('Browser does not support service workers');
      return false;
    }

    try {
      setIsSubscribing(true);
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === 'granted') {
        await subscribeToPush();
        return true;
      }
      return false;
    } catch (error) {
      componentLogger.error({ error }, 'Error requesting notification permission');
      return false;
    } finally {
      setIsSubscribing(false);
    }
  };

  const subscribeToPush = async () => {
    try {
      // Register service worker if not already registered
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
      }

      // Get VAPID public key
      const response = await fetch('/api/push/vapid-public-key');
      if (!response.ok) {
        throw new Error('Failed to fetch VAPID public key');
      }
      const { publicKey } = await response.json();

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Send subscription to server
      const saveResponse = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save push subscription');
      }

      componentLogger.info('Push subscription successful');
    } catch (error) {
      componentLogger.error({ error }, 'Push subscription failed');
      throw error;
    }
  };

  return { permission, requestPermission, isSubscribing };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
