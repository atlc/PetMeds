/**
 * TypeScript type definitions for the PetMeds backend API
 * Defines interfaces for database entities, API requests/responses, and business logic
 */

// ============================================================================
// DATABASE ENTITY TYPES
// ============================================================================

/**
 * User account information
 * Represents a user who can access the PetMeds application
 */
export interface User {
  id: string;                    // Unique user identifier (UUID)
  name: string;                  // User's display name
  email: string;                 // User's email address (unique)
  image_url?: string;            // Profile picture URL from Google OAuth
  timezone: string;              // User's timezone for medication scheduling
  created_at: Date;              // Account creation timestamp
  updated_at?: Date;             // Last profile update timestamp
}

/**
 * Household information
 * Represents a group of users who share pet care responsibilities
 */
export interface Household {
  id: string;                    // Unique household identifier (UUID)
  name: string;                  // Household display name
  owner_id: string;              // User ID of the household owner
  created_at: Date;              // Household creation timestamp
  updated_at?: Date;             // Last update timestamp
}

/**
 * Valid household member roles
 * Defines the access levels and permissions for household members
 */
export type HouseholdRole = 'owner' | 'member' | 'sitter';

/**
 * Household membership information
 * Links users to households with specific roles and access controls
 */
export interface HouseholdMember {
  user_id: string;               // User UUID
  household_id: string;          // Household UUID
  role: HouseholdRole;           // Member's role in the household
  access_expires_at?: Date;      // Optional expiration for sitter access
  invited_email?: string;        // Email of invited user (if not yet registered)
  created_at: Date;              // Membership creation timestamp
}

/**
 * Pet information
 * Represents an animal under the care of a household
 */
export interface Pet {
  id: string;                    // Unique pet identifier (UUID)
  household_id: string;          // Household UUID this pet belongs to
  name: string;                  // Pet's name
  species: string;               // Animal species (e.g., "Dog", "Cat")
  birthdate?: Date;              // Pet's birth date (optional)
  image_url?: string;            // Pet's photo URL
  weight_kg?: number;            // Pet's weight in kilograms
  created_at: Date;              // Pet creation timestamp
  updated_at?: Date;             // Last update timestamp
}

/**
 * Dosage unit definitions
 * Standard units for medication dosages (mg, ml, tablets, etc.)
 */
export interface DosageUnit {
  id: string;                    // Unique unit identifier (UUID)
  name: string;                  // Unit name (e.g., "milligram", "tablet")
}

/**
 * Valid schedule time units
 * Defines the intervals for medication scheduling
 */
export type ScheduleUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

/**
 * Medication information
 * Represents a prescription for a specific pet with scheduling details
 */
export interface Medication {
  id: string;                    // Unique medication identifier (UUID)
  pet_id: string;                // Pet UUID this medication is for
  name: string;                  // Medication name
  dosage_amount: number;         // Amount to administer
  dosage_unit_id: string;        // Reference to dosage unit
  interval_qty: number;          // How often to give (e.g., 2 for "every 2 hours")
  interval_unit: ScheduleUnit;   // Time unit for intervals
  times_of_day?: string[];       // Specific times of day (e.g., ["08:00", "20:00"])
  byweekday?: number[];          // Days of week (0=Monday, 6=Sunday)
  prn: boolean;                  // "As needed" flag
  start_date: Date;              // When to start giving medication
  end_date?: Date;               // When to stop (optional for lifelong meds)
  notes?: string;                // Additional instructions or notes
  active: boolean;               // Whether medication is currently active
  created_at: Date;              // Medication creation timestamp
  updated_at?: Date;             // Last update timestamp
}

/**
 * Valid dose status values
 * Tracks the state of scheduled medication doses
 */
export type DoseStatus = 'due' | 'taken' | 'skipped';

/**
 * Medication dose event
 * Represents a scheduled medication administration time
 */
export interface MedicationDoseEvent {
  id: string;                    // Unique dose event identifier (UUID)
  medication_id: string;         // Reference to medication
  scheduled_time: Date;          // When the dose is scheduled
  status: DoseStatus;            // Current status of the dose
  taken_log_id?: string;         // Reference to log entry if taken
}

/**
 * Medication administration log
 * Immutable record of when a medication was given
 */
export interface MedicationLog {
  id: string;                    // Unique log identifier (UUID)
  medication_id: string;         // Reference to medication
  administering_user_id: string; // User who gave the medication
  administration_time: Date;     // When the user says they gave it
  time_logged: Date;             // Server timestamp when logged
  amount_given?: number;         // Actual amount administered
  dosage_unit_id?: string;       // Unit for amount given
  note?: string;                 // Additional notes about the dose
}

