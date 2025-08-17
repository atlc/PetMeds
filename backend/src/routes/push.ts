import { Router, Request, Response } from 'express';
import { pool } from '../db/connection';
import { PushSubscriptionRequest } from '../types';
import { createApiError } from '../middleware/errorHandler';

const router = Router();

// Subscribe to push notifications
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw createApiError('User not authenticated', 401);
    }

    const { endpoint, p256dh, auth, device_label }: PushSubscriptionRequest = req.body;

    if (!endpoint || !p256dh || !auth) {
      throw createApiError('Endpoint, p256dh, and auth are required', 400);
    }

    // Check if subscription already exists
    const existingResult = await pool.query(
      'SELECT id FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
      [req.user.id, endpoint]
    );

    if (existingResult.rows.length > 0) {
      // Update existing subscription
      await pool.query(`
        UPDATE push_subscriptions 
        SET p256dh = $1, auth = $2, device_label = $3, enabled = true, updated_at = now()
        WHERE user_id = $4 AND endpoint = $5
      `, [p256dh, auth, device_label || null, req.user.id, endpoint]);
    } else {
      // Create new subscription
      await pool.query(`
        INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, device_label)
        VALUES ($1, $2, $3, $4, $5)
      `, [req.user.id, endpoint, p256dh, auth, device_label || null]);
    }

    res.json({ message: 'Push subscription created successfully' });
  } catch (error) {
    console.error('Subscribe to push error:', error);
    
    if (error instanceof Error && 'statusCode' in error) {
      return res.status((error as any).statusCode).json({
        error: (error as any).error,
        message: (error as any).message
      });
    }

    res.status(500).json({
      error: 'Failed to subscribe to push notifications',
      message: 'An error occurred while subscribing to push notifications'
    });
  }
});

// Unsubscribe from push notifications
router.delete('/subscriptions/:endpoint', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw createApiError('User not authenticated', 401);
    }

    const { endpoint } = req.params;
    const decodedEndpoint = decodeURIComponent(endpoint);

    // Delete subscription
    await pool.query(
      'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
      [req.user.id, decodedEndpoint]
    );

    res.json({ message: 'Push subscription removed successfully' });
  } catch (error) {
    console.error('Unsubscribe from push error:', error);
    
    if (error instanceof Error && 'statusCode' in error) {
      return res.status((error as any).statusCode).json({
        error: (error as any).error,
        message: (error as any).message
      });
    }

    res.status(500).json({
      error: 'Failed to unsubscribe from push notifications',
      message: 'An error occurred while unsubscribing from push notifications'
    });
  }
});

// Get user's push subscriptions
router.get('/subscriptions', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw createApiError('User not authenticated', 401);
    }

    const result = await pool.query(
      'SELECT * FROM push_subscriptions WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    res.json({ subscriptions: result.rows });
  } catch (error) {
    console.error('Get push subscriptions error:', error);
    
    res.status(500).json({
      error: 'Failed to get push subscriptions',
      message: 'An error occurred while fetching push subscriptions'
    });
  }
});

// Toggle push notification subscription
router.patch('/subscriptions/:id/toggle', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw createApiError('User not authenticated', 401);
    }

    const { id } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      throw createApiError('Enabled field must be a boolean', 400);
    }

    // Update subscription
    const result = await pool.query(`
      UPDATE push_subscriptions 
      SET enabled = $1, updated_at = now()
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `, [enabled, id, req.user.id]);

    if (result.rows.length === 0) {
      throw createApiError('Push subscription not found', 404);
    }

    res.json({ subscription: result.rows[0] });
  } catch (error) {
    console.error('Toggle push subscription error:', error);
    
    if (error instanceof Error && 'statusCode' in error) {
      return res.status((error as any).statusCode).json({
        error: (error as any).error,
        message: (error as any).message
      });
    }

    res.status(500).json({
      error: 'Failed to toggle push subscription',
      message: 'An error occurred while toggling push subscription'
    });
  }
});

export { router as pushRoutes };
