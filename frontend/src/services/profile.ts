import api from './api';

export interface ProfileData {
  id: string;
  email: string;
  name: string;
  department: string | null;
  mobileNumber: string | null;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  profilePhoto: string | null;
  mines: { id: string; name: string }[];
}

export const profileService = {
  getProfile: async (): Promise<ProfileData> => {
    const response = await api.get('/profile');
    return response.data;
  },

  updateProfile: async (data: { name: string; department: string | null; mobileNumber: string | null }): Promise<ProfileData> => {
    const response = await api.patch('/profile', data);
    return response.data;
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<void> => {
    await api.patch('/profile/change-password', data);
  },

  uploadPhoto: async (file: File): Promise<{ profilePhoto: string }> => {
    const formData = new FormData();
    formData.append('photo', file);
    
    // api usually defaults to application/json, but when passing FormData, axios automatically sets multipart/form-data
    const response = await api.patch('/profile/photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};
