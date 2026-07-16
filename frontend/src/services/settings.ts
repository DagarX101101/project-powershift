import api from './api';

export interface ApplicationInfo {
  name: string;
  version: string;
  environment: string;
  backendStatus: string;
  databaseStatus: string;
  calculationEngineStatus: string;
  authenticationStatus: string;
}

export interface SettingsData {
  themePreference: 'light' | 'dark' | 'corporate';
  applicationInfo: ApplicationInfo;
}

export const settingsService = {
  getSettings: async (): Promise<SettingsData> => {
    const response = await api.get('/settings');
    return response.data;
  },

  updateTheme: async (themePreference: string): Promise<void> => {
    await api.patch('/settings/theme', { themePreference });
  }
};
