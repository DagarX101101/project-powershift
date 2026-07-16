import api from '../api';

export interface AccessRequestModel {
  id: string;
  fullName: string;
  email: string;
  department: string | null;
  mobileNumber: string | null;
  reason: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  assignedRole: 'ADMIN' | 'ENGINEER' | 'VIEWER' | null;
  assignedMines: string[];
  rejectionReason: string | null;
}

export const accessRequestsAdminService = {
  getPendingRequests: async (): Promise<AccessRequestModel[]> => {
    const response = await api.get('/access-requests?status=PENDING');
    return response.data;
  },

  getRequestHistory: async (): Promise<AccessRequestModel[]> => {
    const response = await api.get('/access-requests/history');
    return response.data;
  },
  
  approveRequest: async (id: string, role: string, mineIds: string[]): Promise<void> => {
    await api.patch(`/access-requests/${id}/approve`, { role, mineIds });
  },

  rejectRequest: async (id: string, reason: string): Promise<void> => {
    await api.patch(`/access-requests/${id}/reject`, { reason });
  }
};