/**
 * Push notification subscription
 * Stores web push subscription details for medication reminders
 */
export interface PushSubscription {
  id: string;                    // Unique subscription identifier (UUID)
  user_id: string;               // User UUID
  endpoint: string;              // Push service endpoint URL
  p256dh: string;                // Public key for encryption
  auth: string;                  // Authentication secret
  device_label?: string;         // User-friendly device name
  enabled: boolean;              // Whether notifications are active
  created_at: Date;              // Subscription creation timestamp
}

// ============================================================================
// EXTENDED TYPES WITH RELATIONSHIPS
// ============================================================================

/**
 * Household with full member and pet information
 * Used for comprehensive household data retrieval
 */
export interface HouseholdWithMembers extends Household {
  members: HouseholdMember[];    // All household members
  pets: Pet[];                   // All pets in the household
}

/**
 * Pet with associated medications
 * Used when displaying pet details with medication information
 */
export interface PetWithMedications extends Pet {
  medications: Medication[];     // All medications for this pet
}

/**
 * Medication with detailed information
 * Includes dosage unit name and pet information
 */
export interface MedicationWithDetails extends Medication {
  dosage_unit_name: string;      // Human-readable dosage unit
  pet_name: string;              // Pet's name for display
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Request payload for creating a new household
 */
export interface CreateHouseholdRequest {
  name: string;                  // Household name
}

/**
 * Request payload for inviting a member to a household
 */
export interface InviteMemberRequest {
  email: string;                 // Email address to invite
  role: HouseholdRole;           // Role to assign
  access_expires_at?: string;    // Optional expiration date (ISO string)
}

/**
 * Request payload for creating a new pet
 */
export interface CreatePetRequest {
  name: string;                  // Pet's name
  species: string;               // Pet's species
  birthdate?: string;            // Birth date (ISO string)
  weight_kg?: number;            // Weight in kilograms
}

/**
 * Request payload for creating a new medication
 */
export interface CreateMedicationRequest {
  pet_id: string;                // Pet UUID
  name: string;                  // Medication name
  dosage_amount: number;         // Dosage amount
  dosage_unit_id: string;        // Dosage unit UUID
  interval_qty: number;          // Interval quantity
  interval_unit: ScheduleUnit;   // Interval time unit
  times_of_day?: string[];       // Specific times of day
  byweekday?: number[];          // Days of week
  prn: boolean;                  // As needed flag
  start_date: string;            // Start date (ISO string)
  end_date?: string;             // End date (ISO string)
  notes?: string;                // Additional notes
}

/**
 * Request payload for logging a medication dose
 */
export interface LogMedicationRequest {
  administration_time: string;    // When dose was given (ISO string)
  amount_given?: number;         // Amount actually given
  dosage_unit_id?: string;       // Unit for amount given
  note?: string;                 // Additional notes
}

/**
 * Request payload for getting agenda items
 */
export interface AgendaRequest {
  household_id: string;          // Household UUID
  start_date: string;            // Start date (ISO string)
  end_date: string;              // End date (ISO string)
}

/**
 * Agenda item with medication and pet information
 * Used for displaying medication schedules
 */
export interface AgendaItem {
  id: string;                    // Dose event UUID
  scheduled_time: Date;          // When dose is scheduled
  status: DoseStatus;            // Current status
  medication: {
    id: string;                  // Medication UUID
    name: string;                // Medication name
    dosage_amount: number;       // Prescribed amount
    dosage_unit: string;         // Dosage unit name
    notes?: string;              // Medication notes
  };
  pet: {
    id: string;                  // Pet UUID
    name: string;                // Pet's name
    species: string;             // Pet's species
  };
}

/**
 * Request payload for push notification subscription
 */
export interface PushSubscriptionRequest {
  endpoint: string;              // Push service endpoint
  p256dh: string;                // Public key
  auth: string;                  // Authentication secret
  device_label?: string;         // Device name
}

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

/**
 * Google OAuth authentication request
 */
export interface GoogleAuthRequest {
  id_token: string;              // Google ID token
}

/**
 * Authentication response
 * Returned after successful Google OAuth login
 */
export interface AuthResponse {
  user: User;                    // User information
  token: string;                 // JWT token for API access
  households: HouseholdWithMembers[]; // User's households
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Standard API error response
 * Used for consistent error handling across the application
 */
export interface ApiError {
  error: string;                 // Error type/category
  message: string;               // Human-readable error message
}
