-- PetMeds Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(128) NOT NULL,
  email VARCHAR(256) UNIQUE NOT NULL,
  image_url VARCHAR(512),
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Households table
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(128) NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Household roles enum
CREATE TYPE household_role AS ENUM ('owner', 'member', 'sitter');

-- Household members table
CREATE TABLE household_members (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  role household_role NOT NULL DEFAULT 'member',
  access_expires_at TIMESTAMPTZ,
  invited_email VARCHAR(256),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, household_id)
);

-- Pets table
CREATE TABLE pets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name VARCHAR(128) NOT NULL,
  species VARCHAR(64) NOT NULL,
  birthdate DATE,
  image_url VARCHAR(512),
  weight_kg NUMERIC(6,3),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Dosage units table
CREATE TABLE dosage_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(64) UNIQUE NOT NULL
);

-- Insert default dosage units
INSERT INTO dosage_units (name) VALUES 
  ('mg'),
  ('units (insulin)'),
  ('mL'),
  ('tsp'),
  ('tbsp'),
  ('tablets'),
  ('caplets'),
  ('pills');

-- Schedule units enum
CREATE TYPE schedule_unit AS ENUM ('minutes', 'hours', 'days', 'weeks', 'months');

-- Medications table
CREATE TABLE medications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  name VARCHAR(128) NOT NULL,
  dosage_amount NUMERIC(10,3) NOT NULL,
  dosage_unit_id UUID NOT NULL REFERENCES dosage_units(id),
  interval_qty INTEGER NOT NULL DEFAULT 1,
  interval_unit schedule_unit NOT NULL DEFAULT 'hours',
  times_of_day TIME[] DEFAULT NULL,
  byweekday SMALLINT[] DEFAULT NULL,
  prn BOOLEAN NOT NULL DEFAULT FALSE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  notes VARCHAR(2048),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Dose status enum
CREATE TYPE dose_status AS ENUM ('due', 'taken', 'skipped');

-- Medication dose events table
CREATE TABLE medication_dose_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMPTZ NOT NULL,
  status dose_status NOT NULL DEFAULT 'due',
  taken_log_id UUID,
  UNIQUE (medication_id, scheduled_time)
);

-- Medication log table
CREATE TABLE medication_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  administering_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  administration_time TIMESTAMPTZ NOT NULL,
  time_logged TIMESTAMPTZ NOT NULL DEFAULT now(),
  amount_given NUMERIC(10,3),
  dosage_unit_id UUID REFERENCES dosage_units(id),
  note VARCHAR(2048)
);

-- Push subscriptions table
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device_label TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

-- Create indexes for better performance
CREATE INDEX idx_household_members_user_id ON household_members(user_id);
CREATE INDEX idx_household_members_household_id ON household_members(household_id);
CREATE INDEX idx_pets_household_id ON pets(household_id);
CREATE INDEX idx_medications_pet_id ON medications(pet_id);
CREATE INDEX idx_medication_dose_events_medication_id ON medication_dose_events(medication_id);
CREATE INDEX idx_medication_dose_events_scheduled_time ON medication_dose_events(scheduled_time);
CREATE INDEX idx_medication_dose_events_status ON medication_dose_events(status);
CREATE INDEX idx_medication_log_medication_id ON medication_log(medication_id);
CREATE INDEX idx_medication_log_administration_time ON medication_log(administration_time);
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_households_updated_at BEFORE UPDATE ON households FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pets_updated_at BEFORE UPDATE ON pets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medications_updated_at BEFORE UPDATE ON medications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
