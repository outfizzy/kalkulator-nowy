import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Camera, ScanLine, Keyboard, Search } from 'lucide-react';
import type { InventoryItem } from '../../services/database/inventory.service';
import { InventoryService } from '../../services/database/inventory.service';
import type { Installation } from '../../types';
import { toast } from 'react-hot-toast';

interface Props {
  item?: InventoryItem | null; // if provided, pre-select this item
  onClose: () => void;
  onAssign: (itemId: string, installationId: string, quantity: number) => Promise<void>;
}

export const IssueItemModal: React.FC<Props> = ({ item, onClose, onAssign }) => {
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInst, setSelectedInst] = useState('');
  const [instSearch, setInstSearch] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [assigning, setAssigning] = useState(false);

  // Scanner state
  const [scanMode, setScanMode] = useState(false);
  const [manualSku, setManualSku] = useState('');
  const [scannedItem, setScannedItem] = useState<InventoryItem | null>(item || null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    import('../../services/database/installation.service').then(async ({ InstallationService }) => {
      try {
        const data = await InstallationService.getAllInstallations();
        setInstallations(data.filter(i => ['scheduled', 'pending', 'verification', 'issue'].includes(i.status)));
      } catch { toast.error('Błąd ładowania montaży'); }
      finally { setLoading(false); }
    });
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setScanMode(true);
    } catch { toast.error('Brak dostępu do kamery'); }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setScanMode(false);
  };

  const handleManualSkuSearch = async () => {
    if (!manualSku.trim()) return;
    try {
      const found = await InventoryService.findBySku(manualSku.trim().toUpperCase());
      if (found) { setScannedItem(found); toast.success(`Znaleziono: ${found.name}`); }
      else toast.error('Nie znaleziono produktu o tym SKU');
    } catch { toast.error('Błąd wyszukiwania'); }
  };

  const filteredInstallations = installations.filter(i => {
    if (!instSearch) return true;
    const q = instSearch.toLowerCase();
    return (i.client?.lastName || '').toLowerCase().includes(q) ||
      (i.productSummary || '').toLowerCase().includes(q) ||
      (i.scheduledDate || '').includes(q);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedItem || !selectedInst) { toast.error('Wybierz produkt i montaż'); return; }
    if (quantity > scannedItem.quantity) { toast.error('Brak wystarczającej ilości'); return; }
    setAssigning(true);
    try {
      await onAssign(scannedItem.id, selectedInst, quantity);
    } finally { setAssigning(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-5 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl"><ScanLine className="w-5 h-5" /></div>
            <div><h3 className="font-bold text-lg">Wydaj materiał</h3><p className="text-orange-100 text-xs">Pobierz z magazynu na montaż</p></div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Product selection */}
          {scannedItem ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-slate-800">{scannedItem.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {scannedItem.sku && <span className="font-mono text-amber-600 mr-2">{scannedItem.sku}</span>}
                    {scannedItem.color && <span className="mr-2">{scannedItem.color}</span>}
                    Dostępne: <span className="font-bold">{scannedItem.quantity} {scannedItem.unit}</span>
                  </div>
                </div>
                {!item && <button onClick={() => setScannedItem(null)} className="text-xs text-red-500 hover:text-red-700">Zmień</button>}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase">Znajdź produkt</p>
              <div className="flex gap-2">
                <button onClick={startCamera} className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-50 border border-indigo-200 rounded-xl text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors">
                  <Camera className="w-4 h-4" /> Skanuj kamerą
                </button>
                <div className="flex-1 relative">
                  <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input value={manualSku} onChange={e => setManualSku(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleManualSkuSearch()}
                    className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Wpisz SKU..." />
                </div>
              </div>
              {scanMode && (
                <div className="relative rounded-xl overflow-hidden border-2 border-indigo-300">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-48 object-cover bg-black" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-1 bg-red-500/60 animate-pulse" />
                  </div>
                  <button onClick={stopCamera} className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg"><X className="w-4 h-4" /></button>
                  <p className="text-center text-[10px] text-slate-400 py-1 bg-slate-50">Skieruj kamerę na kod kreskowy / QR</p>
                </div>
              )}
            </div>
          )}

          {/* Installation selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Montaż / Klient</label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={instSearch} onChange={e => setInstSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Szukaj klienta..." />
            </div>
            {loading ? <div className="text-sm text-slate-400 text-center py-2">Ładowanie...</div> : (
              <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                value={selectedInst} onChange={e => setSelectedInst(e.target.value)} required>
                <option value="">-- Wybierz montaż --</option>
                {filteredInstallations.map(inst => (
                  <option key={inst.id} value={inst.id}>
                    {inst.client?.lastName} — {inst.productSummary} ({inst.scheduledDate || '?'})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Ilość</label>
            <input type="number" min="1" max={scannedItem?.quantity || 999} value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none" required />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-200">Anuluj</button>
            <button onClick={handleSubmit} disabled={assigning || !scannedItem || !selectedInst}
              className="px-5 py-2.5 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl disabled:opacity-50 transition-colors">
              {assigning ? 'Wydawanie...' : 'Wydaj materiał'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
