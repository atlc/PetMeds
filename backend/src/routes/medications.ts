import { Router, Request, Response } from 'express';
import { pool } from '../db/connection';
import { CreateMedicationRequest, LogMedicationRequest } from '../types';
import { createApiError, NotFoundError, ForbiddenError } from '../middleware/errorHandler';

const router = Router();

// Get medications by pet
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw createApiError('User not authenticated', 401);
    }

    const { pet_id } = req.query;

    if (!pet_id) {
      throw createApiError('Pet ID is required', 400);
    }

    // Check if user has access to this pet's household
    const accessResult = await pool.query(`
      SELECT p.id FROM pets p
      INNER JOIN household_members hm ON p.household_id = hm.household_id
      WHERE p.id = $1 AND hm.user_id = $2 AND (hm.access_expires_at IS NULL OR hm.access_expires_at > now())
    `, [pet_id, req.user.id]);

    if (accessResult.rows.length === 0) {
      throw new ForbiddenError('Access denied to this pet');
    }

    // Get medications with dosage unit
    const result = await pool.query(`
      SELECT m.*, du.name as dosage_unit_name
      FROM medications m
      INNER JOIN dosage_units du ON m.dosage_unit_id = du.id
      WHERE m.pet_id = $1
      ORDER BY m.name
    `, [pet_id]);

    res.json({ medications: result.rows });
  } catch (error) {
    console.error('Get medications error:', error);
    
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
      error: 'Failed to get medications',
      message: 'An error occurred while fetching medications'
    });
  }
});

// Get medication by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw createApiError('User not authenticated', 401);
    }

    const { id } = req.params;

    // Get medication with access check
    const result = await pool.query(`
      SELECT m.*, du.name as dosage_unit_name, p.name as pet_name
      FROM medications m
      INNER JOIN dosage_units du ON m.dosage_unit_id = du.id
      INNER JOIN pets p ON m.pet_id = p.id
      INNER JOIN household_members hm ON p.household_id = hm.household_id
      WHERE m.id = $1 AND hm.user_id = $2 AND (hm.access_expires_at IS NULL OR hm.access_expires_at > now())
    `, [id, req.user.id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Medication not found or access denied');
    }

    res.json({ medication: result.rows[0] });
  } catch (error) {
    console.error('Get medication error:', error);
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to get medication',
      message: 'An error occurred while fetching the medication'
    });
  }
});

