import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getDashboardReport,
  getMasterSheetReport,
  getMineSummaryReport,
  getClusterSummaryReport,
  getCompanySummaryReport,
  getReportHistory,
  exportPDF,
  exportExcel,
} from './reports.controller';

const router = Router();

router.use(requireAuth);

// JSON data endpoints
router.get('/dashboard', getDashboardReport);
router.get('/master-sheet', getMasterSheetReport);
router.get('/mine-summary', getMineSummaryReport);
router.get('/cluster-summary', getClusterSummaryReport);
router.get('/company-summary', getCompanySummaryReport);
router.get('/history', getReportHistory);

// Binary export endpoints
router.get('/export/pdf', exportPDF);
router.get('/export/excel', exportExcel);

export default router;
