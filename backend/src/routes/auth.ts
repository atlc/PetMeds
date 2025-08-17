import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { pool } from '../db/connection';
import { User, AuthResponse, GoogleAuthRequest } from '../types';
import { createApiError } from '../middleware/errorHandler';

const router = Router();

// Initialize Google OAuth client
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

// Google OAuth login
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { id_token }: GoogleAuthRequest = req.body;

    if (!id_token) {
      throw createApiError('ID token is required', 400);
    }

    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw createApiError('Invalid ID token', 400);
    }

    const { email, name, picture } = payload;

    // Check if user exists
    let userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    let user: User;

    if (userResult.rows.length === 0) {
      // Create new user
      const newUserResult = await pool.query(`
        INSERT INTO users (name, email, image_url, timezone)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [name, email, picture, 'UTC']);

      user = newUserResult.rows[0];
    } else {
      user = userResult.rows[0];
      
      // Update user info if needed
      if (user.name !== name || user.image_url !== picture) {
        const updateResult = await pool.query(`
          UPDATE users 
          SET name = $1, image_url = $2, updated_at = now()
          WHERE id = $3
          RETURNING *
        `, [name, picture, user.id]);
        
        user = updateResult.rows[0];
      }
    }

    // Get user's households
    const householdsResult = await pool.query(`
      SELECT 
        h.*,
        json_agg(
          json_build_object(
            'user_id', hm.user_id,
            'role', hm.role,
            'access_expires_at', hm.access_expires_at,
            'invited_email', hm.invited_email,
            'created_at', hm.created_at,
            'user', json_build_object(
              'id', u.id,
              'name', u.name,
              'email', u.email,
              'image_url', u.image_url
            )
          )
        ) as members,
        json_agg(
          json_build_object(
            'id', p.id,
            'name', p.name,
            'species', p.species,
            'birthdate', p.birthdate,
            'image_url', p.image_url,
            'weight_kg', p.weight_kg
          )
        ) FILTER (WHERE p.id IS NOT NULL) as pets
      FROM households h
      LEFT JOIN household_members hm ON h.id = hm.household_id
      LEFT JOIN users u ON hm.user_id = u.id
      LEFT JOIN pets p ON h.id = p.household_id
      WHERE hm.user_id = $1 AND (hm.access_expires_at IS NULL OR hm.access_expires_at > now())
      GROUP BY h.id
    `, [user.id]);

    // Generate JWT token
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const response: AuthResponse = {
      user,
      token,
      households: householdsResult.rows
    };

    res.json(response);
  } catch (error) {
    console.error('Google auth error:', error);
    
    if (error instanceof Error && 'statusCode' in error) {
      return res.status((error as any).statusCode).json({
        error: (error as any).error,
        message: (error as any).message
      });
    }

    res.status(500).json({
      error: 'Authentication failed',
      message: 'An error occurred during authentication'
    });
  }
});

// Get current user
router.get('/me', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw createApiError('User not authenticated', 401);
    }

    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      throw createApiError('User not found', 404);
    }

    res.json({ user: userResult.rows[0] });
  } catch (error) {
    console.error('Get current user error:', error);
    
    if (error instanceof Error && 'statusCode' in error) {
      return res.status((error as any).statusCode).json({
        error: (error as any).error,
        message: (error as any).message
      });
    }

    res.status(500).json({
      error: 'Failed to get user',
      message: 'An error occurred while fetching user data'
    });
  }
});

// Logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    // In a real application, you might want to blacklist the token
    // For now, we'll just return a success message
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'An error occurred during logout'
    });
  }
});

export { router as authRoutes };
