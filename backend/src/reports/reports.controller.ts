import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { aggregateDashboardData } from '../dashboard/DashboardAggregationHelpers';

const FY_KEYS = ['fy27', 'fy28', 'fy29', 'fy30', 'fy31'];
const FY_DISPLAY: Record<string, string> = {
  fy27: 'FY27', fy28: 'FY28', fy29: 'FY29', fy30: 'FY30', fy31: 'FY31',
};
const APP_NAME = 'Project PowerShift';
const COMPANY = 'Project PowerShift';

// ─── Shared helpers ─────────────────────────────────────────────────────────

async function fetchBaseData() {
  const [dbClusters, dbCalcResults, planningCounts] = await Promise.all([
    prisma.cluster.findMany({ include: { mines: true } }),
    prisma.calculationResult.findMany(),
    prisma.minePlanningInput.groupBy({
      by: ['mineId'],
      _count: { id: true },
    }),
  ]);

  const planningInputsCounts: Record<string, number> = {};
  planningCounts.forEach((p) => {
    planningInputsCounts[p.mineId] = p._count.id;
  });

  return { dbClusters, dbCalcResults, planningInputsCounts };
}

function getActiveFys(financialYear: string): string[] {
  return financialYear === 'all' ? FY_KEYS : [financialYear.toLowerCase()];
}

async function logReportHistory(
  userId: string,
  reportType: string,
  mineFilter: string,
  fyFilter: string,
  exportFormat: string
) {
  // Fetch user name for audit trail
  const userRecord = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  const generatorName = userRecord?.name || userRecord?.email || userId;

  await prisma.reportHistory.create({
    data: {
      generatedBy: userId,
      generatorName,
      reportType,
      mineFilter,
      fyFilter,
      exportFormat,
    },
  });
}

function getCalcMap(dbCalcResults: any[]) {
  const map = new Map<string, any>();
  dbCalcResults.forEach((r) => {
    map.set(`${r.mineId}_${r.financialYear.toLowerCase()}`, r.results);
  });
  return map;
}

// ─── JSON data endpoints ─────────────────────────────────────────────────────

export async function getDashboardReport(req: AuthenticatedRequest, res: Response) {
  try {
    const mineId = (req.query.mine as string) || 'all';
    const financialYear = (req.query.fy as string) || 'all';
    const { dbClusters, dbCalcResults, planningInputsCounts } = await fetchBaseData();

    const data = aggregateDashboardData(dbClusters, dbCalcResults, planningInputsCounts, {
      mineId, financialYear,
    });

    res.json(data);
  } catch (err) {
    console.error('[ReportsController] getDashboardReport:', err);
    res.status(500).json({ error: 'Failed to generate dashboard report data' });
  }
}

export async function getMasterSheetReport(req: AuthenticatedRequest, res: Response) {
  try {
    const mineIdFilter = (req.query.mine as string) || 'all';
    const fyFilter = (req.query.fy as string) || 'all';
    const activeFys = getActiveFys(fyFilter);

    const dbClusters = await prisma.cluster.findMany({ include: { mines: true } });
    const dbCalcResults = await prisma.calculationResult.findMany();
    const calcMap = getCalcMap(dbCalcResults);

    const rows: any[] = [];
    dbClusters.forEach((cluster) => {
      cluster.mines.forEach((mine) => {
        if (mineIdFilter !== 'all' && mine.id !== mineIdFilter) return;

        activeFys.forEach((fy) => {
          const res = calcMap.get(`${mine.id}_${fy}`);
          if (res) {
            rows.push({
              cluster: cluster.name,
              mine: mine.name,
              financialYear: FY_DISPLAY[fy] || fy.toUpperCase(),
              totalEVFleet: res.vehicle?.totalEVFleet ?? 0,
              availableEVPower: res.power?.availableEVPower ?? 0,
              chargersRequired: res.power?.chargersRequired ?? 0,
              requiredEVPower: res.power?.requiredEVPower ?? 0,
              vehiclesDeployable: res.power?.vehiclesDeployable ?? 0,
              totalRequiredPower: res.power?.totalRequiredPower ?? 0,
            });
          }
        });
      });
    });

    res.json({ rows, metadata: { generatedAt: new Date().toISOString() } });
  } catch (err) {
    console.error('[ReportsController] getMasterSheetReport:', err);
    res.status(500).json({ error: 'Failed to generate master sheet report data' });
  }
}

