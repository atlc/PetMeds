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

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('petmeds_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
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

// Auth API
export const authApi = {
  googleLogin: async (idToken: string): Promise<AxiosResponse> => {
    return api.post('/auth/google', { id_token: idToken });
  },
  
  getCurrentUser: async (): Promise<AxiosResponse> => {
    return api.get('/auth/me');
  },
  
  logout: async (): Promise<AxiosResponse> => {
    return api.post('/auth/logout');
  }
};

// Households API
export const householdsApi = {
  getAll: async (): Promise<AxiosResponse<{ households: HouseholdWithMembers[] }>> => {
    return api.get('/households');
  },
  
  getById: async (id: string): Promise<AxiosResponse<{ household: HouseholdWithMembers }>> => {
    return api.get(`/households/${id}`);
  },
  
  create: async (data: CreateHouseholdRequest): Promise<AxiosResponse<{ household: any }>> => {
    return api.post('/households', data);
  },
  
  inviteMember: async (householdId: string, inviteData: any): Promise<AxiosResponse> => {
    return api.post(`/households/${householdId}/invite`, inviteData);
  },
  
  removeMember: async (householdId: string, userId: string): Promise<AxiosResponse> => {
    return api.delete(`/households/${householdId}/members/${userId}`);
  }
};

// Pets API
export const petsApi = {
  getByHousehold: async (householdId: string): Promise<AxiosResponse<{ pets: Pet[] }>> => {
    return api.get(`/pets?household_id=${householdId}`);
  },
  
  getById: async (id: string): Promise<AxiosResponse<{ pet: Pet }>> => {
    return api.get(`/pets/${id}`);
  },
  
  create: async (data: CreatePetRequest): Promise<AxiosResponse<{ pet: Pet }>> => {
    return api.post('/pets', data);
  },
  
  update: async (id: string, data: Partial<CreatePetRequest>): Promise<AxiosResponse<{ pet: Pet }>> => {
    return api.put(`/pets/${id}`, data);
  },
  
  delete: async (id: string): Promise<AxiosResponse> => {
    return api.delete(`/pets/${id}`);
  }
};

// Medications API
export const medicationsApi = {
  getByPet: async (petId: string): Promise<AxiosResponse<{ medications: Medication[] }>> => {
    return api.get(`/medications?pet_id=${petId}`);
  },
  
  getById: async (id: string): Promise<AxiosResponse<{ medication: Medication }>> => {
    return api.get(`/medications/${id}`);
  },
  
  create: async (data: CreateMedicationRequest): Promise<AxiosResponse<{ medication: Medication }>> => {
    return api.post('/medications', data);
  },
  
  update: async (id: string, data: Partial<CreateMedicationRequest>): Promise<AxiosResponse<{ medication: Medication }>> => {
    return api.put(`/medications/${id}`, data);
  },
  
  delete: async (id: string): Promise<AxiosResponse> => {
    return api.delete(`/medications/${id}`);
  },
  
  logDose: async (medicationId: string, data: LogMedicationRequest): Promise<AxiosResponse<{ log: any }>> => {
    return api.post(`/medications/${medicationId}/log`, data);
  }
};

// Agenda API
export const agendaApi = {
  getAgenda: async (data: AgendaRequest): Promise<AxiosResponse<{ items: AgendaItem[] }>> => {
    return api.post('/agenda', data);
  },
  
  getTodayAgenda: async (householdId: string): Promise<AxiosResponse<{ items: AgendaItem[] }>> => {
    return api.get(`/agenda/today/${householdId}`);
  },
  
  snoozeDose: async (doseId: string): Promise<AxiosResponse<{ dose_event: any }>> => {
    return api.post(`/agenda/${doseId}/snooze`);
  }
};

// Push Notifications API
export const pushApi = {
  subscribe: async (data: PushSubscriptionRequest): Promise<AxiosResponse> => {
    return api.post('/push/subscribe', data);
  },
  
  unsubscribe: async (endpoint: string): Promise<AxiosResponse> => {
    return api.delete(`/push/subscriptions/${encodeURIComponent(endpoint)}`);
  },
  
  getSubscriptions: async (): Promise<AxiosResponse<{ subscriptions: any[] }>> => {
    return api.get('/push/subscriptions');
  },
  
  toggleSubscription: async (id: string, enabled: boolean): Promise<AxiosResponse<{ subscription: any }>> => {
    return api.patch(`/push/subscriptions/${id}/toggle`, { enabled });
  }
};

export default api;
