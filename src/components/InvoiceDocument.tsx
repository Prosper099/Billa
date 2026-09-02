import React, { useRef, useState } from 'react';
import {
  Printer,
  Download,
  Copy,
  Check,
  MessageCircle,
  CheckCircle2,
  Share2,
  ArrowLeft,
  Building2,
  ShieldCheck,
  Loader2,
  FileText,
  Trash2,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Invoice, BusinessProfile } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { BrandLogo } from './BrandLogo';
import { useApp } from '../context/AppContext';

interface InvoiceDocumentProps {
  invoice: Invoice;
  businessProfile: BusinessProfile;
  isLivePreview?: boolean;
  onBack?: () => void;
}

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({
  invoice,
  businessProfile,
  isLivePreview = false,
  onBack,
}) => {
  const {
    activeCurrency,
    markInvoiceAsPaid,
    setReminderModalInvoice,
    deleteInvoice,
    requestConfirmation,
    setCurrentView,
    showToast,
  } = useApp();

  const invoiceSheetRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);

    try {
      showToast('Generating PDF', 'Preparing your high-resolution invoice document...');
      const sheet = invoiceSheetRef.current;

      if (!sheet) {
        // Fallback to pure vector jsPDF if DOM ref is unavailable
        const pdf = generateVectorPdf(invoice, businessProfile);
        const safeFilename = `${invoice.invoiceNumber || 'Invoice'}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');
        pdf.save(safeFilename);
        showToast('PDF Saved', `Invoice ${invoice.invoiceNumber} downloaded successfully!`, 'success');
        return;
      }

      // Render canvas at 2x scale for crisp font rendering
      const canvas = await html2canvas(sheet, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1024,
        scrollX: 0,
        scrollY: 0,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const margin = 10; // 10mm margins
      const printWidth = pdfWidth - (margin * 2);
      const printHeight = (canvas.height * printWidth) / canvas.width;

      if (printHeight <= pdfHeight - (margin * 2)) {
        // Fits comfortably on single A4 sheet
        pdf.addImage(imgData, 'PNG', margin, margin, printWidth, printHeight, undefined, 'FAST');
      } else {
        // Multi-page slicing if invoice is longer
        let heightLeft = printHeight;
        let position = margin;

        pdf.addImage(imgData, 'PNG', margin, position, printWidth, printHeight, undefined, 'FAST');
        heightLeft -= (pdfHeight - (margin * 2));

        while (heightLeft > 0) {
          position = heightLeft - printHeight + margin;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', margin, position, printWidth, printHeight, undefined, 'FAST');
          heightLeft -= (pdfHeight - (margin * 2));
        }
      }

      const safeFilename = `${invoice.invoiceNumber || 'Invoice'}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');
      pdf.save(safeFilename);
      showToast('PDF Saved', `Invoice ${invoice.invoiceNumber} downloaded successfully!`, 'success');
    } catch (err: any) {
      console.warn('DOM PDF export fallback to vector jsPDF:', err);
      try {
        const vectorDoc = generateVectorPdf(invoice, businessProfile);
        const safeFilename = `${invoice.invoiceNumber || 'Invoice'}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');
        vectorDoc.save(safeFilename);
        showToast('PDF Saved', `Invoice ${invoice.invoiceNumber} downloaded successfully!`, 'success');
      } catch (vectorErr) {
        console.error('Vector PDF export error:', vectorErr);
        showToast('PDF Export Error', 'Failed to generate PDF. You can also use the Print button to Save as PDF.', 'error');
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const generateVectorPdf = (inv: Invoice, biz: BusinessProfile) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 20;

    // Header Logo Accent
    doc.setFillColor(79, 70, 229); // Indigo 600
    doc.roundedRect(margin, y, 9, 9, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('B', margin + 2.8, y + 6.5);

    // Business Name & Details
    doc.setTextColor(26, 28, 30);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text(biz.name || 'Billa Business', margin + 13, y + 6.5);

    // Invoice Title (Right-aligned)
    doc.setFontSize(20);
    doc.text('INVOICE', pageWidth - margin, y + 5, { align: 'right' });
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229);
    doc.text(inv.invoiceNumber || 'INV-0001', pageWidth - margin, y + 11, { align: 'right' });

    y += 16;
    // Sub-details: Business contact & Dates
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    if (biz.tagline) {
      doc.text(biz.tagline, margin, y);
      y += 4;
    }
    if (biz.address) {
      doc.text(biz.address, margin, y);
      y += 4;
    }
    if (biz.email || biz.phone) {
      doc.text(`${biz.email || ''} ${biz.phone ? '• ' + biz.phone : ''}`, margin, y);
      y += 4;
    }
    if (biz.taxNumber) {
      doc.text(`TIN: ${biz.taxNumber}`, margin, y);
      y += 4;
    }

    // Dates (Right column)
    const dateY = y - (biz.taxNumber ? 16 : 12);
    doc.text(`Issue Date: ${formatDate(inv.issueDate)}`, pageWidth - margin, Math.max(dateY, 28), { align: 'right' });
    doc.text(`Due Date: ${formatDate(inv.dueDate)}`, pageWidth - margin, Math.max(dateY + 5, 33), { align: 'right' });
    doc.text(`Status: ${inv.status.toUpperCase()}`, pageWidth - margin, Math.max(dateY + 10, 38), { align: 'right' });

    y = Math.max(y + 6, 46);

    // Billed To Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, pageWidth - (margin * 2), 22, 3, 3, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(148, 163, 184);
    doc.text('BILLED TO', margin + 5, y + 6);
    doc.setFontSize(11);
    doc.setTextColor(26, 28, 30);
    doc.text(inv.customerName || 'Customer', margin + 5, y + 12);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const contactLine = [inv.customerEmail, inv.customerPhone, inv.customerAddress].filter(Boolean).join(' • ');
    if (contactLine) {
      doc.text(contactLine, margin + 5, y + 17);
    }

    y += 28;

    // Items Table Header
    doc.setFillColor(26, 28, 30);
    doc.rect(margin, y, pageWidth - (margin * 2), 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPTION', margin + 4, y + 4.8);
    doc.text('QTY', pageWidth - margin - 70, y + 4.8, { align: 'center' });
    doc.text('UNIT PRICE', pageWidth - margin - 35, y + 4.8, { align: 'right' });
    doc.text('AMOUNT', pageWidth - margin - 4, y + 4.8, { align: 'right' });

    y += 7;

    // Items Rows
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    inv.items.forEach((item, index) => {
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, pageWidth - (margin * 2), 7, 'F');
      }
      doc.setFontSize(8.5);
      doc.text(item.description || 'Item', margin + 4, y + 4.8);
      doc.text(String(item.quantity), pageWidth - margin - 70, y + 4.8, { align: 'center' });
      doc.text(formatCurrency(item.unitPrice, inv.currency), pageWidth - margin - 35, y + 4.8, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 28, 30);
      doc.text(formatCurrency(item.total, inv.currency), pageWidth - margin - 4, y + 4.8, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      y += 7;
    });

    y += 5;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // Totals Section
    const totalsX = pageWidth - margin - 70;
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Subtotal:', totalsX, y);
    doc.setTextColor(26, 28, 30);
    doc.text(formatCurrency(inv.subtotal, inv.currency), pageWidth - margin - 4, y, { align: 'right' });
    y += 5;

    if (inv.discountAmount) {
      doc.setTextColor(16, 185, 129);
      doc.text(`Discount (${inv.discountPercentage}%):`, totalsX, y);
      doc.text(`-${formatCurrency(inv.discountAmount, inv.currency)}`, pageWidth - margin - 4, y, { align: 'right' });
      y += 5;
    }

    if (inv.taxAmount) {
      doc.setTextColor(100, 116, 139);
      doc.text(`VAT (${inv.taxRate}%):`, totalsX, y);
      doc.setTextColor(26, 28, 30);
      doc.text(`+${formatCurrency(inv.taxAmount, inv.currency)}`, pageWidth - margin - 4, y, { align: 'right' });
      y += 5;
    }

    if (inv.deliveryFee) {
      doc.setTextColor(100, 116, 139);
      doc.text('Delivery / Shipping:', totalsX, y);
      doc.setTextColor(26, 28, 30);
      doc.text(`+${formatCurrency(inv.deliveryFee, inv.currency)}`, pageWidth - margin - 4, y, { align: 'right' });
      y += 5;
    }

    doc.setDrawColor(26, 28, 30);
    doc.line(totalsX, y, pageWidth - margin, y);
    y += 6;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 28, 30);
    doc.text('Total Due:', totalsX, y);
    doc.text(formatCurrency(inv.total, inv.currency), pageWidth - margin - 4, y, { align: 'right' });

    // Bank Info Box
    y += 10;
    if (biz.accountNumber) {
      doc.setFillColor(15, 23, 42); // Slate 900
      doc.roundedRect(margin, y, pageWidth - (margin * 2), 20, 3, 3, 'F');
      doc.setTextColor(165, 180, 252);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('OFFICIAL BANK SETTLEMENT INSTRUCTIONS', margin + 5, y + 5.5);
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(`Bank: ${biz.bankName || 'N/A'}`, margin + 5, y + 11);
      doc.text(`Account No: ${biz.accountNumber}`, margin + 5, y + 16);
      doc.text(`Beneficiary: ${biz.accountName || biz.name}`, pageWidth / 2 + 5, y + 11);
      doc.text(`Reference: ${inv.invoiceNumber}`, pageWidth / 2 + 5, y + 16);
    }

    // Footer
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('Generated and verified via Billa AI Billing Assistant', pageWidth / 2, 285, { align: 'center' });

    return doc;
  };

  const [copiedAccountOnly, setCopiedAccountOnly] = useState(false);

  const copyBankDetails = () => {
    const text = `Bank: ${businessProfile.bankName}\nAccount Name: ${businessProfile.accountName}\nAccount Number: ${businessProfile.accountNumber}\nAmount: ${formatCurrency(invoice.total, invoice.currency)}\nInvoice Ref: ${invoice.invoiceNumber}`;
    navigator.clipboard.writeText(text);
    showToast('Payment Details Copied', 'Account number & bank details copied to clipboard.', 'success');
  };

  const copyAccountNumberOnly = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!businessProfile.accountNumber) return;
    navigator.clipboard.writeText(businessProfile.accountNumber);
    setCopiedAccountOnly(true);
    showToast('Account Number Copied', `Account Number ${businessProfile.accountNumber} copied to clipboard!`, 'success');
    setTimeout(() => setCopiedAccountOnly(false), 2500);
  };

  const copyShareLink = () => {
    const text = `Hello ${invoice.customerName}, here is your invoice ${invoice.invoiceNumber} for ${formatCurrency(invoice.total, invoice.currency)} from ${businessProfile.name}.\n\nPayment Details:\n${businessProfile.bankName} - ${businessProfile.accountNumber} (${businessProfile.accountName})\n\nThank you!`;
    navigator.clipboard.writeText(text);
    showToast('Share Link Copied', 'WhatsApp message format copied to clipboard.');
  };

  return (
    <div className={`space-y-6 ${isLivePreview ? 'w-full' : 'max-w-4xl mx-auto p-4 sm:p-6 animate-fadeIn'}`}>
      {/* Top Action Bar (hidden in live preview or print) */}
      {!isLivePreview && (
        <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-slate-200/90 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer border border-slate-200"
                title="Go back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>{invoice.invoiceNumber}</span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                    invoice.status === 'paid'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : invoice.status === 'overdue'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {invoice.status}
                </span>
              </h2>
              <p className="text-xs text-slate-500">Issued {formatDate(invoice.issueDate)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {invoice.status !== 'paid' && (
              <>
                <button
                  id="btn-doc-remind"
                  onClick={() => setReminderModalInvoice(invoice)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Send AI Reminder</span>
                </button>
                <button
                  id="btn-doc-mark-paid"
                  onClick={() => markInvoiceAsPaid(invoice.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark as Paid</span>
                </button>
              </>
            )}

            <button
              onClick={copyShareLink}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
              title="Copy share message"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>

            {/* Download as PDF Button */}
            <button
              id="btn-doc-download-pdf"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed"
              title="Download high-resolution PDF"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download as PDF</span>
                </>
              )}
            </button>

            {/* Browser Print / PDF Fallback Button */}
            <button
              id="btn-doc-print-pdf"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Print document"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>
      )}

      {/* The Printable High-Res Invoice Document Sheet */}
      <div
        ref={invoiceSheetRef}
        className="print-invoice-sheet bg-white text-slate-900 rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-200/90 space-y-8 select-text"
      >
        {/* Top Header: Business Branding & Invoice Meta */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-100 pb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-xs">
                <span>B</span>
              </div>
              <span className="text-xl font-black tracking-tight text-slate-900 font-sans">
                {businessProfile.name || 'Apex Studios'}
              </span>
            </div>
            <div className="text-xs text-slate-500 space-y-0.5 max-w-xs">
              <p className="font-medium text-slate-700">{businessProfile.tagline}</p>
              <p>{businessProfile.address}</p>
              <p>{businessProfile.phone} • {businessProfile.email}</p>
              {businessProfile.taxNumber && <p className="font-mono text-[11px]">TIN: {businessProfile.taxNumber}</p>}
            </div>
          </div>

          <div className="sm:text-right space-y-1">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">
              INVOICE
            </div>
            <div className="font-mono text-sm font-bold text-indigo-600">
              {invoice.invoiceNumber}
            </div>
            <div className="pt-2 text-xs text-slate-500 space-y-1">
              <div>
                <span className="text-slate-400 font-medium">Issue Date: </span>
                <span className="font-semibold text-slate-800">{formatDate(invoice.issueDate)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Due Date: </span>
                <span className="font-semibold text-slate-800">{formatDate(invoice.dueDate)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bill To & Payment Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 rounded-2xl p-5 border border-slate-100">
          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Billed To
            </div>
            <div className="text-base font-bold text-slate-900">{invoice.customerName}</div>
            <div className="text-xs text-slate-600 space-y-0.5">
              {invoice.customerAddress && <p>{invoice.customerAddress}</p>}
              <p>{invoice.customerEmail}</p>
              <p>{invoice.customerPhone}</p>
            </div>
          </div>

          <div className="sm:text-right space-y-2 flex flex-col sm:items-end justify-center">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Payment Status
            </div>
            <div>
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                  invoice.status === 'paid'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : invoice.status === 'overdue'
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                {invoice.status === 'paid' ? 'PAID IN FULL' : invoice.status === 'overdue' ? 'OVERDUE' : 'PAYMENT PENDING'}
              </span>
            </div>
          </div>
        </div>

        {/* Itemized Services / Products Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b-2 border-slate-900 text-slate-900 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-2">Description</th>
                <th className="py-3 px-4 text-center">Qty</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {invoice.items.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td className="py-3.5 px-2 font-medium text-slate-900">
                    {item.description || 'Item description'}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-medium">
                    {item.quantity}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-medium">
                    {formatCurrency(item.unitPrice, invoice.currency)}
                  </td>
                  <td className="py-3.5 px-2 text-right font-mono font-bold text-slate-900">
                    {formatCurrency(item.total, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Calculation Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-t border-slate-100 pt-6">
          {/* Notes & Terms */}
          <div className="space-y-3 max-w-sm">
            {invoice.notes && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Notes & Special Instructions
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{invoice.notes}</p>
              </div>
            )}
            {invoice.paymentTerms && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Terms & Conditions
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{invoice.paymentTerms}</p>
              </div>
            )}
          </div>

          {/* Breakdown Table */}
          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-mono font-semibold text-slate-900">
                {formatCurrency(invoice.subtotal, invoice.currency)}
              </span>
            </div>

            {invoice.discountAmount ? (
              <div className="flex justify-between text-emerald-600">
                <span>Discount ({invoice.discountPercentage}%)</span>
                <span className="font-mono font-semibold">
                  -{formatCurrency(invoice.discountAmount, invoice.currency)}
                </span>
              </div>
            ) : null}

            {invoice.taxAmount ? (
              <div className="flex justify-between text-slate-600">
                <span>VAT ({invoice.taxRate}%)</span>
                <span className="font-mono font-semibold text-slate-900">
                  +{formatCurrency(invoice.taxAmount, invoice.currency)}
                </span>
              </div>
            ) : null}

            {invoice.deliveryFee ? (
              <div className="flex justify-between text-slate-600">
                <span>Delivery / Shipping</span>
                <span className="font-mono font-semibold text-slate-900">
                  +{formatCurrency(invoice.deliveryFee, invoice.currency)}
                </span>
              </div>
            ) : null}

            <div className="border-t-2 border-slate-900 pt-3 flex justify-between items-baseline">
              <span className="text-sm font-extrabold uppercase text-slate-900">Total Due</span>
              <span className="text-xl sm:text-2xl font-black text-slate-950 font-mono">
                {formatCurrency(invoice.total, invoice.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Bank Payment Information Box */}
        <div className="rounded-2xl bg-slate-900 text-white p-5 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Official Bank Settlement Instructions
              </span>
            </div>
            <button
              onClick={copyBankDetails}
              className="no-print flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              <span>Copy Details</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-slate-800">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Bank Name</span>
              <span className="font-semibold text-white">{businessProfile.bankName}</span>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Account Number</span>
                <button
                  type="button"
                  onClick={copyAccountNumberOnly}
                  className="no-print text-[10px] text-indigo-300 hover:text-white flex items-center gap-1 font-semibold transition-colors cursor-pointer bg-slate-800/80 hover:bg-slate-700 px-1.5 py-0.5 rounded"
                  title="Copy Account Number"
                >
                  {copiedAccountOnly ? (
                    <>
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                      <span className="text-emerald-300">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-2.5 h-2.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono font-bold text-indigo-300 text-sm tracking-wide">
                  {businessProfile.accountNumber}
                </span>
              </div>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Beneficiary Name</span>
              <span className="font-semibold text-white">{businessProfile.accountName}</span>
            </div>
          </div>
        </div>

        {/* Footer Guarantee */}
        <div className="border-t border-slate-100 pt-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
          <span>Generated and verified via Billa AI Billing Assistant</span>
        </div>
      </div>
    </div>
  );
};
