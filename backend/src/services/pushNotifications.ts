import webpush from 'web-push';
import { pool } from '../db/connection';

// Initialize web-push with VAPID keys
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || '',
};

webpush.setVapidDetails(
  'mailto:admin@petmeds.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

export const setupPushNotifications = async () => {
  if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
    console.warn('⚠️  VAPID keys not configured. Push notifications will not work.');
    return;
  }
  console.log('✅ Push notifications service initialized');
};

export const sendPushNotification = async (
  userId: string,
  title: string,
  body: string,
  data?: any
) => {
  try {
    // Get user's push subscriptions
    const result = await pool.query(
      'SELECT * FROM push_subscriptions WHERE user_id = $1 AND enabled = true',
      [userId]
    );

    if (result.rows.length === 0) {
      console.log(`No push subscriptions found for user ${userId}`);
      return;
    }

    const payload = JSON.stringify({
      title,
      body,
      data,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'medication-reminder',
      requireInteraction: true,
    });

    // Send to all user's devices
    const sendPromises = result.rows.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload
        );
        console.log(`Push notification sent to ${subscription.device_label || 'device'}`);
      } catch (error: any) {
        console.error(`Failed to send push notification to ${subscription.device_label || 'device'}:`, error);
        
        // If subscription is invalid, remove it
        if (error.statusCode === 410) {
          await pool.query(
            'DELETE FROM push_subscriptions WHERE id = $1',
            [subscription.id]
          );
          console.log(`Removed invalid push subscription ${subscription.id}`);
        }
      }
    });

    await Promise.allSettled(sendPromises);
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};

export const sendMedicationReminder = async (
  userId: string,
  petName: string,
  medicationName: string,
  scheduledTime: Date
) => {
  const title = `Time for ${petName}'s medication`;
  const body = `${medicationName} is due now`;
  
  await sendPushNotification(userId, title, body, {
    type: 'medication-reminder',
    petName,
    medicationName,
    scheduledTime: scheduledTime.toISOString(),
  });
};

export const sendMedicationOverdue = async (
  userId: string,
  petName: string,
  medicationName: string,
  scheduledTime: Date
) => {
  const title = `${petName}'s medication is overdue`;
  const body = `${medicationName} was due at ${scheduledTime.toLocaleTimeString()}`;
  
  await sendPushNotification(userId, title, body, {
    type: 'medication-overdue',
    petName,
    medicationName,
    scheduledTime: scheduledTime.toISOString(),
  });
};
