import api from './api';

export type ReportType = 'dashboard' | 'master-sheet' | 'mine-summary' | 'cluster-summary' | 'company-summary';
export type ExportFormat = 'pdf' | 'excel';

export interface ReportHistoryItem {
  id: string;
  generatedBy: string;
  generatorName: string;
  reportType: string;
  mineFilter: string;
  fyFilter: string;
  exportFormat: string;
  generatedAt: string;
}

export const reportsService = {
  getDashboardReport: async (mine = 'all', fy = 'all') => {
    const res = await api.get('/reports/dashboard', { params: { mine, fy } });
    return res.data;
  },

  getMasterSheetReport: async (mine = 'all', fy = 'all') => {
    const res = await api.get('/reports/master-sheet', { params: { mine, fy } });
    return res.data;
  },

  getMineSummaryReport: async () => {
    const res = await api.get('/reports/mine-summary');
    return res.data;
  },

  getClusterSummaryReport: async () => {
    const res = await api.get('/reports/cluster-summary');
    return res.data;
  },

  getCompanySummaryReport: async () => {
    const res = await api.get('/reports/company-summary');
    return res.data;
  },

  getHistory: async (): Promise<ReportHistoryItem[]> => {
    const res = await api.get('/reports/history');
    return res.data;
  },

  downloadPDF: async (type: ReportType, mine: string, fy: string): Promise<void> => {
    const res = await api.get('/reports/export/pdf', {
      params: { type, mine, fy },
      responseType: 'blob',
    });
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = type === 'dashboard'
      ? 'ProjectPowerShift_Dashboard.pdf'
      : type === 'master-sheet'
      ? `ProjectPowerShift_MasterSheet_${fy.toUpperCase()}.pdf`
      : `ProjectPowerShift_Report_${dateStr}.pdf`;
    triggerDownload(res.data, filename, 'application/pdf');
  },

  downloadExcel: async (type: ReportType, mine: string, fy: string): Promise<void> => {
    const res = await api.get('/reports/export/excel', {
      params: { type, mine, fy },
      responseType: 'blob',
    });
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = type === 'master-sheet'
      ? `ProjectPowerShift_MasterSheet_${fy.toUpperCase()}.xlsx`
      : `ProjectPowerShift_Report_${dateStr}.xlsx`;
    triggerDownload(res.data, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  },
};

function triggerDownload(blob: Blob, filename: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([blob], { type: mimeType }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
