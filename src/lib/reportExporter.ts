import { jsPDF } from 'jspdf';
import hteimLogoAsset from '../assets/hteim_logo.png';

export interface ReportColumn {
  header: string;
  key: string;
  align?: 'left' | 'center' | 'right';
  width?: number;
}

export interface ReportSummaryMetric {
  label: string;
  value: string | number;
  subtext?: string;
  badgeColor?: string;
}

async function getLogoBase64(): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg'));
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = hteimLogoAsset;
  });
}

/**
 * Download report data as CSV file
 */
export function exportReportToCSV(
  filename: string,
  columns: ReportColumn[],
  rows: Record<string, any>[]
): void {
  const headers = columns.map(col => `"${col.header.replace(/"/g, '""')}"`).join(',');
  const rowStrings = rows.map(row => {
    return columns.map(col => {
      const val = row[col.key];
      const strVal = val === null || val === undefined ? '' : String(val);
      return `"${strVal.replace(/"/g, '""')}"`;
    }).join(',');
  });

  const csvContent = [headers, ...rowStrings].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generate PDF Report using jsPDF
 */
export async function generateReportPDF(
  reportTitle: string,
  filterSummary: string[],
  summaryMetrics: ReportSummaryMetric[],
  columns: ReportColumn[],
  rows: Record<string, any>[]
): Promise<void> {
  const doc = new jsPDF({
    orientation: columns.length > 5 ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const logoData = await getLogoBase64();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Gold accent bar
  doc.setFillColor(217, 119, 6); // amber-600
  doc.rect(0, 32, pageWidth, 2, 'F');

  // Header Logo
  if (logoData) {
    try {
      doc.addImage(logoData, 'JPEG', 10, 4, 24, 24);
    } catch {
      // Fallback if logo fails
    }
  }

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('HTEIM School of Ministry', 38, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(251, 191, 36); // amber-400
  doc.text(reportTitle.toUpperCase(), 38, 19);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Generated: ${new Date().toLocaleString()} | Official Administrative Report`, 38, 25);

  let currentY = 40;

  // Filter Summary Box
  if (filterSummary.length > 0) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(10, currentY, pageWidth - 20, 12, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('ACTIVE FILTERS:', 14, currentY + 7);

    doc.setFont('helvetica', 'normal');
    doc.text(filterSummary.join('  |  '), 42, currentY + 7);

    currentY += 16;
  }

  // Summary Metrics Bar
  if (summaryMetrics.length > 0) {
    const metricBoxWidth = (pageWidth - 20 - (summaryMetrics.length - 1) * 4) / summaryMetrics.length;
    summaryMetrics.forEach((metric, index) => {
      const x = 10 + index * (metricBoxWidth + 4);
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(x, currentY, metricBoxWidth, 14, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(metric.label.toUpperCase(), x + 4, currentY + 5);

      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(String(metric.value), x + 4, currentY + 11);
    });

    currentY += 18;
  }

  // Table Headers
  const tableWidth = pageWidth - 20;
  const colWidth = tableWidth / columns.length;

  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(10, currentY, tableWidth, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);

  columns.forEach((col, idx) => {
    const x = 10 + idx * colWidth + 2;
    doc.text(col.header.toUpperCase(), x, currentY + 5);
  });

  currentY += 8;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  rows.forEach((row, rowIdx) => {
    // Page break handling
    if (currentY > pageHeight - 20) {
      doc.addPage();
      currentY = 20;

      // Repeat Table Header on new page
      doc.setFillColor(30, 41, 59);
      doc.rect(10, currentY, tableWidth, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      columns.forEach((col, idx) => {
        const x = 10 + idx * colWidth + 2;
        doc.text(col.header.toUpperCase(), x, currentY + 5);
      });
      currentY += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
    }

    // Zebra striping
    if (rowIdx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(10, currentY, tableWidth, 7, 'F');
    }

    doc.setTextColor(30, 41, 59);
    columns.forEach((col, idx) => {
      const x = 10 + idx * colWidth + 2;
      const rawVal = row[col.key];
      const cellText = rawVal === null || rawVal === undefined ? '' : String(rawVal);
      const truncated = cellText.length > 28 ? cellText.substring(0, 25) + '...' : cellText;
      doc.text(truncated, x, currentY + 5);
    });

    currentY += 7;
  });

  // Footer
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Heaven Touching Earth International Ministries - School of Ministry Portal  |  Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  doc.save(`${reportTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`);
}
