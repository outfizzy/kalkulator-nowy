import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { InventoryItem } from '../../services/database/inventory.service';
import { fmtEur } from './WarehouseHelpers';
import {
  Camera, Upload, X, FileText, Loader2, CheckCircle2, AlertCircle,
  Pencil, Plus, Trash2, Image as ImageIcon, RotateCcw, Sparkles,
  FileCheck, BadgeEuro, Package, ChevronDown, ChevronUp, Info
} from 'lucide-react';

interface ScannedItem {
  name: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
  matchedId?: string;
  matchedName?: string;
  category?: string;
  selected: boolean;
}

interface DocumentInfo {
  type: 'faktura' | 'wz' | 'paragon' | 'unknown';
  number?: string;
  date?: string;
  supplier?: string;
  currency?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  existingItems: InventoryItem[];
  onImport: (items: { name: string; qty: number; price: number; unit: string; matchedId?: string; category?: string }[]) => Promise<void>;
}

type ScanStep = 'upload' | 'scanning' | 'preview' | 'importing';

export const DocumentScannerModal: React.FC<Props> = ({ isOpen, onClose, existingItems, onImport }) => {
  const [step, setStep] = useState<ScanStep>('upload');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [docInfo, setDocInfo] = useState<DocumentInfo | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [expandedDoc, setExpandedDoc] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep('upload');
    setImagePreview(null);
    setScannedItems([]);
    setDocInfo(null);
    setConfidence(0);
    setNotes('');
    setError('');
  }, []);

  const handleClose = () => { reset(); onClose(); };

  // Match scanned item against existing inventory
  const matchItem = useCallback((name: string): { id?: string; name?: string } => {
    const lower = name.toLowerCase().trim();
    // Exact match
    const exact = existingItems.find(i =>
      i.name.toLowerCase() === lower || (i.sku && i.sku.toLowerCase() === lower)
    );
    if (exact) return { id: exact.id, name: exact.name };
    // Fuzzy: contains check
    const partial = existingItems.find(i =>
      i.name.toLowerCase().includes(lower) || lower.includes(i.name.toLowerCase())
    );
    if (partial) return { id: partial.id, name: partial.name };
    return {};
  }, [existingItems]);

  // Process uploaded image
  const processImage = async (file: File) => {
    setError('');
    // Show preview
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setImagePreview(base64);
      setStep('scanning');

      try {
        const { data, error: fnError } = await supabase.functions.invoke('scan-invoice', {
          body: { image: base64 }
        });

        if (fnError) throw new Error(fnError.message || 'Scan failed');
        if (data?.error) throw new Error(data.error);

        const items: ScannedItem[] = (data.items || []).map((item: any) => {
          const match = matchItem(item.name);
          return {
            name: item.name || '',
            quantity: item.quantity || 1,
            unit: item.unit || 'szt',
            price: item.price || 0,
            total: item.total || (item.price || 0) * (item.quantity || 1),
            matchedId: match.id,
            matchedName: match.name,
            category: 'Inne',
            selected: true,
          };
        });

        setScannedItems(items);
        setDocInfo(data.document_info || null);
        setConfidence(data.confidence || 0);
        setNotes(data.notes || '');
        setStep('preview');
      } catch (err: any) {
        console.error('[DocumentScanner] Error:', err);
        setError(err.message || 'Błąd skanowania dokumentu');
        setStep('upload');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) processImage(file);
  };

  // Edit handlers
  const updateItem = (idx: number, field: keyof ScannedItem, value: any) => {
    setScannedItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const removeItem = (idx: number) => {
    setScannedItems(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleItem = (idx: number) => {
    setScannedItems(prev => prev.map((item, i) => i === idx ? { ...item, selected: !item.selected } : item));
  };

  const toggleAll = () => {
    const allSelected = scannedItems.every(i => i.selected);
    setScannedItems(prev => prev.map(item => ({ ...item, selected: !allSelected })));
  };

  // Import
  const handleImport = async () => {
    const selected = scannedItems.filter(i => i.selected);
    if (selected.length === 0) return;
    setStep('importing');
    try {
      await onImport(selected.map(i => ({
        name: i.name,
        qty: i.quantity,
        price: i.price,
        unit: i.unit,
        matchedId: i.matchedId,
        category: i.category,
      })));
      handleClose();
    } catch {
      setError('Błąd importu');
      setStep('preview');
    }
  };

  if (!isOpen) return null;

  const selectedCount = scannedItems.filter(i => i.selected).length;
  const selectedTotal = scannedItems.filter(i => i.selected).reduce((s, i) => s + i.price * i.quantity, 0);
  const matchedCount = scannedItems.filter(i => i.matchedId).length;

  const docTypeLabels: Record<string, string> = {
    faktura: 'Faktura', wz: 'WZ', paragon: 'Paragon', unknown: 'Dokument'
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-cyan-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl text-white shadow-sm">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Skaner Dokumentów AI</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {step === 'upload' && 'Zrób zdjęcie lub wgraj fakturę / WZ'}
                {step === 'scanning' && 'Analizowanie dokumentu...'}
                {step === 'preview' && `${scannedItems.length} pozycji rozpoznanych`}
                {step === 'importing' && 'Importowanie do magazynu...'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="w-9 h-9 rounded-full bg-white/80 text-slate-400 hover:text-slate-600 hover:bg-white flex items-center justify-center transition-all border border-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Error */}
          {error && (
            <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-red-700 font-medium">Błąd skanowania</p>
                <p className="text-xs text-red-600 mt-0.5">{error}</p>
              </div>
              <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="p-5 sm:p-8">
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                className="border-2 border-dashed border-blue-200 rounded-2xl p-8 sm:p-12 text-center bg-gradient-to-b from-blue-50/50 to-white hover:border-blue-400 hover:bg-blue-50/80 transition-all cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <ImageIcon className="w-8 h-8 text-blue-500" />
                </div>
                <h4 className="text-lg font-bold text-slate-700 mb-2">Przeciągnij zdjęcie dokumentu</h4>
                <p className="text-sm text-slate-500 mb-6">lub kliknij aby wybrać plik (JPG, PNG, PDF)</p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="px-5 py-2.5 bg-white border border-blue-200 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-50 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <Upload className="w-4 h-4" /> Wybierz plik
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-sm font-medium hover:from-cyan-600 hover:to-blue-700 transition-all flex items-center gap-2 shadow-sm"
                  >
                    <Camera className="w-4 h-4" /> Zrób zdjęcie
                  </button>
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { icon: <FileText className="w-5 h-5" />, label: 'Faktury', desc: 'VAT, proforma' },
                  { icon: <FileCheck className="w-5 h-5" />, label: 'WZ', desc: 'Wydanie zewnętrzne' },
                  { icon: <Package className="w-5 h-5" />, label: 'Paragony', desc: 'Rachunki zakupowe' },
                ].map((item, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                    <div className="text-slate-400 flex justify-center mb-1.5">{item.icon}</div>
                    <p className="text-xs font-bold text-slate-700">{item.label}</p>
                    <p className="text-[10px] text-slate-400">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Scanning */}
          {step === 'scanning' && (
            <div className="p-8 sm:p-12 text-center">
              {imagePreview && (
                <div className="max-w-xs mx-auto mb-6 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                  <img src={imagePreview} alt="Document" className="w-full h-auto max-h-48 object-contain bg-slate-50" />
                </div>
              )}
              <div className="w-16 h-16 mx-auto mb-4 relative">
                <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
                <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                <Sparkles className="w-6 h-6 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <h4 className="text-lg font-bold text-slate-700 mb-2">GPT-4o Vision analizuje dokument</h4>
              <p className="text-sm text-slate-500">Rozpoznawanie pozycji, cen i ilości...</p>
              <div className="mt-4 flex justify-center gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="p-4 sm:p-5 space-y-4">
              {/* Document info bar */}
              {docInfo && (
                <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                  <button onClick={() => setExpandedDoc(!expandedDoc)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${docInfo.type === 'faktura' ? 'bg-blue-100 text-blue-600' : docInfo.type === 'wz' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-bold text-slate-700">{docTypeLabels[docInfo.type] || 'Dokument'}</span>
                        {docInfo.number && <span className="text-xs text-slate-500 ml-2">Nr: {docInfo.number}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${confidence >= 0.8 ? 'bg-emerald-100 text-emerald-700' : confidence >= 0.5 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {Math.round(confidence * 100)}% pewności
                      </span>
                      {expandedDoc ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </button>
                  {expandedDoc && (
                    <div className="px-4 pb-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500 border-t border-slate-100 pt-3">
                      {docInfo.date && <span>Data: <b className="text-slate-700">{docInfo.date}</b></span>}
                      {docInfo.supplier && <span>Dostawca: <b className="text-slate-700">{docInfo.supplier}</b></span>}
                      {docInfo.currency && <span>Waluta: <b className="text-slate-700">{docInfo.currency}</b></span>}
                      {notes && <span className="flex items-center gap-1 text-amber-600"><Info className="w-3 h-3" />{notes}</span>}
                    </div>
                  )}
                </div>
              )}

              {/* Stats bar */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200 font-medium">
                  {selectedCount}/{scannedItems.length} zaznaczonych
                </span>
                <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-200 font-medium">
                  {matchedCount} dopasowanych
                </span>
                <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg border border-amber-200 font-medium flex items-center gap-1">
                  <BadgeEuro className="w-3 h-3" /> {fmtEur(selectedTotal)}
                </span>
                <button onClick={toggleAll} className="ml-auto text-blue-600 hover:text-blue-700 font-medium">
                  {scannedItems.every(i => i.selected) ? 'Odznacz wszystko' : 'Zaznacz wszystko'}
                </button>
              </div>

              {/* Items table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="w-10 px-3 py-2.5"></th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Nazwa produktu</th>
                        <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 w-20">Ilość</th>
                        <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 w-16">Jdn.</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 w-24">Cena/szt.</th>
                        <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 w-28">Status</th>
                        <th className="px-3 py-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {scannedItems.map((item, idx) => (
                        <tr key={idx} className={`hover:bg-slate-50/50 transition-colors ${!item.selected ? 'opacity-40' : ''}`}>
                          <td className="px-3 py-2.5 text-center">
                            <input type="checkbox" checked={item.selected} onChange={() => toggleItem(idx)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              value={item.name}
                              onChange={e => updateItem(idx, 'name', e.target.value)}
                              className="w-full bg-transparent text-slate-800 font-medium text-sm focus:bg-white focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 outline-none transition-all"
                            />
                            {item.matchedName && (
                              <div className="text-[10px] text-emerald-600 mt-0.5 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> → {item.matchedName}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <input
                              type="number" min="0" step="1"
                              value={item.quantity}
                              onChange={e => updateItem(idx, 'quantity', Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-16 text-center bg-transparent font-mono text-sm focus:bg-white focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 outline-none border border-transparent hover:border-slate-200"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <select value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)}
                              className="text-xs bg-transparent border border-transparent hover:border-slate-200 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-blue-400">
                              {['szt', 'm', 'mb', 'm²', 'kg', 'kpl', 'op', 'l'].map(u => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <input
                              type="number" min="0" step="0.01"
                              value={item.price}
                              onChange={e => updateItem(idx, 'price', Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-20 text-right bg-transparent font-mono text-sm focus:bg-white focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 outline-none border border-transparent hover:border-slate-200"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {item.matchedId ? (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
                                ✓ Istniejący
                              </span>
                            ) : (
                              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200 font-medium">
                                + Nowy
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <button onClick={() => removeItem(idx)} className="w-6 h-6 rounded-full hover:bg-red-50 text-slate-300 hover:text-red-500 flex items-center justify-center transition-colors">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {scannedItems.length === 0 && (
                  <div className="p-8 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm">Nie rozpoznano żadnych pozycji</p>
                  </div>
                )}
              </div>

              {/* Thumbnail */}
              {imagePreview && (
                <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <img src={imagePreview} alt="Scan" className="w-12 h-12 object-cover rounded-lg border border-slate-200" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-600 truncate">Zeskanowany dokument</p>
                    <p className="text-[10px] text-slate-400">{scannedItems.length} pozycji rozpoznanych</p>
                  </div>
                  <button onClick={reset} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" /> Skanuj ponownie
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Importing */}
          {step === 'importing' && (
            <div className="p-12 text-center">
              <Loader2 className="w-12 h-12 text-emerald-500 mx-auto mb-4 animate-spin" />
              <h4 className="text-lg font-bold text-slate-700 mb-2">Importowanie do magazynu</h4>
              <p className="text-sm text-slate-500">{selectedCount} pozycji...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'preview' && (
          <div className="border-t border-slate-100 p-4 flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50/50">
            <div className="text-xs text-slate-500">
              <span className="font-medium text-slate-700">{selectedCount}</span> pozycji do przyjęcia
              {selectedTotal > 0 && <> · Wartość: <span className="font-bold text-emerald-700">{fmtEur(selectedTotal)}</span></>}
            </div>
            <div className="flex gap-2">
              <button onClick={handleClose} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
                Anuluj
              </button>
              <button
                onClick={handleImport}
                disabled={selectedCount === 0}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center gap-2 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" /> Przyjmij {selectedCount} pozycji
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
