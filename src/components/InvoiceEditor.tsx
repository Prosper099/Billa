import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Sparkles,
  ArrowLeft,
  Check,
  Eye,
  FileEdit,
  Building2,
  Calendar,
  Percent,
  Truck,
  HelpCircle,
  Save,
  Camera,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { InvoiceItem, Invoice, Customer } from '../types';
import { formatCurrency, generateInvoiceNumber, CURRENCIES } from '../utils/formatters';
import { InvoiceDocument } from './InvoiceDocument';

export const InvoiceEditor: React.FC = () => {
  const {
    businessProfile,
    customers,
    invoices,
    activeCurrency,
    createInvoice,
    setCurrentView,
    setSelectedInvoice,
    setIsQuickPromptOpen,
    setIsReceiptScannerOpen,
    receiptDraftData,
    setReceiptDraftData,
    showToast,
  } = useApp();

  // Form State
  const [currency, setCurrency] = useState<any>(activeCurrency || businessProfile.preferredCurrency || 'NGN');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [customerName, setCustomerName] = useState<string>(customers[0]?.name || '');
  const [customerEmail, setCustomerEmail] = useState<string>(customers[0]?.email || '');
  const [customerPhone, setCustomerPhone] = useState<string>(customers[0]?.phone || '');
  const [customerAddress, setCustomerAddress] = useState<string>(customers[0]?.address || '');

  // Keep currency synced with activeCurrency if not customized
  useEffect(() => {
    if (activeCurrency) {
      setCurrency(activeCurrency);
    }
  }, [activeCurrency]);

  const [invoiceNumber, setInvoiceNumber] = useState<string>(() => generateInvoiceNumber(invoices.length));
  const [issueDate, setIssueDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + (businessProfile.defaultPaymentTermsDays || 14));
    return d.toISOString().split('T')[0];
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: `item-${Date.now()}-1`,
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
    },
  ]);

  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [includeVat, setIncludeVat] = useState<boolean>(false);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [notes, setNotes] = useState<string>('Thank you for your business. Please remit payment directly to our bank account.');
  const [paymentTerms, setPaymentTerms] = useState<string>('Payment due within 14 days of invoice receipt.');

  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
  const [scannedReceiptBanner, setScannedReceiptBanner] = useState<boolean>(false);

  // Auto-fill from Scanned Receipt if available
  useEffect(() => {
    if (receiptDraftData) {
      if (receiptDraftData.customerName) setCustomerName(receiptDraftData.customerName);
      if (receiptDraftData.invoiceNumber) setInvoiceNumber(receiptDraftData.invoiceNumber);
      if (receiptDraftData.date) setIssueDate(receiptDraftData.date);
      if (receiptDraftData.dueDate) setDueDate(receiptDraftData.dueDate);
      if (receiptDraftData.items && receiptDraftData.items.length > 0) {
        setItems(receiptDraftData.items);
      }
      if (receiptDraftData.discountPercentage) {
        setDiscountPercentage(receiptDraftData.discountPercentage);
      }
      if (receiptDraftData.taxRate && receiptDraftData.taxRate > 0) {
        setIncludeVat(true);
      }
      if (receiptDraftData.notes) {
        setNotes(receiptDraftData.notes);
      }
      setScannedReceiptBanner(true);
      // Clear draft data so it doesn't re-trigger on subsequent edits
      setReceiptDraftData(null);
    }
  }, [receiptDraftData, setReceiptDraftData]);

  // Customer dropdown handler
  const handleCustomerSelect = (custId: string) => {
    setSelectedCustomerId(custId);
    if (custId === 'new') {
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setCustomerAddress('');
    } else {
      const cust = customers.find((c) => c.id === custId);
      if (cust) {
        setCustomerName(cust.name);
        setCustomerEmail(cust.email);
        setCustomerPhone(cust.phone);
        setCustomerAddress(cust.address || '');
      }
    }
  };

  // Line item handlers
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };

    if (field === 'quantity' || field === 'unitPrice') {
      const qty = field === 'quantity' ? Number(value) || 0 : item.quantity;
      const price = field === 'unitPrice' ? Number(value) || 0 : item.unitPrice;
      item.total = qty * price;
    }

    updated[index] = item;
    setItems(updated);
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length + 1}`,
        description: '',
        quantity: 1,
        unitPrice: 0,
        total: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      showToast('Line item required', 'An invoice must have at least one line item.', 'warning');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Real-time Totals Calculation
  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, it) => sum + (it.total || 0), 0);
    const discountAmount = discountPercentage > 0 ? (subtotal * discountPercentage) / 100 : 0;
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxRate = includeVat ? businessProfile.defaultTaxRate || 7.5 : 0;
    const taxAmount = (taxableAmount * taxRate) / 100;
    const total = Math.max(0, taxableAmount + taxAmount + (Number(deliveryFee) || 0));

    return {
      subtotal,
      discountAmount,
      taxRate,
      taxAmount,
      deliveryFee: Number(deliveryFee) || 0,
      total,
    };
  }, [items, discountPercentage, includeVat, deliveryFee, businessProfile.defaultTaxRate]);

  // Construct draft invoice object for preview & submission
  const previewInvoice: Invoice = useMemo(() => {
    return {
      id: 'draft-temp',
      invoiceNumber: invoiceNumber || 'BIL-2026-DRAFT',
      customerId: selectedCustomerId,
      customerName: customerName || 'Valued Client',
      customerEmail: customerEmail || 'client@example.com',
      customerPhone: customerPhone || '+234 800 000 0000',
      customerAddress: customerAddress || '',
      issueDate,
      dueDate,
      items,
      subtotal: totals.subtotal,
      discountPercentage,
      discountAmount: totals.discountAmount,
      taxRate: totals.taxRate,
      taxAmount: totals.taxAmount,
      deliveryFee: totals.deliveryFee,
      total: totals.total,
      status: 'pending',
      notes,
      paymentTerms,
      currency: currency || activeCurrency,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [
    invoiceNumber,
    selectedCustomerId,
    customerName,
    customerEmail,
    customerPhone,
    customerAddress,
    issueDate,
    dueDate,
    items,
    totals,
    discountPercentage,
    notes,
    paymentTerms,
    currency,
    activeCurrency,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      showToast('Customer Name Required', 'Please enter the client name.', 'error');
      return;
    }

    if (items.some((i) => !i.description.trim() || i.unitPrice <= 0)) {
      showToast('Check Line Items', 'Please ensure all items have a description and valid price.', 'error');
      return;
    }

    const created = createInvoice({
      invoiceNumber: invoiceNumber.trim() || generateInvoiceNumber(invoices.length),
      customerId: selectedCustomerId === 'new' ? `cust-${Date.now()}` : selectedCustomerId,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      issueDate,
      dueDate,
      items,
      subtotal: totals.subtotal,
      discountPercentage,
      discountAmount: totals.discountAmount,
      taxRate: totals.taxRate,
      taxAmount: totals.taxAmount,
      deliveryFee: totals.deliveryFee,
      total: totals.total,
      status: 'pending',
      notes,
      paymentTerms,
      currency: currency || activeCurrency,
    });

    setSelectedInvoice(created);
    setCurrentView('invoice-view');
  };

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5 sm:space-y-6 pb-28 lg:pb-8 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentView('invoices')}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A1C1E] tracking-tight">
              Create New Invoice
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live split-screen invoice builder with instant calculation
            </p>
          </div>
        </div>

        {/* Mobile Tab Switcher (Editor vs Live Preview) */}
        <div className="flex lg:hidden items-center bg-slate-100 border border-slate-200 rounded-xl p-1 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setMobileTab('editor')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mobileTab === 'editor'
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileEdit className="w-3.5 h-3.5" />
            <span>Editor</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mobileTab === 'preview'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview ({formatCurrency(totals.total, activeCurrency)})</span>
          </button>
        </div>
      </div>

      {/* Scanned Receipt Notification Alert */}
      {scannedReceiptBanner && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs font-bold">Receipt Details Auto-Populated by Billa Vision AI</p>
              <p className="text-[11px] text-emerald-700">Line items, pricing, and client fields have been loaded. Edit below as needed.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setScannedReceiptBanner(false)}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 px-2 py-1 rounded bg-white/60 hover:bg-white cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* AI Prompt & Receipt Camera Tools Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-white to-indigo-50/60 border border-indigo-200/90 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-100/80 text-indigo-700 border border-indigo-200 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Need instant auto-fill?</p>
            <p className="text-[11px] text-slate-500">Snap a paper receipt photo or dictate details using voice/text AI prompt.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <button
            type="button"
            id="editor-scan-receipt-btn"
            onClick={() => setIsReceiptScannerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-indigo-400" />
            <span>Scan Receipt</span>
          </button>

          <button
            type="button"
            id="editor-ai-prompt-btn"
            onClick={() => setIsQuickPromptOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Prompt</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Form Left (6 cols), Live Preview Right (6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Container (Hidden on mobile if tab is preview) */}
        <form
          onSubmit={handleSubmit}
          className={`lg:col-span-6 space-y-6 ${mobileTab === 'preview' ? 'hidden lg:block' : 'block'}`}
        >
          {/* Section 1: Customer Info */}
          <div className="rounded-2xl bg-white border border-slate-200/90 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                <span>1. Customer Details</span>
              </h2>

              <select
                aria-label="Select from existing customers"
                value={selectedCustomerId}
                onChange={(e) => handleCustomerSelect(e.target.value)}
                className="text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.companyName || 'Individual'})
                  </option>
                ))}
                <option value="new">+ Add New Customer</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-600 font-semibold">Customer / Business Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Chinedu Okonkwo"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 font-semibold">Phone / WhatsApp Number</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+234 803 000 0000"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 font-semibold">Email Address</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="client@company.ng"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 font-semibold">Billing Address</label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Victoria Island, Lagos"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Invoice Metadata (Dates & Reference & Currency) */}
          <div className="rounded-2xl bg-white border border-slate-200/90 p-5 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <span>2. Invoice Details & Currency</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-600 font-semibold">Invoice Number</label>
                <input
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 font-semibold">Issue Date</label>
                <input
                  type="date"
                  required
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 font-semibold">Due Date</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 font-semibold">Currency</label>
                <select
                  aria-label="Invoice Currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors shadow-2xs cursor-pointer"
                >
                  {Object.values(CURRENCIES).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol}) - {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Dynamic Itemized Services / Products */}
          <div className="rounded-2xl bg-white border border-slate-200/90 p-5 space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                <span>3. Line Items</span>
              </h2>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-scan-receipt-items"
                  onClick={() => setIsReceiptScannerOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  title="Scan physical receipt with Camera to auto-fill items"
                >
                  <Camera className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Scan with Camera</span>
                </button>

                <button
                  type="button"
                  id="btn-add-line-item"
                  onClick={addItem}
                  className="flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Web Design, Catering Services, Consulting, Physical Goods"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-500 font-medium">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 font-mono text-center focus:outline-none focus:border-indigo-500 shadow-2xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-500 font-medium">Unit Price ({CURRENCIES[currency]?.symbol || CURRENCIES[activeCurrency]?.symbol || ''})</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={item.unitPrice || ''}
                        onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                        placeholder="Enter amount (e.g. 15000)"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 font-mono text-right focus:outline-none focus:border-indigo-500 shadow-2xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-500 font-medium">Line Total</label>
                      <div className="px-2.5 py-1.5 rounded-lg bg-indigo-50/70 border border-indigo-100 text-indigo-700 font-mono font-bold text-right">
                        {formatCurrency(item.total, currency || activeCurrency)}
                      </div>
                    </div>
                  </div>

                  {/* Quick Amount Suggestion Chips for Fast Entry */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                    <span className="text-slate-400 font-medium">Quick amounts:</span>
                    {[2500, 5000, 10000, 25000, 50000, 100000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleItemChange(index, 'unitPrice', amt)}
                        className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 text-slate-600 font-mono transition-colors cursor-pointer"
                      >
                        +{formatCurrency(amt, currency || activeCurrency)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Adjustments (Discount, VAT, Delivery) */}
          <div className="rounded-2xl bg-white border border-slate-200/90 p-5 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <span>4. Discounts & Taxes</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-600 font-semibold">Discount (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercentage || ''}
                  onChange={(e) => setDiscountPercentage(Number(e.target.value) || 0)}
                  placeholder="0%"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 font-semibold">Delivery Fee ({CURRENCIES[currency]?.symbol || CURRENCIES[activeCurrency]?.symbol || ''})</label>
                <input
                  type="number"
                  min="0"
                  value={deliveryFee || ''}
                  onChange={(e) => setDeliveryFee(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors shadow-2xs"
                />
              </div>

              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeVat}
                    onChange={(e) => setIncludeVat(e.target.checked)}
                    className="rounded accent-indigo-600 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Apply VAT (7.5%)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 5: Notes & Payment Terms */}
          <div className="rounded-2xl bg-white border border-slate-200/90 p-5 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <span>5. Notes & Settlement Instructions</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-600 font-semibold">Customer Notes / Thank You</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 font-semibold">Payment Terms</label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Primary Submit Button */}
          <div className="sticky bottom-4 z-20 pt-2">
            <button
              type="submit"
              id="btn-save-invoice-final"
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/25 transition-all active:scale-[0.99] cursor-pointer"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              <span>Generate & Finalize Invoice ({formatCurrency(totals.total, currency || activeCurrency)})</span>
            </button>
          </div>
        </form>

        {/* Live Split-Screen Document Preview Container (Sticky on desktop) */}
        <div className={`lg:col-span-6 lg:sticky lg:top-20 ${mobileTab === 'editor' ? 'hidden lg:block' : 'block'}`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                <span>Live Document Preview</span>
              </span>
              <span className="text-xs font-mono font-bold text-indigo-600">
                Total: {formatCurrency(totals.total, currency || activeCurrency)}
              </span>
            </div>

            <div className="scale-95 sm:scale-100 origin-top">
              <InvoiceDocument
                 invoice={previewInvoice}
                 businessProfile={businessProfile}
                 isLivePreview={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
