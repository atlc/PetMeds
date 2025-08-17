import { Router, Request, Response } from 'express';
import { pool } from '../db/connection';
import { CreateHouseholdRequest, InviteMemberRequest, HouseholdWithMembers } from '../types';
import { createApiError, ForbiddenError, NotFoundError } from '../middleware/errorHandler';

const router = Router();

// Get user's households
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw createApiError('User not authenticated', 401);
    }

    const result = await pool.query(`
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
    `, [req.user.id]);

    res.json({ households: result.rows });
  } catch (error) {
    console.error('Get households error:', error);
    
    if (error instanceof Error && 'statusCode' in error) {
      return res.status((error as any).statusCode).json({
        error: (error as any).error,
        message: (error as any).message
      });
    }

    res.status(500).json({
      error: 'Failed to get households',
      message: 'An error occurred while fetching households'
    });
  }
});

// Get household by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw createApiError('User not authenticated', 401);
    }

    const { id } = req.params;

    // Check if user has access to this household
    const accessResult = await pool.query(`
      SELECT role FROM household_members 
      WHERE household_id = $1 AND user_id = $2 AND (access_expires_at IS NULL OR access_expires_at > now())
    `, [id, req.user.id]);

    if (accessResult.rows.length === 0) {
      throw new ForbiddenError('Access denied to this household');
    }

    // Get household with members and pets
    const result = await pool.query(`
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
      WHERE h.id = $1
      GROUP BY h.id
    `, [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Household not found');
    }

    res.json({ household: result.rows[0] });
  } catch (error) {
    console.error('Get household error:', error);
    
    if (error instanceof ForbiddenError) {
      return res.status(403).json({
        error: 'Forbidden',
        message: error.message
      });
    }

    if (error instanceof NotFoundError) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }

    if (error instanceof Error && 'statusCode' in error) {
      return res.status((error as any).statusCode).json({
        error: (error as any).error,
        message: (error as any).message
      });
    }

    res.status(500).json({
      error: 'Failed to get household',
      message: 'An error occurred while fetching the household'
    });
  }
});

// Create new household
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw createApiError('User not authenticated', 401);
    }

    const { name }: CreateHouseholdRequest = req.body;

    if (!name || !name.trim()) {
      throw createApiError('Household name is required', 400);
    }

    // Create household
    const householdResult = await pool.query(`
      INSERT INTO households (name, owner_id)
      VALUES ($1, $2)
      RETURNING *
    `, [name.trim(), req.user.id]);

    const household = householdResult.rows[0];

    // Add user as owner
    await pool.query(`
      INSERT INTO household_members (user_id, household_id, role)
      VALUES ($1, $2, 'owner')
    `, [req.user.id, household.id]);

    res.status(201).json({ household });
  } catch (error) {
    console.error('Create household error:', error);
    
    if (error instanceof Error && 'statusCode' in error) {
      return res.status((error as any).statusCode).json({
        error: (error as any).error,
        message: (error as any).message
      });
    }

    res.status(500).json({
      error: 'Failed to create household',
      message: 'An error occurred while creating the household'
    });
  }
});

// Invite member to household
router.post('/:id/invite', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw createApiError('User not authenticated', 401);
    }

    const { id } = req.params;
    const { email, role, access_expires_at }: InviteMemberRequest = req.body;

    if (!email || !role) {
      throw createApiError('Email and role are required', 400);
    }

    // Check if user has access to this household
    const accessResult = await pool.query(`
      SELECT role FROM household_members 
      WHERE household_id = $1 AND user_id = $2 AND (access_expires_at IS NULL OR access_expires_at > now())
    `, [id, req.user.id]);

    if (accessResult.rows.length === 0) {
      throw new ForbiddenError('Access denied to this household');
    }

    // Check if user is owner or has permission to invite
    if (accessResult.rows[0].role !== 'owner') {
      throw new ForbiddenError('Only owners can invite members');
    }

    // Check if user already exists
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length > 0) {
      // User exists, add them to household
      const userId = userResult.rows[0].id;
      
      // Check if user is already a member
      const existingMember = await pool.query(
        'SELECT id FROM household_members WHERE household_id = $1 AND user_id = $2',
        [id, userId]
      );

      if (existingMember.rows.length > 0) {
        throw createApiError('User is already a member of this household', 400);
      }

      await pool.query(`
        INSERT INTO household_members (user_id, household_id, role, access_expires_at)
        VALUES ($1, $2, $3, $4)
      `, [userId, id, role, access_expires_at || null]);
    } else {
      // User doesn't exist, create invitation record
      await pool.query(`
        INSERT INTO household_members (household_id, role, invited_email, access_expires_at)
        VALUES ($1, $2, $3, $4)
      `, [id, role, email, access_expires_at || null]);
    }

    res.json({ message: 'Invitation sent successfully' });
  } catch (error) {
    console.error('Invite member error:', error);
    
    if (error instanceof ForbiddenError) {
      return res.status(403).json({
        error: 'Forbidden',
        message: error.message
      });
    }

    if (error instanceof Error && 'statusCode' in error) {
      return res.status((error as any).statusCode).json({
        error: (error as any).error,
        message: (error as any).message
      });
    }

    res.status(500).json({
      error: 'Failed to invite member',
      message: 'An error occurred while inviting the member'
    });
  }
});

// Remove member from household
router.delete('/:id/members/:userId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw createApiError('User not authenticated', 401);
    }

    const { id: householdId, userId } = req.params;

    // Check if user has access to this household
    const accessResult = await pool.query(`
      SELECT role FROM household_members 
      WHERE household_id = $1 AND user_id = $2 AND (access_expires_at IS NULL OR access_expires_at > now())
    `, [householdId, req.user.id]);

    if (accessResult.rows.length === 0) {
      throw new ForbiddenError('Access denied to this household');
    }

    // Check if user is owner or has permission to remove members
    if (accessResult.rows[0].role !== 'owner') {
      throw new ForbiddenError('Only owners can remove members');
    }

    // Check if trying to remove owner
    const memberToRemove = await pool.query(
      'SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2',
      [householdId, userId]
    );

    if (memberToRemove.rows.length === 0) {
      throw new NotFoundError('Member not found');
    }

    if (memberToRemove.rows[0].role === 'owner') {
      throw new ForbiddenError('Cannot remove the owner from a household');
    }

    // Remove member
    await pool.query(
      'DELETE FROM household_members WHERE household_id = $1 AND user_id = $2',
      [householdId, userId]
    );

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    
    if (error instanceof ForbiddenError) {
      return res.status(403).json({
        error: 'Forbidden',
        message: error.message
      });
    }

    if (error instanceof NotFoundError) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }

    if (error instanceof Error && 'statusCode' in error) {
      return res.status((error as any).statusCode).json({
        error: (error as any).error,
        message: (error as any).message
      });
    }

    res.status(500).json({
      error: 'Failed to remove member',
      message: 'An error occurred while removing the member'
    });
  }
});

export { router as householdRoutes };
