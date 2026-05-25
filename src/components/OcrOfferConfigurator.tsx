import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { ProductConfig } from '../types';
import {
  Camera, Upload, X, FileText, Loader2, Sparkles,
  Trash2, Image as ImageIcon, RotateCcw, Package
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure pdf.js worker — use local import to avoid version mismatch
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface ScannedItem {
  name: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
}

interface OcrOfferConfiguratorProps {
  onComplete: (config: ProductConfig) => void;
  initialData?: ProductConfig;
}

type ScanStep = 'upload' | 'scanning' | 'review';

export const OcrOfferConfigurator: React.FC<OcrOfferConfiguratorProps> = ({
  onComplete,
  initialData
}) => {
  const [step, setStep] = useState<ScanStep>('upload');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>(initialData?.ocrItems || []);
  const [error, setError] = useState('');

  // Commercial / Configurator state
  const [modelId, setModelId] = useState<string>(initialData?.modelId || '');
  const [roofType, setRoofType] = useState<ProductConfig['roofType']>(initialData?.roofType || 'polycarbonate');
  const [description, setDescription] = useState(initialData?.manualDescription || '');
  
  // Financial state
  const [marginPct, setMarginPct] = useState<string>(initialData?.ocrMargin?.toString() || '30');
  const [installationFee, setInstallationFee] = useState<string>(initialData?.ocrInstallationFee?.toString() || '0');
  const [invoiceTotal, setInvoiceTotal] = useState<number>(initialData?.ocrBasePrice || 0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const models = [
    { id: 'Orangeline', name: 'Orangestyle', hasPoly: true, hasGlass: true, image_url: '/images/models/orangeline.jpg' },
    { id: 'Orangeline+', name: 'Orangestyle+', hasPoly: true, hasGlass: true, image_url: '/images/models/orangeline-plus.jpg' },
    { id: 'Trendline', name: 'Trendstyle', hasPoly: true, hasGlass: true, image_url: '/images/models/trendline.jpg' },
    { id: 'Trendline+', name: 'Trendstyle+', hasPoly: true, hasGlass: true, image_url: '/images/models/trendline-plus.jpg' },
    { id: 'Topline', name: 'Topstyle', hasPoly: true, hasGlass: true, image_url: '/images/models/topline.jpg' },
    { id: 'Topline XL', name: 'Topstyle XL', hasPoly: true, hasGlass: true, image_url: '/images/models/topline-xl.jpg' },
    { id: 'Designline', name: 'Designstyle', hasPoly: false, hasGlass: true, image_url: '/images/models/designline.jpg' },
    { id: 'Ultraline', name: 'Ultrastyle', hasPoly: false, hasGlass: true, image_url: '/images/models/ultraline.jpg' },
    { id: 'Skyline', name: 'Skystyle', hasPoly: false, hasGlass: false, image_url: '/images/models/skyline.jpg' },
    { id: 'Carport', name: 'Carport', hasPoly: false, hasGlass: false, image_url: '/images/models/carport.jpg' },
    { id: 'TR10', name: 'Orangestyle 10', hasPoly: true, hasGlass: true, image_url: '/images/models/teranda-tr10.jpg' },
    { id: 'TR15', name: 'Trendstyle 15', hasPoly: true, hasGlass: true, image_url: '/images/models/teranda-tr15.jpg' },
    { id: 'TR20', name: 'Topstyle 20', hasPoly: true, hasGlass: true, image_url: '/images/models/teranda-tr20.jpg' },
    { id: 'Pergola', name: 'Pergola', hasPoly: false, hasGlass: false, image_url: '/images/models/pergola.jpg' },
    { id: 'Pergola Deluxe', name: 'Pergola Deluxe', hasPoly: false, hasGlass: false, image_url: '/images/models/pergola-deluxe.jpg' },
    { id: 'Pergola Luxe', name: 'Pergola Luxe (Manuell)', hasPoly: false, hasGlass: false, image_url: '/images/models/pergola-luxe/pergola-luxe-anthracite.jpg' },
    { id: 'Pergola Luxe Electric', name: 'Pergola Luxe (Elektrisch)', hasPoly: false, hasGlass: false, image_url: '/images/models/pergola-luxe/pergola-luxe-anthracite.jpg' },
  ];

  // Convert a single PDF page to a data URL image
  const pdfPageToImage = async (page: any, scale: number = 2.0): Promise<string> => {
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  // Process a PDF file — convert all pages to images and send them all to AI
  const processPdf = async (file: File) => {
    setError('');
    setStep('scanning');
    setImagePreview(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pageCount = pdf.numPages;

      toast.success(`PDF: ${pageCount} stron — konwertuję...`);

      const pageImages: string[] = [];
      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const img = await pdfPageToImage(page);
        pageImages.push(img);
      }

      // Show first page as preview
      setImagePreview(pageImages[0]);

      // Send ALL pages to AI
      const { data, error: fnError } = await supabase.functions.invoke('scan-invoice', {
        body: { images: pageImages }
      });

      if (fnError) throw new Error(fnError.message || 'Scan failed');
      if (data?.error) throw new Error(data.error);

      const items: ScannedItem[] = (data.items || []).map((item: any) => {
        const qty = item.quantity || 1;
        const itemTotal = item.totalPrice ?? item.total ?? item.price ?? 0;
        const unitPrice = qty > 0 ? itemTotal / qty : itemTotal;
        return {
          name: item.name || '',
          quantity: qty,
          unit: item.unit || 'szt',
          price: Math.round(unitPrice * 100) / 100,
          total: Math.round(itemTotal * 100) / 100,
        };
      });

      if (data.globalCosts && Array.isArray(data.globalCosts)) {
        for (const gc of data.globalCosts) {
          if (gc.price && gc.price > 0) {
            items.push({
              name: gc.name || 'Versand & Verpackung',
              quantity: 1,
              unit: 'szt',
              price: Math.round((gc.price || 0) * 100) / 100,
              total: Math.round((gc.price || 0) * 100) / 100,
            });
          }
        }
      }

      setScannedItems(items);

      if (data.invoiceTotal && data.invoiceTotal > 0) {
        setInvoiceTotal(data.invoiceTotal);
      } else {
        setInvoiceTotal(items.reduce((s: number, i: ScannedItem) => s + i.total, 0));
      }

      const autoDesc = items.map(i => `- ${i.name} (${i.quantity} ${i.unit})`).join('\n');
      setDescription(`Zadaszenie wg specyfikacji:\n${autoDesc}\n- Montaż w cenie`);

      setStep('review');
      toast.success(`Pomyślnie przeanalizowano ${pageCount}-stronicowy PDF!`);
    } catch (err: any) {
      console.error('[PDF Scanner] Error:', err);
      setError(err.message || 'Błąd skanowania PDF');
      setStep('upload');
      toast.error('Błąd skanowania PDF');
    }
  };

  const processImage = async (file: File) => {
    // Handle PDF files
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      return processPdf(file);
    }

    setError('');
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
          const qty = item.quantity || 1;
          const itemTotal = item.totalPrice ?? item.total ?? item.price ?? 0;
          const unitPrice = qty > 0 ? itemTotal / qty : itemTotal;
          return {
            name: item.name || '',
            quantity: qty,
            unit: item.unit || 'szt',
            price: Math.round(unitPrice * 100) / 100,
            total: Math.round(itemTotal * 100) / 100,
          };
        });

        if (data.globalCosts && Array.isArray(data.globalCosts)) {
          for (const gc of data.globalCosts) {
            if (gc.price && gc.price > 0) {
              items.push({
                name: gc.name || 'Versand & Verpackung',
                quantity: 1,
                unit: 'szt',
                price: Math.round((gc.price || 0) * 100) / 100,
                total: Math.round((gc.price || 0) * 100) / 100,
              });
            }
          }
        }

        setScannedItems(items);

        if (data.invoiceTotal && data.invoiceTotal > 0) {
          setInvoiceTotal(data.invoiceTotal);
        } else {
          setInvoiceTotal(items.reduce((s: number, i: ScannedItem) => s + i.total, 0));
        }
        
        const autoDesc = items.map(i => `- ${i.name} (${i.quantity} ${i.unit})`).join('\n');
        setDescription(`Zadaszenie wg specyfikacji:\n${autoDesc}\n- Montaż w cenie`);

        setStep('review');
        toast.success('Pomyślnie przeanalizowano dokument!');
      } catch (err: any) {
        console.error('[DocumentScanner] Error:', err);
        setError(err.message || 'Błąd skanowania dokumentu');
        setStep('upload');
        toast.error('Błąd skanowania OCR');
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
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
      processImage(file);
    } else if (file) {
      toast.error('Obsługiwane formaty: JPG, PNG, PDF');
    }
  };

  const updateItem = (idx: number, field: keyof ScannedItem, value: any) => {
    setScannedItems(prev => {
      const newItems = [...prev];
      newItems[idx] = { ...newItems[idx], [field]: value };
      // Recalculate total if price or qty changes
      if (field === 'price' || field === 'quantity') {
        newItems[idx].total = newItems[idx].price * newItems[idx].quantity;
      }
      return newItems;
    });
  };

  const removeItem = (idx: number) => {
    setScannedItems(prev => prev.filter((_, i) => i !== idx));
  };

  const resetScan = () => {
    setStep('upload');
    setImagePreview(null);
    setScannedItems([]);
    setInvoiceTotal(0);
  };

  const handleSubmit = () => {
    if (!modelId) {
      toast.error('Wybierz model produktu (dla wizualizacji)');
      return;
    }
    if (!description) {
      toast.error('Podaj opis oferty dla klienta');
      return;
    }
    if (scannedItems.length === 0) {
      toast.error('Brak pozycji z OCR');
      return;
    }

    // Use invoiceTotal (Gesamtpreis from invoice) as the purchase cost base
    const basePrice = invoiceTotal > 0 ? invoiceTotal : scannedItems.reduce((acc, item) => acc + item.total, 0);
    const margin = parseFloat(marginPct) / 100 || 0;
    const installCost = parseFloat(installationFee) || 0;

    // Selling = Gesamtpreis (Einkauf) + Margin markup + Installation
    const sellingPriceNet = basePrice * (1 + margin) + installCost;

    const config: ProductConfig = {
      modelId,
      roofType,
      width: 5000, 
      projection: 3000,
      color: 'RAL 7016',
      customColor: false,
      installationType: 'wall-mounted',
      addons: [],
      isManual: true,
      isOcr: true,
      manualDescription: description,
      manualPrice: sellingPriceNet,
      ocrItems: scannedItems,
      ocrBasePrice: basePrice,
      ocrMargin: margin,
      ocrInstallationFee: installCost
    };

    onComplete(config);
  };

  const itemsSum = scannedItems.reduce((acc, item) => acc + item.total, 0);
  const effectiveBasePrice = invoiceTotal > 0 ? invoiceTotal : itemsSum;
  const calculatedSellingPrice = effectiveBasePrice * (1 + (parseFloat(marginPct) / 100 || 0)) + (parseFloat(installationFee) || 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Visual Model Selection */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <ImageIcon className="w-6 h-6 text-indigo-500" /> Wybierz Model (do wizualizacji w ofercie)
        </h3>
        <p className="text-sm text-slate-500 mb-6">
          Zaznacz model przypominający produkt z zewnętrznej oferty. Zostanie on wyświetlony klientowi w PDFie.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {models.map(model => {
            const isSelected = modelId === model.id;
            return (
              <div
                key={model.id}
                onClick={() => {
                  setModelId(model.id);
                  if (model.hasGlass && !model.hasPoly) setRoofType('glass');
                  else setRoofType('polycarbonate');
                }}
                className={`cursor-pointer border-2 rounded-xl overflow-hidden transition-all relative group ${isSelected
                  ? 'border-accent ring-2 ring-accent/20 shadow-lg'
                  : 'border-slate-100 hover:border-accent/40 hover:shadow-md'
                  }`}
              >
                <div className="aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-50 relative overflow-hidden">
                  <img
                    src={model.image_url}
                    alt={model.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon') as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <div className="fallback-icon absolute inset-0 items-center justify-center text-slate-300 hidden">
                    <ImageIcon className="w-10 h-10" />
                  </div>
                  <div className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected
                    ? 'bg-accent border-accent'
                    : 'bg-white/80 border-slate-300'}`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="p-2.5">
                  <h4 className="font-bold text-sm text-slate-900 leading-tight">{model.name}</h4>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {model.hasGlass && <span className="text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-medium">Szkło</span>}
                    {model.hasPoly && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Poliwęglan</span>}
                    {!model.hasGlass && !model.hasPoly && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">Lamele</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* OCR Section */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="text-2xl">🤖</span> Wgranie i Odczyt Oferty (OCR)
        </h3>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {step === 'upload' && (
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            className="border-2 border-dashed border-indigo-200 rounded-2xl p-8 sm:p-12 text-center bg-gradient-to-b from-indigo-50/50 to-white hover:border-indigo-400 hover:bg-indigo-50/80 transition-all cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <ImageIcon className="w-8 h-8 text-indigo-500" />
            </div>
            <h4 className="text-lg font-bold text-slate-700 mb-2">Przeciągnij zrzut ekranu oferty, zdjęcie lub PDF</h4>
            <p className="text-sm text-slate-500 mb-6">JPG, PNG lub PDF (wielostronicowy) — AI przeanalizuje wszystkie strony</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="px-5 py-2.5 bg-white border border-indigo-200 text-indigo-700 rounded-xl text-sm font-medium hover:bg-indigo-50 transition-colors flex items-center gap-2 shadow-sm"
              >
                <Upload className="w-4 h-4" /> Wybierz plik
              </button>
            </div>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*,.pdf,application/pdf" className="hidden" onChange={handleFileChange} />

        {step === 'scanning' && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
              <Sparkles className="w-6 h-6 text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <h4 className="text-lg font-bold text-slate-700 mb-2">Sztuczna Inteligencja analizuje tabelę z ofertą</h4>
            <p className="text-sm text-slate-500">Wyciąganie pozycji, ilości oraz cen zakupu...</p>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-4">
                {imagePreview && (
                  <img src={imagePreview} alt="Zeskanowana oferta" className="w-12 h-12 object-cover rounded-lg border border-slate-300" />
                )}
                <div>
                  <h4 className="font-bold text-slate-800">Odczytane pozycje ({scannedItems.length})</h4>
                  <p className="text-xs text-slate-500">Zweryfikuj poprawność odczytu przez AI</p>
                </div>
              </div>
              <button onClick={resetScan} className="text-sm text-indigo-600 font-bold hover:text-indigo-700 flex items-center gap-1">
                <RotateCcw className="w-4 h-4" /> Skanuj ponownie
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Nazwa (odczyt)</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 w-24">Ilość</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 w-28">Cena jedn. (€)</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 w-28">Suma (€)</th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {scannedItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2">
                          <input
                            value={item.name}
                            onChange={e => updateItem(idx, 'name', e.target.value)}
                            className="w-full bg-transparent font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-400 rounded px-2 py-1 outline-none transition-all"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="number" min="0" step="1"
                            value={item.quantity}
                            onChange={e => updateItem(idx, 'quantity', Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-16 text-center bg-transparent font-mono text-sm focus:bg-white focus:ring-1 focus:ring-indigo-400 rounded px-2 py-1 outline-none"
                          />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number" min="0" step="0.01"
                            value={item.price}
                            onChange={e => updateItem(idx, 'price', Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-20 text-right bg-transparent font-mono text-sm focus:bg-white focus:ring-1 focus:ring-indigo-400 rounded px-2 py-1 outline-none"
                          />
                        </td>
                        <td className="px-4 py-2 text-right font-mono font-bold text-slate-700">
                          {item.total.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button onClick={() => removeItem(idx)} className="text-slate-400 hover:text-red-500 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {scannedItems.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">
                          <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p>Brak pozycji. Załaduj dokument ponownie.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-right text-slate-500 text-xs">Suma pozycji:</td>
                      <td className="px-4 py-2 text-right text-slate-500 text-sm">{itemsSum.toFixed(2)} €</td>
                      <td></td>
                    </tr>
                    <tr className="bg-amber-50 border-t border-amber-200">
                      <td colSpan={3} className="px-4 py-3 text-right text-amber-800 font-bold">
                        Gesamtpreis Netto (Einkaufspreis):
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number" min="0" step="0.01"
                          value={invoiceTotal || ''}
                          onChange={e => setInvoiceTotal(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-28 text-right font-mono font-bold text-lg text-amber-900 bg-white border border-amber-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-amber-400 outline-none"
                        />
                      </td>
                      <td className="px-2 text-amber-600 text-[10px]">€</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Financials & Output */}
      {step === 'review' && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="text-2xl">💰</span> Marża, Montaż i Opis dla Klienta
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-2">Kalkulacja</h4>

              {/* Einkaufspreis from invoice */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-amber-800">Einkaufspreis (Gesamtpreis Netto)</span>
                  <span className="font-mono font-bold text-amber-900 text-lg">{effectiveBasePrice.toFixed(2)} €</span>
                </div>
                <p className="text-[10px] text-amber-600 mt-0.5">Z faktury dostawcy — od tej kwoty liczymy marżę</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Narzut (Marża) %</label>
                <div className="relative max-w-xs">
                  <input
                    type="number"
                    value={marginPct}
                    onChange={(e) => setMarginPct(e.target.value)}
                    className="w-full pl-4 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-base"
                    placeholder="30"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</div>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {effectiveBasePrice.toFixed(2)} + ({effectiveBasePrice.toFixed(2)} × {marginPct}%) = {(effectiveBasePrice * (1 + (parseFloat(marginPct) / 100 || 0))).toFixed(2)} €
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Koszty Montażu (EUR)</label>
                <div className="relative max-w-xs">
                  <input
                    type="number"
                    value={installationFee}
                    onChange={(e) => setInstallationFee(e.target.value)}
                    className="w-full pl-4 pr-12 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-base"
                    placeholder="0"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">EUR</div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <div className="flex justify-between items-end">
                  <span className="text-slate-600 font-medium">Cena dla Klienta (Netto)</span>
                  <span className="text-2xl font-black text-emerald-600">{calculatedSellingPrice.toFixed(2)} EUR</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 text-right">
                  Zysk: {(calculatedSellingPrice - effectiveBasePrice - (parseFloat(installationFee) || 0)).toFixed(2)} € ({((parseFloat(marginPct) || 0)).toFixed(0)}% narzut)
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Opis Oferty (widoczny na PDF dla klienta)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={8}
                className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none font-mono text-sm leading-relaxed"
                placeholder="Wpisz treść, która będzie widoczna w PDFie dla klienta..."
              />
              <p className="text-xs text-slate-500 mt-2">
                Możesz edytować ten opis. Domyślnie wygenerowano go na podstawie odczytanych pozycji z pliku.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={handleSubmit}
              className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl font-bold text-lg shadow-xl shadow-indigo-500/20 hover:from-indigo-600 hover:to-indigo-700 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              Wygeneruj Ofertę <Sparkles className="w-5 h-5" />
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
