import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  X,
  RefreshCw,
  Check,
  Plus,
  Trash2,
  FileText,
  User,
  ZoomIn,
  ZoomOut,
  SwitchCamera,
  Image as ImageIcon,
  CheckCircle2,
  FileCheck,
  Smartphone,
  Info,
  AlertTriangle,
  AlertCircle,
  Calculator,
  ShieldCheck,
  Sliders,
  ArrowRight,
  ArrowLeft,
  Eye,
  Maximize2,
  RotateCcw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { formatCurrency, generateInvoiceNumber } from '../utils/formatters';
import { InvoiceItem } from '../types';
import { callAiEndpoint } from '../services/aiClient';

interface ExtractedReceiptData {
  merchantName: string;
  customerName: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountPercentage: number;
  discountAmount: number;
  deliveryFee?: number;
  total: number;
  currency: string;
  notes: string;
  confidence: number;
}

export const ReceiptScannerModal: React.FC = () => {
  const {
    isReceiptScannerOpen,
    setIsReceiptScannerOpen,
    activeCurrency,
    createInvoice,
    setCurrentView,
    setSelectedInvoice,
    setReceiptDraftData,
    customers,
    showToast,
  } = useApp();

  // Step flow: 'capture' | 'processing' | 'correction' | 'confirmation'
  const [step, setStep] = useState<'capture' | 'processing' | 'correction' | 'confirmation'>('capture');

  // Camera Mode: 'options' | 'live'
  const [captureMode, setCaptureMode] = useState<'options' | 'live'>('options');

  // Camera State
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Dedicated file & mobile camera input refs
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  // Captured Image & Extracted Data
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedReceiptData | null>(null);
  const [isSavingDirectly, setIsSavingDirectly] = useState<boolean>(false);

  // Image inspection tools for side-by-side review
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isEnhancedContrast, setIsEnhancedContrast] = useState<boolean>(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);

  // Manual correction & verification tracking
  const [isVerifiedByUser, setIsVerifiedByUser] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'editor' | 'receipt'>('editor');
  const [validationWarning, setValidationWarning] = useState<string | null>(null);

  // Drag & drop state
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  // Stop camera stream utility
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Start live camera stream
  const startLiveCamera = useCallback(async (mode: 'environment' | 'user' = facingMode) => {
    try {
      setCameraError(null);
      stopCamera();

      if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Direct browser viewfinder requires HTTPS / device permission. Tap "Take Photo" below for direct camera capture.');
        setCaptureMode('options');
        return;
      }

      setCaptureMode('live');

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode } },
          audio: false,
        });
      } catch {
        // Broad fallback constraint for older or strict webcam devices
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.muted = true;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Camera stream initialisation note:', err);
      setCameraError('Direct camera permission was blocked or unavailable. You can use "Take Photo" or "Choose Photo" to scan your receipt directly.');
      setCameraActive(false);
      setCaptureMode('options');
    }
  }, [facingMode, stopCamera]);

  // Handle open / close lifecycle & keyboard escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsReceiptScannerOpen(false);
      }
    };

    if (isReceiptScannerOpen) {
      setStep('capture');
      setCaptureMode('options');
      setCapturedImage(null);
      setExtractedData(null);
      setCameraError(null);
      setIsDraggingOver(false);
      window.addEventListener('keydown', handleKeyDown);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isReceiptScannerOpen, stopCamera, setIsReceiptScannerOpen]);

  // Global clipboard paste listener for screenshots / copied images
  useEffect(() => {
    if (!isReceiptScannerOpen || step !== 'capture') return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            setStep('processing');
            stopCamera();
            const reader = new FileReader();
            reader.onload = (event) => {
              const dataUrl = event.target?.result as string;
              if (dataUrl) {
                compressAndProcessImage(dataUrl);
              }
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isReceiptScannerOpen, step, stopCamera]);

  // Flip front/rear camera
  const handleToggleCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startLiveCamera(nextMode);
  };

  // Capture frame from live video stream
  const handleSnapLivePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);

    stopCamera();
    setCapturedImage(imageDataUrl);
    processReceiptImage(imageDataUrl);
  };

  // Image compressor & auto-orient for mobile photos (downscales 12MP photos to ~1200px)
  const compressAndProcessImage = (dataUrl: string) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 1200;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(compressed);
        processReceiptImage(compressed);
      } else {
        setCapturedImage(dataUrl);
        processReceiptImage(dataUrl);
      }
    };
    img.onerror = () => {
      setCapturedImage(dataUrl);
      processReceiptImage(dataUrl);
    };
    img.src = dataUrl;
  };

  // Handle file input or mobile camera capture
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Immediate visual feedback
    setStep('processing');
    stopCamera();

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        compressAndProcessImage(dataUrl);
      }
    };
    reader.onerror = () => {
      setStep('capture');
      setCameraError('Failed to read image file. Please try selecting another file.');
    };
    reader.readAsDataURL(file);
    // Reset file input value to allow selecting same file again if needed
    e.target.value = '';
  };

  // Handle Drag & Drop of receipt images
  const handleDropReceipt = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type.includes('pdf'))) {
      setStep('processing');
      stopCamera();
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          compressAndProcessImage(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Sample Receipt for instant testing
  const handleUseSampleReceipt = () => {
    stopCamera();
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 600;
    sampleCanvas.height = 800;
    const ctx = sampleCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 600, 800);
      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 24px monospace';
      ctx.fillText('STARLIGHT SUPPLIES LTD', 140, 70);
      ctx.font = '14px monospace';
      ctx.fillText('42 Adeniyi Jones, Ikeja, Lagos', 150, 100);
      ctx.fillText('Tel: +234 803 555 0192', 190, 125);
      ctx.fillText('--------------------------------------', 90, 155);
      ctx.fillText('CASH RECEIPT / INVOICE #ST-8902', 130, 185);
      ctx.fillText(`Date: ${new Date().toISOString().split('T')[0]}`, 130, 210);
      ctx.fillText('Customer: Fatima Aliyu', 130, 235);
      ctx.fillText('--------------------------------------', 90, 265);
      ctx.fillText('1x UI/UX Design System         ₦120,000', 100, 305);
      ctx.fillText('2x Frontend Development Sprints ₦180,000', 100, 345);
      ctx.fillText('1x Cloud Server Setup           ₦45,000', 100, 385);
      ctx.fillText('--------------------------------------', 90, 425);
      ctx.fillText('Subtotal:                      ₦345,000', 100, 465);
      ctx.fillText('VAT (7.5%):                     ₦25,875', 100, 495);
      ctx.fillText('Discount (5%):                 -₦17,250', 100, 525);
      ctx.font = 'bold 18px monospace';
      ctx.fillText('TOTAL PAID:                    ₦353,625', 100, 570);
      ctx.font = '14px monospace';
      ctx.fillText('--------------------------------------', 90, 610);
      ctx.fillText('THANK YOU FOR YOUR BUSINESS!', 160, 650);
    }
    const sampleDataUrl = sampleCanvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(sampleDataUrl);
    processReceiptImage(sampleDataUrl);
  };

  // Send image to backend Gemini OCR endpoint
  const processReceiptImage = async (imageBase64: string) => {
    setStep('processing');

    try {
      // Auto-detect MIME type from data URL prefix
      const mimeMatch = imageBase64.match(/^data:([^;]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

      const { data, isFallback, fallbackReason, source } = await callAiEndpoint(
        '/api/ai/parse-receipt',
        {
          imageBase64,
          mimeType,
          defaultCurrency: activeCurrency,
        },
        { timeoutMs: 22000 }
      );

      const receipt = data?.receipt;
      if (!receipt) {
        throw new Error(fallbackReason || 'Empty receipt data received from server');
      }

      if (isFallback) {
        console.info(`[ReceiptScannerModal] Processed receipt with fallback engine (${source}): ${fallbackReason}`);
      }

      const structured: ExtractedReceiptData = {
        merchantName: receipt.merchantName || 'Merchant',
        customerName: receipt.customerName || 'Customer',
        invoiceNumber: receipt.invoiceNumber || generateInvoiceNumber(10),
        date: receipt.date || new Date().toISOString().split('T')[0],
        dueDate: receipt.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        items: (receipt.items || []).map((it: any, idx: number) => ({
          id: `item-${Date.now()}-${idx}`,
          description: it.description || 'Service / Product',
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          total: Number(it.total) || (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
        })),
        subtotal: Number(receipt.subtotal) || 0,
        taxRate: Number(receipt.taxRate) || 0,
        taxAmount: Number(receipt.taxAmount) || 0,
        discountPercentage: Number(receipt.discountPercentage) || 0,
        discountAmount: Number(receipt.discountAmount) || 0,
        deliveryFee: 0,
        total: Number(receipt.total) || 0,
        currency: receipt.currency || activeCurrency,
        notes: receipt.notes || 'Extracted from photo receipt.',
        confidence: receipt.confidence || 95,
      };

      setExtractedData(structured);
      setIsVerifiedByUser(false);
      setValidationWarning(null);
      setStep('correction');
    } catch (err: any) {
      console.error('Receipt parsing fallback:', err);
      const todayStr = new Date().toISOString().split('T')[0];
      const dueStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      setExtractedData({
        merchantName: 'Store / Merchant',
        customerName: 'Customer',
        invoiceNumber: generateInvoiceNumber(12),
        date: todayStr,
        dueDate: dueStr,
        items: [
          {
            id: `item-${Date.now()}-1`,
            description: 'Item from receipt',
            quantity: 1,
            unitPrice: 0,
            total: 0,
          },
        ],
        subtotal: 0,
        taxRate: 0,
        taxAmount: 0,
        discountPercentage: 0,
        discountAmount: 0,
        deliveryFee: 0,
        total: 0,
        currency: activeCurrency,
        notes: 'Receipt photo captured. Please verify or enter line item amounts.',
        confidence: 60,
      });
      setIsVerifiedByUser(false);
      setValidationWarning(null);
      setStep('correction');
    }
  };

  // Calculation of computed totals from line items for discrepancy detection
  const computedMetrics = useMemo(() => {
    if (!extractedData) {
      return {
        subtotal: 0,
        discountAmount: 0,
        taxAmount: 0,
        deliveryFee: 0,
        expectedTotal: 0,
        discrepancy: 0,
        hasDiscrepancy: false,
        unpricedCount: 0,
      };
    }

    const sub = extractedData.items.reduce((acc, it) => acc + (it.total || 0), 0);
    const disc = (sub * (extractedData.discountPercentage || 0)) / 100;
    const taxable = Math.max(0, sub - disc);
    const tax = (taxable * (extractedData.taxRate || 0)) / 100;
    const delivery = extractedData.deliveryFee || 0;
    const expTotal = Math.max(0, taxable + tax + delivery);
    const diff = Math.abs(expTotal - (extractedData.total || 0));
    const unpriced = extractedData.items.filter((it) => !it.unitPrice || it.unitPrice <= 0).length;

    return {
      subtotal: sub,
      discountAmount: disc,
      taxAmount: tax,
      deliveryFee: delivery,
      expectedTotal: expTotal,
      discrepancy: diff,
      hasDiscrepancy: diff > 0.05,
      unpricedCount: unpriced,
    };
  }, [extractedData]);

  // Real-time edits in the interactive manual correction step
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    if (!extractedData) return;
    const newItems = [...extractedData.items];
    const updated = { ...newItems[index], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      const q = field === 'quantity' ? Math.max(0, Number(value) || 0) : updated.quantity;
      const p = field === 'unitPrice' ? Math.max(0, Number(value) || 0) : updated.unitPrice;
      updated.total = q * p;
    }
    newItems[index] = updated;

    const subtotal = newItems.reduce((acc, it) => acc + (it.total || 0), 0);
    const discAmt = (subtotal * (extractedData.discountPercentage || 0)) / 100;
    const taxable = Math.max(0, subtotal - discAmt);
    const taxAmt = (taxable * (extractedData.taxRate || 0)) / 100;
    const delivery = extractedData.deliveryFee || 0;
    const total = Math.max(0, taxable + taxAmt + delivery);

    setExtractedData({
      ...extractedData,
      items: newItems,
      subtotal,
      discountAmount: discAmt,
      taxAmount: taxAmt,
      total,
    });
  };

  const handleAddItem = () => {
    if (!extractedData) return;
    const newItems = [
      ...extractedData.items,
      {
        id: `item-${Date.now()}-${extractedData.items.length + 1}`,
        description: 'New Item',
        quantity: 1,
        unitPrice: 0,
        total: 0,
      },
    ];
    setExtractedData({ ...extractedData, items: newItems });
  };

  const handleRemoveItem = (index: number) => {
    if (!extractedData || extractedData.items.length <= 1) return;
    const newItems = extractedData.items.filter((_, i) => i !== index);
    const subtotal = newItems.reduce((acc, it) => acc + (it.total || 0), 0);
    const discAmt = (subtotal * (extractedData.discountPercentage || 0)) / 100;
    const taxable = Math.max(0, subtotal - discAmt);
    const taxAmt = (taxable * (extractedData.taxRate || 0)) / 100;
    const delivery = extractedData.deliveryFee || 0;
    const total = Math.max(0, taxable + taxAmt + delivery);

    setExtractedData({
      ...extractedData,
      items: newItems,
      subtotal,
      discountAmount: discAmt,
      taxAmount: taxAmt,
      total,
    });
  };

  const handleTaxRateChange = (newRate: number) => {
    if (!extractedData) return;
    const validRate = Math.max(0, newRate || 0);
    const subtotal = extractedData.subtotal;
    const discAmt = (subtotal * (extractedData.discountPercentage || 0)) / 100;
    const taxable = Math.max(0, subtotal - discAmt);
    const taxAmt = (taxable * validRate) / 100;
    const delivery = extractedData.deliveryFee || 0;
    const total = Math.max(0, taxable + taxAmt + delivery);

    setExtractedData({
      ...extractedData,
      taxRate: validRate,
      taxAmount: taxAmt,
      total,
    });
  };

  const handleDiscountPercentageChange = (newDiscount: number) => {
    if (!extractedData) return;
    const validDisc = Math.max(0, newDiscount || 0);
    const subtotal = extractedData.subtotal;
    const discAmt = (subtotal * validDisc) / 100;
    const taxable = Math.max(0, subtotal - discAmt);
    const taxAmt = (taxable * (extractedData.taxRate || 0)) / 100;
    const delivery = extractedData.deliveryFee || 0;
    const total = Math.max(0, taxable + taxAmt + delivery);

    setExtractedData({
      ...extractedData,
      discountPercentage: validDisc,
      discountAmount: discAmt,
      taxAmount: taxAmt,
      total,
    });
  };

  const handleDeliveryFeeChange = (newFee: number) => {
    if (!extractedData) return;
    const fee = Math.max(0, newFee || 0);
    const subtotal = extractedData.subtotal;
    const discAmt = extractedData.discountAmount || 0;
    const taxable = Math.max(0, subtotal - discAmt);
    const taxAmt = extractedData.taxAmount || 0;
    const total = Math.max(0, taxable + taxAmt + fee);

    setExtractedData({
      ...extractedData,
      deliveryFee: fee,
      total,
    });
  };

  const handleSyncTotalToCalculated = () => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      subtotal: computedMetrics.subtotal,
      discountAmount: computedMetrics.discountAmount,
      taxAmount: computedMetrics.taxAmount,
      total: computedMetrics.expectedTotal,
    });
    showToast('Totals Reconciled', `Invoice total synced to ${formatCurrency(computedMetrics.expectedTotal, extractedData.currency as any)}`);
  };

  const handleAddAdjustmentItem = () => {
    if (!extractedData) return;
    const diff = Number((extractedData.total - computedMetrics.expectedTotal).toFixed(2));
    if (diff === 0) return;

    const adjustmentItem: InvoiceItem = {
      id: `item-${Date.now()}-adj`,
      description: diff > 0 ? 'Receipt Balance / Service Charge' : 'Discount / Negative Adjustment',
      quantity: 1,
      unitPrice: diff,
      total: diff,
    };

    const newItems = [...extractedData.items, adjustmentItem];
    const subtotal = newItems.reduce((acc, it) => acc + (it.total || 0), 0);
    const discAmt = (subtotal * (extractedData.discountPercentage || 0)) / 100;
    const taxable = Math.max(0, subtotal - discAmt);
    const taxAmt = (taxable * (extractedData.taxRate || 0)) / 100;
    const delivery = extractedData.deliveryFee || 0;
    const total = Math.max(0, taxable + taxAmt + delivery);

    setExtractedData({
      ...extractedData,
      items: newItems,
      subtotal,
      discountAmount: discAmt,
      taxAmount: taxAmt,
      total,
    });

    showToast('Line Item Added', `Added adjustment line for ${formatCurrency(diff, extractedData.currency as any)}`);
  };

  const handleProceedToConfirmation = () => {
    if (!extractedData) return;
    if (computedMetrics.unpricedCount > 0) {
      setValidationWarning(`There are ${computedMetrics.unpricedCount} line items with ₦0.00 / missing price. Please provide valid unit prices.`);
      return;
    }
    setValidationWarning(null);
    setIsVerifiedByUser(true);
    setStep('confirmation');
  };

  // Action 1: Customize in Invoice Studio
  const handleOpenInStudio = () => {
    if (!extractedData) return;
    setReceiptDraftData({
      ...extractedData,
      capturedImage,
    });
    setIsReceiptScannerOpen(false);
    setCurrentView('invoice-create');
  };

  // Action 2: Save Directly to Database & Invoices List
  const handleSaveDirectly = () => {
    if (!extractedData) return;
    setIsSavingDirectly(true);

    try {
      const existingCust = customers.find(
        (c) => c.name.toLowerCase() === (extractedData.customerName || '').toLowerCase()
      );

      const created = createInvoice({
        invoiceNumber: extractedData.invoiceNumber,
        customerId: existingCust?.id || `cust-${Date.now()}`,
        customerName: extractedData.customerName || extractedData.merchantName || 'Valued Client',
        customerEmail: existingCust?.email || 'client@example.com',
        customerPhone: existingCust?.phone || '+234 800 000 0000',
        customerAddress: existingCust?.address || 'Business Workspace',
        issueDate: extractedData.date,
        dueDate: extractedData.dueDate,
        items: extractedData.items,
        subtotal: extractedData.subtotal,
        discountPercentage: extractedData.discountPercentage,
        discountAmount: extractedData.discountAmount,
        taxRate: extractedData.taxRate,
        taxAmount: extractedData.taxAmount,
        deliveryFee: extractedData.deliveryFee || 0,
        total: extractedData.total,
        status: 'pending',
        notes: extractedData.notes,
        paymentTerms: 'Payment due upon receipt.',
        currency: (extractedData.currency as any) || activeCurrency,
      });

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });

      showToast('Invoice Created', `Invoice ${created.invoiceNumber} saved successfully from verified receipt.`);
      setIsReceiptScannerOpen(false);
      setSelectedInvoice(created);
      setCurrentView('invoice-view');
    } catch (err: any) {
      console.error('Failed to save receipt invoice:', err);
      showToast('Save Error', 'Failed to save receipt invoice.', 'error');
    } finally {
      setIsSavingDirectly(false);
    }
  };

  if (!isReceiptScannerOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsReceiptScannerOpen(false);
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto"
    >
      {/* Mobile / Device Camera Input */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*,image/heic,image/heif"
        capture="environment"
        onChange={handleFileInputChange}
        className="sr-only opacity-0 absolute pointer-events-none w-px h-px -z-10"
        id="camera-capture-input"
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Gallery / File Picker Input */}
      <input
        type="file"
        ref={galleryInputRef}
        accept="image/*,image/heic,image/heif,.pdf"
        onChange={handleFileInputChange}
        className="sr-only opacity-0 absolute pointer-events-none w-px h-px -z-10"
        id="gallery-upload-input"
        tabIndex={-1}
        aria-hidden="true"
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (step === 'capture') setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDropReceipt}
        className={`relative w-full ${
          step === 'correction' || step === 'confirmation' ? 'max-w-4xl lg:max-w-5xl' : 'max-w-lg'
        } bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] transition-all duration-200`}
      >
        {/* Drag & Drop Visual Overlay */}
        {isDraggingOver && (
          <div className="absolute inset-0 z-50 bg-indigo-600/90 text-white backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center border-4 border-dashed border-white/60 m-2 rounded-2xl animate-pulse">
            <Upload className="w-12 h-12 mb-2 animate-bounce" />
            <h3 className="text-base font-extrabold">Drop Receipt Image Here</h3>
            <p className="text-xs text-indigo-100 mt-1">Release to auto-scan with Billa AI Vision</p>
          </div>
        )}
        {/* Modal Header with Clear Exit Button */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/95 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shadow-indigo-600/20 shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-1.5 truncate">
                <span>Receipt Scanner</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold shrink-0">
                  AI Vision
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 truncate">
                {step === 'correction'
                  ? 'Manual verification & numeric values correction'
                  : step === 'confirmation'
                  ? 'Final invoice review & confirmation'
                  : 'Snap or upload any paper receipt'}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-receipt-scanner-header"
            onClick={() => setIsReceiptScannerOpen(false)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-200/70 hover:bg-slate-300 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer text-xs font-semibold shrink-0"
            title="Close modal (Esc)"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Close</span>
          </button>
        </div>

        {/* Verification Progress Stepper */}
        {(step === 'correction' || step === 'confirmation') && (
          <div className="px-4 sm:px-6 py-2.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto py-0.5">
              <button
                type="button"
                onClick={() => {
                  setStep('capture');
                  setCaptureMode('options');
                }}
                className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-medium cursor-pointer shrink-0 transition-colors"
              >
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                <span>1. Scan Photo</span>
              </button>

              <span className="text-slate-300">/</span>

              <button
                type="button"
                onClick={() => setStep('correction')}
                className={`flex items-center gap-1.5 font-bold cursor-pointer shrink-0 transition-colors ${
                  step === 'correction' ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === 'correction' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-emerald-600 text-white'
                }`}>
                  {step === 'confirmation' ? '✓' : '2'}
                </span>
                <span>2. Review & Correct</span>
              </button>

              <span className="text-slate-300">/</span>

              <button
                type="button"
                onClick={handleProceedToConfirmation}
                className={`flex items-center gap-1.5 font-bold cursor-pointer shrink-0 transition-colors ${
                  step === 'confirmation' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === 'confirmation' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                }`}>
                  3
                </span>
                <span>3. Confirm Invoice</span>
              </button>
            </div>

            {extractedData && (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-[11px] text-slate-500">AI Confidence:</span>
                <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  extractedData.confidence >= 80
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : extractedData.confidence >= 65
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-rose-100 text-rose-900 border border-rose-300'
                }`}>
                  {extractedData.confidence < 80 && <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />}
                  {extractedData.confidence}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* STEP 1: CAPTURE / UPLOAD */}
          {step === 'capture' && (
            <div className="space-y-3.5">
              {/* If Live Camera Mode is chosen */}
              {captureMode === 'live' ? (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-[4/3] sm:aspect-[16/9] flex items-center justify-center shadow-inner border border-slate-800">
                    <video
                      ref={videoRef}
                      playsInline
                      autoPlay
                      muted
                      className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                    />

                    {/* Framing Reticle */}
                    {cameraActive && (
                      <div className="absolute inset-4 sm:inset-6 pointer-events-none border-2 border-indigo-400/50 rounded-2xl flex flex-col justify-between p-3">
                        <div className="flex justify-between items-center text-indigo-300 text-[10px] font-mono font-bold bg-slate-950/70 px-2.5 py-1 rounded-md self-center backdrop-blur-xs">
                          <span>ALIGN RECEIPT EDGES INSIDE FRAME</span>
                        </div>
                        <div className="flex justify-between">
                          <div className="w-5 h-5 border-t-2 border-l-2 border-indigo-400 rounded-tl-md" />
                          <div className="w-5 h-5 border-t-2 border-r-2 border-indigo-400 rounded-tr-md" />
                        </div>
                        <div className="flex justify-between">
                          <div className="w-5 h-5 border-b-2 border-l-2 border-indigo-400 rounded-bl-md" />
                          <div className="w-5 h-5 border-b-2 border-r-2 border-indigo-400 rounded-br-md" />
                        </div>
                      </div>
                    )}

                    {/* Live Controls */}
                    {cameraActive && (
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleToggleCamera}
                          className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-md border border-slate-700 transition-colors cursor-pointer shadow-md"
                          title="Switch Camera (Front / Rear)"
                        >
                          <SwitchCamera className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Shutter Bar */}
                  <div className="flex items-center justify-between gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        stopCamera();
                        setCaptureMode('options');
                      }}
                      className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Back to Options
                    </button>

                    {cameraActive && (
                      <button
                        type="button"
                        id="btn-live-shutter-snap"
                        onClick={handleSnapLivePhoto}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Capture</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Mobile & Desktop Options Grid */
                <div className="space-y-3">
                  {cameraError && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                      <Info className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{cameraError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 1. Snap with Phone Camera (Direct Native Mobile Action) */}
                    <label
                      htmlFor="camera-capture-input"
                      id="btn-mobile-camera-snap"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          cameraInputRef.current?.click();
                        }
                      }}
                      onClick={() => {
                        try {
                          cameraInputRef.current?.click();
                        } catch (_) {}
                      }}
                      className="group p-4 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-left transition-all shadow-sm shadow-indigo-600/20 active:scale-[0.98] cursor-pointer flex flex-col justify-between min-h-[120px]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white">
                          <Camera className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        </div>
                        <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-white/20 text-white">
                          Camera
                        </span>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Take Photo</h3>
                        <p className="text-[11px] text-indigo-100 mt-0.5">
                          Opens camera with auto-focus
                        </p>
                      </div>
                    </label>

                    {/* 2. Choose from Photos / Gallery */}
                    <label
                      htmlFor="gallery-upload-input"
                      id="btn-upload-photo-library"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          galleryInputRef.current?.click();
                        }
                      }}
                      onClick={() => {
                        try {
                          galleryInputRef.current?.click();
                        } catch (_) {}
                      }}
                      className="group p-4 rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 hover:border-indigo-300 text-left transition-all shadow-2xs active:scale-[0.98] cursor-pointer flex flex-col justify-between min-h-[120px]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-indigo-50 text-slate-700 group-hover:text-indigo-600 flex items-center justify-center transition-colors">
                          <Upload className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500">
                          JPG, PNG, PDF
                        </span>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Choose Photo</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Select receipt image or screenshot
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Desktop Drag & Paste Helper */}
                  <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 flex items-center justify-between gap-2">
                    <span className="truncate">💡 Drag & drop receipts or press Ctrl+V to paste</span>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">HEIC / JPG / PNG</span>
                  </div>

                  {/* Secondary Options: Live Viewfinder & Sample Receipt */}
                  <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <button
                      type="button"
                      id="btn-open-live-viewfinder"
                      onClick={() => startLiveCamera()}
                      className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer border border-slate-200"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-slate-600" />
                      <span>Live Viewfinder</span>
                    </button>

                    <button
                      type="button"
                      id="btn-load-sample-receipt"
                      onClick={handleUseSampleReceipt}
                      className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-600" />
                      <span>Try Sample Receipt</span>
                    </button>
                  </div>

                  {/* Bottom Cancel & Exit Button */}
                  <div className="pt-2 border-t border-slate-200/80 flex justify-end">
                    <button
                      type="button"
                      id="btn-exit-receipt-scanner-footer"
                      onClick={() => setIsReceiptScannerOpen(false)}
                      className="w-full sm:w-auto px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Cancel & Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: PROCESSING SCAN */}
          {step === 'processing' && (
            <div className="py-8 sm:py-10 text-center space-y-4 max-w-md mx-auto">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-2xl bg-indigo-600/20 animate-ping" />
                <div className="relative w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
                  <Sparkles className="w-7 h-7 animate-spin" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  Scanning Receipt with Billa AI Vision...
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Extracting line items, prices, and totals.
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-left space-y-2 text-xs text-slate-600 max-w-xs mx-auto">
                <div className="flex items-center gap-2 text-indigo-600 font-semibold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Optimizing photo resolution</span>
                </div>
                <div className="flex items-center gap-2 text-indigo-600 font-semibold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Parsing itemized tabular breakdown</span>
                </div>
                <div className="flex items-center gap-2 text-indigo-600 font-semibold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Calculating subtotal & taxes</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep('capture');
                    setCaptureMode('options');
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel Scan
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: MANUAL CORRECTION & VERIFICATION STEP */}
          {step === 'correction' && extractedData && (
            <div className="space-y-4 animate-fadeIn">
              {/* AI Confidence & Verification Banner */}
              {extractedData.confidence < 80 || computedMetrics.hasDiscrepancy || computedMetrics.unpricedCount > 0 ? (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/95 border border-amber-300 text-amber-950 space-y-2 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0 mt-0.5">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xs sm:text-sm font-extrabold text-amber-900">
                            Manual Correction Required
                          </h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">
                            {extractedData.confidence}% AI Confidence
                          </span>
                        </div>
                        <p className="text-xs text-amber-800 leading-relaxed">
                          The AI parsed text from your receipt, but certainty is low or mathematical discrepancies exist.
                          Please cross-reference the numbers with the receipt photo and correct any inaccurate values below before confirming.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setStep('capture');
                        setCaptureMode('options');
                      }}
                      className="hidden sm:inline-flex px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                      Rescan
                    </button>
                  </div>

                  {/* Summary Flags */}
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-amber-200/80 text-[11px]">
                    {computedMetrics.unpricedCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-950 font-semibold">
                        <AlertCircle className="w-3 h-3 text-amber-700" />
                        {computedMetrics.unpricedCount} item{computedMetrics.unpricedCount > 1 ? 's' : ''} with ₦0.00 / missing price
                      </span>
                    )}
                    {computedMetrics.hasDiscrepancy && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-950 font-semibold">
                        <Calculator className="w-3 h-3 text-amber-700" />
                        Math discrepancy: {formatCurrency(computedMetrics.discrepancy, activeCurrency)}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-950 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-emerald-950">AI Vision Extracted Successfully</p>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-200/90 text-emerald-800 font-bold">
                          {extractedData.confidence}% Confidence
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Please review itemized numbers and customer details below before creating the invoice.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setStep('capture');
                      setCaptureMode('options');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100/70 border border-emerald-300 text-emerald-800 text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    Rescan
                  </button>
                </div>
              )}

              {/* Mobile Tab Toggle for Small Screens */}
              <div className="flex md:hidden items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMobileTab('editor')}
                  className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer text-center ${
                    mobileTab === 'editor' ? 'bg-white shadow-xs text-indigo-700 font-bold' : 'text-slate-600'
                  }`}
                >
                  Edit Values ({extractedData.items.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('receipt')}
                  className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer text-center ${
                    mobileTab === 'receipt' ? 'bg-white shadow-xs text-indigo-700 font-bold' : 'text-slate-600'
                  }`}
                >
                  View Receipt Photo
                </button>
              </div>

              {/* Dual-Pane Verification Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                {/* Left Pane: Sticky Receipt Photo Viewer with Inspection Tools */}
                <div
                  className={`md:col-span-5 rounded-2xl bg-slate-900 border border-slate-700/60 overflow-hidden shadow-sm flex flex-col md:sticky md:top-2 ${
                    mobileTab === 'receipt' ? 'block' : 'hidden md:flex'
                  }`}
                >
                  {/* Photo Header & Controls */}
                  <div className="p-2.5 bg-slate-800 border-b border-slate-700 text-slate-300 text-xs flex items-center justify-between flex-wrap gap-2">
                    <span className="flex items-center gap-1.5 font-bold text-slate-200">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Receipt Photo</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* Zoom Out */}
                      <button
                        type="button"
                        onClick={() => setZoomLevel((z) => Math.max(1, Number((z - 0.25).toFixed(2))))}
                        className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-white transition-colors cursor-pointer disabled:opacity-40"
                        disabled={zoomLevel <= 1}
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>

                      <span className="text-[11px] font-mono font-bold text-slate-300 min-w-[36px] text-center">
                        {Math.round(zoomLevel * 100)}%
                      </span>

                      {/* Zoom In */}
                      <button
                        type="button"
                        onClick={() => setZoomLevel((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))))}
                        className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-white transition-colors cursor-pointer disabled:opacity-40"
                        disabled={zoomLevel >= 2.5}
                        title="Zoom In"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>

                      {/* Reset Zoom */}
                      {zoomLevel > 1 && (
                        <button
                          type="button"
                          onClick={() => setZoomLevel(1)}
                          className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors cursor-pointer"
                          title="Reset Zoom"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Enhance Contrast Toggle */}
                      <button
                        type="button"
                        onClick={() => setIsEnhancedContrast(!isEnhancedContrast)}
                        className={`p-1 rounded transition-colors cursor-pointer ${
                          isEnhancedContrast ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                        }`}
                        title="Toggle high-contrast filter for faded receipts"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>

                      {/* Lightbox / Fullscreen */}
                      <button
                        type="button"
                        onClick={() => setIsLightboxOpen(true)}
                        className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-white transition-colors cursor-pointer"
                        title="Full Resolution Inspection"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Image Viewport */}
                  <div
                    onClick={() => setIsLightboxOpen(true)}
                    className="relative bg-slate-950 overflow-auto max-h-[380px] md:max-h-[440px] flex items-center justify-center p-2 cursor-zoom-in group"
                    title="Click to open full resolution inspector"
                  >
                    {capturedImage ? (
                      <img
                        src={capturedImage}
                        alt="Scanned Paper Receipt"
                        className={`transition-transform duration-150 origin-top-left object-contain ${
                          isEnhancedContrast ? 'contrast-150 brightness-95' : ''
                        }`}
                        style={{
                          transform: `scale(${zoomLevel})`,
                          maxWidth: zoomLevel > 1 ? 'none' : '100%',
                        }}
                      />
                    ) : (
                      <div className="h-48 flex items-center justify-center text-slate-500 text-xs">
                        No image preview available
                      </div>
                    )}

                    <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-slate-900/80 backdrop-blur-xs text-[10px] text-slate-300 font-medium opacity-80 group-hover:opacity-100 flex items-center gap-1 pointer-events-none">
                      <Eye className="w-3 h-3" />
                      <span>Click to enlarge</span>
                    </div>
                  </div>

                  <div className="p-2 bg-slate-800/80 border-t border-slate-700 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Inspect printed prices & tax rates</span>
                    {isEnhancedContrast && (
                      <span className="text-indigo-400 font-bold font-mono">Contrast Boosted</span>
                    )}
                  </div>
                </div>

                {/* Right Pane: Editable Extracted Values & Correction Forms */}
                <div
                  className={`md:col-span-7 space-y-4 ${
                    mobileTab === 'editor' ? 'block' : 'hidden md:block'
                  }`}
                >
                  {/* Client / Vendor & Invoice Identification */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Client & Receipt Information</span>
                      </h4>
                      <span className="text-[11px] font-mono text-indigo-600 font-bold">
                        {extractedData.invoiceNumber}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-slate-600 font-semibold">Client Name</label>
                          {customers.length > 0 && (
                            <select
                              onChange={(e) => {
                                const found = customers.find((c) => c.id === e.target.value);
                                if (found) {
                                  setExtractedData({
                                    ...extractedData,
                                    customerName: found.name,
                                  });
                                }
                              }}
                              className="text-[10px] text-indigo-600 font-medium bg-transparent cursor-pointer focus:outline-none"
                            >
                              <option value="">Choose saved client...</option>
                              {customers.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        <input
                          type="text"
                          value={extractedData.customerName}
                          onChange={(e) => setExtractedData({ ...extractedData, customerName: e.target.value })}
                          placeholder="Client or Customer Name"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-indigo-500 shadow-2xs text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 font-semibold">Vendor / Merchant</label>
                        <input
                          type="text"
                          value={extractedData.merchantName}
                          onChange={(e) => setExtractedData({ ...extractedData, merchantName: e.target.value })}
                          placeholder="Vendor Name"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 font-semibold">Issue Date</label>
                        <input
                          type="date"
                          value={extractedData.date}
                          onChange={(e) => setExtractedData({ ...extractedData, date: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 font-semibold">Due Date</label>
                        <input
                          type="date"
                          value={extractedData.dueDate}
                          onChange={(e) => setExtractedData({ ...extractedData, dueDate: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Line Items Editor with Real-Time Math Correction */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Extracted Line Items ({extractedData.items.length})
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-xs font-bold text-indigo-700 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Item</span>
                      </button>
                    </div>

                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {extractedData.items.map((item, idx) => {
                        const isUnpriced = !item.unitPrice || item.unitPrice <= 0;
                        return (
                          <div
                            key={item.id || idx}
                            className={`p-3 rounded-xl bg-white border transition-colors space-y-2.5 text-xs ${
                              isUnpriced ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 flex items-center gap-2">
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                                  placeholder="Item description"
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                                />
                                {isUnpriced && (
                                  <span className="shrink-0 px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold">
                                    Needs Price
                                  </span>
                                )}
                              </div>

                              {extractedData.items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                                  title="Delete line item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-2 items-center">
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-slate-500 font-medium">Quantity</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-center font-mono text-xs focus:outline-none font-bold text-slate-800"
                                />
                              </div>

                              <div className="space-y-0.5">
                                <span className="text-[10px] text-slate-500 font-medium">Unit Price</span>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={item.unitPrice || ''}
                                    placeholder="0.00"
                                    onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                                    className={`w-full px-2.5 py-1.5 rounded-md border text-right font-mono text-xs focus:outline-none font-bold ${
                                      isUnpriced
                                        ? 'bg-amber-50 border-amber-400 text-amber-950 focus:border-amber-500'
                                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                                    }`}
                                  />
                                </div>
                              </div>

                              <div className="space-y-0.5">
                                <span className="text-[10px] text-slate-500 font-medium">Line Total</span>
                                <div className="px-2.5 py-1.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono font-bold text-right text-xs truncate">
                                  {formatCurrency(item.total, activeCurrency)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Breakdown & Financial Summary Inputs */}
                    <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
                      {/* Subtotal */}
                      <div className="flex justify-between items-center text-slate-600">
                        <span className="font-semibold">Items Subtotal:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {formatCurrency(extractedData.subtotal, activeCurrency)}
                        </span>
                      </div>

                      {/* Discount and Tax Controls */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {/* Tax / VAT */}
                        <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 gap-2">
                          <span className="text-slate-600 text-[11px] font-semibold">Tax / VAT (%):</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={extractedData.taxRate}
                              onChange={(e) => handleTaxRateChange(Number(e.target.value))}
                              className="w-14 px-1.5 py-1 rounded bg-slate-50 border border-slate-200 text-right font-mono text-xs focus:outline-none"
                            />
                            <span className="text-slate-400 text-xs">%</span>
                          </div>
                          <span className="text-slate-700 font-mono text-xs font-semibold shrink-0">
                            {formatCurrency(extractedData.taxAmount, activeCurrency)}
                          </span>
                        </div>

                        {/* Discount */}
                        <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 gap-2">
                          <span className="text-slate-600 text-[11px] font-semibold">Discount (%):</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={extractedData.discountPercentage}
                              onChange={(e) => handleDiscountPercentageChange(Number(e.target.value))}
                              className="w-14 px-1.5 py-1 rounded bg-slate-50 border border-slate-200 text-right font-mono text-xs focus:outline-none"
                            />
                            <span className="text-slate-400 text-xs">%</span>
                          </div>
                          <span className="text-slate-700 font-mono text-xs font-semibold shrink-0">
                            {formatCurrency(extractedData.discountAmount, activeCurrency)}
                          </span>
                        </div>
                      </div>

                      {/* Delivery Fee Input */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                        <span className="text-slate-600 text-[11px] font-semibold">Delivery / Shipping Fee:</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            value={extractedData.deliveryFee || 0}
                            onChange={(e) => handleDeliveryFeeChange(Number(e.target.value))}
                            className="w-24 px-2 py-1 rounded bg-slate-50 border border-slate-200 text-right font-mono text-xs focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Grand Total */}
                      <div className="flex justify-between items-center text-base font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                        <span>Invoice Total:</span>
                        <span className="text-indigo-600 font-mono text-lg">
                          {formatCurrency(extractedData.total, activeCurrency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mathematical Discrepancy Assistant */}
                  {computedMetrics.hasDiscrepancy && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 space-y-2.5">
                      <div className="flex items-start gap-2.5">
                        <Calculator className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="space-y-1 text-xs">
                          <p className="font-extrabold text-rose-900">
                            Math Discrepancy Detected
                          </p>
                          <p className="text-rose-800 leading-relaxed">
                            Line items ({formatCurrency(computedMetrics.subtotal, activeCurrency)}) + Tax ({formatCurrency(computedMetrics.taxAmount, activeCurrency)}) - Discount ({formatCurrency(computedMetrics.discountAmount, activeCurrency)}) + Fee ({formatCurrency(computedMetrics.deliveryFee, activeCurrency)}) equals{' '}
                            <span className="font-bold font-mono text-rose-950">
                              {formatCurrency(computedMetrics.expectedTotal, activeCurrency)}
                            </span>
                            , but the invoice total is currently set to{' '}
                            <span className="font-bold font-mono text-rose-950">
                              {formatCurrency(extractedData.total, activeCurrency)}
                            </span>
                            .
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1 border-t border-rose-200/70">
                        <button
                          type="button"
                          onClick={handleSyncTotalToCalculated}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                        >
                          Sync Total to Calculated Sum ({formatCurrency(computedMetrics.expectedTotal, activeCurrency)})
                        </button>
                        <button
                          type="button"
                          onClick={handleAddAdjustmentItem}
                          className="px-3 py-1.5 rounded-lg bg-white hover:bg-rose-100 border border-rose-300 text-rose-800 font-bold text-xs transition-colors cursor-pointer"
                        >
                          Add Balancing Line Item ({formatCurrency(extractedData.total - computedMetrics.expectedTotal, activeCurrency)})
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Validation Error Banner */}
                  {validationWarning && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{validationWarning}</span>
                    </div>
                  )}

                  {/* Verification Checkbox */}
                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/90 hover:border-indigo-400 transition-colors cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isVerifiedByUser}
                      onChange={(e) => setIsVerifiedByUser(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                    />
                    <div className="text-xs">
                      <span className="font-extrabold text-indigo-950">
                        I have verified all numeric values against the receipt photo
                      </span>
                      <p className="text-indigo-800/80 text-[11px] mt-0.5">
                        Confirms that quantities, unit prices, subtotal, and tax amount are accurate.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Action Buttons for Step 2 */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('capture');
                      setCaptureMode('options');
                    }}
                    className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Scan Another
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsReceiptScannerOpen(false)}
                    className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleOpenInStudio}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-indigo-50 border border-slate-300 hover:border-indigo-200 text-slate-800 hover:text-indigo-900 font-bold text-xs transition-colors cursor-pointer shadow-xs"
                  >
                    <FileCheck className="w-4 h-4 text-indigo-600" />
                    <span>Open in Invoice Studio</span>
                  </button>

                  <button
                    type="button"
                    id="btn-proceed-to-confirmation"
                    onClick={handleProceedToConfirmation}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer"
                  >
                    <span>Proceed to Confirmation</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: FINAL INVOICE CONFIRMATION */}
          {step === 'confirmation' && extractedData && (
            <div className="space-y-4 animate-fadeIn">
              {/* Review Stamp */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-indigo-50/90 border border-indigo-200 text-indigo-950">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shadow-indigo-600/20 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs sm:text-sm font-extrabold text-indigo-950">
                        Invoice Ready for Final Confirmation
                      </p>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                        Verified by User
                      </span>
                    </div>
                    <p className="text-xs text-indigo-800 mt-0.5">
                      Review the final verified invoice before saving to your business records.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep('correction')}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-100/70 border border-indigo-200 text-indigo-800 text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Edit Values</span>
                </button>
              </div>

              {/* Formatted Invoice Preview Document */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-5">
                {/* Top Document Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Merchant / Issuer</span>
                    <h3 className="text-base font-extrabold text-slate-900">{extractedData.merchantName}</h3>
                    <p className="text-xs text-slate-500">Invoice: <span className="font-mono font-bold text-indigo-600">{extractedData.invoiceNumber}</span></p>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Client</span>
                    <h3 className="text-base font-extrabold text-slate-900">{extractedData.customerName}</h3>
                    <p className="text-xs text-slate-500">
                      Date: <span className="font-medium text-slate-700">{extractedData.date}</span> | Due: <span className="font-medium text-slate-700">{extractedData.dueDate}</span>
                    </p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                        <th className="pb-2 font-bold">Item & Description</th>
                        <th className="pb-2 font-bold text-center">Qty</th>
                        <th className="pb-2 font-bold text-right">Unit Price</th>
                        <th className="pb-2 font-bold text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {extractedData.items.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="py-2.5 font-medium text-slate-800">{item.description}</td>
                          <td className="py-2.5 text-center font-mono text-slate-600">{item.quantity}</td>
                          <td className="py-2.5 text-right font-mono text-slate-600">{formatCurrency(item.unitPrice, activeCurrency)}</td>
                          <td className="py-2.5 text-right font-mono font-bold text-slate-900">{formatCurrency(item.total, activeCurrency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary Breakdown */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-4 border-t border-slate-200">
                  {/* Attached Audit Receipt Thumbnail */}
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    {capturedImage && (
                      <img
                        src={capturedImage}
                        alt="Audit Receipt"
                        className="w-12 h-12 object-cover rounded-lg border border-slate-200 cursor-pointer shadow-2xs"
                        onClick={() => setIsLightboxOpen(true)}
                      />
                    )}
                    <div className="text-xs">
                      <p className="font-bold text-slate-800">Attached Receipt Photo</p>
                      <button
                        type="button"
                        onClick={() => setIsLightboxOpen(true)}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline mt-0.5"
                      >
                        Inspect full resolution
                      </button>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="w-full sm:w-64 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-mono font-bold text-slate-900">{formatCurrency(extractedData.subtotal, activeCurrency)}</span>
                    </div>
                    {extractedData.discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Discount ({extractedData.discountPercentage}%):</span>
                        <span className="font-mono font-bold">-{formatCurrency(extractedData.discountAmount, activeCurrency)}</span>
                      </div>
                    )}
                    {extractedData.taxAmount > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Tax / VAT ({extractedData.taxRate}%):</span>
                        <span className="font-mono font-bold text-slate-900">{formatCurrency(extractedData.taxAmount, activeCurrency)}</span>
                      </div>
                    )}
                    {(extractedData.deliveryFee || 0) > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Delivery Fee:</span>
                        <span className="font-mono font-bold text-slate-900">{formatCurrency(extractedData.deliveryFee || 0, activeCurrency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-sm font-extrabold text-slate-900">
                      <span>Total Amount:</span>
                      <span className="text-indigo-600 font-mono text-lg">{formatCurrency(extractedData.total, activeCurrency)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Step 3 */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setStep('correction')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Edit Values</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsReceiptScannerOpen(false)}
                    className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleOpenInStudio}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-indigo-50 border border-slate-300 hover:border-indigo-200 text-slate-800 hover:text-indigo-900 font-bold text-xs transition-colors cursor-pointer shadow-xs"
                  >
                    <FileCheck className="w-4 h-4 text-indigo-600" />
                    <span>Open in Invoice Studio</span>
                  </button>

                  <button
                    type="button"
                    id="btn-save-receipt-invoice"
                    disabled={isSavingDirectly}
                    onClick={handleSaveDirectly}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/25 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{isSavingDirectly ? 'Saving Invoice...' : 'Confirm & Create Invoice'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* High-Resolution Inspection Lightbox Modal */}
      {isLightboxOpen && capturedImage && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex flex-col p-4 animate-fadeIn"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="flex items-center justify-between text-white pb-3 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-bold">Receipt High-Resolution Inspection</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEnhancedContrast(!isEnhancedContrast)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border ${
                  isEnhancedContrast
                    ? 'bg-indigo-600 border-indigo-400 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                {isEnhancedContrast ? 'Contrast: Enhanced' : 'Contrast: Normal'}
              </button>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div
            className="flex-1 overflow-auto flex items-center justify-center p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={capturedImage}
              alt="High Resolution Receipt"
              className={`max-w-none transition-all rounded-lg shadow-2xl ${
                isEnhancedContrast ? 'contrast-150 brightness-90' : ''
              }`}
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
            />
          </div>

          <div
            className="flex items-center justify-center gap-3 pt-3 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(1, z - 0.5))}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
            >
              Zoom Out (-)
            </button>
            <span className="text-white text-xs font-mono font-bold">{Math.round(zoomLevel * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(3, z + 0.5))}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
            >
              Zoom In (+)
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
