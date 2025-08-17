import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  User, 
  HouseholdWithMembers, 
  Pet, 
  Medication, 
  AgendaItem,
  CreateHouseholdRequest,
  CreatePetRequest,
  CreateMedicationRequest,
  LogMedicationRequest,
  AgendaRequest,
  PushSubscriptionRequest
} from '../types';

/**
 * Create and configure Axios HTTP client instance
 * Sets base URL, timeout, and default headers for all API requests
 */
const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor to automatically add authentication token
 * Checks localStorage for JWT token and adds it to Authorization header
 */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('petmeds_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Response interceptor to handle authentication errors globally
 * If response is 401 (Unauthorized), clears token and redirects to login
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('petmeds_token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

/**
 * Authentication API endpoints
 * Handles Google OAuth login, user profile retrieval, and logout
 */
export const authApi = {
  /**
   * Authenticate user with Google OAuth ID token
   * @param idToken - Google OAuth ID token from client-side authentication
   * @returns Promise with user data, JWT token, and households
   */
  googleLogin: async (idToken: string): Promise<AxiosResponse> => {
    return api.post('/auth/google', { id_token: idToken });
  },
  
  /**
   * Get current authenticated user's profile information
   * @returns Promise with user data
   */
  getCurrentUser: async (): Promise<AxiosResponse> => {
    return api.get('/auth/me');
  },
  
  /**
   * Logout current user (backend cleanup)
   * @returns Promise indicating logout success
   */
  logout: async (): Promise<AxiosResponse> => {
    return api.post('/auth/logout');
  }
};

/**
 * Household management API endpoints
 * Handles CRUD operations for households and member invitations
 */
export const householdsApi = {
  /**
   * Get all households where current user is a member
   * @returns Promise with array of households including members and pets
   */
  getAll: async (): Promise<AxiosResponse<{ households: HouseholdWithMembers[] }>> => {
    return api.get('/households');
  },
  
  /**
   * Get specific household by ID with member and pet details
   * @param id - Household UUID
   * @returns Promise with household data
   */
  getById: async (id: string): Promise<AxiosResponse<{ household: HouseholdWithMembers }>> => {
    return api.get(`/households/${id}`);
  },
  
  /**
   * Create new household
   * @param data - Household creation data (name, description)
   * @returns Promise with created household data
   */
  create: async (data: CreateHouseholdRequest): Promise<AxiosResponse<{ household: any }>> => {
    return api.post('/households', data);
  },
  
  /**
   * Invite new member to household
   * @param householdId - Target household UUID
   * @param inviteData - Invitation details (email, role, expiration)
   * @returns Promise indicating invitation success
   */
  inviteMember: async (householdId: string, inviteData: any): Promise<AxiosResponse> => {
    return api.post(`/households/${householdId}/invite`, inviteData);
  },
  
  /**
   * Remove member from household
   * @param householdId - Target household UUID
   * @param userId - User UUID to remove
   * @returns Promise indicating removal success
   */
  removeMember: async (householdId: string, userId: string): Promise<AxiosResponse> => {
    return api.delete(`/households/${householdId}/members/${userId}`);
  }
};

/**
 * Pet management API endpoints
 * Handles CRUD operations for pets within households
 */
export const petsApi = {
  /**
   * Get all pets belonging to a specific household
   * @param householdId - Household UUID to get pets for
   * @returns Promise with array of pets
   */
  getByHousehold: async (householdId: string): Promise<AxiosResponse<{ pets: Pet[] }>> => {
    return api.get(`/pets?household_id=${householdId}`);
  },
  
  /**
   * Get specific pet by ID
   * @param id - Pet UUID
   * @returns Promise with pet data
   */
  getById: async (id: string): Promise<AxiosResponse<{ pet: Pet }>> => {
    return api.get(`/pets/${id}`);
  },
  
  /**
   * Create new pet in household
   * @param data - Pet creation data (name, species, birthdate, weight)
   * @returns Promise with created pet data
   */
  create: async (data: CreatePetRequest): Promise<AxiosResponse<{ pet: Pet }>> => {
    return api.post('/pets', data);
  },
  
  /**
   * Update existing pet information
   * @param id - Pet UUID to update
   * @param data - Partial pet data for updates
   * @returns Promise with updated pet data
   */
  update: async (id: string, data: Partial<CreatePetRequest>): Promise<AxiosResponse<{ pet: Pet }>> => {
    return api.put(`/pets/${id}`, data);
  },
  
  /**
   * Delete pet from household
   * @param id - Pet UUID to delete
   * @returns Promise indicating deletion success
   */
  delete: async (id: string): Promise<AxiosResponse> => {
    return api.delete(`/pets/${id}`);
  }
};

/**
 * Medication management API endpoints
 * Handles CRUD operations for medications and dose logging
 */
export const medicationsApi = {
  /**
   * Get all medications for a specific pet
   * @param petId - Pet UUID to get medications for
   * @returns Promise with array of medications
   */
  getByPet: async (petId: string): Promise<AxiosResponse<{ medications: Medication[] }>> => {
    return api.get(`/medications?pet_id=${petId}`);
  },
  
  /**
   * Get specific medication by ID
   * @param id - Medication UUID
   * @returns Promise with medication data
   */
  getById: async (id: string): Promise<AxiosResponse<{ medication: Medication }>> => {
    return api.get(`/medications/${id}`);
  },
  
  /**
   * Create new medication for pet
   * @param data - Medication creation data (name, dosage, schedule, etc.)
   * @returns Promise with created medication data
   */
  create: async (data: CreateMedicationRequest): Promise<AxiosResponse<{ medication: Medication }>> => {
    return api.post('/medications', data);
  },
  
  /**
   * Update existing medication information
   * @param id - Medication UUID to update
   * @param data - Partial medication data for updates
   * @returns Promise with updated medication data
   */
  update: async (id: string, data: Partial<CreateMedicationRequest>): Promise<AxiosResponse<{ medication: Medication }>> => {
    return api.put(`/medications/${id}`, data);
  },
  
  /**
   * Delete medication
   * @param id - Medication UUID to delete
   * @returns Promise indicating deletion success
   */
  delete: async (id: string): Promise<AxiosResponse> => {
    return api.delete(`/medications/${id}`);
  },
  
  /**
   * Log a medication dose administration
   * @param medicationId - Medication UUID to log dose for
   * @param data - Dose logging data (time, amount, notes)
   * @returns Promise with created log entry
   */
  logDose: async (medicationId: string, data: LogMedicationRequest): Promise<AxiosResponse<{ log: any }>> => {
    return api.post(`/medications/${medicationId}/log`, data);
  }
};

/**
 * Agenda and scheduling API endpoints
 * Handles medication schedule viewing and dose management
 */
export const agendaApi = {
  /**
   * Get agenda items for a household within a date range
   * @param data - Agenda request data (household ID, start/end dates)
   * @returns Promise with array of agenda items
   */
  getAgenda: async (data: AgendaRequest): Promise<AxiosResponse<{ items: AgendaItem[] }>> => {
    return api.post('/agenda', data);
  },
  
  /**
   * Get today's agenda for a specific household
   * @param householdId - Household UUID to get agenda for
   * @returns Promise with array of today's agenda items
   */
  getTodayAgenda: async (householdId: string): Promise<AxiosResponse<{ items: AgendaItem[] }>> => {
    return api.get(`/agenda/today/${householdId}`);
  },
  
  /**
   * Snooze a medication dose by 15 minutes
   * @param doseId - Dose event UUID to snooze
   * @returns Promise with updated dose event data
   */
  snoozeDose: async (doseId: string): Promise<AxiosResponse<{ dose_event: any }>> => {
    return api.post(`/agenda/${doseId}/snooze`);
  }
};

/**
 * Push notification API endpoints
 * Handles web push subscription management
 */
export const pushApi = {
  /**
   * Subscribe to push notifications for a device
   * @param data - Push subscription data (endpoint, keys, device label)
   * @returns Promise indicating subscription success
   */
  subscribe: async (data: PushSubscriptionRequest): Promise<AxiosResponse> => {
    return api.post('/push/subscribe', data);
  },
  
  /**
   * Unsubscribe from push notifications
   * @param endpoint - Push subscription endpoint URL
   * @returns Promise indicating unsubscription success
   */
  unsubscribe: async (endpoint: string): Promise<AxiosResponse> => {
    return api.delete(`/push/subscriptions/${encodeURIComponent(endpoint)}`);
  },
  
  /**
   * Get user's active push notification subscriptions
   * @returns Promise with array of subscription objects
   */
  getSubscriptions: async (): Promise<AxiosResponse<{ subscriptions: any[] }>> => {
    return api.get('/push/subscriptions');
  },
  
  /**
   * Toggle push notification subscription on/off
   * @param id - Subscription UUID to toggle
   * @param enabled - Whether to enable or disable notifications
   * @returns Promise with updated subscription data
   */
  toggleSubscription: async (id: string, enabled: boolean): Promise<AxiosResponse<{ subscription: any }>> => {
    return api.patch(`/push/subscriptions/${id}/toggle`, { enabled });
  }
};

export default api;
