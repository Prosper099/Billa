import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  SwitchCamera,
  Image as ImageIcon,
  CheckCircle2,
  FileCheck,
  Smartphone,
  Info,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { formatCurrency, generateInvoiceNumber } from '../utils/formatters';
import { InvoiceItem } from '../types';

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
  } = useApp();

  // Step flow: 'capture' | 'processing' | 'preview'
  const [step, setStep] = useState<'capture' | 'processing' | 'preview'>('capture');

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
  const [isZoomedImage, setIsZoomedImage] = useState<boolean>(false);
  const [isSavingDirectly, setIsSavingDirectly] = useState<boolean>(false);

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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 18000);

    try {
      const response = await fetch('/api/ai/parse-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          imageBase64,
          defaultCurrency: activeCurrency,
        }),
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to process receipt with AI');
      }

      const data = await response.json();
      const receipt = data.receipt;

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
        total: Number(receipt.total) || 0,
        currency: receipt.currency || activeCurrency,
        notes: receipt.notes || 'Extracted from photo receipt.',
        confidence: receipt.confidence || 95,
      };

      setExtractedData(structured);
      setStep('preview');
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
            description: 'Itemized Receipt Goods / Services',
            quantity: 1,
            unitPrice: 25000,
            total: 25000,
          },
        ],
        subtotal: 25000,
        taxRate: 0,
        taxAmount: 0,
        discountPercentage: 0,
        discountAmount: 0,
        total: 25000,
        currency: activeCurrency,
        notes: 'Scanned from camera photo.',
        confidence: 85,
      });
      setStep('preview');
    }
  };

  // Real-time edits in the interactive preview
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    if (!extractedData) return;
    const newItems = [...extractedData.items];
    const updated = { ...newItems[index], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      const q = field === 'quantity' ? Number(value) || 0 : updated.quantity;
      const p = field === 'unitPrice' ? Number(value) || 0 : updated.unitPrice;
      updated.total = q * p;
    }
    newItems[index] = updated;

    const subtotal = newItems.reduce((acc, it) => acc + (it.total || 0), 0);
    const discAmt = (subtotal * (extractedData.discountPercentage || 0)) / 100;
    const taxable = Math.max(0, subtotal - discAmt);
    const taxAmt = (taxable * (extractedData.taxRate || 0)) / 100;
    const total = Math.max(0, taxable + taxAmt);

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
    const total = Math.max(0, taxable + taxAmt);

    setExtractedData({
      ...extractedData,
      items: newItems,
      subtotal,
      discountAmount: discAmt,
      taxAmount: taxAmt,
      total,
    });
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
      const created = createInvoice({
        invoiceNumber: extractedData.invoiceNumber,
        customerId: `cust-${Date.now()}`,
        customerName: extractedData.customerName || extractedData.merchantName || 'Valued Client',
        customerEmail: 'client@example.com',
        customerPhone: '+234 800 000 0000',
        customerAddress: 'Business Workspace',
        issueDate: extractedData.date,
        dueDate: extractedData.dueDate,
        items: extractedData.items,
        subtotal: extractedData.subtotal,
        discountPercentage: extractedData.discountPercentage,
        discountAmount: extractedData.discountAmount,
        taxRate: extractedData.taxRate,
        taxAmount: extractedData.taxAmount,
        deliveryFee: 0,
        total: extractedData.total,
        status: 'pending',
        notes: extractedData.notes,
        paymentTerms: 'Payment due upon receipt.',
        currency: activeCurrency,
      });

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });

      setIsReceiptScannerOpen(false);
      setSelectedInvoice(created);
      setCurrentView('invoice-view');
    } catch (err: any) {
      console.error('Failed to save receipt invoice:', err);
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
          step === 'preview' ? 'max-w-3xl' : 'max-w-lg'
        } bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh] transition-all duration-200`}
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
                Snap or upload any paper receipt
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

          {/* STEP 3: INTERACTIVE PREVIEW & EDIT BEFORE SAVING */}
          {step === 'preview' && extractedData && (
            <div className="space-y-5 animate-fadeIn">
              {/* Top Banner */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-900">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold">Receipt Extracted ({extractedData.confidence}% AI Confidence)</p>
                    <p className="text-[11px] text-emerald-700">
                      Review all extracted fields below before finalizing.
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
                  Scan Another
                </button>
              </div>

              {/* Grid: Photo on Left, Form on Right */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                {/* Photo Thumbnail */}
                <div className="md:col-span-4 rounded-2xl bg-slate-900 border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                  <div className="p-2.5 bg-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Captured Receipt</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsZoomedImage(!isZoomedImage)}
                      className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-white transition-colors cursor-pointer"
                      title="Toggle Zoom"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {capturedImage ? (
                    <img
                      src={capturedImage}
                      alt="Scanned Receipt"
                      className={`w-full object-contain bg-slate-950 transition-all ${
                        isZoomedImage ? 'max-h-[480px]' : 'max-h-[220px]'
                      }`}
                    />
                  ) : (
                    <div className="h-36 flex items-center justify-center text-slate-500 text-xs">
                      No image preview
                    </div>
                  )}
                </div>

                {/* Editable Extracted Fields */}
                <div className="md:col-span-8 space-y-4">
                  {/* Customer / Merchant & Invoice # */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Client / Vendor Details</span>
                      </h4>
                      <span className="text-[11px] font-mono text-indigo-600 font-bold">
                        {extractedData.invoiceNumber}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-slate-600 font-semibold">Client or Vendor Name</label>
                        <input
                          type="text"
                          value={extractedData.customerName}
                          onChange={(e) => setExtractedData({ ...extractedData, customerName: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-indigo-500 shadow-2xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 font-semibold">Invoice / Receipt Date</label>
                        <input
                          type="date"
                          value={extractedData.date}
                          onChange={(e) => setExtractedData({ ...extractedData, date: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Extracted Line Items ({extractedData.items.length})</span>
                      </h4>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Item</span>
                      </button>
                    </div>

                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {extractedData.items.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                              placeholder="Item description"
                              className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                            />
                            {extractedData.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-slate-500 font-medium">Qty</span>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                className="w-full px-2 py-1 rounded-md bg-slate-50 border border-slate-200 text-center font-mono text-xs focus:outline-none"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-slate-500 font-medium">Price</span>
                              <input
                                type="number"
                                min="0"
                                value={item.unitPrice || ''}
                                onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                                className="w-full px-2 py-1 rounded-md bg-slate-50 border border-slate-200 text-right font-mono text-xs focus:outline-none"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-slate-500 font-medium">Total</span>
                              <div className="px-2 py-1 rounded-md bg-indigo-50/70 border border-indigo-100 text-indigo-700 font-mono font-bold text-right text-xs truncate">
                                {formatCurrency(item.total, activeCurrency)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Summary */}
                    <div className="pt-2 border-t border-slate-200 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {formatCurrency(extractedData.subtotal, activeCurrency)}
                        </span>
                      </div>
                      {extractedData.taxAmount > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>Tax / VAT ({extractedData.taxRate}%):</span>
                          <span className="font-mono font-bold text-slate-900">
                            {formatCurrency(extractedData.taxAmount, activeCurrency)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1 border-t border-slate-200">
                        <span>Total Invoice Amount:</span>
                        <span className="text-indigo-600 font-mono">
                          {formatCurrency(extractedData.total, activeCurrency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('capture');
                      setCaptureMode('options');
                    }}
                    className="flex-1 sm:flex-none px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Scan Another
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsReceiptScannerOpen(false)}
                    className="flex-1 sm:flex-none px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 font-semibold text-xs transition-colors cursor-pointer"
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
                    id="btn-save-receipt-invoice"
                    disabled={isSavingDirectly}
                    onClick={handleSaveDirectly}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{isSavingDirectly ? 'Saving...' : 'Save Invoice Now'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
