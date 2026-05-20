import React from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import type { InventoryItem } from '../../services/database/inventory.service';

export const getStockStatus = (item: InventoryItem) => {
  if (!item.isActive) return { label: 'Nieaktywny', color: 'bg-slate-100 text-slate-500 border-slate-200', icon: <XCircle className="w-3.5 h-3.5" /> };
  if (item.minQuantity > 0 && item.quantity <= item.minQuantity) return { label: `Niski stan (min: ${item.minQuantity})`, color: 'bg-red-50 text-red-700 border-red-200', icon: <AlertTriangle className="w-3.5 h-3.5" /> };
  return { label: 'OK', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle className="w-3.5 h-3.5" /> };
};

export const fmtEur = (v: number) => v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

export interface Supplier { id: string; name: string; }
