import api from './api';

export interface AccessRequestPayload {
  fullName: string;
  email: string;
  password?: string;
  department?: string;
  mobileNumber?: string;
  reason?: string;
}

export interface AccessRequestStatusResponse {
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  reviewedAt: string | null;
}

export const accessRequestService = {
  createAccessRequest: async (data: AccessRequestPayload) => {
    // Because the 401 interceptor might intercept requests, access-request is public. 
    // It should just return the response or throw.
    const response = await api.post('/access-request', data);
    return response.data;
  },

  getAccessRequestStatus: async (email: string): Promise<AccessRequestStatusResponse> => {
    const response = await api.get(`/access-request/status`, {
      params: { email },
    });
    return response.data;
  },
};
