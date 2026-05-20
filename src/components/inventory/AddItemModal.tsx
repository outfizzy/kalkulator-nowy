import React, { useState } from 'react';
import { X, Package, MapPin } from 'lucide-react';
import { WAREHOUSE_CATEGORIES, COLORS } from '../../services/database/inventory.service';
import type { Supplier } from './WarehouseHelpers';

interface Props {
  suppliers: Supplier[];
  existingCategories: string[];
  onAdd: (item: any) => Promise<void>;
  onClose: () => void;
}

export const AddItemModal: React.FC<Props> = ({ suppliers, existingCategories, onAdd, onClose }) => {
  const [form, setForm] = useState({
    name: '', sku: '', category: 'Inne', color: '', lengthMm: '', weightKg: '',
    purchasePrice: '', minQuantity: '0', unit: 'szt', description: '', location: 'Magazyn główny', supplierId: '',
  });
  const [saving, setSaving] = useState(false);

  const allCategories = [...new Set([...WAREHOUSE_CATEGORIES, ...existingCategories])];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onAdd({
        name: form.name.trim(),
        sku: form.sku.trim() || undefined,
        category: form.category,
        quantity: 0,
        minQuantity: parseInt(form.minQuantity) || 0,
        unit: form.unit,
        description: form.description.trim() || undefined,
        color: form.color || undefined,
        lengthMm: form.lengthMm ? parseInt(form.lengthMm) : undefined,
        weightKg: form.weightKg ? parseFloat(form.weightKg) : undefined,
        purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : undefined,
        location: form.location || 'Magazyn główny',
        supplierId: form.supplierId || undefined,
        isActive: true,
      });
      onClose();
    } finally { setSaving(false); }
  };

  const field = (label: string, key: string, type = 'text', placeholder = '', extra?: React.ReactNode) => (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">{label}</label>
      {extra || <input type={type} value={(form as any)[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white" placeholder={placeholder} />}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-5 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl"><Package className="w-5 h-5" /></div>
            <div><h3 className="font-bold text-lg">Nowa pozycja</h3><p className="text-amber-100 text-xs">Dodaj element do magazynu</p></div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {field('Nazwa *', 'name', 'text', 'np. Słup Giallo 3m')}
            {field('SKU / Kod', 'sku', 'text', 'np. SLP-GIALLO-3M-ANT')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field('Kategoria', 'category', '', '', (
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none bg-white">
                {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            ))}
            {field('Kolor', 'color', '', '', (
              <select value={form.color} onChange={e => setForm({ ...form, color: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none bg-white">
                <option value="">— Bez koloru —</option>
                {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {field('Długość (mm)', 'lengthMm', 'number', '3000')}
            {field('Waga (kg)', 'weightKg', 'number', '2.5')}
            {field('Cena zakupu (€)', 'purchasePrice', 'number', '0.00')}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {field('Min. ilość', 'minQuantity', 'number', '0')}
            {field('Jednostka', 'unit', 'text', 'szt')}
            {field('Dostawca', 'supplierId', '', '', (
              <select value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none bg-white">
                <option value="">— Wybierz —</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            ))}
          </div>
          {field('Lokalizacja', 'location', 'text', 'Magazyn główny, Regał A3...')}
          {field('Opis / uwagi', 'description', 'text', 'Opcjonalny opis...')}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-200">Anuluj</button>
            <button type="submit" disabled={saving || !form.name.trim()} className="px-5 py-2.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl disabled:opacity-50 transition-colors">
              {saving ? 'Zapisywanie...' : 'Dodaj pozycję'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
