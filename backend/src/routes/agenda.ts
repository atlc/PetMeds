import { Router, Request, Response } from 'express';
import { pool } from '../db/connection';
import { AgendaRequest } from '../types';
import { createApiError, ForbiddenError } from '../middleware/errorHandler';

const router = Router();

// Get agenda for a household
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw createApiError('User not authenticated', 401);
    }

    const { household_id, start_date, end_date }: AgendaRequest = req.body;

    if (!household_id || !start_date || !end_date) {
      throw createApiError('Household ID, start date, and end date are required', 400);
    }

    // Check if user has access to this household
    const accessResult = await pool.query(`
      SELECT role FROM household_members 
      WHERE household_id = $1 AND user_id = $2 AND (access_expires_at IS NULL OR access_expires_at > now())
    `, [household_id, req.user.id]);

    if (accessResult.rows.length === 0) {
      throw new ForbiddenError('Access denied to this household');
    }

    // Get dose events with medication and pet details
    const result = await pool.query(`
      SELECT 
        mde.id,
        mde.scheduled_time,
        mde.status,
        m.name as medication_name,
        m.dosage_amount,
        m.notes as medication_notes,
        du.name as dosage_unit,
        p.name as pet_name,
        p.species as pet_species
      FROM medication_dose_events mde
      INNER JOIN medications m ON mde.medication_id = m.id
      INNER JOIN dosage_units du ON m.dosage_unit_id = du.id
      INNER JOIN pets p ON m.pet_id = p.id
      INNER JOIN household_members hm ON p.household_id = hm.household_id
      WHERE hm.household_id = $1 
        AND hm.user_id = $2 
        AND (hm.access_expires_at IS NULL OR hm.access_expires_at > now())
        AND mde.scheduled_time >= $3 
        AND mde.scheduled_time <= $4
        AND m.active = true
      ORDER BY mde.scheduled_time
    `, [household_id, req.user.id, start_date, end_date]);

    // Transform the data to match the expected format
    const items = result.rows.map(row => ({
      id: row.id,
      scheduled_time: row.scheduled_time,
      status: row.status,
      medication: {
        id: row.medication_id,
        name: row.medication_name,
        dosage_amount: row.dosage_amount,
        dosage_unit: row.dosage_unit,
        notes: row.medication_notes
      },
      pet: {
        id: row.pet_id,
        name: row.pet_name,
        species: row.pet_species
      }
    }));

    res.json({ items });
  } catch (error) {
    console.error('Get agenda error:', error);
    
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
      error: 'Failed to get agenda',
      message: 'An error occurred while fetching the agenda'
    });
  }
});

// Get today's agenda for a household
router.get('/today/:householdId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw createApiError('User not authenticated', 401);
    }

    const { householdId } = req.params;

    // Check if user has access to this household
    const accessResult = await pool.query(`
      SELECT role FROM household_members 
      WHERE household_id = $1 AND user_id = $2 AND (access_expires_at IS NULL OR access_expires_at > now())
    `, [householdId, req.user.id]);

    if (accessResult.rows.length === 0) {
      throw new ForbiddenError('Access denied to this household');
    }

    // Get today's dose events
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

    const result = await pool.query(`
      SELECT 
        mde.id,
        mde.scheduled_time,
        mde.status,
        m.name as medication_name,
        m.dosage_amount,
        m.notes as medication_notes,
        du.name as dosage_unit,
        p.name as pet_name,
        p.species as pet_species
      FROM medication_dose_events mde
      INNER JOIN medications m ON mde.medication_id = m.id
      INNER JOIN dosage_units du ON m.dosage_unit_id = du.id
      INNER JOIN pets p ON m.pet_id = p.id
      INNER JOIN household_members hm ON p.household_id = hm.household_id
      WHERE hm.household_id = $1 
        AND hm.user_id = $2 
        AND (hm.access_expires_at IS NULL OR hm.access_expires_at > now())
        AND mde.scheduled_time >= $3 
        AND mde.scheduled_time <= $4
        AND m.active = true
      ORDER BY mde.scheduled_time
    `, [householdId, req.user.id, startOfDay, endOfDay]);

    // Transform the data
    const items = result.rows.map(row => ({
      id: row.id,
      scheduled_time: row.scheduled_time,
      status: row.status,
      medication: {
        id: row.medication_id,
        name: row.medication_name,
        dosage_amount: row.dosage_amount,
        dosage_unit: row.dosage_unit,
        notes: row.medication_notes
      },
      pet: {
        id: row.pet_id,
        name: row.pet_name,
        species: row.pet_species
      }
    }));

    res.json({ items });
  } catch (error) {
    console.error('Get today agenda error:', error);
    
    if (error instanceof ForbiddenError) {
      return res.status(403).json({
        error: 'Forbidden',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to get today agenda',
      message: 'An error occurred while fetching today agenda'
    });
  }
});

// Snooze a dose (reschedule for 15 minutes later)
router.post('/:id/snooze', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw createApiError('User not authenticated', 401);
    }

    const { id } = req.params;

    // Check if user has access to this dose event
    const accessResult = await pool.query(`
      SELECT mde.id FROM medication_dose_events mde
      INNER JOIN medications m ON mde.medication_id = m.id
      INNER JOIN pets p ON m.pet_id = p.id
      INNER JOIN household_members hm ON p.household_id = hm.household_id
      WHERE mde.id = $1 AND hm.user_id = $2 AND (hm.access_expires_at IS NULL OR hm.access_expires_at > now())
    `, [id, req.user.id]);

    if (accessResult.rows.length === 0) {
      throw new ForbiddenError('Access denied to this dose event');
    }

    // Update scheduled time to 15 minutes later
    const result = await pool.query(`
      UPDATE medication_dose_events 
      SET scheduled_time = scheduled_time + INTERVAL '15 minutes'
      WHERE id = $1
      RETURNING *
    `, [id]);

    res.json({ dose_event: result.rows[0] });
  } catch (error) {
    console.error('Snooze dose error:', error);
    
    if (error instanceof ForbiddenError) {
      return res.status(403).json({
        error: 'Forbidden',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to snooze dose',
      message: 'An error occurred while snoozing the dose'
    });
  }
});

export { router as agendaRoutes };
