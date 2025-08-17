import { Router, Request, Response } from 'express';
import { pool } from '../db/connection';
import { CreatePetRequest } from '../types';
import { createApiError, NotFoundError, ForbiddenError } from '../middleware/errorHandler';

const router = Router();

// Get pets by household
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw createApiError('User not authenticated', 401);
    }

    const { household_id } = req.query;

    if (!household_id) {
      throw createApiError('Household ID is required', 400);
    }

    // Check if user has access to this household
    const accessResult = await pool.query(`
      SELECT role FROM household_members 
      WHERE household_id = $1 AND user_id = $2 AND (access_expires_at IS NULL OR access_expires_at > now())
    `, [household_id, req.user.id]);

    if (accessResult.rows.length === 0) {
      throw new ForbiddenError('Access denied to this household');
    }

    // Get pets
    const result = await pool.query(
      'SELECT * FROM pets WHERE household_id = $1 ORDER BY name',
      [household_id]
    );

    res.json({ pets: result.rows });
  } catch (error) {
    console.error('Get pets error:', error);
    
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
      error: 'Failed to get pets',
      message: 'An error occurred while fetching pets'
    });
  }
});

// Get pet by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw createApiError('User not authenticated', 401);
    }

    const { id } = req.params;

    // Get pet with household access check
    const result = await pool.query(`
      SELECT p.* FROM pets p
      INNER JOIN household_members hm ON p.household_id = hm.household_id
      WHERE p.id = $1 AND hm.user_id = $2 AND (hm.access_expires_at IS NULL OR hm.access_expires_at > now())
    `, [id, req.user.id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Pet not found or access denied');
    }

    res.json({ pet: result.rows[0] });
  } catch (error) {
    console.error('Get pet error:', error);
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to get pet',
      message: 'An error occurred while fetching the pet'
    });
  }
});

// Create new pet
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw createApiError('User not authenticated', 401);
    }

    const { name, species, birthdate, weight_kg }: CreatePetRequest = req.body;

    if (!name || !species) {
      throw createApiError('Name and species are required', 400);
    }

    // Get household_id from request body or query
    const { household_id } = req.body;
    if (!household_id) {
      throw createApiError('Household ID is required', 400);
    }

    // Check if user has access to this household
    const accessResult = await pool.query(`
      SELECT role FROM household_members 
      WHERE household_id = $1 AND user_id = $2 AND (access_expires_at IS NULL OR access_expires_at > now())
    `, [household_id, req.user.id]);

    if (accessResult.rows.length === 0) {
      throw new ForbiddenError('Access denied to this household');
    }

    // Create pet
    const result = await pool.query(`
      INSERT INTO pets (household_id, name, species, birthdate, weight_kg)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [household_id, name.trim(), species.trim(), birthdate || null, weight_kg || null]);

    res.status(201).json({ pet: result.rows[0] });
  } catch (error) {
    console.error('Create pet error:', error);
    
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
      error: 'Failed to create pet',
      message: 'An error occurred while creating the pet'
    });
  }
});

// Update pet
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw createApiError('User not authenticated', 401);
    }

    const { id } = req.params;
    const { name, species, birthdate, weight_kg }: Partial<CreatePetRequest> = req.body;

    // Check if user has access to this pet's household
    const accessResult = await pool.query(`
      SELECT p.id FROM pets p
      INNER JOIN household_members hm ON p.household_id = hm.household_id
      WHERE p.id = $1 AND hm.user_id = $2 AND (hm.access_expires_at IS NULL OR hm.access_expires_at > now())
    `, [id, req.user.id]);

    if (accessResult.rows.length === 0) {
      throw new NotFoundError('Pet not found or access denied');
    }

    // Update pet
    const result = await pool.query(`
      UPDATE pets 
      SET name = COALESCE($2, name),
          species = COALESCE($3, species),
          birthdate = $4,
          weight_kg = $5,
          updated_at = now()
      WHERE id = $1
      RETURNING *
    `, [id, name?.trim(), species?.trim(), birthdate || null, weight_kg || null]);

    res.json({ pet: result.rows[0] });
  } catch (error) {
    console.error('Update pet error:', error);
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to update pet',
      message: 'An error occurred while updating the pet'
    });
  }
});

// Delete pet
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw createApiError('User not authenticated', 401);
    }

    const { id } = req.params;

    // Check if user has access to this pet's household
    const accessResult = await pool.query(`
      SELECT p.id FROM pets p
      INNER JOIN household_members hm ON p.household_id = hm.household_id
      WHERE p.id = $1 AND hm.user_id = $2 AND (hm.access_expires_at IS NULL OR hm.access_expires_at > now())
    `, [id, req.user.id]);

    if (accessResult.rows.length === 0) {
      throw new NotFoundError('Pet not found or access denied');
    }

    // Delete pet (this will cascade to medications and dose events)
    await pool.query('DELETE FROM pets WHERE id = $1', [id]);

    res.json({ message: 'Pet deleted successfully' });
  } catch (error) {
    console.error('Delete pet error:', error);
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to delete pet',
      message: 'An error occurred while deleting the pet'
    });
  }
});

export { router as petRoutes };
