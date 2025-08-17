// Database entity types
export interface User {
  id: string;
  name: string;
  email: string;
  image_url?: string;
  timezone: string;
  created_at: Date;
  updated_at?: Date;
}

export interface Household {
  id: string;
  name: string;
  owner_id: string;
  created_at: Date;
  updated_at?: Date;
}

export type HouseholdRole = 'owner' | 'member' | 'sitter';

export interface HouseholdMember {
  user_id: string;
  household_id: string;
  role: HouseholdRole;
  access_expires_at?: Date;
  invited_email?: string;
  created_at: Date;
}

export interface Pet {
  id: string;
  household_id: string;
  name: string;
  species: string;
  birthdate?: Date;
  image_url?: string;
  weight_kg?: number;
  created_at: Date;
  updated_at?: Date;
}

export interface DosageUnit {
  id: string;
  name: string;
}

export type ScheduleUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

export interface Medication {
  id: string;
  pet_id: string;
  name: string;
  dosage_amount: number;
  dosage_unit_id: string;
  interval_qty: number;
  interval_unit: ScheduleUnit;
  times_of_day?: string[]; // TIME[] as strings
  byweekday?: number[]; // SMALLINT[] for days of week (0=Monday, 6=Sunday)
  prn: boolean;
  start_date: Date;
  end_date?: Date;
  notes?: string;
  active: boolean;
  created_at: Date;
  updated_at?: Date;
}

export type DoseStatus = 'due' | 'taken' | 'skipped';

export interface MedicationDoseEvent {
  id: string;
  medication_id: string;
  scheduled_time: Date;
  status: DoseStatus;
  taken_log_id?: string;
}

export interface MedicationLog {
  id: string;
  medication_id: string;
  administering_user_id: string;
  administration_time: Date;
  time_logged: Date;
  amount_given?: number;
  dosage_unit_id?: string;
  note?: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  device_label?: string;
  enabled: boolean;
  created_at: Date;
}

// API request/response types
export interface CreateHouseholdRequest {
  name: string;
}

export interface InviteMemberRequest {
  email: string;
  role: HouseholdRole;
  access_expires_at?: string; // ISO date string
}

export interface CreatePetRequest {
  name: string;
  species: string;
  birthdate?: string; // ISO date string
  weight_kg?: number;
}

export interface CreateMedicationRequest {
  pet_id: string;
  name: string;
  dosage_amount: number;
  dosage_unit_id: string;
  interval_qty: number;
  interval_unit: ScheduleUnit;
  times_of_day?: string[];
  byweekday?: number[];
  prn: boolean;
  start_date: string; // ISO date string
  end_date?: string; // ISO date string
  notes?: string;
}

export interface LogMedicationRequest {
  administration_time: string; // ISO date string
  amount_given?: number;
  dosage_unit_id?: string;
  note?: string;
}

export interface AgendaRequest {
  household_id: string;
  start_date: string; // ISO date string
  end_date: string; // ISO date string
}

export interface AgendaItem {
  id: string;
  scheduled_time: Date;
  status: DoseStatus;
  medication: {
    id: string;
    name: string;
    dosage_amount: number;
    dosage_unit: string;
    notes?: string;
  };
  pet: {
    id: string;
    name: string;
    species: string;
  };
}

export interface PushSubscriptionRequest {
  endpoint: string;
  p256dh: string;
  auth: string;
  device_label?: string;
}

// Extended types with relationships
export interface HouseholdWithMembers extends Household {
  members: (HouseholdMember & { user: User })[];
  pets: Pet[];
}

export interface PetWithMedications extends Pet {
  medications: Medication[];
}

export interface MedicationWithDetails extends Medication {
  pet: Pet;
  dosage_unit: DosageUnit;
  dose_events: MedicationDoseEvent[];
}

// Auth types
export interface GoogleAuthRequest {
  id_token: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  households: HouseholdWithMembers[];
}

// Error types
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}