export async function getMineSummaryReport(req: AuthenticatedRequest, res: Response) {
  try {
    const { dbClusters, dbCalcResults } = await fetchBaseData();
    const calcMap = getCalcMap(dbCalcResults);

    const summary: any[] = [];
    dbClusters.forEach((cluster) => {
      cluster.mines.forEach((mine) => {
        const byYear: Record<string, any> = {};
        FY_KEYS.forEach((fy) => {
          const res = calcMap.get(`${mine.id}_${fy}`);
          if (res) {
            byYear[FY_DISPLAY[fy]] = {
              totalEVFleet: res.vehicle?.totalEVFleet ?? 0,
              availableEVPower: res.power?.availableEVPower ?? 0,
              chargersRequired: res.power?.chargersRequired ?? 0,
              vehiclesDeployable: res.power?.vehiclesDeployable ?? 0,
              totalRequiredPower: res.power?.totalRequiredPower ?? 0,
            };
          }
        });
        summary.push({ cluster: cluster.name, mine: mine.name, byYear });
      });
    });

    res.json({ mines: summary });
  } catch (err) {
    console.error('[ReportsController] getMineSummaryReport:', err);
    res.status(500).json({ error: 'Failed to generate mine summary' });
  }
}

export async function getClusterSummaryReport(req: AuthenticatedRequest, res: Response) {
  try {
    const { dbClusters, dbCalcResults, planningInputsCounts } = await fetchBaseData();
    const data = aggregateDashboardData(dbClusters, dbCalcResults, planningInputsCounts, {
      mineId: 'all', financialYear: 'all',
    });
    res.json({ clusters: data.clusters });
  } catch (err) {
    console.error('[ReportsController] getClusterSummaryReport:', err);
    res.status(500).json({ error: 'Failed to generate cluster summary' });
  }
}

export async function getCompanySummaryReport(req: AuthenticatedRequest, res: Response) {
  try {
    const { dbClusters, dbCalcResults, planningInputsCounts } = await fetchBaseData();
    const data = aggregateDashboardData(dbClusters, dbCalcResults, planningInputsCounts, {
      mineId: 'all', financialYear: 'all',
    });
    res.json({ kpis: data.kpis, clusters: data.clusters, mineTable: data.mineTable });
  } catch (err) {
    console.error('[ReportsController] getCompanySummaryReport:', err);
    res.status(500).json({ error: 'Failed to generate company summary' });
  }
}

export async function getReportHistory(req: AuthenticatedRequest, res: Response) {
  try {
    const history = await prisma.reportHistory.findMany({
      orderBy: { generatedAt: 'desc' },
      take: 50,
    });
    res.json(history);
  } catch (err) {
    console.error('[ReportsController] getReportHistory:', err);
    res.status(500).json({ error: 'Failed to fetch report history' });
  }
}

// ─── PDF Export ──────────────────────────────────────────────────────────────

