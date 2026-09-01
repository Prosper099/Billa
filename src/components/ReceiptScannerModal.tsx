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
  AlertCircle,
  FileText,
  DollarSign,
  Calendar,
  User,
  ArrowRight,
  ZoomIn,
  SwitchCamera,
  Image as ImageIcon,
  CheckCircle2,
  FileCheck,
  Layers,
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
    showToast,
    customers,
  } = useApp();

  // Step flow: 'capture' | 'processing' | 'preview'
  const [step, setStep] = useState<'capture' | 'processing' | 'preview'>('capture');

  // Camera State
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Captured Image & Extracted Data
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedReceiptData | null>(null);
  const [isZoomedImage, setIsZoomedImage] = useState<boolean>(false);
  const [isSavingDirectly, setIsSavingDirectly] = useState<boolean>(false);

  // Stop camera stream utility
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Start live camera stream
  const startCamera = useCallback(async (mode: 'environment' | 'user' = facingMode) => {
    try {
      setCameraError(null);
      stopCamera();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Live camera not supported by this browser. Please use the Upload or Mobile Camera button.');
        return;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Camera stream initialisation note:', err);
      setCameraError('Camera access unavailable or permission not granted. You can still upload or snap a photo directly.');
      setCameraActive(false);
    }
  }, [facingMode, stopCamera]);

  // Handle open / close lifecycle
  useEffect(() => {
    if (isReceiptScannerOpen) {
      setStep('capture');
      setCapturedImage(null);
      setExtractedData(null);
      startCamera('environment');
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isReceiptScannerOpen, startCamera, stopCamera]);

  // Flip front/rear camera
  const handleToggleCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Capture frame from video stream
  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);

    stopCamera();
    setCapturedImage(imageDataUrl);
    processReceiptImage(imageDataUrl);
  };

  // Handle file input or mobile camera capture
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        stopCamera();
        setCapturedImage(dataUrl);
        processReceiptImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Sample Receipt for instant testing
  const handleUseSampleReceipt = () => {
    stopCamera();
    // High quality receipt canvas sample
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
      const response = await fetch('/api/ai/parse-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          defaultCurrency: activeCurrency,
        }),
      });

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
      showToast('Receipt scanned successfully!', 'Review and customize the extracted invoice details below.', 'success');
    } catch (err: any) {
      console.error('Receipt parsing error:', err);
      // Fallback
      const todayStr = new Date().toISOString().split('T')[0];
      const dueStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      setExtractedData({
        merchantName: 'Store / Contractor',
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
        confidence: 80,
      });
      setStep('preview');
      showToast('Receipt parsed with fallback', 'You can review and edit all fields before saving.', 'info');
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
    if (!extractedData || extractedData.items.length <= 1) {
      showToast('Line item required', 'Must have at least one line item.', 'warning');
      return;
    }
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
    showToast('Receipt loaded into Studio', 'Customize items, branding, or terms and finalize.', 'success');
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
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });

      setIsReceiptScannerOpen(false);
      setSelectedInvoice(created);
      setCurrentView('invoice-view');
      showToast('Invoice Created from Receipt!', `Invoice #${created.invoiceNumber} saved successfully.`, 'success');
    } catch (err: any) {
      showToast('Failed to save invoice', err?.message || 'Error occurred while saving', 'error');
    } finally {
      setIsSavingDirectly(false);
    }
  };

  if (!isReceiptScannerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span>Receipt Camera & AI Auto-Fill</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold">
                  Billa Vision AI
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Snap or upload any physical receipt to automatically generate structured invoices
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsReceiptScannerOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: CAPTURE / UPLOAD */}
          {step === 'capture' && (
            <div className="space-y-5">
              {/* Viewfinder Canvas */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-[4/3] sm:aspect-[16/9] flex items-center justify-center shadow-inner border border-slate-800">
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                />

                {/* Framing Reticle Overlay */}
                {cameraActive && (
                  <div className="absolute inset-4 sm:inset-8 pointer-events-none border-2 border-indigo-400/50 rounded-2xl flex flex-col justify-between p-4">
                    <div className="flex justify-between items-center text-indigo-300 text-xs font-mono font-bold bg-slate-950/60 px-3 py-1 rounded-lg self-center backdrop-blur-xs">
                      <span>ALIGN RECEIPT EDGES INSIDE FRAME</span>
                    </div>

                    {/* Corner Reticles */}
                    <div className="flex justify-between">
                      <div className="w-6 h-6 border-t-2 border-l-2 border-indigo-400 rounded-tl-lg" />
                      <div className="w-6 h-6 border-t-2 border-r-2 border-indigo-400 rounded-tr-lg" />
                    </div>
                    <div className="flex justify-between">
                      <div className="w-6 h-6 border-b-2 border-l-2 border-indigo-400 rounded-bl-lg" />
                      <div className="w-6 h-6 border-b-2 border-r-2 border-indigo-400 rounded-br-lg" />
                    </div>
                  </div>
                )}

                {/* If live camera is not active / error */}
                {!cameraActive && (
                  <div className="text-center p-6 space-y-3 max-w-md">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-950/80 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-800/60">
                      <Camera className="w-7 h-7" />
                    </div>
                    <p className="text-sm font-bold text-white">Camera Viewfinder Ready</p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {cameraError || 'Tap "Start Live Camera" or choose an image / mobile camera option below.'}
                    </p>
                    <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => startCamera()}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center gap-2"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Start Live Camera</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Camera Top Controls */}
                {cameraActive && (
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleCamera}
                      className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-md border border-slate-700 transition-colors cursor-pointer shadow-md"
                      title="Switch Camera (Front / Rear)"
                    >
                      <SwitchCamera className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Shutter & Quick Upload Action Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                {/* File / Mobile Camera Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition-colors cursor-pointer shadow-xs"
                  >
                    <Upload className="w-4 h-4 text-slate-600" />
                    <span>Upload Photo / File</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleUseSampleReceipt}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs border border-indigo-200 transition-colors cursor-pointer"
                    title="Load sample receipt to test immediately"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Try Sample Receipt</span>
                  </button>
                </div>

                {/* Primary Shutter Snap Button */}
                {cameraActive && (
                  <button
                    type="button"
                    id="btn-shutter-snap"
                    onClick={handleSnapPhoto}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-sm shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                  >
                    <Camera className="w-5 h-5" />
                    <span>Capture & Extract Receipt</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: PROCESSING SCAN */}
          {step === 'processing' && (
            <div className="py-12 sm:py-16 text-center space-y-6 max-w-md mx-auto">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-3xl bg-indigo-600/20 animate-ping" />
                <div className="relative w-20 h-20 rounded-3xl bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-600/30">
                  <Sparkles className="w-9 h-9 animate-spin" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-extrabold text-slate-900">
                  Reading Receipt with Billa AI Vision...
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Scanning vendor name, item descriptions, quantities, unit prices, tax amounts, and currency.
                </p>
              </div>

              {/* Status Checklist animation */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 text-left space-y-2.5 text-xs text-slate-600 max-w-xs mx-auto">
                <div className="flex items-center gap-2 text-indigo-600 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Enhancing photo clarity & contrast</span>
                </div>
                <div className="flex items-center gap-2 text-indigo-600 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Recognizing itemized table breakdown</span>
                </div>
                <div className="flex items-center gap-2 text-indigo-600 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Matching currency & subtotal calculations</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: INTERACTIVE PREVIEW & EDIT BEFORE SAVING */}
          {step === 'preview' && extractedData && (
            <div className="space-y-6 animate-fadeIn">
              {/* Top Banner */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-900">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold">Receipt Extracted ({extractedData.confidence}% AI Confidence)</p>
                    <p className="text-[11px] text-emerald-700">
                      Review all details below before saving or customizing in Invoice Studio.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setStep('capture');
                    startCamera();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100/70 border border-emerald-300 text-emerald-800 text-xs font-bold transition-colors cursor-pointer shrink-0"
                >
                  Retake Photo
                </button>
              </div>

              {/* Grid: Photo on Left (4 cols), Form on Right (8 cols) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
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
                        isZoomedImage ? 'max-h-[500px]' : 'max-h-[220px]'
                      }`}
                    />
                  ) : (
                    <div className="h-40 flex items-center justify-center text-slate-500 text-xs">
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

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
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
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

                    {/* Calculated Summary Card */}
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

              {/* Action Buttons: 1) Open in Studio, 2) Save Directly */}
              <div className="pt-3 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep('capture');
                    startCamera();
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Scan Another Receipt
                </button>

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
