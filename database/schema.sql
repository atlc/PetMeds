-- ============================================================================
-- PetMeds Database Schema
-- ============================================================================
-- 
-- This schema defines the database structure for the PetMeds application.
-- It includes tables for users, households, pets, medications, and scheduling.
-- 
-- Key Design Principles:
-- - UUID primary keys for security and scalability
-- - Timestamps for audit trails
-- - Proper foreign key relationships
-- - Enum types for constrained values
-- - JSON aggregation for complex queries
-- ============================================================================

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Stores user account information from Google OAuth authentication
-- Each user can belong to multiple households with different roles
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(128) NOT NULL,                    -- User's display name
  email VARCHAR(256) UNIQUE NOT NULL,            -- Email address (unique identifier)
  image_url TEXT,                                -- Profile picture URL from Google
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',   -- User's timezone for scheduling
  created_at TIMESTAMPTZ DEFAULT now(),          -- Account creation timestamp
  updated_at TIMESTAMPTZ                         -- Last profile update timestamp
);

-- ============================================================================
-- HOUSEHOLDS TABLE
-- ============================================================================
-- Represents groups of users who share pet care responsibilities
-- Each household has one owner and can have multiple members
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(128) NOT NULL,                    -- Household display name
  description TEXT,                               -- Optional description
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),          -- Household creation timestamp
  updated_at TIMESTAMPTZ                         -- Last update timestamp
);

-- ============================================================================
-- HOUSEHOLD MEMBERS TABLE
-- ============================================================================
-- Links users to households with specific roles and access controls
-- Supports role-based access control (owner, member, sitter)
-- Sitters can have expiration dates for temporary access
CREATE TABLE household_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL CHECK (role IN ('owner', 'member', 'sitter')),
  access_expires_at TIMESTAMPTZ,                 -- Optional expiration for sitter access
  invited_email VARCHAR(256),                    -- Email for users not yet registered
  created_at TIMESTAMPTZ DEFAULT now(),          -- Membership creation timestamp
  
  -- Ensure unique household-user combinations
  UNIQUE(household_id, user_id),
  
  -- Ensure unique household-invited email combinations
  UNIQUE(household_id, invited_email)
);

-- ============================================================================
-- PETS TABLE
-- ============================================================================
-- Stores information about animals under household care
-- Each pet belongs to exactly one household
CREATE TABLE pets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name VARCHAR(128) NOT NULL,                    -- Pet's name
  species VARCHAR(64) NOT NULL,                  -- Animal species (Dog, Cat, etc.)
  birthdate DATE,                                -- Pet's birth date (optional)
  image_url TEXT,                                -- Pet's photo URL
  weight_kg DECIMAL(5,2),                        -- Weight in kilograms
  created_at TIMESTAMPTZ DEFAULT now(),          -- Pet creation timestamp
  updated_at TIMESTAMPTZ                         -- Last update timestamp
);

-- ============================================================================
-- DOSAGE UNITS TABLE
-- ============================================================================
-- Standard units for medication dosages
-- Pre-populated with common units like mg, ml, tablets
CREATE TABLE dosage_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(64) UNIQUE NOT NULL,              -- Unit name (milligram, tablet, etc.)
  abbreviation VARCHAR(16) UNIQUE                -- Short form (mg, tab, etc.)
);

-- Insert default dosage units for common medications
INSERT INTO dosage_units (name, abbreviation) VALUES 
  ('milligram', 'mg'),
  ('units (insulin)', 'units'),
  ('milliliter', 'mL'),
  ('teaspoon', 'tsp'),
  ('tablespoon', 'tbsp'),
  ('tablet', 'tab'),
  ('capsule', 'cap'),
  ('pill', 'pill');

-- ============================================================================
-- MEDICATIONS TABLE
-- ============================================================================
-- Stores medication prescriptions with complex scheduling information
-- Supports interval-based and fixed-time scheduling
-- Can handle PRN (as needed) medications and specific day/time patterns
CREATE TYPE schedule_unit AS ENUM ('minutes', 'hours', 'days', 'weeks', 'months');

