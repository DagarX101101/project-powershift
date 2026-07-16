import api from './api';
import type { User, Role } from '../../shared/types';

export const usersService = {
  getAllUsers: async (): Promise<User[]> => {
    const res = await api.get('/users');
    return res.data;
  },

  updateUserStatus: async (id: string, status: 'ACTIVE' | 'SUSPENDED' | 'DELETED'): Promise<User> => {
    const res = await api.patch(`/users/${id}/status`, { status });
    return res.data;
  },

  updateUserRole: async (id: string, role: Role): Promise<User> => {
    const res = await api.patch(`/users/${id}/role`, { role });
    return res.data;
  },

  updateUserMines: async (id: string, assignedMines: string[]): Promise<User> => {
    const res = await api.patch(`/users/${id}/mines`, { assignedMines });
    return res.data;
  },

  resetPassword: async (id: string): Promise<User> => {
    const res = await api.patch(`/users/${id}/reset-password`);
    return res.data;
  }
};