// Create new medication
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw createApiError('User not authenticated', 401);
    }

    const {
      pet_id,
      name,
      dosage_amount,
      dosage_unit_id,
      interval_qty,
      interval_unit,
      times_of_day,
      byweekday,
      prn,
      start_date,
      end_date,
      notes
    }: CreateMedicationRequest = req.body;

    if (!pet_id || !name || !dosage_amount || !dosage_unit_id || !interval_qty || !interval_unit) {
      throw createApiError('Required fields are missing', 400);
    }

    // Check if user has access to this pet's household
    const accessResult = await pool.query(`
      SELECT p.id FROM pets p
      INNER JOIN household_members hm ON p.household_id = hm.household_id
      WHERE p.id = $1 AND hm.user_id = $2 AND (hm.access_expires_at IS NULL OR hm.access_expires_at > now())
    `, [pet_id, req.user.id]);

    if (accessResult.rows.length === 0) {
      throw new ForbiddenError('Access denied to this pet');
    }

    // Create medication
    const result = await pool.query(`
      INSERT INTO medications (
        pet_id, name, dosage_amount, dosage_unit_id, interval_qty, interval_unit,
        times_of_day, byweekday, prn, start_date, end_date, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      pet_id, name.trim(), dosage_amount, dosage_unit_id, interval_qty, interval_unit,
      times_of_day || null, byweekday || null, prn || false, start_date, end_date || null, notes || null
    ]);

    const medication = result.rows[0];

    // TODO: Generate dose events for this medication
    // This would be handled by a separate service

    res.status(201).json({ medication });
  } catch (error) {
    console.error('Create medication error:', error);
    
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
      error: 'Failed to create medication',
      message: 'An error occurred while creating the medication'
    });
  }
});

// Update medication
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw createApiError('User not authenticated', 401);
    }

    const { id } = req.params;
    const updateData: Partial<CreateMedicationRequest> = req.body;

    // Check if user has access to this medication
    const accessResult = await pool.query(`
      SELECT m.id FROM medications m
      INNER JOIN pets p ON m.pet_id = p.id
      INNER JOIN household_members hm ON p.household_id = hm.household_id
      WHERE m.id = $1 AND hm.user_id = $2 AND (hm.access_expires_at IS NULL OR hm.access_expires_at > now())
    `, [id, req.user.id]);

    if (accessResult.rows.length === 0) {
      throw new NotFoundError('Medication not found or access denied');
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (updateData.name !== undefined) {
      updateFields.push(`name = $${++paramCount}`);
      updateValues.push(updateData.name.trim());
    }
    if (updateData.dosage_amount !== undefined) {
      updateFields.push(`dosage_amount = $${++paramCount}`);
      updateValues.push(updateData.dosage_amount);
    }
    if (updateData.dosage_unit_id !== undefined) {
      updateFields.push(`dosage_unit_id = $${++paramCount}`);
      updateValues.push(updateData.dosage_unit_id);
    }
    if (updateData.interval_qty !== undefined) {
      updateFields.push(`interval_qty = $${++paramCount}`);
      updateValues.push(updateData.interval_qty);
    }
    if (updateData.interval_unit !== undefined) {
      updateFields.push(`interval_unit = $${++paramCount}`);
      updateValues.push(updateData.interval_unit);
    }
    if (updateData.times_of_day !== undefined) {
      updateFields.push(`times_of_day = $${++paramCount}`);
      updateValues.push(updateData.times_of_day);
    }
    if (updateData.byweekday !== undefined) {
      updateFields.push(`byweekday = $${++paramCount}`);
      updateValues.push(updateData.byweekday);
    }
    if (updateData.prn !== undefined) {
      updateFields.push(`prn = $${++paramCount}`);
      updateValues.push(updateData.prn);
    }
    if (updateData.start_date !== undefined) {
      updateFields.push(`start_date = $${++paramCount}`);
      updateValues.push(updateData.start_date);
    }
    if (updateData.end_date !== undefined) {
      updateFields.push(`end_date = $${++paramCount}`);
      updateValues.push(updateData.end_date);
    }
    if (updateData.notes !== undefined) {
      updateFields.push(`notes = $${++paramCount}`);
      updateValues.push(updateData.notes);
    }
    if (updateData.active !== undefined) {
      updateFields.push(`active = $${++paramCount}`);
      updateValues.push(updateData.active);
    }

    if (updateFields.length === 0) {
      throw createApiError('No fields to update', 400);
    }

    updateFields.push(`updated_at = now()`);
    updateValues.unshift(id);

    const result = await pool.query(`
      UPDATE medications 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING *
    `, updateValues);

    res.json({ medication: result.rows[0] });
  } catch (error) {
    console.error('Update medication error:', error);
    
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
      error: 'Failed to update medication',
      message: 'An error occurred while updating the medication'
    });
  }
});

// Delete medication
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw createApiError('User not authenticated', 401);
    }

    const { id } = req.params;

    // Check if user has access to this medication
    const accessResult = await pool.query(`
      SELECT m.id FROM medications m
      INNER JOIN pets p ON m.pet_id = p.id
      INNER JOIN household_members hm ON p.household_id = hm.household_id
      WHERE m.id = $1 AND hm.user_id = $2 AND (hm.access_expires_at IS NULL OR hm.access_expires_at > now())
    `, [id, req.user.id]);

    if (accessResult.rows.length === 0) {
      throw new NotFoundError('Medication not found or access denied');
    }

    // Delete medication (this will cascade to dose events)
    await pool.query('DELETE FROM medications WHERE id = $1', [id]);

    res.json({ message: 'Medication deleted successfully' });
  } catch (error) {
    console.error('Delete medication error:', error);
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to delete medication',
      message: 'An error occurred while deleting the medication'
    });
  }
});

// Log medication dose
router.post('/:id/log', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw createApiError('User not authenticated', 401);
    }

    const { id } = req.params;
    const { administration_time, amount_given, dosage_unit_id, note }: LogMedicationRequest = req.body;

    if (!administration_time) {
      throw createApiError('Administration time is required', 400);
    }

    // Check if user has access to this medication
    const accessResult = await pool.query(`
      SELECT m.id FROM medications m
      INNER JOIN pets p ON m.pet_id = p.id
      INNER JOIN household_members hm ON p.household_id = hm.household_id
      WHERE m.id = $1 AND hm.user_id = $2 AND (hm.access_expires_at IS NULL OR hm.access_expires_at > now())
    `, [id, req.user.id]);

    if (accessResult.rows.length === 0) {
      throw new NotFoundError('Medication not found or access denied');
    }

    // Create medication log
    const logResult = await pool.query(`
      INSERT INTO medication_log (
        medication_id, administering_user_id, administration_time, amount_given, dosage_unit_id, note
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      id, req.user.id, administration_time, amount_given || null, dosage_unit_id || null, note || null
    ]);

    const log = logResult.rows[0];

    // Update dose event status to 'taken'
    await pool.query(`
      UPDATE medication_dose_events 
      SET status = 'taken', taken_log_id = $1
      WHERE medication_id = $2 AND scheduled_time::date = $3::date
      AND status = 'due'
      LIMIT 1
    `, [log.id, id, administration_time]);

    res.status(201).json({ log });
  } catch (error) {
    console.error('Log medication error:', error);
    
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
      error: 'Failed to log medication',
      message: 'An error occurred while logging the medication'
    });
  }
});

export { router as medicationRoutes };