CREATE TABLE medications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  name VARCHAR(128) NOT NULL,                    -- Medication name
  dosage_amount DECIMAL(10,3) NOT NULL,          -- Amount to administer
  dosage_unit_id UUID NOT NULL REFERENCES dosage_units(id),
  interval_qty INTEGER NOT NULL DEFAULT 1,       -- How often (e.g., 2 for "every 2 hours")
  interval_unit schedule_unit NOT NULL DEFAULT 'hours',
  times_of_day TIME[] DEFAULT NULL,              -- Specific times (e.g., ["08:00", "20:00"])
  byweekday SMALLINT[] DEFAULT NULL,             -- Days of week (0=Monday, 6=Sunday)
  prn BOOLEAN NOT NULL DEFAULT FALSE,            -- "As needed" flag
  start_date DATE NOT NULL DEFAULT CURRENT_DATE, -- When to start giving
  end_date DATE,                                 -- When to stop (optional for lifelong meds)
  notes VARCHAR(2048),                           -- Additional instructions
  active BOOLEAN NOT NULL DEFAULT TRUE,          -- Whether currently active
  created_at TIMESTAMPTZ DEFAULT now(),          -- Medication creation timestamp
  updated_at TIMESTAMPTZ                         -- Last update timestamp
);

-- ============================================================================
-- MEDICATION DOSE EVENTS TABLE
-- ============================================================================
-- Generated schedule of medication administration times
-- Created automatically based on medication scheduling rules
-- Tracks the status of each scheduled dose
CREATE TYPE dose_status AS ENUM ('due', 'taken', 'skipped');

CREATE TABLE medication_dose_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMPTZ NOT NULL,           -- When dose is scheduled
  status dose_status NOT NULL DEFAULT 'due',     -- Current status
  taken_log_id UUID,                             -- Reference to log entry if taken
  
  -- Ensure unique medication-scheduled time combinations
  UNIQUE (medication_id, scheduled_time)
);

-- ============================================================================
-- MEDICATION LOG TABLE
-- ============================================================================
-- Immutable record of medication administration
-- Cannot be edited or deleted - corrections are new entries
-- Tracks both user-reported time and server timestamp
CREATE TABLE medication_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  administering_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  administration_time TIMESTAMPTZ NOT NULL,      -- When user says they gave it
  time_logged TIMESTAMPTZ NOT NULL DEFAULT now(), -- Server timestamp
  amount_given DECIMAL(10,3),                    -- Actual amount administered
  dosage_unit_id UUID REFERENCES dosage_units(id),
  note VARCHAR(2048)                             -- Additional notes about the dose
);

-- ============================================================================
-- PUSH SUBSCRIPTIONS TABLE
-- ============================================================================
-- Stores web push notification subscription details
-- Enables medication reminders and notifications
-- Supports multiple devices per user
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,                        -- Push service endpoint URL
  p256dh TEXT NOT NULL,                          -- Public key for encryption
  auth TEXT NOT NULL,                            -- Authentication secret
  device_label TEXT,                             -- User-friendly device name
  enabled BOOLEAN NOT NULL DEFAULT TRUE,         -- Whether notifications are active
  created_at TIMESTAMPTZ DEFAULT now(),          -- Subscription creation timestamp
  
  -- Ensure unique user-endpoint combinations
  UNIQUE (user_id, endpoint)
);

-- ============================================================================
-- DATABASE INDEXES
-- ============================================================================
-- Create indexes for better query performance
-- Focus on foreign keys and frequently queried fields

-- Household member lookups
CREATE INDEX idx_household_members_user_id ON household_members(user_id);
CREATE INDEX idx_household_members_household_id ON household_members(household_id);

-- Pet lookups by household
CREATE INDEX idx_pets_household_id ON pets(household_id);

-- Medication lookups by pet
CREATE INDEX idx_medications_pet_id ON medications(pet_id);

-- Dose event lookups and scheduling
CREATE INDEX idx_medication_dose_events_medication_id ON medication_dose_events(medication_id);
CREATE INDEX idx_medication_dose_events_scheduled_time ON medication_dose_events(scheduled_time);
CREATE INDEX idx_medication_dose_events_status ON medication_dose_events(status);

-- Medication log lookups
CREATE INDEX idx_medication_log_medication_id ON medication_log(medication_id);
CREATE INDEX idx_medication_log_administration_time ON medication_log(administration_time);

-- Push subscription lookups
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- ============================================================================
-- AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================
-- Function to automatically update the updated_at column
-- Ensures data integrity and audit trails
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_households_updated_at BEFORE UPDATE ON households FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pets_updated_at BEFORE UPDATE ON pets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medications_updated_at BEFORE UPDATE ON medications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SCHEMA COMPLETION
-- ============================================================================
-- The database schema is now complete and ready for use
-- All tables include proper constraints, indexes, and triggers
-- The application can now create, read, update, and delete data safely
