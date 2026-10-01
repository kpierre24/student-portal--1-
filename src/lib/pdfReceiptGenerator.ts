import { jsPDF } from 'jspdf';
import { PaymentRecord, Receipt } from '../types';
import hteimLogoAsset from '../assets/hteim_logo.png';

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

export async function generateTuitionReceiptPDF(payment: PaymentRecord): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const logoData = await getLogoBase64();

  // Page Dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header Banner Background
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Gold accent bar
  doc.setFillColor(217, 119, 6); // amber-600
  doc.rect(0, 40, pageWidth, 2, 'F');

  // Header Logo if available
  if (logoData) {
    try {
      doc.addImage(logoData, 'JPEG', 12, 6, 28, 28);
    } catch {
      // Fallback text if logo fails to render in canvas
    }
  }

  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('HTEIM SCHOOL OF MINISTRY', 45, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('Heaven Touching Earth Int\'l Ministries • Academic Financial Office', 45, 21);
  doc.text('"Bringing Heaven to Earth, Taking People to Heaven"', 45, 27);

  // Official Receipt Title Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, 48, pageWidth - 24, 22, 3, 3, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('OFFICIAL TUITION RECEIPT & ACKNOWLEDGEMENT', 18, 57);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Receipt #: ${payment.id.toUpperCase()}`, 18, 64);

  const txnDate = payment.lastPaymentDate !== 'N/A' ? payment.lastPaymentDate : new Date().toLocaleDateString();
  doc.text(`Issue Date: ${txnDate}`, pageWidth - 18, 64, { align: 'right' });

  // Student & Program Details Card
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(12, 76, pageWidth - 24, 38, 3, 3, 'D');

  doc.setFillColor(241, 245, 249);
  doc.rect(12, 76, pageWidth - 24, 8, 'F');
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('STUDENT & ENROLLMENT INFORMATION', 16, 81.5);

  // Student Details Content
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Student Name: ${payment.studentName}`, 16, 91);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Student ID: ${payment.studentId}`, 16, 97);
  doc.text(`Email Address: ${payment.email || 'N/A'}`, 16, 103);

  doc.text(`Program Track: ${payment.moduleTrack}`, 110, 91);
  doc.text(`Payment Method: ${payment.paymentMethod}`, 110, 97);
  
  const statusColor = payment.status === 'Paid In Full' ? [16, 185, 129] : payment.status === 'Partial' ? [217, 119, 6] : [239, 68, 68];
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(`Payment Status: ${payment.status.toUpperCase()}`, 110, 103);

  // Financial Tuition Breakdown Table
  const tableStartY = 120;
  doc.setFillColor(15, 23, 42);
  doc.rect(12, tableStartY, pageWidth - 24, 9, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DESCRIPTION / TUITION ITEM', 16, tableStartY + 6);
  doc.text('AMOUNT (USD)', pageWidth - 16, tableStartY + 6, { align: 'right' });

  // Rows
  let currentY = tableStartY + 15;
  
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(`Academic Semester Tuition - ${payment.moduleTrack}`, 16, currentY);
  doc.text(`$${payment.totalTuition.toLocaleString()}`, pageWidth - 16, currentY, { align: 'right' });

  currentY += 8;
  doc.setDrawColor(241, 245, 249);
  doc.line(12, currentY - 4, pageWidth - 12, currentY - 4);

  doc.setTextColor(16, 185, 129); // emerald
  doc.setFont('helvetica', 'bold');
  doc.text('Total Amount Received & Recorded', 16, currentY);
  doc.text(`$${payment.amountPaid.toLocaleString()}`, pageWidth - 16, currentY, { align: 'right' });

  currentY += 8;
  doc.line(12, currentY - 4, pageWidth - 12, currentY - 4);

  const remaining = payment.totalTuition - payment.amountPaid;
  doc.setTextColor(remaining > 0 ? 180 : 15, remaining > 0 ? 83 : 23, remaining > 0 ? 9 : 42);
  doc.setFont('helvetica', 'bold');
  doc.text('Remaining Tuition Balance Outstanding', 16, currentY);
  doc.text(`$${remaining.toLocaleString()}`, pageWidth - 16, currentY, { align: 'right' });

  // Box Summary Box
  currentY += 12;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(12, currentY, pageWidth - 24, 20, 3, 3, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const notesText = payment.notes ? `Remarks: ${payment.notes}` : 'Remarks: Official tuition acknowledgment issued by the Academic Registrar.';
  const splitNotes = doc.splitTextToSize(notesText, pageWidth - 32);
  doc.text(splitNotes, 16, currentY + 7);

  // Official Seal & Verification
  currentY += 28;
  doc.setDrawColor(226, 232, 240);
  doc.line(12, currentY, pageWidth - 12, currentY);

  currentY += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('VERIFICATION & OFFICIAL SIGNATURE', 16, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Authorized Registrar: HTEIM Academic Office', 16, currentY + 5);
  doc.text('Digital Security Token: HTEIM-VERIFIED-AUTH-2026', 16, currentY + 9);

  // Technology Developer Partner Watermark Footer
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 275, pageWidth, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(251, 191, 36); // amber-400
  doc.text('SOFTWARE DEVELOPED & POWERED BY ROCKPROXY TECHNOLOGIES', pageWidth / 2, 281, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text('Director: Kendell Pierre • Email: rockproxytechnologies@gmail.com', pageWidth / 2, 286, { align: 'center' });
  doc.text('HTEIM School of Ministry ERP System • Official Digital Document', pageWidth / 2, 290, { align: 'center' });

  // Save PDF
  const safeFilename = `HTEIM_Tuition_Receipt_${payment.studentName.replace(/[^a-zA-Z0-0]/g, '_')}_${payment.id}.pdf`;
  doc.save(safeFilename);
}

/**
 * Generate Student Account Statement PDF for all transactions of a student
 */
export async function generateStudentAccountStatementPDF(
  studentName: string,
  studentId: string,
  email: string,
  payments: PaymentRecord[]
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const logoData = await getLogoBase64();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top header banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 38, 'F');
  doc.setFillColor(217, 119, 6);
  doc.rect(0, 38, pageWidth, 2, 'F');

  if (logoData) {
    try {
      doc.addImage(logoData, 'JPEG', 12, 5, 28, 28);
    } catch {
      // fallback
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('HTEIM SCHOOL OF MINISTRY', 45, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Official Student Tuition & Financial Account Statement', 45, 20);
  doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 45, 26);

  // Statement Header Details
  let currentY = 48;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`STUDENT FINANCIAL STATEMENT: ${studentName.toUpperCase()}`, 12, currentY);

  currentY += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Student ID: ${studentId} • Email: ${email || 'N/A'}`, 12, currentY);

  // Table header
  currentY += 10;
  doc.setFillColor(15, 23, 42);
  doc.rect(12, currentY, pageWidth - 24, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('RECORD ID', 15, currentY + 5.5);
  doc.text('PROGRAM TRACK', 50, currentY + 5.5);
  doc.text('TUITION', 120, currentY + 5.5, { align: 'right' });
  doc.text('PAID', 150, currentY + 5.5, { align: 'right' });
  doc.text('BALANCE', pageWidth - 15, currentY + 5.5, { align: 'right' });

  currentY += 8;

  let totalTuitionAll = 0;
  let totalPaidAll = 0;

  payments.forEach((rec, idx) => {
    totalTuitionAll += rec.totalTuition;
    totalPaidAll += rec.amountPaid;
    const balance = rec.totalTuition - rec.amountPaid;

    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(12, currentY, pageWidth - 24, 7, 'F');
    }

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    doc.text(rec.id.toUpperCase(), 15, currentY + 4.5);
    doc.text(rec.moduleTrack.slice(0, 32), 50, currentY + 4.5);
    doc.text(`$${rec.totalTuition.toLocaleString()}`, 120, currentY + 4.5, { align: 'right' });
    doc.text(`$${rec.amountPaid.toLocaleString()}`, 150, currentY + 4.5, { align: 'right' });
    doc.text(`$${balance.toLocaleString()}`, pageWidth - 15, currentY + 4.5, { align: 'right' });

    currentY += 7;
  });

  // Total summary row
  doc.setFillColor(241, 245, 249);
  doc.rect(12, currentY, pageWidth - 24, 9, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(12, currentY, pageWidth - 24, 9, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL ACCOUNT SUMMARY', 15, currentY + 6);

  doc.text(`$${totalTuitionAll.toLocaleString()}`, 120, currentY + 6, { align: 'right' });
  doc.setTextColor(16, 185, 129);
  doc.text(`$${totalPaidAll.toLocaleString()}`, 150, currentY + 6, { align: 'right' });
  const totalBalance = totalTuitionAll - totalPaidAll;
  doc.setTextColor(totalBalance > 0 ? 180 : 15, totalBalance > 0 ? 83 : 23, totalBalance > 0 ? 9 : 42);
  doc.text(`$${totalBalance.toLocaleString()}`, pageWidth - 15, currentY + 6, { align: 'right' });

  // Developer credit footer
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 275, pageWidth, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(251, 191, 36);
  doc.text('SOFTWARE DEVELOPED & POWERED BY ROCKPROXY TECHNOLOGIES', pageWidth / 2, 281, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text('Director: Kendell Pierre • Email: rockproxytechnologies@gmail.com', pageWidth / 2, 286, { align: 'center' });

  doc.save(`HTEIM_Financial_Statement_${studentName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

export async function generateOfficialReceiptPDF(receipt: Receipt): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const logoData = await getLogoBase64();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner Background
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Gold accent bar
  doc.setFillColor(217, 119, 6); // amber-600
  doc.rect(0, 40, pageWidth, 2, 'F');

  if (logoData) {
    try {
      doc.addImage(logoData, 'JPEG', 12, 6, 28, 28);
    } catch (e) {
      // ignore
    }
  }

  // Header Titles
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('HEAVEN TOUCHING EARTH INTERNATIONAL MINISTRIES', 46, 16);

  doc.setFontSize(10);
  doc.setTextColor(251, 191, 36); // amber-400
  doc.text('SCHOOL OF MINISTRY — OFFICIAL TUITION RECEIPT', 46, 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('Bursar & Treasury Office • Academic Financial Management System', 46, 29);
  doc.text(`Official Receipt No: ${receipt.receiptNumber} • Verification: ${receipt.verificationCode || 'HTEIM-VALID'}`, 46, 35);

  // Metadata Box
  doc.setFillColor(248, 250, 252);
  doc.rect(12, 48, pageWidth - 24, 28, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(12, 48, pageWidth - 24, 28, 'D');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('STUDENT & BILLING DETAILS', 16, 55);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Student Name: `, 16, 61);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(receipt.studentName, 42, 61);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Student ID: `, 16, 67);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(receipt.studentId, 42, 67);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Academic Term: `, 16, 73);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(receipt.academicTerm || '2026 Semester 1', 42, 73);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Payment Date: `, 115, 61);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(receipt.paymentDate, 142, 61);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Payment Method: `, 115, 67);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(receipt.paymentMethod, 142, 67);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Payment Ref: `, 115, 73);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(receipt.paymentReference || 'N/A', 142, 73);

  // Financial Items Table
  let currentY = 84;
  doc.setFillColor(15, 23, 42);
  doc.rect(12, currentY, pageWidth - 24, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('LINE ITEM DESCRIPTION', 16, currentY + 5.5);
  doc.text('TOTAL BILLED', 115, currentY + 5.5, { align: 'right' });
  doc.text('DISCOUNTS/AID', 145, currentY + 5.5, { align: 'right' });
  doc.text('AMOUNT PAID', pageWidth - 16, currentY + 5.5, { align: 'right' });

  currentY += 8;
  doc.setFillColor(255, 255, 255);
  doc.rect(12, currentY, pageWidth - 24, 12, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(12, currentY, pageWidth - 24, 12, 'D');

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(receipt.courseOrModule || 'School of Ministry 6 Core Curriculum Modules', 16, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Invoice Ref: ${receipt.invoiceId} • Transaction: ${receipt.paymentId}`, 16, currentY + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`$${(receipt.totalTuitionBilled || 1200).toLocaleString()}`, 115, currentY + 7, { align: 'right' });
  doc.text(`$${(receipt.discountsAndScholarships || 0).toLocaleString()}`, 145, currentY + 7, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(`$${receipt.amountPaid.toLocaleString()}`, pageWidth - 16, currentY + 7, { align: 'right' });

  currentY += 12;

  // Summary Totals
  doc.setFillColor(241, 245, 249);
  doc.rect(12, currentY, pageWidth - 24, 20, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(12, currentY, pageWidth - 24, 20, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL AMOUNT RECEIVED THIS TRANSACTION:', 16, currentY + 8);
  doc.setTextColor(16, 185, 129);
  doc.text(`$${receipt.amountPaid.toFixed(2)} USD`, pageWidth - 16, currentY + 8, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Remaining Outstanding Balance on Account:', 16, currentY + 15);
  const remBalance = receipt.balanceRemaining !== undefined ? receipt.balanceRemaining : 0;
  doc.setTextColor(remBalance > 0 ? 225 : 16, remBalance > 0 ? 29 : 185, remBalance > 0 ? 72 : 129);
  doc.text(`$${remBalance.toFixed(2)} USD`, pageWidth - 16, currentY + 15, { align: 'right' });

  // Verification & Signatures
  currentY += 28;
  doc.setFillColor(248, 250, 252);
  doc.rect(12, currentY, pageWidth - 24, 28, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(12, currentY, pageWidth - 24, 28, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('AUTHORIZED SIGNATURE & INSTITUTIONAL SEAL', 16, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Issued by: ${receipt.issuedBy || 'Finance Bursar'}`, 16, currentY + 13);
  doc.text(`Timestamp: ${receipt.issuedAt || new Date().toISOString()}`, 16, currentY + 18);
  doc.text(`Notes: ${receipt.notes || 'Official university ministerial receipt.'}`, 16, currentY + 23);

  doc.setDrawColor(148, 163, 184);
  doc.line(pageWidth - 65, currentY + 18, pageWidth - 16, currentY + 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('AUTHORIZED TREASURER SIGNATURE', pageWidth - 40, currentY + 22, { align: 'center' });

  // Footer
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 275, pageWidth, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(251, 191, 36);
  doc.text('HEAVEN TOUCHING EARTH INTERNATIONAL MINISTRIES', pageWidth / 2, 281, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text('Official Tuition & Financial Management System • All Rights Reserved', pageWidth / 2, 286, { align: 'center' });

  doc.save(`HTEIM_Receipt_${receipt.receiptNumber}.pdf`);
}