export async function exportPDF(req: AuthenticatedRequest, res: Response) {
  try {
    const reportType = (req.query.type as string) || 'dashboard';
    const mineFilter = (req.query.mine as string) || 'all';
    const fyFilter = (req.query.fy as string) || 'all';
    const user = req.user!;

    const { dbClusters, dbCalcResults, planningInputsCounts } = await fetchBaseData();
    const calcMap = getCalcMap(dbCalcResults);
    const activeFys = getActiveFys(fyFilter);

    const mineLabel = mineFilter === 'all' ? 'All Mines' : mineFilter;
    const fyLabel = fyFilter === 'all' ? 'All Years' : fyFilter.toUpperCase();
    const generatedOn = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const userRecord = await prisma.user.findUnique({ where: { id: user.userId }, select: { name: true, email: true } });
    const generatorName = userRecord?.name || userRecord?.email || user.userId;

    const reportTitle = getReportTitle(reportType);

    const doc = new PDFDocument({ 
      margin: 50, 
      size: 'A4', 
      layout: reportType === 'master-sheet' ? 'landscape' : 'portrait',
      bufferPages: true 
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    // ── Header ──
    // Draw Logo
    const startX = doc.page.width / 2;
    const startY = doc.y + 10;
    const scale = 0.35;
    doc.save();
    doc.translate(startX - (50 * scale), startY);
    doc.scale(scale);
    
    // Base hex
    doc.path('M50 5L90 27.5V72.5L50 95L10 72.5V27.5L50 5Z')
       .fillAndStroke('#F59E0B', '#FCD34D');
       
    // Inner abstract shape
    doc.path('M48 25L28 55H50L45 80L72 45H52L55 25H48Z')
       .fill('#0F172A');
       
    doc.restore();
    doc.y = startY + (100 * scale) + 10;

    doc.fontSize(18).fillColor('#1a1a2e').font('Helvetica-Bold').text(APP_NAME, { align: 'center' });
    doc.fontSize(11).fillColor('#4a5568').font('Helvetica').text(COMPANY, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(14).fillColor('#2d3748').font('Helvetica-Bold').text(reportTitle, { align: 'center' });
    doc.moveDown(0.3);

    // ── Metadata line ──
    doc.fontSize(9).fillColor('#718096').font('Helvetica')
      .text(`Mine: ${mineLabel}   |   Financial Year: ${fyLabel}   |   Generated: ${generatedOn}   |   By: ${generatorName}`, { align: 'center' });

    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#e2e8f0').stroke();
    doc.moveDown(0.5);

    // ── Content based on type ──
    if (reportType === 'dashboard' || reportType === 'company-summary') {
      const data = aggregateDashboardData(dbClusters, dbCalcResults, planningInputsCounts, { mineId: mineFilter, financialYear: fyFilter });

      // KPIs
      doc.fontSize(12).fillColor('#2d3748').font('Helvetica-Bold').text('Key Performance Indicators');
      doc.moveDown(0.3);

      const kpiHeaders = ['Metric', 'Value', 'Unit'];
      const kpiRows = Object.values(data.kpis).map((k: any) => [k.title, k.value.toFixed(2), k.unit]);
      drawTable(doc, kpiHeaders, kpiRows, [260, 80, 80]);

      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#2d3748').font('Helvetica-Bold').text('Mine Summary');
      doc.moveDown(0.3);

      const mineHeaders = ['Mine', 'EV Fleet', 'Avail. Power (MVA)', 'Chargers Req.', 'Deployable'];
      const mineRows = data.mineTable.map((m: any) => [
        m.mineName, String(m.totalEVFleet.toFixed(0)), String(m.availableEVPower.toFixed(2)),
        String(m.chargersRequired.toFixed(0)), String(m.vehiclesDeployable.toFixed(0)),
      ]);
      drawTable(doc, mineHeaders, mineRows, [130, 70, 110, 90, 80]);

    } else if (reportType === 'master-sheet') {
      doc.fontSize(12).fillColor('#2d3748').font('Helvetica-Bold').text('Master Sheet — Calculation Results');
      doc.moveDown(0.3);

      const headers = ['Cluster', 'Mine', 'FY', 'EV Fleet', 'Avail. Power', 'Chargers', 'Req. Power', 'Deployable'];
      const rows: string[][] = [];
      dbClusters.forEach((cluster) => {
        cluster.mines.forEach((mine) => {
          if (mineFilter !== 'all' && mine.id !== mineFilter) return;
          activeFys.forEach((fy) => {
            const r = calcMap.get(`${mine.id}_${fy}`);
            if (r) {
              rows.push([
                cluster.name, mine.name, FY_DISPLAY[fy] || fy.toUpperCase(),
                (r.vehicle?.totalEVFleet ?? 0).toFixed(0),
                (r.power?.availableEVPower ?? 0).toFixed(2),
                (r.power?.chargersRequired ?? 0).toFixed(0),
                (r.power?.requiredEVPower ?? 0).toFixed(2),
                (r.power?.vehiclesDeployable ?? 0).toFixed(0),
              ]);
            }
          });
        });
      });
      drawTable(doc, headers, rows, [110, 110, 45, 85, 95, 95, 100, 100]);

    } else if (reportType === 'cluster-summary') {
      const data = aggregateDashboardData(dbClusters, dbCalcResults, planningInputsCounts, { mineId: 'all', financialYear: fyFilter });
      doc.fontSize(12).fillColor('#2d3748').font('Helvetica-Bold').text('Cluster Summary');
      doc.moveDown(0.3);

      const headers = ['Cluster', 'Mines', 'EV Fleet', 'Avail. Power (MVA)', 'Req. Power', 'Deployable'];
      const rows = data.clusters.map((c: any) => [
        c.clusterName, String(c.mineCount),
        c.totalEVFleet.toFixed(0), c.availableEVPower.toFixed(2),
        c.requiredPower.toFixed(2), c.vehiclesDeployable.toFixed(0),
      ]);
      drawTable(doc, headers, rows, [110, 50, 70, 100, 80, 80]);

    } else if (reportType === 'mine-summary') {
      doc.fontSize(12).fillColor('#2d3748').font('Helvetica-Bold').text('Mine Summary Report');
      doc.moveDown(0.3);

      const headers = ['Cluster', 'Mine', 'FY', 'EV Fleet', 'Avail. Power', 'Chargers', 'Deployable'];
      const rows: string[][] = [];
      dbClusters.forEach((cluster) => {
        cluster.mines.forEach((mine) => {
          if (mineFilter !== 'all' && mine.id !== mineFilter) return;
          FY_KEYS.forEach((fy) => {
            const r = calcMap.get(`${mine.id}_${fy}`);
            if (r) rows.push([
              cluster.name, mine.name, FY_DISPLAY[fy],
              (r.vehicle?.totalEVFleet ?? 0).toFixed(0),
              (r.power?.availableEVPower ?? 0).toFixed(2),
              (r.power?.chargersRequired ?? 0).toFixed(0),
              (r.power?.vehiclesDeployable ?? 0).toFixed(0),
            ]);
          });
        });
      });
      drawTable(doc, headers, rows, [80, 85, 30, 60, 80, 70, 90]);
    }

    // ── Footer ──
    const pageCount = (doc as any).bufferedPageRange?.()?.count || 1;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor('#a0aec0').text(
        `${APP_NAME} | ${COMPANY} | Confidential | Page ${i + 1} of ${pageCount}`,
        50, doc.page.height - 40,
        { align: 'center', width: doc.page.width - 100 }
      );
    }

    doc.end();

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));
    });

     const dateStr = new Date().toISOString().split('T')[0];
    const filename = reportType === 'dashboard'
      ? 'ProjectPowerShift_Dashboard.pdf'
      : reportType === 'master-sheet'
      ? `ProjectPowerShift_MasterSheet_${fyFilter.toUpperCase()}.pdf`
      : `ProjectPowerShift_Report_${dateStr}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);

    // Log to history
    await logReportHistory(user.userId, reportType, mineFilter, fyFilter, 'PDF');

  } catch (err) {
    console.error('[ReportsController] exportPDF:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to generate PDF' });
  }
}

// ─── Excel Export ────────────────────────────────────────────────────────────

export async function exportExcel(req: AuthenticatedRequest, res: Response) {
  try {
    const reportType = (req.query.type as string) || 'master-sheet';
    const mineFilter = (req.query.mine as string) || 'all';
    const fyFilter = (req.query.fy as string) || 'all';
    const user = req.user!;

    const { dbClusters, dbCalcResults, planningInputsCounts } = await fetchBaseData();
    const calcMap = getCalcMap(dbCalcResults);
    const activeFys = getActiveFys(fyFilter);

    const workbook = new ExcelJS.Workbook();
    const excelUserRecord = await prisma.user.findUnique({ where: { id: user.userId }, select: { name: true, email: true } });
    const generatorName = excelUserRecord?.name || excelUserRecord?.email || user.userId;
    workbook.creator = generatorName;
    workbook.created = new Date();

    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a1a2e' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin', color: { argb: 'FFe2e8f0' } },
        bottom: { style: 'thin', color: { argb: 'FFe2e8f0' } },
        left: { style: 'thin', color: { argb: 'FFe2e8f0' } },
        right: { style: 'thin', color: { argb: 'FFe2e8f0' } },
      },
    };

    const cellStyle: Partial<ExcelJS.Style> = {
      border: {
        top: { style: 'thin', color: { argb: 'FFe2e8f0' } },
        bottom: { style: 'thin', color: { argb: 'FFe2e8f0' } },
        left: { style: 'thin', color: { argb: 'FFe2e8f0' } },
        right: { style: 'thin', color: { argb: 'FFe2e8f0' } },
      },
    };

    const addInfoRows = (ws: ExcelJS.Worksheet) => {
      ws.addRow([APP_NAME]);
      ws.addRow([COMPANY]);
      ws.addRow([getReportTitle(reportType)]);
      ws.addRow([`Mine: ${mineFilter === 'all' ? 'All Mines' : mineFilter} | FY: ${fyFilter === 'all' ? 'All Years' : fyFilter.toUpperCase()} | Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} | By: ${generatorName}`]);
      ws.addRow([]);
    };

    const applyHeaderRow = (row: ExcelJS.Row) => {
      row.eachCell((cell) => { Object.assign(cell, headerStyle); });
      row.height = 22;
    };

    if (reportType === 'master-sheet' || reportType === 'dashboard') {
      const ws = workbook.addWorksheet('Master Sheet');
      addInfoRows(ws);
      const hRow = ws.addRow(['Cluster', 'Mine', 'Financial Year', 'Total EV Fleet (Nos.)', 'Available EV Power (MVA)', 'Chargers Required (Nos.)', 'Required EV Power (MVA)', 'Vehicles Deployable (Nos.)', 'Total Required Power (MW)']);
      applyHeaderRow(hRow);
      ws.columns = [
        { width: 18 }, { width: 18 }, { width: 16 }, { width: 22 }, { width: 24 },
        { width: 24 }, { width: 22 }, { width: 24 }, { width: 24 },
      ];

      dbClusters.forEach((cluster) => {
        cluster.mines.forEach((mine) => {
          if (mineFilter !== 'all' && mine.id !== mineFilter) return;
          activeFys.forEach((fy) => {
            const r = calcMap.get(`${mine.id}_${fy}`);
            if (r) {
              const row = ws.addRow([
                cluster.name, mine.name, FY_DISPLAY[fy],
                r.vehicle?.totalEVFleet ?? 0, r.power?.availableEVPower ?? 0,
                r.power?.chargersRequired ?? 0, r.power?.requiredEVPower ?? 0,
                r.power?.vehiclesDeployable ?? 0, r.power?.totalRequiredPower ?? 0,
              ]);
              row.eachCell((cell) => { Object.assign(cell, cellStyle); });
            }
          });
        });
      });
    }

    if (reportType === 'cluster-summary' || reportType === 'company-summary') {
      const data = aggregateDashboardData(dbClusters, dbCalcResults, planningInputsCounts, { mineId: 'all', financialYear: fyFilter });
      const ws = workbook.addWorksheet('Cluster Summary');
      addInfoRows(ws);
      const hRow = ws.addRow(['Cluster', 'Mine Count', 'Total EV Fleet (Nos.)', 'Available EV Power (MVA)', 'Required Power (MVA)', 'Vehicles Deployable (Nos.)']);
      applyHeaderRow(hRow);
      ws.columns = [{ width: 20 }, { width: 14 }, { width: 22 }, { width: 26 }, { width: 22 }, { width: 26 }];
      data.clusters.forEach((c: any) => {
        const row = ws.addRow([c.clusterName, c.mineCount, c.totalEVFleet, c.availableEVPower, c.requiredPower, c.vehiclesDeployable]);
        row.eachCell((cell) => { Object.assign(cell, cellStyle); });
      });
    }

    if (reportType === 'mine-summary' || reportType === 'company-summary') {
      const ws = workbook.addWorksheet('Mine Summary');
      addInfoRows(ws);
      const hRow = ws.addRow(['Cluster', 'Mine', 'FY27 EV Fleet', 'FY28 EV Fleet', 'FY29 EV Fleet', 'FY30 EV Fleet', 'FY31 EV Fleet']);
      applyHeaderRow(hRow);
      ws.columns = [{ width: 18 }, { width: 18 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }];
      dbClusters.forEach((cluster) => {
        cluster.mines.forEach((mine) => {
          if (mineFilter !== 'all' && mine.id !== mineFilter) return;
          const row = ws.addRow([
            cluster.name, mine.name,
            ...FY_KEYS.map((fy) => {
              const r = calcMap.get(`${mine.id}_${fy}`);
              return r ? (r.vehicle?.totalEVFleet ?? 0) : '';
            }),
          ]);
          row.eachCell((cell) => { Object.assign(cell, cellStyle); });
        });
      });
    }

    const excelBuffer = await workbook.xlsx.writeBuffer();
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = reportType === 'master-sheet'
      ? `ProjectPowerShift_MasterSheet_${fyFilter.toUpperCase()}.xlsx`
      : `ProjectPowerShift_Report_${dateStr}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(excelBuffer);

    await logReportHistory(user.userId, reportType, mineFilter, fyFilter, 'Excel');

  } catch (err) {
    console.error('[ReportsController] exportExcel:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to generate Excel' });
  }
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function getReportTitle(reportType: string): string {
  const titles: Record<string, string> = {
    'dashboard': 'Dashboard Report',
    'master-sheet': 'Master Sheet Report',
    'mine-summary': 'Mine Summary Report',
    'cluster-summary': 'Cluster Summary Report',
    'company-summary': 'Company Summary Report',
  };
  return titles[reportType] || 'Report';
}

