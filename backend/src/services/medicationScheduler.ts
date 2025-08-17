import cron from 'node-cron';
import { pool } from '../db/connection';
import { sendMedicationReminder, sendMedicationOverdue } from './pushNotifications';

export const setupMedicationScheduler = async () => {
  console.log('✅ Medication scheduler service initialized');
  
  // Schedule reminder check every minute
  cron.schedule('* * * * *', async () => {
    await checkAndSendReminders();
  });
  
  // Schedule overdue check every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    await checkAndSendOverdueNotifications();
  });
  
  // Schedule dose event generation daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    await generateDoseEvents();
  });
};

const checkAndSendReminders = async () => {
  try {
    const now = new Date();
    const reminderTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now
    
    // Get medications due in the next 15 minutes
    const result = await pool.query(`
      SELECT 
        mde.id,
        mde.scheduled_time,
        m.name as medication_name,
        p.name as pet_name,
        u.id as user_id,
        u.timezone
      FROM medication_dose_events mde
      INNER JOIN medications m ON mde.medication_id = m.id
      INNER JOIN pets p ON m.pet_id = p.id
      INNER JOIN household_members hm ON p.household_id = hm.household_id
      INNER JOIN users u ON hm.user_id = u.id
      WHERE mde.status = 'due'
        AND mde.scheduled_time BETWEEN $1 AND $2
        AND m.active = true
        AND (hm.access_expires_at IS NULL OR hm.access_expires_at > now())
    `, [now, reminderTime]);
    
    // Send reminders for each due medication
    for (const row of result.rows) {
      await sendMedicationReminder(
        row.user_id,
        row.pet_name,
        row.medication_name,
        row.scheduled_time
      );
    }
  } catch (error) {
    console.error('Error checking and sending reminders:', error);
  }
};

const checkAndSendOverdueNotifications = async () => {
  try {
    const now = new Date();
    const overdueThreshold = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago
    
    // Get overdue medications
    const result = await pool.query(`
      SELECT 
        mde.id,
        mde.scheduled_time,
        m.name as medication_name,
        p.name as pet_name,
        u.id as user_id
      FROM medication_dose_events mde
      INNER JOIN medications m ON mde.medication_id = m.id
      INNER JOIN pets p ON m.pet_id = p.id
      INNER JOIN household_members hm ON p.household_id = hm.household_id
      INNER JOIN users u ON hm.user_id = u.id
      WHERE mde.status = 'due'
        AND mde.scheduled_time < $1
        AND m.active = true
        AND (hm.access_expires_at IS NULL OR hm.access_expires_at > now())
    `, [overdueThreshold]);
    
    // Send overdue notifications
    for (const row of result.rows) {
      await sendMedicationOverdue(
        row.user_id,
        row.pet_name,
        row.medication_name,
        row.scheduled_time
      );
    }
  } catch (error) {
    console.error('Error checking and sending overdue notifications:', error);
  }
};

const generateDoseEvents = async () => {
  try {
    console.log('Generating dose events for the next 30 days...');
    
    // Get all active medications
    const medicationsResult = await pool.query(`
      SELECT 
        m.id,
        m.pet_id,
        m.interval_qty,
        m.interval_unit,
        m.times_of_day,
        m.byweekday,
        m.start_date,
        m.end_date
      FROM medications m
      WHERE m.active = true
    `);
    
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    
    for (const medication of medicationsResult.rows) {
      await generateDoseEventsForMedication(medication, startDate, endDate);
    }
    
    console.log('Dose event generation completed');
  } catch (error) {
    console.error('Error generating dose events:', error);
  }
};

const generateDoseEventsForMedication = async (
  medication: any,
  startDate: Date,
  endDate: Date
) => {
  try {
    const { id, interval_qty, interval_unit, times_of_day, byweekday, start_date, end_date } = medication;
    
    // Check if medication is within its active period
    const medStartDate = new Date(start_date);
    const medEndDate = end_date ? new Date(end_date) : null;
    
    if (medStartDate > endDate || (medEndDate && medEndDate < startDate)) {
      return; // Medication not active in this period
    }
    
    // Calculate the actual start date for generation
    const generationStartDate = medStartDate > startDate ? medStartDate : startDate;
    
    // Generate dose events based on schedule
    if (times_of_day && times_of_day.length > 0) {
      // Fixed times of day
      await generateFixedTimeDoseEvents(id, times_of_day, generationStartDate, endDate, byweekday);
    } else {
      // Interval-based schedule
      await generateIntervalDoseEvents(id, interval_qty, interval_unit, generationStartDate, endDate);
    }
  } catch (error) {
    console.error(`Error generating dose events for medication ${medication.id}:`, error);
  }
};

const generateFixedTimeDoseEvents = async (
  medicationId: string,
  timesOfDay: string[],
  startDate: Date,
  endDate: Date,
  byWeekday?: number[]
) => {
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    // Check if this day should have doses (byweekday filter)
    if (byWeekday && byWeekday.length > 0) {
      const dayOfWeek = currentDate.getDay();
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Monday=0, Sunday=6
      
      if (!byWeekday.includes(adjustedDay)) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }
    }
    
    // Generate dose events for each time of day
    for (const timeStr of timesOfDay) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const doseTime = new Date(currentDate);
      doseTime.setHours(hours, minutes, 0, 0);
      
      if (doseTime >= startDate && doseTime <= endDate) {
        await createDoseEventIfNotExists(medicationId, doseTime);
      }
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
};

const generateIntervalDoseEvents = async (
  medicationId: string,
  intervalQty: number,
  intervalUnit: string,
  startDate: Date,
  endDate: Date
) => {
  let currentTime = new Date(startDate);
  
  while (currentTime <= endDate) {
    await createDoseEventIfNotExists(medicationId, currentTime);
    
    // Calculate next dose time
    switch (intervalUnit) {
      case 'minutes':
        currentTime = new Date(currentTime.getTime() + intervalQty * 60 * 1000);
        break;
      case 'hours':
        currentTime = new Date(currentTime.getTime() + intervalQty * 60 * 60 * 1000);
        break;
      case 'days':
        currentTime.setDate(currentTime.getDate() + intervalQty);
        break;
      case 'weeks':
        currentTime.setDate(currentTime.getDate() + intervalQty * 7);
        break;
      case 'months':
        currentTime.setMonth(currentTime.getMonth() + intervalQty);
        break;
      default:
        currentTime.setHours(currentTime.getHours() + intervalQty);
    }
  }
};

const createDoseEventIfNotExists = async (medicationId: string, scheduledTime: Date) => {
  try {
    // Check if dose event already exists
    const existingResult = await pool.query(
      'SELECT id FROM medication_dose_events WHERE medication_id = $1 AND scheduled_time = $2',
      [medicationId, scheduledTime]
    );
    
    if (existingResult.rows.length === 0) {
      // Create new dose event
      await pool.query(`
        INSERT INTO medication_dose_events (medication_id, scheduled_time, status)
        VALUES ($1, $2, 'due')
      `, [medicationId, scheduledTime]);
    }
  } catch (error) {
    console.error(`Error creating dose event for medication ${medicationId}:`, error);
  }
};
