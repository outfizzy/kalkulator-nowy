import React, { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, X, Sparkles, FileText, Check, Pencil, ArrowLeft, Building2, ClipboardPaste, ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { pdfjs } from 'react-pdf';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

type Supplier = 'aluxe' | 'deponti' | 'teranda' | 'aliplast';
type Step = 'supplier' | 'upload' | 'scanning' | 'preview';

interface ScannedItem {
  name: string;
  price: number;
  description: string;
  editing?: boolean;
}

interface OcrInvoiceScannerModalProps {
  onImport: (items: { name: string; price: number; description?: string }[]) => void;
  onClose: () => void;
}

const SUPPLIERS: { id: Supplier; label: string; desc: string; color: string; bgColor: string; icon: 'building' | 'paste' | 'image' }[] = [
  { id: 'aluxe', label: 'ALUXE', desc: 'PDF-Rechnung', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: 'building' },
  { id: 'deponti', label: 'DEPONTI', desc: 'PDF-Rechnung', color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: 'building' },
  { id: 'teranda', label: 'TERANDA', desc: 'Text einfügen', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: 'paste' },
  { id: 'aliplast', label: 'ALIPLAST', desc: 'Screenshot (PLN→EUR)', color: 'text-violet-600', bgColor: 'bg-violet-100', icon: 'image' },
];

export const OcrInvoiceScannerModal: React.FC<OcrInvoiceScannerModalProps> = ({ onImport, onClose }) => {
  const [step, setStep] = useState<Step>('supplier');
  const [supplier, setSupplier] = useState<Supplier>('aluxe');
  const [error, setError] = useState('');
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [pastedText, setPastedText] = useState('');
  const [eurRate, setEurRate] = useState('4.28');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectSupplier = (s: Supplier) => {
    setSupplier(s);
    setStep('upload');
  };

  const processText = async (text: string) => {
    setError('');
    setStep('scanning');

    try {
      console.log(`[DocumentScanner] Sending ${text.length} chars to AI, supplier: ${supplier}`);

      const { data, error: fnError } = await supabase.functions.invoke('scan-invoice', {
        body: { text, supplier }
      });

      if (fnError) {
        let errMsg = fnError.message || 'Scan failed';
        try { if (fnError.context?.json) { const d = await fnError.context.json(); if (d.error) errMsg = d.error; } } catch (_e) {}
        throw new Error(errMsg);
      }
      if (data?.error) throw new Error(data.error);

      const items = processAiResult(data);
      setScannedItems(items);
      setInvoiceTotal(data.invoiceTotal || 0);
      setStep('preview');
    } catch (err: any) {
      console.error('[DocumentScanner] Error:', err);
      setError(err.message || 'Fehler beim Scannen des Dokuments');
      setStep('upload');
      toast.error('Fehler beim Verarbeitung');
    }
  };

  const processFile = async (file: File) => {
    setError('');
    setStep('scanning');

    try {
      let extractedText = '';

      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        console.log(`[DocumentScanner] PDF pages: ${pdf.numPages}, supplier: ${supplier}`);

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
          if (pageText.length > 20) {
            extractedText += `\n\n=== PAGE ${i} ===\n${pageText}`;
          }
        }
        console.log(`[DocumentScanner] Extracted ${extractedText.length} chars of text`);
      } else {
        // Image — send as base64 to vision AI
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const { data, error: fnError } = await supabase.functions.invoke('scan-invoice', {
          body: { image: base64, supplier }
        });
        if (fnError || data?.error) throw new Error(fnError?.message || data?.error || 'Scan failed');
        const items = processAiResult(data);
        setScannedItems(items);
        setInvoiceTotal(data.invoiceTotal || 0);
        setStep('preview');
        return;
      }

      // Send extracted text to edge function
      const { data, error: fnError } = await supabase.functions.invoke('scan-invoice', {
        body: { text: extractedText, supplier }
      });

      if (fnError) {
        let errMsg = fnError.message || 'Scan failed';
        try { if (fnError.context?.json) { const d = await fnError.context.json(); if (d.error) errMsg = d.error; } } catch (_e) {}
        throw new Error(errMsg);
      }
      if (data?.error) throw new Error(data.error);

      const items = processAiResult(data);
      setScannedItems(items);
      setInvoiceTotal(data.invoiceTotal || 0);
      setStep('preview');
    } catch (err: any) {
      console.error('[DocumentScanner] Error:', err);
      setError(err.message || 'Fehler beim Scannen des Dokuments');
      setStep('upload');
      toast.error('Fehler beim OCR-Scan');
    }
  };

  const processAiResult = (data: any): ScannedItem[] => {
    const allItems: any[] = data.items || [];
    const allGlobalCosts: any[] = data.globalCosts || [];

    // Deduplicate
    const seenItems = new Map<string, any>();
    allItems.forEach(item => {
      const key = (item.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const existing = seenItems.get(key);
      if (existing) {
        if ((existing.totalPrice || 0) === 0 && (item.totalPrice || 0) > 0) {
          seenItems.set(key, item);
        } else if ((item.totalPrice || 0) > 0 && (existing.totalPrice || 0) > 0) {
          seenItems.set(key + '_' + Math.random(), item);
        }
      } else {
        seenItems.set(key, item);
      }
    });

    const uniqueItems = Array.from(seenItems.values());
    const importedItems: ScannedItem[] = uniqueItems.map(item => ({
      name: item.name,
      price: item.totalPrice || 0,
      description: item.components || ''
    }));

    // Distribute globalCosts proportionally
    const totalGlobalCosts = allGlobalCosts.reduce((sum: number, c: any) => sum + (c.price || 0), 0);
    if (totalGlobalCosts > 0 && importedItems.length > 0) {
      const totalProductsPrice = importedItems.reduce((sum, i) => sum + (i.price || 0), 0);
      if (totalProductsPrice > 0) {
        importedItems.forEach(item => {
          const share = item.price / totalProductsPrice;
          item.price = Math.round((item.price + totalGlobalCosts * share) * 100) / 100;
        });
      }
    }

    // Aliplast: convert PLN → EUR using rate
    if (supplier === 'aliplast') {
      const rate = parseFloat(eurRate) || 4.28;
      importedItems.forEach(item => {
        item.price = Math.round((item.price / rate) * 100) / 100;
      });
    }

    return importedItems;
  };

  const updateItemName = (index: number, newName: string) => {
    setScannedItems(prev => prev.map((item, i) => i === index ? { ...item, name: newName } : item));
  };

  const updateItemPrice = (index: number, newPrice: number) => {
    setScannedItems(prev => prev.map((item, i) => i === index ? { ...item, price: newPrice } : item));
  };

  const toggleEditing = (index: number) => {
    setScannedItems(prev => prev.map((item, i) => i === index ? { ...item, editing: !item.editing } : item));
  };

  const removeItem = (index: number) => {
    setScannedItems(prev => prev.filter((_, i) => i !== index));
  };

  const confirmImport = () => {
    const items = scannedItems.map(({ name, price, description }) => ({ name, price, description }));
    const total = items.reduce((sum, i) => sum + i.price, 0);
    toast.success(`${items.length} Positionen importiert (${total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })})`);
    onImport(items);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      processFile(file);
    } else if (file) {
      toast.error('Nur Bilder (JPG, PNG) und PDF-Dateien werden unterstützt.');
    }
  };

  const calculatedTotal = scannedItems.reduce((sum, i) => sum + i.price, 0);
  const supplierMeta = SUPPLIERS.find(s => s.id === supplier)!;

  const SupplierIcon = ({ icon, className }: { icon: string; className: string }) => {
    if (icon === 'paste') return <ClipboardPaste className={className} />;
    if (icon === 'image') return <ImageIcon className={className} />;
    return <Building2 className={className} />;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            {(step === 'upload' || step === 'preview') && (
              <button
                onClick={() => { setStep(step === 'preview' ? 'upload' : 'supplier'); setError(''); }}
                className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              {step === 'supplier' ? 'Lieferant wählen' : step === 'preview' ? 'Positionen prüfen' : 'Angebot importieren'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* STEP 1: Supplier Selection */}
          {step === 'supplier' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SUPPLIERS.map(s => (
                <button
                  key={s.id}
                  onClick={() => selectSupplier(s.id)}
                  className="group p-5 border-2 border-slate-200 rounded-2xl hover:border-indigo-400 hover:bg-indigo-50/30 transition-all text-left"
                >
                  <div className={`w-10 h-10 ${s.bgColor} rounded-xl flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform`}>
                    <SupplierIcon icon={s.icon} className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm mb-0.5">{s.label}</h3>
                  <p className="text-[10px] text-slate-500 leading-tight">{s.desc}</p>
                </button>
              ))}
            </div>
          )}

          {/* STEP 2a: PDF Upload (Aluxe/Deponti) */}
          {step === 'upload' && (supplier === 'aluxe' || supplier === 'deponti') && (
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              className="border-2 border-dashed border-indigo-200 rounded-2xl p-8 sm:p-10 text-center bg-gradient-to-b from-indigo-50/50 to-white hover:border-indigo-400 hover:bg-indigo-50/80 transition-all cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${supplierMeta.bgColor} ${supplierMeta.color}`}>
                  {supplierMeta.label}
                </span>
              </div>
              <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <FileText className="w-7 h-7 text-indigo-500" />
              </div>
              <h4 className="text-base font-bold text-slate-700 mb-1">PDF oder Bild hochladen</h4>
              <p className="text-sm text-slate-500 mb-5">KI extrahiert die Positionen automatisch</p>
              <button
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="px-5 py-2 bg-white border border-indigo-200 text-indigo-700 rounded-xl text-sm font-medium hover:bg-indigo-50 transition-colors flex items-center gap-2 shadow-sm mx-auto"
              >
                <Upload className="w-4 h-4" /> Datei auswählen
              </button>
            </div>
          )}

          {/* STEP 2b: Text Paste (Teranda) */}
          {step === 'upload' && supplier === 'teranda' && (
            <div>
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">TERANDA</span>
              </div>
              <textarea
                value={pastedText}
                onChange={e => setPastedText(e.target.value)}
                placeholder={"Text aus Teranda-Konfigurator hier einfügen...\n\nBeispiel:\nTR20 GLAS 5000x3000 mm\nRAL7016st (Anthrazit)\n...\nNettopreis € 8.947,89"}
                className="w-full h-56 p-4 border-2 border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none font-mono leading-relaxed"
              />
              <button
                onClick={() => { if (pastedText.trim().length > 20) processText(pastedText.trim()); else toast.error('Bitte fügen Sie den Teranda-Konfigurationstext ein.'); }}
                disabled={pastedText.trim().length < 20}
                className="w-full mt-3 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                KI analysieren lassen
              </button>
            </div>
          )}

          {/* STEP 2c: Screenshot Upload (Aliplast) with EUR rate */}
          {step === 'upload' && supplier === 'aliplast' && (
            <div>
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-violet-100 text-violet-700">ALIPLAST</span>
                <span className="text-[10px] text-slate-400">PLN → EUR</span>
              </div>

              {/* Exchange rate input */}
              <div className="mb-4 p-4 bg-violet-50 border border-violet-200 rounded-xl">
                <label className="block text-xs font-bold text-violet-700 mb-2">Kurs PLN/EUR (1 EUR = ? PLN)</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 font-medium">1 EUR =</span>
                  <input
                    type="number"
                    value={eurRate}
                    onChange={e => setEurRate(e.target.value)}
                    step="0.01"
                    min="1"
                    className="w-24 px-3 py-2 border-2 border-violet-300 rounded-lg text-sm font-bold text-violet-700 text-center focus:outline-none focus:ring-2 focus:ring-violet-200"
                  />
                  <span className="text-sm text-slate-500 font-medium">PLN</span>
                </div>
              </div>

              {/* Screenshot upload */}
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                className="border-2 border-dashed border-violet-200 rounded-2xl p-6 text-center bg-gradient-to-b from-violet-50/50 to-white hover:border-violet-400 hover:bg-violet-50/80 transition-all cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <ImageIcon className="w-6 h-6 text-violet-500" />
                </div>
                <h4 className="text-sm font-bold text-slate-700 mb-1">Screenshot hochladen</h4>
                <p className="text-xs text-slate-500 mb-4">KI liest die Tabelle, übersetzt auf Deutsch und rechnet in EUR um</p>
                <button
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="px-4 py-2 bg-white border border-violet-200 text-violet-700 rounded-xl text-sm font-medium hover:bg-violet-50 transition-colors flex items-center gap-2 shadow-sm mx-auto"
                >
                  <Upload className="w-4 h-4" /> Bild auswählen
                </button>
              </div>
            </div>
          )}

          <input ref={fileInputRef} type="file" accept={supplier === 'aliplast' ? 'image/*' : 'image/*,application/pdf'} className="hidden" onChange={handleFileChange} />

          {/* STEP 3: Scanning */}
          {step === 'scanning' && (
            <div className="p-10 text-center">
              <div className="w-14 h-14 mx-auto mb-4 relative">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                <Sparkles className="w-5 h-5 text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <h4 className="text-base font-bold text-slate-700 mb-1">KI analysiert ({supplierMeta.label})...</h4>
              <p className="text-sm text-slate-500">
                {supplier === 'aliplast' ? 'Positionen werden erkannt, übersetzt und in EUR umgerechnet' : 'Positionen und Preise werden extrahiert'}
              </p>
            </div>
          )}

          {/* STEP 4: Preview & Edit */}
          {step === 'preview' && (
            <div>
              <div className="space-y-1.5">
                {scannedItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 py-2.5 px-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 group transition-colors">
                    <span className="w-6 h-6 flex items-center justify-center rounded bg-slate-200/80 text-[10px] font-bold text-slate-500 shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      {item.editing ? (
                        <input
                          type="text"
                          value={item.name}
                          onChange={e => updateItemName(idx, e.target.value)}
                          onBlur={() => toggleEditing(idx)}
                          onKeyDown={e => { if (e.key === 'Enter') toggleEditing(idx); }}
                          autoFocus
                          className="w-full text-sm font-semibold text-slate-800 bg-white border border-indigo-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                      )}
                      {item.description && !item.editing && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.description.substring(0, 80)}...</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.editing ? (
                        <input
                          type="number"
                          value={item.price}
                          onChange={e => updateItemPrice(idx, parseFloat(e.target.value) || 0)}
                          step="0.01"
                          className="w-24 text-sm font-bold text-right text-indigo-700 bg-white border border-indigo-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                      ) : (
                        <span className="text-sm font-bold text-indigo-700">
                          {item.price.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        </span>
                      )}
                      <button
                        onClick={() => toggleEditing(idx)}
                        className="p-1 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded transition-colors"
                        title="Bearbeiten"
                      >
                        {item.editing ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => removeItem(idx)}
                        className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Entfernen"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  {scannedItems.length} Positionen
                  {invoiceTotal > 0 && (
                    <span className="ml-2 text-slate-400">
                      ({supplier === 'aliplast' ? 'PLN' : 'Rechnung'}: {invoiceTotal.toLocaleString('de-DE', { style: 'currency', currency: supplier === 'aliplast' ? 'PLN' : 'EUR' })})
                    </span>
                  )}
                </div>
                <span className="text-base font-black text-indigo-700">
                  {calculatedTotal.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </span>
              </div>

              {/* Import button */}
              <button
                onClick={confirmImport}
                disabled={scannedItems.length === 0}
                className="w-full mt-4 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                {scannedItems.length} Positionen importieren
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