function drawTable(doc: PDFKit.PDFDocument, headers: string[], rows: string[][], colWidths: number[]) {
  const x0 = 50;
  let y = doc.y;
  const rowH = 18;
  const pageBottom = doc.page.height - 70;

  // Header row
  doc.fontSize(9).font('Helvetica-Bold');
  let cx = x0;
  headers.forEach((h, i) => {
    doc.fillColor('#2d3748').rect(cx, y, colWidths[i], rowH).fill();
    doc.fillColor('#FFFFFF').text(h, cx + 3, y + 4, { width: colWidths[i] - 6, lineBreak: false });
    cx += colWidths[i];
  });
  y += rowH;

  // Data rows
  doc.font('Helvetica').fontSize(8);
  rows.forEach((row, ri) => {
    if (y + rowH > pageBottom) {
      doc.addPage();
      y = 50;
    }
    cx = x0;
    row.forEach((cell, i) => {
      const bg = ri % 2 === 0 ? '#f7fafc' : '#FFFFFF';
      doc.fillColor(bg).rect(cx, y, colWidths[i], rowH).fill();
      doc.fillColor('#4a5568').rect(cx, y, colWidths[i], rowH).stroke().text(String(cell), cx + 3, y + 4, { width: colWidths[i] - 6, lineBreak: false });
      cx += colWidths[i];
    });
    y += rowH;
  });

  doc.moveDown(0.5);
}
