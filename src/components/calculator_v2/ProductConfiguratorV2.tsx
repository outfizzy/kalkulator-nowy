import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/translations';
import { PricingService } from '../../services/pricing.service';
import { ConfiguratorService, type LeadConfiguration } from '../../services/database/configurator.service';
import { toast } from 'react-hot-toast';
import { WallVisualizer } from './WallVisualizer';
import { DatabaseService } from '../../services/database';
import { LeadService } from '../../services/database/lead.service';
import { SendEmailModal } from '../leads/SendEmailModal';
import { useAuth } from '../../contexts/AuthContext';
import { SettingsService } from '../../services/database/settings.service';
import type { Customer, Lead, Offer } from '../../types';
import { generateOfferPDF, generateOfferPDFBase64 } from '../../utils/offerPDF';
import { CustomerForm } from '../CustomerForm';
import { calculateDachrechner, type RoofModelId, type DachrechnerResults } from '../../services/dachrechner.service';

// ======= PROFESSIONAL SVG ICONS =======
// Thin-line icons for premium calculator UI — replaces all emoji
const _i = (d: string, cls = 'w-5 h-5') => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={cls}><path d={d} /></svg>
);
const IC = {
    roof:     (c?: string) => _i('M3 21h18M4 21V10l8-7 8 7v11M9 21v-6h6v6', c),
    ruler:    (c?: string) => _i('M21 3H3v18M21 3l-8 8M21 3v4M21 3h-4M3 21h4M3 21v-4', c),
    palette:  (c?: string) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={c || 'w-5 h-5'}><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="12" cy="6" r="1" fill="currentColor"/><circle cx="16" cy="9" r="1" fill="currentColor"/><circle cx="8" cy="14" r="1.5" fill="currentColor"/></svg>,
    puzzle:   (c?: string) => _i('M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.878-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877L2.293 13.439a2.403 2.403 0 0 1-.707-1.706c0-.618.236-1.235.707-1.706l1.568-1.568c.23-.23.556-.338.877-.29.493.074.84.504 1.02.968a2.5 2.5 0 1 0 3.237-3.237c-.464-.18-.894-.527-.967-1.02a1.026 1.026 0 0 1 .289-.877l1.61-1.61A2.404 2.404 0 0 1 11.633.886c.618 0 1.234.236 1.704.707l1.568 1.568c.23.23.556.338.878.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.968 1.02z', c),
    check:    (c?: string) => _i('M5 13l4 4L19 7', c),
    wall:     (c?: string) => _i('M3 21V8l9-5 9 5v13M3 8h18M3 21h18M8 8v13M13 8v13M18 8v13', c),
    freestand:(c?: string) => _i('M4 21V8h16v13M4 8l8-4 8 4M4 21h16M8 8v13M12 4v17M16 8v13', c),
    cart:     (c?: string) => _i('M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0', c),
    compass:  (c?: string) => _i('M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12', c),
    clipboard:(c?: string) => _i('M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z', c),
    build:    (c?: string) => _i('M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z', c),
    alert:    (c?: string) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={c || 'w-5 h-5'}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    link:     (c?: string) => _i('M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71', c),
    measure:  (c?: string) => _i('M2 2l20 20M2 8V2h6M22 16v6h-6', c),
    sun:      (c?: string) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={c || 'w-5 h-5'}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
    wood:     (c?: string) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={c || 'w-5 h-5'}><rect x="2" y="6" width="20" height="3" rx=".5"/><rect x="2" y="11" width="20" height="3" rx=".5"/><rect x="2" y="16" width="20" height="3" rx=".5"/></svg>,
    square:   (c?: string) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={c || 'w-5 h-5'}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18M12 3v18" opacity=".4"/></svg>,
    wrench:   (c?: string) => _i('M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z', c),
};

// ======= TYPES =======
type CoverType = 'Poly' | 'Glass';
type ConstructionType = 'wall' | 'freestanding';
type ViewState = 'customer' | 'mode-select' | 'config' | 'manual' | 'summary';

import { AiService } from '../../services/ai';

interface RoofModel {
    id: string;
    name: string;
    description: string;
    hasPoly: boolean;
    hasGlass: boolean;
    hasFreestanding: boolean;
    image_url?: string;
}

interface Accessory {
    id: string;
    name: string;
    price: number;
    category: 'led' | 'profile' | 'pvc' | 'mounting' | 'polycarbonate' | 'other';
    unit: string;
}

interface BasketItem {
    id: string;
    category: 'roof' | 'wall' | 'accessory' | 'panorama';
    name: string;
    config: string;
    dimensions: string;
    price: number;
    quantity: number;
}

// ======= TECHNICAL SPECIFICATIONS (from Aluxe Technikmappe V01.05) =======
const TECH_SPECS: Record<string, {
    minWidth: number; maxWidth: number; minDepth: number; maxDepth: number;
    maxHeight: number; glassFall: string; keilmassMin: number | null;
    options: string[];
}> = {
    'Orangeline':   { minWidth: 1000, maxWidth: 6000, minDepth: 1000, maxDepth: 5000, maxHeight: 3000, glassFall: '8°', keilmassMin: 39, options: ['Aufdachmarkise', 'Unterdachmarkise', 'Senkrechtmarkise', 'Shutter', 'Panorama', 'Keilfenster', 'Heizsystem', 'LED-Spots', 'LED-Strips (L ED)'] },
    'Orangeline+':  { minWidth: 1000, maxWidth: 7000, minDepth: 1000, maxDepth: 5000, maxHeight: 3000, glassFall: '8-12° Poly / 5-12° Glas', keilmassMin: 34, options: ['Aufdachmarkise', 'Unterdachmarkise', 'Senkrechtmarkise', 'Shutter', 'Panorama', 'Keilfenster', 'Heizsystem', 'LED-Spots', 'LED-Strips (L ED)'] },
    'Trendline':    { minWidth: 1000, maxWidth: 7950, minDepth: 1000, maxDepth: 5000, maxHeight: 3000, glassFall: '5-15°', keilmassMin: 39, options: ['Aufdachmarkise', 'Unterdachmarkise', 'Senkrechtmarkise', 'Shutter', 'Panorama', 'Keilfenster', 'Heizsystem', 'LED-Spots', 'LED-Strips (L ED)'] },
    'Trendline+':   { minWidth: 1000, maxWidth: 7000, minDepth: 1000, maxDepth: 5000, maxHeight: 3000, glassFall: '5-15°', keilmassMin: 50, options: ['Aufdachmarkise', 'Unterdachmarkise', 'Senkrechtmarkise', 'Shutter', 'Panorama', 'Keilfenster', 'Heizsystem', 'LED-Spots', 'LED-Strips (L ED)'] },
    'Topline':      { minWidth: 1000, maxWidth: 7000, minDepth: 1000, maxDepth: 5000, maxHeight: 3000, glassFall: '5-15°', keilmassMin: 84, options: ['Aufdachmarkise', 'Unterdachmarkise', 'Senkrechtmarkise', 'Shutter', 'Panorama', 'Keilfenster', 'Heizsystem', 'LED-Spots', 'LED-Strips (L ED)'] },
    'Topline XL':   { minWidth: 1000, maxWidth: 7000, minDepth: 1000, maxDepth: 5000, maxHeight: 3000, glassFall: '5-15°', keilmassMin: 106, options: ['Aufdachmarkise', 'Unterdachmarkise', 'Senkrechtmarkise', 'Shutter', 'Panorama', 'Keilfenster', 'Heizsystem', 'LED-Spots', 'LED-Strips (L ED)'] },
    'Designline':   { minWidth: 1000, maxWidth: 7000, minDepth: 1000, maxDepth: 5000, maxHeight: 3000, glassFall: '4-12° / 6-8° Schiebe', keilmassMin: 93, options: ['Aufdachmarkise', 'Unterdachmarkise', 'Senkrechtmarkise', 'Shutter', 'Panorama', 'Keilfenster', 'Heizsystem', 'LED-Spots', 'Schiebeeinheit'] },
    'Ultraline':    { minWidth: 1000, maxWidth: 7000, minDepth: 1000, maxDepth: 6000, maxHeight: 3000, glassFall: '1,5-3,1°', keilmassMin: null, options: ['Aufdachmarkise', 'Unterdachmarkise', 'Senkrechtmarkise', 'Shutter', 'Panorama', 'Heizsystem', 'LED-Spots', 'LED-Strips'] },
    'Skyline':      { minWidth: 1000, maxWidth: 7000, minDepth: 1000, maxDepth: 5000, maxHeight: 3000, glassFall: '1,1-1,9°', keilmassMin: null, options: ['Aufdachmarkise', 'Unterdachmarkise', 'Senkrechtmarkise', 'Shutter', 'Panorama', 'Heizsystem', 'LED-Spots', 'LED-Strips'] },
    'Carport':      { minWidth: 1000, maxWidth: 7000, minDepth: 1000, maxDepth: 5000, maxHeight: 3500, glassFall: '~1° Trapez', keilmassMin: null, options: ['Aufdachmarkise', 'Unterdachmarkise', 'Senkrechtmarkise', 'Shutter', 'Panorama', 'Heizsystem', 'LED-Strips'] },
    // Teranda models
    'TR10':         { minWidth: 2000, maxWidth: 7000, minDepth: 1000, maxDepth: 3500, maxHeight: 3000, glassFall: '5-15°', keilmassMin: null, options: [] },
    'TR15':         { minWidth: 2060, maxWidth: 12060, minDepth: 1000, maxDepth: 5000, maxHeight: 3000, glassFall: '5-15°', keilmassMin: null, options: [] },
    'TR20':         { minWidth: 3060, maxWidth: 12060, minDepth: 1000, maxDepth: 6000, maxHeight: 3000, glassFall: '5-15°', keilmassMin: null, options: [] },
    // Pergola Luxe (Mirpol) — Bioclimatic louvered pergola
    'Pergola Luxe':         { minWidth: 3000, maxWidth: 7800, minDepth: 3000, maxDepth: 4000, maxHeight: 2300, glassFall: '—', keilmassMin: null, options: ['LED-Beleuchtung', 'Vertikalmarkise', 'Lamellenwand', 'Glasschiebetür'] },
    'Pergola Luxe Electric': { minWidth: 3000, maxWidth: 4000, minDepth: 3000, maxDepth: 4000, maxHeight: 2300, glassFall: '—', keilmassMin: null, options: ['LED-Beleuchtung (integriert)', 'Vertikalmarkise', 'Lamellenwand', 'Glasschiebetür'] },
};

// ======= PROFILE SPECIFICATIONS (from Excel "Materialien" sheets per model) =======
// Physical profile dimensions for technical display and PDF offers
const PROFILE_SPECS: Record<string, {
    pfosten: string; // Pfosten cross-section (e.g. "110×110mm")
    sparrenTypes: { type: string; dim: string }[];
    rinne: string; // Rinne identifier
}> = {
    'Orangeline':  { pfosten: '—', sparrenTypes: [{ type: 'S', dim: '86×55mm' }, { type: 'M', dim: '100×55mm' }, { type: 'L', dim: '100×55mm' }, { type: 'XL', dim: '112×55mm' }], rinne: 'Rinne Orangeline (11431)' },
    'Orangeline+': { pfosten: '—', sparrenTypes: [{ type: 'S', dim: '86×55mm' }, { type: 'M', dim: '100×55mm' }, { type: 'L', dim: '100×55mm' }, { type: 'XL', dim: '112×55mm' }], rinne: 'Rinne Orangeline+ (11078)' },
    'Trendline':   { pfosten: '110×110mm', sparrenTypes: [{ type: 'S', dim: '86×55mm' }, { type: 'M', dim: '100×55mm' }, { type: 'L', dim: '100×55mm' }, { type: 'XL', dim: '112×55mm' }], rinne: 'Rinne Trendline (11145)' },
    'Trendline+':  { pfosten: '110×110mm', sparrenTypes: [{ type: 'S', dim: '86×55mm' }, { type: 'M', dim: '100×55mm' }, { type: 'L', dim: '100×55mm' }, { type: 'XL', dim: '112×55mm' }], rinne: 'Rinne Trendline+ (11002)' },
    'Topline':     { pfosten: '110×150mm', sparrenTypes: [{ type: 'S', dim: '86×55mm' }, { type: 'M', dim: '100×55mm' }, { type: 'L', dim: '100×55mm' }, { type: 'XL', dim: '112×55mm' }], rinne: 'Rinne Topline (11003)' },
    'Topline XL':  { pfosten: '117×196mm', sparrenTypes: [{ type: 'S', dim: '86×55mm' }, { type: 'M', dim: '100×55mm' }, { type: 'L', dim: '100×55mm' }, { type: 'XL', dim: '112×55mm' }], rinne: 'Rinne Topline XL (11441)' },
    'Designline':  { pfosten: '117×196mm', sparrenTypes: [{ type: 'Mittel', dim: '90×142mm' }, { type: 'Außen', dim: '55×142mm' }], rinne: 'Rinne Designline (11430)' },
    'Ultraline':   { pfosten: '200×200mm', sparrenTypes: [{ type: 'Standard', dim: '100×200mm' }], rinne: 'Rinne Ultraline (11147)' },
    'Skyline':     { pfosten: '117×160mm', sparrenTypes: [{ type: 'Außen', dim: '117×241mm' }, { type: 'Mittel', dim: '40×160mm' }], rinne: 'Rinne Skyline (11165)' },
    'Carport':     { pfosten: '117×160mm', sparrenTypes: [{ type: 'Außen', dim: '117×241mm' }, { type: 'Mittel', dim: '40×160mm' }], rinne: 'Rinne Carport (11165)' },
    // Teranda
    'TR10':        { pfosten: '—', sparrenTypes: [{ type: 'Standard', dim: '—' }], rinne: '—' },
    'TR15':        { pfosten: '—', sparrenTypes: [{ type: 'Standard', dim: '—' }], rinne: '—' },
    'TR20':        { pfosten: '—', sparrenTypes: [{ type: 'Standard', dim: '—' }], rinne: '—' },
    // Pergola Luxe (Mirpol)
    'Pergola Luxe':         { pfosten: '100×100×1,6mm', sparrenTypes: [{ type: 'Lamellen', dim: '145×23×1,4mm' }], rinne: 'WaterSpill (integriert)' },
    'Pergola Luxe Electric': { pfosten: '100×100×1,6mm', sparrenTypes: [{ type: 'Lamellen (motorisiert)', dim: '145×23×1,4mm' }], rinne: 'WaterSpill (integriert)' },
};

// ======= PRODUCT CATALOG =======
const ROOF_MODELS: RoofModel[] = [
    { id: 'Orangeline', name: 'Orangestyle', description: 'Einstiegsprofil • max. 6.000mm Breite', hasPoly: true, hasGlass: true, hasFreestanding: false, image_url: '/images/models/orangeline.jpg' },
    { id: 'Orangeline+', name: 'Orangestyle+', description: 'Einstieg Plus • max. 7.000mm Breite', hasPoly: true, hasGlass: true, hasFreestanding: false, image_url: '/images/models/orangeline-plus.jpg' },
    { id: 'Trendline', name: 'Trendstyle', description: 'Klassisches Profil • max. 7.950mm Breite', hasPoly: true, hasGlass: true, hasFreestanding: true, image_url: '/images/models/trendline.jpg' },
    { id: 'Trendline+', name: 'Trendstyle+', description: 'Klassisch Plus • max. 7.000mm Breite', hasPoly: true, hasGlass: true, hasFreestanding: true, image_url: '/images/models/trendline-plus.jpg' },
    { id: 'Topline', name: 'Topstyle', description: 'Premium Profil • max. 7.000mm Breite', hasPoly: true, hasGlass: true, hasFreestanding: true, image_url: '/images/models/topline.jpg' },
    { id: 'Topline XL', name: 'Topstyle XL', description: 'Extra große XL-Konstruktion', hasPoly: true, hasGlass: true, hasFreestanding: false, image_url: '/images/models/topline-xl.jpg' },
    { id: 'Designline', name: 'Designstyle', description: 'Elegantes Design • nur Glas • Schiebeeinheit', hasPoly: false, hasGlass: true, hasFreestanding: true, image_url: '/images/models/designline.jpg' },
    { id: 'Ultraline', name: 'Ultrastyle', description: 'Premium 100mm Profil • max. 6.000mm Tiefe', hasPoly: false, hasGlass: true, hasFreestanding: false, image_url: '/images/models/ultraline.jpg' },
    { id: 'Skyline', name: 'Skystyle', description: 'Pergola mit Lamellen', hasPoly: false, hasGlass: false, hasFreestanding: true, image_url: '/images/models/skyline.jpg' },
    { id: 'Carport', name: 'Carport', description: 'Carport mit Stahlblech • max. 3.500mm Höhe', hasPoly: false, hasGlass: false, hasFreestanding: true, image_url: '/images/models/carport.jpg' },
    // --- Teranda ---
    { id: 'TR10', name: 'Orangestyle 10', description: 'Einstiegsprofil • max. 7.000mm • VSG 44.2', hasPoly: true, hasGlass: true, hasFreestanding: false, image_url: '/images/models/teranda-tr10.jpg' },
    { id: 'TR15', name: 'Trendstyle 15', description: 'Standard Profil • max. 12.060mm • VSG 44.2', hasPoly: true, hasGlass: true, hasFreestanding: false, image_url: '/images/models/teranda-tr15.jpg' },
    { id: 'TR20', name: 'Topstyle 20', description: 'Premium Profil • max. 12.060mm • VSG 55.2', hasPoly: true, hasGlass: true, hasFreestanding: false, image_url: '/images/models/teranda-tr20.jpg' },
    // --- Pergola Luxe (Mirpol) ---
    { id: 'Pergola Luxe', name: 'Pergola Luxe (Manuell)', description: 'Bioklimatisch - Manuell drehbare Alu-Lamellen - Freistehend', hasPoly: false, hasGlass: false, hasFreestanding: true, image_url: '/images/models/pergola-luxe/pergola-luxe-anthracite.jpg' },
    { id: 'Pergola Luxe Electric', name: 'Pergola Luxe (Elektrisch)', description: 'Bioklimatisch - Somfy Motor + LED - Fernbedienung - Freistehend', hasPoly: false, hasGlass: false, hasFreestanding: true, image_url: '/images/models/pergola-luxe/pergola-luxe-anthracite.jpg' },
];

// Glass variant options
const GLASS_VARIANTS = [
    { id: 'klar', name: 'Klar (VSG)', description: 'Klares Sicherheitsglas', color: '#22c55e' },
    { id: 'matt', name: 'Matt (VSG)', description: 'Satiniert, Sichtschutz', color: '#e5e7eb' },
    { id: 'stopsol', name: 'UV Reflex', description: 'Sonnenschutzglas', color: '#f97316' },
];

// Teranda-specific glass variants (Klar + Matt only, different lookup)
const TERANDA_GLASS_VARIANTS = [
    { id: 'klar', name: 'Klar (VSG)', description: 'Klares Sicherheitsglas', color: '#22c55e' },
    { id: 'matt', name: 'Matt (VSG)', description: 'Satiniert / Milchglas', color: '#e5e7eb' },
];

// Polycarbonate variant options (per Excel: klar/opal share price, IR Gold is surcharge)
const POLY_VARIANTS = [
    { id: 'opal', name: 'Opal', description: 'Lichtstreuend, milchig', color: '#e5e7eb' },
    { id: 'klar', name: 'Klar', description: 'Transparent', color: '#22c55e' },
    { id: 'ir-gold', name: 'IR Gold', description: 'IR-Wärmeschutz', color: '#eab308' },
    { id: 'smokey', name: 'Smokey Grey', description: 'Getönt, UV-Schutz', color: '#6b7280' },
];

// Teranda-specific poly variants (Klar + Reflex Pearl only)
const TERANDA_POLY_VARIANTS = [
    { id: 'klar', name: 'Klar', description: 'Transparent', color: '#22c55e' },
    { id: 'reflex-pearl', name: 'Reflex Pearl', description: 'Lichtstreuend, Perlmutt', color: '#f5f5dc' },
];

const WALL_PRODUCTS = [
    { id: 'Side Wall (Glass)', name: 'Seitenwand (Glas)', icon: 'square', description: 'Aluminium-Seitenwand mit VSG-Verglasung' },
    { id: 'Front Wall (Glass)', name: 'Frontwand (Glas)', icon: 'square', description: 'Aluminium-Frontwand mit VSG-Verglasung' },
];

// Keilfenster (Wedge) accessories from Aluxe pricelist
const KEILFENSTER_ACCESSORIES = [
    { id: 'uProfil', name: 'U-Profil 55x29mm', price: 38.40, icon: 'ruler', description: 'Ausgleichs-U-Profil für Fenster', image: '/materials/u-profil_kopplung.png' },
    { id: 'schraubenSet', name: 'Schrauben-Set Keilfenster', price: 15.32, icon: 'wrench', description: 'Montage-Schrauben-Set', image: '/materials/schraubenset_keilfenster.png' },
    { id: 'kippFenster', name: 'Kipp-Fenster Keilfenster', price: 564.75, icon: 'square', description: 'Dreh-Kipp-Fenster im Keil', image: '/materials/kippprofil.png' },
    { id: 'abdeckungEL891', name: 'Abdeckung Keilfenster EL891', price: 20.07, icon: 'square', description: 'Abdeckung 3200mm', image: '/materials/abdeckleiste.png' },
];

// ======= MATERIAL IMAGE MAP (extracted via RichData vm attribute from AluxePreisliste.xlsx) =======
// Verified: cell E{row} vm=N → imageN.png, product name from column A same row
// Each product has its exact technical profile drawing from the manufacturer
const MATERIAL_IMAGES: [string, string][] = [
    // === RINNE (Gutters) — model-specific ===
    ['Rinne Orangeline+', '/materials/rinne_orangeline+.png'],
    ['Rinne Orangeline', '/materials/rinne_orangeline.png'],
    ['Rinne Trendline plus', '/materials/rinne_trendline_plus.png'],
    ['Rinne Trendline', '/materials/rinne_trendline.png'],
    ['Rinne Topline XL', '/materials/rinne_topline_xl.png'],
    ['Rinne Topline', '/materials/rinne_topline.png'],
    ['Rinne Designline', '/materials/rinne_designline.png'],
    ['Rinne Ultraline', '/materials/rinne_ultraline.png'],
    ['Rinne Skyline', '/materials/rinne_skyline__carport.png'],
    ['Rinne Carport', '/materials/rinne_skyline__carport.png'],

    // === PFOSTEN (Posts) — model-specific ===
    ['Pfosten Trendline Klassik', '/materials/pfosten_trendline_klassik.png'],
    ['Pfosten Trendline Rund', '/materials/pfosten_trendline_rund.png'],
    ['Pfosten Trendline', '/materials/pfosten_trendline.png'],
    ['Pfosten Designline / Topline XL', '/materials/pfosten_designline__topline_xl.png'],
    ['Pfosten Designline', '/materials/pfosten_designline__topline_xl.png'],
    ['Pfosten Topline XL', '/materials/pfosten_designline__topline_xl.png'],
    ['Pfosten Topline', '/materials/pfosten_topline.png'],
    ['Pfosten Ultraline', '/materials/pfosten_ultraline.png'],
    ['Pfosten Skyline', '/materials/pfosten_skyline__carport.png'],
    ['Pfosten Carport', '/materials/pfosten_skyline__carport.png'],
    ['Pfosten', '/materials/pfosten.png'],
    ['Ausgleichspfosten', '/materials/pfosten.png'],

    // === SPARREN (Rafters) — model-specific ===
    ['Mittlere Sparren Designline', '/materials/mittlere_sparren_designline.png'],
    ['Mittelsparren Skyline', '/materials/mittelsparren_skyline.png'],
    ['Außensparren Designline', '/materials/aussensparren_designline.png'],
    ['Außensparren Skyline', '/materials/aussensparren_skyline__carport.png'],
    ['Sparren Ultraline', '/materials/sparren_ultraline.png'],
    ['S-Sparren', '/materials/s-sparren.png'],
    ['M-Sparren', '/materials/m-sparren.png'],
    ['L-Sparren', '/materials/l-sparren.png'],
    ['XL-Sparren', '/materials/xl-sparren.png'],

    // === ABDECKLEISTEN ===
    ['Abdeckleiste Wandprofil Designline', '/materials/abdeckleiste_wandprofil_designline.png'],
    ['Abdeckleiste Sparren Designline', '/materials/abdeckleiste_sparren_designline.png'],
    ['Abdeckleiste', '/materials/abdeckleiste.png'],
    ['Seitenklickleiste', '/materials/seitenklickleiste.png'],

    // === KLICKLEISTEN ===
    ['Klickleiste Ultraline Rinne oben', '/materials/klickleiste_ultraline_rinne_oben.png'],
    ['Klickleiste Ultraline', '/materials/klickleiste_ultraline_sparren_pfostenrinne_unten.png'],
    ['Klickleiste Pfosten Designline', '/materials/klickleiste_pfosten_designline__topline_xl.png'],
    ['Klickleiste Pfosten Skyline', '/materials/klickleiste_pfosten_skyline__carport.png'],
    ['Klickleiste LED Skyline', '/materials/klickleiste_led_skyline__carport.png'],

    // === WAND ===
    ['Wandanschlussprofil Designline', '/materials/wandanschlussprofil_designline.png'],
    ['Wandanschluss Ultraline', '/materials/wandanschluss_ultraline.png'],
    ['Wandanschluss Skyline', '/materials/wandanschluss_skyline__carport.png'],
    ['Wandanschluss XL', '/materials/wandanschluss_xl.png'],
    ['Wandanschluss', '/materials/wandanschluss.png'],
    ['Kippprofil Wandseite Designline', '/materials/kippprofil_wandseite_designline.png'],
    ['Kippprofil', '/materials/kippprofil.png'],

    // === DISTANZPROFIL ===
    ['Distanzprofil Ultraline Frontleiste', '/materials/distanzprofil_ultraline_frontleiste.png'],
    ['Distanzprofil Ultraline', '/materials/distanzprofil_ultraline.png'],
    ['Distanzprofil Wandanschluss oben Skyline', '/materials/distanzprofil_wandanschluss_oben_skyline__carport.png'],
    ['Distanzprofil Wandanschluss unten Skyline', '/materials/distanzprofil_wandanschluss_unten_skyline__carport.png'],
    ['Distanzprofil  Rinnenseite Skyline', '/materials/distanzprofil_rinnenseite_skyline__carport.png'],
    ['Distanzprofil hinten bei Freistand', '/materials/distanzprofil_hinten_bei_freistand_skyline.png'],
    ['Distanzprofil XL', '/materials/distanzprofil_xl.png'],
    ['Distanzprofil', '/materials/distanzprofil.png'],

    // === GLASLEISTEN ===
    ['Glasleiste Ultraline oben', '/materials/glasleiste_ultraline_oben.png'],
    ['Glasleiste Ultraline unten', '/materials/glasleiste_ultraline_unten.png'],
    ['Glashalteleiste Skyline', '/materials/glashalteleiste_skyline.png'],
    ['Glasleiste', '/materials/glasleiste.png'],
    ['Frontleiste Ultraline', '/materials/frontleiste_ultraline.png'],
    ['Abtropfleiste', '/materials/abtropfleiste_glas_8mm.png'],

    // === MONTAGE ===
    ['Montagewinkel Ultraline Sparren/Rinne mitte', '/materials/montagewinkel_ultraline_sparren_rinne_mitte_al10009.png'],
    ['Montagewinkel Ultraline Sparren/Rinne links', '/materials/montagewinkel_ultraline_sparren_rinne_links_al10009b.png'],
    ['Montagewinkel Ultraline Pfosten', '/materials/montagewinkel_ultraline_pfosten_rinne_links.png'],
    ['Montagewinkel Rinne/Pfosten', '/materials/montagewinkel_rinne_pfosten.png'],
    ['Montagewinkel Rinne/Ständer', '/materials/montagewinkel_rinne_staender_designline.png'],
    ['Montageplatte Außensparren links', '/materials/montageplatte_aussensparren_links.png'],
    ['Montageplatte Außensparren rechts', '/materials/montageplatte_aussensparren_rechts.png'],
    ['Montageplatte Mittelsparren', '/materials/montageplatte_mittelsparren_skyline.png'],
    ['Montageprofil Carport', '/materials/montageprofil_carport.png'],
    ['Befestigung Rinne/Sparren', '/materials/befestigung_rinne_sparren_designline.png'],
    ['Befestigungsplatte Sparren mittig', '/materials/befestigungsplatte_sparren_mittig_wand_ultraline.png'],
    ['Befestigungsplatte Seite Sparren', '/materials/befestigungsplatte_seite_sparren_wand_ultraline.png'],
    ['Niederhalter Carport', '/materials/niederhalter_carport.png'],

    // === ZIERLEISTEN ===
    ['Zierleiste Flach', '/materials/zierleiste_flach.png'],
    ['Zierleiste Rund', '/materials/zierleiste_rund.png'],
    ['Zierleiste Klassik', '/materials/zierleiste_klassik.png'],

    // === DICHTUNGEN ===
    ['Dichtung Glas Ultraline/Designline', '/materials/dichtung_glas_ultraline_designline.png'],
    ['Dichtung Glas unten', '/materials/dichtung_glas_unten.png'],
    ['Dichtung Glas', '/materials/dichtung_glas.png'],
    ['Dichtung Glasleiste Ultraline', '/materials/dichtung_glasleiste_ultraline_seitlich.png'],
    ['Dichtung Wandanschluss Designline', '/materials/dichtung_wandanschluss_designline.png'],
    ['Dichtung Wandanschluß', '/materials/dichtung_wandanschluss.png'],
    ['Dichtung Rinne', '/materials/dichtung_rinne_und_distanzprofil_ultraline.png'],
    ['Dichtung Polycarbonat', '/materials/dichtung_polycarbonat.png'],
    ['Dichtung XL', '/materials/dichtung_xl.png'],

    // === ABDECKKAPPEN ===
    ['Abdeckkappe Rinne Designline', '/materials/abdeckkappe_rinne_designline_d01.png'],
    ['Abdeckkappe Rinne Ultraline', '/materials/abdeckkappe_rinne_ultraline.png'],
    ['Abdeckkappe Rinne Set Orangeline+', '/materials/abdeckkappe_rinne_set_orangeline+.png'],
    ['Abdeckkappe Rinne Set Orangeline', '/materials/abdeckkappe_rinne_set_orangeline.png'],
    ['Abdeckkappe Wandanschluss Designline', '/materials/abdeckkappe_wandanschluss_designline_d02.png'],
    ['Abdeckkappe Wandanschluss Ultraline', '/materials/abdeckkappe_wandanschluss_ultraline.png'],
    ['Abdeckkappe Wandanschluss XL', '/materials/abdeckkappe_wandanschluss_xl_set.png'],
    ['Abdeckkappe Wandanschluss', '/materials/abdeckkappe_wandanschluss_set.png'],
    ['Abdeckkappe Frontleiste', '/materials/abdeckkappe_frontleiste_ultraline.png'],
    ['Abdeckkappe Sparren mittig Rinne', '/materials/abdeckkappe_sparren_mittig_rinne_designline_d04.png'],
    ['Abdeckkappe Sparren mittig Wand', '/materials/abdeckkappe_sparren_mittig_wand_designline_d03.png'],
    ['Abdeckkappe Seite Sparren Wand', '/materials/abdeckkappe_seite_sparren_wand_designline_d08.png'],
    ['Abdeckkappe seite Sparren Rinne', '/materials/abdeckkappe_seite_sparren_rinne_designline_d09.png'],
    ['Abdeckkappe Flach', '/materials/abdeckkappe_flach.png'],
    ['Abdeckkappe Rund', '/materials/abdeckkappe_rund.png'],
    ['Abdeckkappe Klassik', '/materials/abdeckkappe_klassik.png'],
    // === MISC PROFILES (from Loses Material allgemein) ===
    ['Rahmenprofil für Fenster', '/materials/rahmenprofil_fuer_fenster_al8002.png'],
    ['Rahmenabdeckprofil für Fenster', '/materials/rahmenabdeckprofil_fuer_fenster_al8003.png'],
    ['T-Rahmenprofil für Fenster', '/materials/t-rahmenprofil_fuer_fenster_al8001.png'],
    ['T-Abdeckprofil für Fenster', '/materials/t-abdeckprofil_fuer_fenster_al8000.png'],
    ['Winkelverbinder', '/materials/winkelverbinder.png'],
    ['Ausgleichspfosten', '/materials/ausgleichspfosten_110x60mm.png'],
    ['Koppelprofil', '/materials/koppelprofil_glas_8mm.png'],
    ['Anti-Kondensat', '/materials/anti-kondensat-profil_16mm.png'],
    ['Konstruktions Profil', '/materials/konstruktions_profil_190x117_mm.png'],
    ['Klickleiste f. Konstruktions', '/materials/klickleiste_f_konstruktions-_u_designlinepfosten.png'],
    ['Leiste Woodline', '/materials/leiste_woodline.png'],
    ['Rinne Woodline', '/materials/rinne_woodline.png'],
    ['Wandprofil Woodline', '/materials/wandprofil_woodline.png'],
    ['Abdichtprofil', '/materials/abdichtprofil.png'],
    ['Steel-Look-I-Profil', '/materials/steel-look-i-profil.png'],
    ['U-Profil Kopplung', '/materials/u-profil_kopplung.png'],

    // === VERSTÄRKUNGEN (Steel reinforcements) ===
    ['Sparrenverstärkung', '/materials/sparrenverstaerkung_xl_stahl.png'],
    ['Rinnenverstärkung', '/materials/rinnenverstaerkung_stahl.png'],

    // === HEIZSTRAHLER ===
    ['Heizstrahler', '/materials/heizstrahler_model_type_4_inkl_fernbedienung.png'],

    // === BELEUCHTUNG (LED lighting) ===
    ['LED Set IP65 6 Spots', '/materials/led_6er_set.png'],
    ['LED Set IP65', '/materials/led_6er_set.png'],
    ['LED 6er Set', '/materials/led_6er_set.png'],
    ['10er led set', '/materials/10er_led_set_ip65_erweiterbar_bis_max_13_spots.png'],
    ['LED 10er Set', '/materials/10er_led_set_ip65_erweiterbar_bis_max_13_spots.png'],
    ['LED Erweiterung 2er', '/materials/led_erweiterung_2er_set.png'],
    ['1er led erweiterung', '/materials/1er_led_erweiterung_ip65.png'],
    ['LED Erweiterung 1er', '/materials/1er_led_erweiterung_ip65.png'],
    ['LED Stripe', '/materials/led_stripe_5m.png'],
    ['LED Spot', '/materials/led_spot.png'],
    ['LED Silikon Diffusor', '/materials/silikon-diffusor.png'],
    ['Silikon-Diffusor', '/materials/silikon-diffusor.png'],
    ['Trafo 150W', '/materials/trafo_150w.png'],
    ['Trafo 60W', '/materials/trafo_60w.png'],
    ['Trafo', '/materials/trafo_150w.png'],
    ['Verbindungsmuffe Buchse', '/materials/verbindungsmuffe_buchse.png'],
    ['Anschlussbox Somfy', '/materials/anschlussbox_somfy.png'],
    ['Somfy Steuerung', '/materials/somfy_steuerung.png'],
    ['Somfy', '/materials/somfy_steuerung.png'],
    ['Dimm-Controller', '/materials/dimm-controller.png'],
    ['Fernbedienung', '/materials/fernbedienung.png'],
    ['Y-Kabel', '/materials/y-kabel_4er_set.png'],
    ['Verlängerungskabel', '/materials/verlaengerungskabel_1m_4er_set.png'],

    // === VERGLASUNG & POLYCARBONAT ===
    ['Glas klar 8 mm VSG', '/materials/glas_klar_8_mm_vsg.png'],
    ['Glas klar', '/materials/glas_klar_8_mm_vsg.png'],
    ['Iso Glas', '/materials/iso_glas_331-10-331.png'],
    ['Polycarbonat opal', '/materials/polycarbonat_opal_5x_16_mm.png'],
    ['Polycarbonat', '/materials/polycarbonat_opal_5x_16_mm.png'],
    ['Antistaubband', '/materials/antistaubband.png'],
    ['Dichtungsband', '/materials/dichtungsband.png'],

    // === FUNDAMENTE (Foundations) ===
    ['Betonfundament', '/materials/betonfundament_mit_auslauf.png'],
    ['Stahlfundament zum Einbetonieren', '/materials/stahlfundament_zum_einbetonieren.png'],
    ['Stahlfundament zum Aufdübeln asymetrisch', '/materials/stahlfundament_zum_aufduebeln_asymetrisch.png'],
    ['Stahlfundament zum Aufdübeln symetrisch', '/materials/stahlfundament_zum_aufduebeln_symetrisch.png'],
    ['Stahlfundament zum Aufdübeln', '/materials/stahlfundament_zum_aufduebeln_asymetrisch.png'],
    ['Stahlfundament mit Montageplatte', '/materials/stahlfundament_mit_montageplatte.png'],
    ['Stahlfundament', '/materials/stahlfundament.png'],
    ['Grundbügel', '/materials/grundbuegel.png'],
    ['Stahlmauerschuh', '/materials/stahlmauerschuh.png'],

    // === ENTWÄSSERUNG (Drainage PVC) ===
    ['PVC Rohr', '/materials/pvc_rohr.png'],
    ['Verbindungsmuffe', '/materials/verbindungsmuffe.png'],
    ['PVC Reduzierung', '/materials/pvc_reduzierung.png'],
    ['PVC 90°', '/materials/pvc_90°_bogen.png'],
    ['PVC 45°', '/materials/pvc_45°_bogen.png'],
    ['PVC T-Stück', '/materials/pvc_t-stueck.png'],
    ['Laubfänger', '/materials/laubfaenger.png'],
    ['Clean Box', '/materials/clean_box.png'],
    ['Deep Clean Box', '/materials/deep_clean_box.png'],

    // === WINKEL (Angle brackets with RAL) ===
    ['RAL 7016', '/materials/ral_7016_feinstruktur__matt.png'],
    ['RAL 9010', '/materials/ral_7016_feinstruktur__matt.png'],
    ['RAL 9007', '/materials/ral_7016_feinstruktur__matt.png'],

    // Generic fallbacks
    ['LED', '/materials/led_6er_set.png'],
    ['Niederhalter', '/materials/pfosten.png'],
];

// Helper: find best matching image for a material name (first match wins — order matters)
function getMaterialImage(materialName: string): string | null {
    for (const [keyword, imgPath] of MATERIAL_IMAGES) {
        if (materialName.includes(keyword)) return imgPath;
    }
    return null;
}

// ======= MATERIAL BOM COSTS (Aluxe Loses Material Preisliste 2025/2026) =======
// Prices verified 1:1 against "Loses Material allgemein" sheet in AluxePreisliste.xlsx
// Physical materials (glass panels, rafters, accessories) billed separately from system price
const COVER_RATES_PER_M2: Record<string, number> = {
    // VSG Glass — from Excel sheet "Loses Material allgemein" rows 250-255
    'Glass_8mm_klar':     33.12,   // Glas klar 8mm VSG (11128)
    'Glass_8mm_matt':     41.40,   // Glas matt 8mm VSG (11129)
    'Glass_8mm_planibel': 61.272,  // Glas planibel grey 8mm VSG (11905)
    'Glass_10mm_klar':    38.295,  // Glas klar 10mm VSG (11131)
    'Glass_10mm_matt':    46.575,  // Glas matt 10mm VSG (11132)
    'Glass_10mm_stopsol': 64.899,  // Glas Stopsol klar 10mm VSG (11391) = Sonnenschutzglas
    // Polycarbonate — from Excel rows 233-237
    'Poly_standard':      20.844,  // Polycarbonat klar/opal 16mm (11288/11290)
    'Poly_ir_gold':       28.035,  // Polycarbonat IR Gold 16mm (11284/11286)
    'Poly_smokey':        27.477,  // Polycarbonat smokey grey 16mm (11675)
};

// Per-piece Sparren rate, derived from Excel EXKL price progression per model.
// Methodology: EXKL progression per 500mm depth / rafter count × Sparren share ratio (94.14%)
// Calibrated against Aluxe calculator screenshot: Trendline L-Sparren = €13.50/piece (verified ✅)
const SPARREN_PRICES_PER_PIECE: Record<string, number> = {
    'Orangeline': 12.82, 'Orangeline+': 12.85,
    'Trendline': 13.50, 'Trendline+': 13.53,
    'Topline': 15.53, 'Topline XL': 15.83,
    'Designline': 22.15, 'Ultraline': 49.52,
};

const FIXED_ROOF_ACCESSORIES_BOM = [
    { name: 'Lochbohrer 83mm HWA', price: 7.37 },
    { name: 'Silikon transparent', price: 3.46 },
    { name: 'Bogen 90 Grad', price: 4.22 },
];

const PFAND_RATES = {
    roof_palette: 26.00,
    roof_glass_crate: 110.00,
    panorama_crate: 90.00, // Excel Vorwort: Panoramakiste = €90 p/st
    keilfenster_crate: 110.00,
    markise_palette: 26.00,
    schiebetuer_crate: 110.00,
};

const TRANSPORT_COST = 375.00; // Aluxe standard transport cost

// Panorama per-system mandatory accessories (from Aluxe BOM)
const PANORAMA_BOM_ACCESSORIES = [
    { name: 'Koppelprofil Keil/Panorama', price: 26.17 },
    { name: 'Silikon transparent', price: 3.46 },
];

const MARKISE_BOM_ACCESSORIES = [
    { name: 'Befestigungs Winkel (1 set)', price: 45.00 },
];

// Calculate physical material costs for a roof structure
// Logic verified against Aluxe calculator output (Apr 2026)
// Area calculation uses Excel's "Oberfläche in m²" column which = width × projection / 1,000,000
function calculateRoofMaterialCost(
    model: string, cover: 'Poly' | 'Glass', width: number, projection: number,
    fieldsCount: number, postsCount: number, polyVar: string, glassVar: string
): { coverCost: number; sparrenCost: number; accessoriesCost: number; total: number; details: string } {
    // 1. Cover material — Excel uses simple width×projection for area (Oberfläche column)
    const areaM2 = (width * projection) / 1_000_000;
    const is10mm = ['Topline', 'Topline XL', 'Designline', 'Ultraline'].includes(model);
    let rate: number;
    let rateLabel: string;
    if (cover === 'Glass') {
        if (glassVar === 'stopsol') {
            rate = is10mm ? COVER_RATES_PER_M2['Glass_10mm_stopsol'] : COVER_RATES_PER_M2['Glass_8mm_planibel'];
            rateLabel = is10mm ? 'Stopsol 10mm' : 'Planibel 8mm';
        } else if (glassVar === 'matt') {
            rate = is10mm ? COVER_RATES_PER_M2['Glass_10mm_matt'] : COVER_RATES_PER_M2['Glass_8mm_matt'];
            rateLabel = `Matt ${is10mm ? '10' : '8'}mm`;
        } else {
            rate = is10mm ? COVER_RATES_PER_M2['Glass_10mm_klar'] : COVER_RATES_PER_M2['Glass_8mm_klar'];
            rateLabel = `Klar ${is10mm ? '10' : '8'}mm`;
        }
    } else {
        if (polyVar === 'ir-gold') {
            rate = COVER_RATES_PER_M2['Poly_ir_gold'];
            rateLabel = 'IR Gold';
        } else if (polyVar === 'smokey') {
            rate = COVER_RATES_PER_M2['Poly_smokey'];
            rateLabel = 'Smokey Grey';
        } else {
            rate = COVER_RATES_PER_M2['Poly_standard'];
            rateLabel = 'Standard';
        }
    }
    const coverCost = Math.round(areaM2 * rate * 100) / 100;

    // 2. L-Sparren (rafters) = fields + 1 (verified: Aluxe 6000×3000 = 8 fields + 1 = 9 Sparren)
    const sparrenCount = fieldsCount + 1;
    const sparrenUnit = SPARREN_PRICES_PER_PIECE[model] || 13.50;
    const sparrenCost = Math.round(sparrenUnit * sparrenCount * 100) / 100;

    // 3. Fixed accessories (from Aluxe calculator output)
    const accessoriesCost = Math.round(FIXED_ROOF_ACCESSORIES_BOM.reduce((s, a) => s + a.price, 0) * 100) / 100;

    const total = Math.round((coverCost + sparrenCost + accessoriesCost) * 100) / 100;
    const label = cover === 'Glass' ? `VSG ${rateLabel}` : `Poly ${rateLabel}`;
    const details = `${label}: ${areaM2.toFixed(1)}m² × €${rate.toFixed(3)} = €${coverCost.toFixed(2)} | Sparren: ${sparrenCount}× €${sparrenUnit} = €${sparrenCost.toFixed(2)}`;
    return { coverCost, sparrenCost, accessoriesCost, total, details };
}

// Glass type options for Side/Front walls
const WALL_GLASS_TYPES = [
    { id: 'klar', name: 'Klar (VSG 44.2)', color: '#22c55e', price: 'Standard' },
    { id: 'matt', name: 'Matt (VSG 44.2)', color: '#e5e7eb', price: '+ Aufpreis' },
    { id: 'iso', name: 'Isolierglas', color: '#ef4444', price: '+ Aufpreis' },
];


// Schiebetür - framed sliding doors
const SCHIEBETUR_PRODUCTS = [
    { id: 'Schiebetür (VSG klar)', name: 'VSG klar', icon: 'square', description: 'Alu-Schiebetür mit klarem Sicherheitsglas' },
    { id: 'Schiebetür (VSG matt)', name: 'VSG matt', icon: 'square', description: 'Alu-Schiebetür mit mattem Sicherheitsglas' },
    { id: 'Schiebetür (Isolierglas)', name: 'Isolierglas', icon: 'square', description: 'Alu-Schiebetür mit Wärmedämmglas' },
];

// Schiebetür handle types (from Aluxe ACSL catalog)
const SCHIEBETUR_HANDLES = [
    { id: 'ACSL2042', name: 'Handgriff flach (innen)', description: 'Flacher Griff, Innenseite', icon: 'square' },
    { id: 'ACSL2046', name: 'Handgriff fest (außen)', description: 'Fester Griff, Außenseite', icon: 'square' },
    { id: 'ACSL2044', name: 'Handgriff fest (innen)', description: 'Fester Griff, Innenseite', icon: 'square' },
    { id: 'ACSL2047', name: 'Handgriff mit Zylinder (außen)', description: 'Abschließbarer Griff, Außenseite', icon: 'wrench' },
];

// Schiebetür opening directions
const SCHIEBETUR_OPENING = [
    { id: 'left', name: 'Links öffnend', description: 'Öffnung nach links', icon: '◀️' },
    { id: 'right', name: 'Rechts öffnend', description: 'Öffnung nach rechts', icon: '▶️' },
    { id: 'center', name: 'Mittig öffnend', description: 'Mittig öffnend/schließend', icon: '↔️' },
];

// Auto-calculate panel count from width (from Aluxe pricelist, Feldbreite max 1500mm)
function getSchiebetuerPanelCount(widthMm: number): { count: string; maxWidth: number } {
    if (widthMm <= 2500) return { count: '2-Flügel', maxWidth: 2620 };
    if (widthMm <= 3000) return { count: '2-3 Flügel', maxWidth: 2620 };
    if (widthMm <= 3500) return { count: '3-Flügel', maxWidth: 2620 };
    if (widthMm <= 4500) return { count: '3-4 Flügel', maxWidth: 2620 };
    if (widthMm <= 5000) return { count: '4-Flügel', maxWidth: 2620 };
    if (widthMm <= 6000) return { count: '4-6 Flügel', maxWidth: 2620 };
    return { count: '6+ Flügel', maxWidth: 2620 };
}

// Panorama - frameless sliding glass systems
const PANORAMA_PRODUCTS = [
    // AL22 - flat track
    { id: 'Panorama AL22 (3-Tor)', name: 'AL22 3-Tor', description: 'Flachschiene, 3 Spuren', icon: '⊞', tracks: 3 },
    { id: 'Panorama AL22 (5-Tor)', name: 'AL22 5-Tor', description: 'Flachschiene, 5 Spuren', icon: '⊟', tracks: 5 },
    // AL23 - high track
    { id: 'Panorama AL23 (3-Tor)', name: 'AL23 3-Tor', description: 'Hochschiene, 3 Spuren', icon: '⊞', tracks: 3 },
    { id: 'Panorama AL23 (4-Tor)', name: 'AL23 4-Tor', description: 'Hochschiene, 4 Spuren', icon: '⊞', tracks: 4 },
    { id: 'Panorama AL23 (5-Tor)', name: 'AL23 5-Tor', description: 'Hochschiene, 5 Spuren', icon: '⊟', tracks: 5 },
    { id: 'Panorama AL23 (6-Tor)', name: 'AL23 6-Tor', description: 'Hochschiene, 6 Spuren', icon: '⊟', tracks: 6 },
    { id: 'Panorama AL23 (7-Tor)', name: 'AL23 7-Tor', description: 'Hochschiene, 7 Spuren', icon: '⊞', tracks: 7 },
    // AL24
    { id: 'Panorama AL24 (3-Tor)', name: 'AL24 3-Tor', description: '3 Spuren', icon: '⊞', tracks: 3 },
    { id: 'Panorama AL24 (4-Tor)', name: 'AL24 4-Tor', description: '4 Spuren', icon: '⊞', tracks: 4 },
    { id: 'Panorama AL24 (5-Tor)', name: 'AL24 5-Tor', description: '5 Spuren', icon: '⊟', tracks: 5 },
    { id: 'Panorama AL24 (6-Tor)', name: 'AL24 6-Tor', description: '6 Spuren', icon: '⊟', tracks: 6 },
    { id: 'Panorama AL24 (7-Tor)', name: 'AL24 7-Tor', description: '7 Spuren', icon: '⊞', tracks: 7 },
    // AL25
    { id: 'Panorama AL25 (3-Tor)', name: 'AL25 3-Tor', description: '3 Spuren', icon: '⊞', tracks: 3 },
    { id: 'Panorama AL25 (4-Tor)', name: 'AL25 4-Tor', description: '4 Spuren', icon: '⊞', tracks: 4 },
    { id: 'Panorama AL25 (5-Tor)', name: 'AL25 5-Tor', description: '5 Spuren', icon: '⊟', tracks: 5 },
    { id: 'Panorama AL25 (6-Tor)', name: 'AL25 6-Tor', description: '6 Spuren', icon: '⊟', tracks: 6 },
    { id: 'Panorama AL25 (7-Tor)', name: 'AL25 7-Tor', description: '7 Spuren', icon: '⊞', tracks: 7 },
    // AL26
    { id: 'Panorama AL26 (3-Tor)', name: 'AL26 3-Tor', description: '3 Spuren', icon: '⊞', tracks: 3 },
    { id: 'Panorama AL26 (4-Tor)', name: 'AL26 4-Tor', description: '4 Spuren', icon: '⊞', tracks: 4 },
    { id: 'Panorama AL26 (5-Tor)', name: 'AL26 5-Tor', description: '5 Spuren', icon: '⊟', tracks: 5 },
    { id: 'Panorama AL26 (6-Tor)', name: 'AL26 6-Tor', description: '6 Spuren', icon: '⊟', tracks: 6 },
    { id: 'Panorama AL26 (7-Tor)', name: 'AL26 7-Tor', description: '7 Spuren', icon: '⊞', tracks: 7 },
];

const PANORAMA_MODELS = [
    { id: 'AL22', name: 'AL22', description: 'Flachschiene (Flat Track)', icon: '⊞', validTracks: [3, 5] },
    { id: 'AL23', name: 'AL23', description: 'Hochschiene (High Track)', icon: '⊞', validTracks: [3, 4, 5, 6, 7] },
    { id: 'AL24', name: 'AL24', description: 'Standard', icon: '⊞', validTracks: [3, 4, 5, 6, 7] },
    { id: 'AL25', name: 'AL25', description: 'Premium', icon: '⊞', validTracks: [3, 4, 5, 6, 7] },
    { id: 'AL26', name: 'AL26', description: 'Exclusive', icon: '⊞', validTracks: [3, 4, 5, 6, 7] },
];

function getBestPanoramaVariant(modelId: string, width: number): string {
    const model = PANORAMA_MODELS.find(m => m.id === modelId);
    if (!model) return PANORAMA_PRODUCTS[0].id;

    // Logic: Panel width max ~1100mm
    // minTracks = width / 1100
    const minTracks = Math.ceil(width / 1100);

    // Find smallest available track count >= minTracks
    let bestTracks = model.validTracks.find(t => t >= minTracks);

    // If width is too large (requires more tracks than available), pick max
    if (!bestTracks) {
        bestTracks = model.validTracks[model.validTracks.length - 1];
    }

    return `Panorama ${model.id} (${bestTracks}-Tor)`;
}

// ======= MODEL NAME MAPPING =======
// Calculator uses 'Trendline' but DB uses 'Trendstyle' etc.
function modelToDbName(model: string): string {
    const mapping: Record<string, string> = {
        'Orangeline': 'Orangestyle',
        'Orangeline+': 'Orangestyle+',
        'Trendline': 'Trendstyle',
        'Trendline+': 'Trendstyle+',
        'Topline': 'Topstyle',
        'Topline XL': 'Topstyle XL',
        'Designline': 'Designline',
        'Ultraline': 'Ultrastyle',
        'Skyline': 'Skystyle',
        'Carport': 'Carport',
        'TR10': 'TR10',
        'TR15': 'TR15',
        'TR20': 'TR20',
        'Pergola Luxe': 'Pergola Luxe',
        'Pergola Luxe Electric': 'Pergola Luxe Electric',
    };
    return mapping[model] || model;
}

// ======= HELPER: Brand detection =======
const TERANDA_MODELS = ['TR10', 'TR15', 'TR20'];
function isTerandaModel(model: string): boolean {
    return TERANDA_MODELS.includes(model);
}

// ======= HELPER: Pergola Luxe detection =======
const PERGOLA_LUXE_MODELS = ['Pergola Luxe', 'Pergola Luxe Electric'];
function isPergolaLuxeModel(model: string): boolean {
    return PERGOLA_LUXE_MODELS.includes(model);
}

// Pergola Luxe color options (per Mirpol catalog)
const PERGOLA_LUXE_COLORS = [
    { id: 'anthracite', name: 'Anthrazit', color: '#3a3a3a', image: '/images/models/pergola-luxe/pergola-luxe-anthracite.jpg' },
    { id: 'white', name: 'Weiß', color: '#f5f5f5', image: '/images/models/pergola-luxe/pergola-luxe-white.jpg' },
    { id: 'wood', name: 'Holzoptik', color: '#8B6914', image: '/images/models/pergola-luxe/pergola-luxe-wood.jpg' },
];

// Pergola Luxe available sizes — fixed-size products matching Mirpol catalog exactly
const PERGOLA_LUXE_SIZES: Record<string, { width: number; depth: number; label: string }[]> = {
    'Pergola Luxe': [
        { width: 3000, depth: 3000, label: '3,0 x 3,0 m' },
        { width: 3000, depth: 4000, label: '3,0 x 4,0 m' },
        { width: 4000, depth: 4000, label: '4,0 x 4,0 m' },
        { width: 5800, depth: 3000, label: '5,8 x 3,0 m' },
        { width: 5800, depth: 4000, label: '5,8 x 4,0 m' },
        { width: 7800, depth: 3000, label: '7,8 x 3,0 m' },
        { width: 7800, depth: 4000, label: '7,8 x 4,0 m' },
    ],
    'Pergola Luxe Electric': [
        { width: 3000, depth: 3000, label: '3,0 x 3,0 m' },
        { width: 3500, depth: 3500, label: '3,5 x 3,5 m' },
        { width: 3000, depth: 4000, label: '3,0 x 4,0 m' },
        { width: 4000, depth: 4000, label: '4,0 x 4,0 m' },
    ],
};

// ======= PERGOLA LUXE ACCESSORIES =======
// All prices are Mirpol B2B netto PLN + 10% markup, converted to EUR at /4.1
type PergolaLuxeAccessoryType = 'markiza_elektryczna' | 'markiza_manualna' | 'panel_nieruchomy' | 'panel_ruchomy' | 'drzwi_szklane' | 'drzwi_zaluzjowe';

interface PergolaLuxeAccessory {
    id: string;
    type: PergolaLuxeAccessoryType;
    namePL: string;
    nameDE: string;
    size: '3M' | '4M' | 'other';
    colors: string[];   // available colors
    pricePLN: number;   // Mirpol netto + 10%
    priceEUR: number;   // pricePLN / 4.1 rounded
    image: string;
    description: string;
}

const PERGOLA_LUXE_ACCESSORIES: PergolaLuxeAccessory[] = [
    // === MARKIZY ELEKTRYCZNE (Vertikalmarkise elektrisch) ===
    // 2189.47 PLN * 1.1 = 2408 PLN / 4.1 = 587 EUR
    { id: 'markiza-el-3m', type: 'markiza_elektryczna', namePL: 'Markiza elektryczna 3M', nameDE: 'Vertikalmarkise elektrisch 3M', size: '3M', colors: ['anthracite', 'white'], pricePLN: 2408, priceEUR: 587, image: '/images/models/pergola-luxe/markiza-manual.jpg', description: 'Elektrische Seitenmarkise mit Motor' },
    // 2684.21 PLN * 1.1 = 2953 PLN / 4.1 = 720 EUR
    { id: 'markiza-el-4m', type: 'markiza_elektryczna', namePL: 'Markiza elektryczna 4M', nameDE: 'Vertikalmarkise elektrisch 4M', size: '4M', colors: ['anthracite', 'white'], pricePLN: 2953, priceEUR: 720, image: '/images/models/pergola-luxe/markiza-manual.jpg', description: 'Elektrische Seitenmarkise mit Motor' },

    // === MARKIZY MANUALNE (Vertikalmarkise manuell) ===
    // 1800 PLN * 1.1 = 1980 PLN / 4.1 = 483 EUR
    { id: 'markiza-man-3m', type: 'markiza_manualna', namePL: 'Markiza manualna 3M', nameDE: 'Vertikalmarkise manuell 3M', size: '3M', colors: ['anthracite', 'white'], pricePLN: 1980, priceEUR: 483, image: '/images/models/pergola-luxe/markiza-manual.jpg', description: 'Manuelle Seitenmarkise mit Handkurbel' },
    // 2100 PLN * 1.1 = 2310 PLN / 4.1 = 563 EUR
    { id: 'markiza-man-4m', type: 'markiza_manualna', namePL: 'Markiza manualna 4M', nameDE: 'Vertikalmarkise manuell 4M', size: '4M', colors: ['anthracite', 'white'], pricePLN: 2310, priceEUR: 563, image: '/images/models/pergola-luxe/markiza-manual.jpg', description: 'Manuelle Seitenmarkise mit Handkurbel' },

    // === PANELE ZALUZJOWE NIERUCHOME (Feste Lamellenwand) ===
    // 862.80 PLN * 1.1 = 949 PLN / 4.1 = 231 EUR
    { id: 'panel-fix-3m', type: 'panel_nieruchomy', namePL: 'Panel zaluzjowy nieruchomy 3M', nameDE: 'Feste Lamellenwand 3M', size: '3M', colors: ['anthracite', 'white', 'wood'], pricePLN: 949, priceEUR: 231, image: '/images/models/pergola-luxe/panel-louver.jpg', description: 'Feststehende Aluminium-Lamellenwand' },
    // 1236.48 PLN * 1.1 = 1360 PLN / 4.1 = 332 EUR
    { id: 'panel-fix-4m', type: 'panel_nieruchomy', namePL: 'Panel zaluzjowy nieruchomy 4M', nameDE: 'Feste Lamellenwand 4M', size: '4M', colors: ['anthracite', 'white', 'wood'], pricePLN: 1360, priceEUR: 332, image: '/images/models/pergola-luxe/panel-louver.jpg', description: 'Feststehende Aluminium-Lamellenwand' },

    // === PANELE ZALUZJOWE RUCHOME (Bewegliche Lamellenwand) ===
    // 1126.32 PLN * 1.1 = 1239 PLN / 4.1 = 302 EUR
    { id: 'panel-mov-3m', type: 'panel_ruchomy', namePL: 'Panel zaluzjowy ruchomy 3M', nameDE: 'Bewegliche Lamellenwand 3M', size: '3M', colors: ['anthracite', 'white', 'wood'], pricePLN: 1239, priceEUR: 302, image: '/images/models/pergola-luxe/panel-louver.jpg', description: 'Verschiebbare Lamellenwand mit Laufschiene' },
    // 1421.05 PLN * 1.1 = 1563 PLN / 4.1 = 381 EUR
    { id: 'panel-mov-4m', type: 'panel_ruchomy', namePL: 'Panel zaluzjowy ruchomy 4M', nameDE: 'Bewegliche Lamellenwand 4M', size: '4M', colors: ['anthracite', 'white', 'wood'], pricePLN: 1563, priceEUR: 381, image: '/images/models/pergola-luxe/panel-louver.jpg', description: 'Verschiebbare Lamellenwand mit Laufschiene' },

    // === DRZWI PRZESUWNE SZKLANE (Glas-Schiebetueren) ===
    // 3842.11 PLN * 1.1 = 4226 PLN / 4.1 = 1031 EUR
    { id: 'glass-door-3m', type: 'drzwi_szklane', namePL: 'Drzwi szklane przesuwne 3M', nameDE: 'Glas-Schiebewand 3M', size: '3M', colors: ['anthracite', 'white', 'wood'], pricePLN: 4226, priceEUR: 1031, image: '/images/models/pergola-luxe/glass-doors.jpg', description: 'Schiebbare Glaswand, gehaertetes Sicherheitsglas' },
    // 4736.84 PLN * 1.1 = 5211 PLN / 4.1 = 1271 EUR
    { id: 'glass-door-4m', type: 'drzwi_szklane', namePL: 'Drzwi szklane przesuwne 4M', nameDE: 'Glas-Schiebewand 4M', size: '4M', colors: ['anthracite', 'white', 'wood'], pricePLN: 5211, priceEUR: 1271, image: '/images/models/pergola-luxe/glass-doors.jpg', description: 'Schiebbare Glaswand, gehaertetes Sicherheitsglas' },

    // === DRZWI PRZESUWNE ZALUZJOWE (Lamellen-Schiebetueren) ===
    // 4421.05 PLN * 1.1 = 4863 PLN / 4.1 = 1186 EUR
    { id: 'louver-door-3m', type: 'drzwi_zaluzjowe', namePL: 'Drzwi przesuwne zaluzjowe 270x238', nameDE: 'Lamellen-Schiebetuer 270x238', size: '3M', colors: ['anthracite'], pricePLN: 4863, priceEUR: 1186, image: '/images/models/pergola-luxe/panel-louver.jpg', description: 'Verschiebbare Lamellentuer aus Aluminium' },
];

// ======= HELPER: Build table name =======
// LEGACY format: Aluxe V2 - {Model} {Cover} (Zone {X})
// NEW format (from migration): {DbModel} - Zone {X} - {subtype}
// TERANDA format: Teranda - {Model} {Cover} (Zone 1)
function buildTableName(model: string, cover: CoverType, zone: number, construction: ConstructionType, pergolaLuxeVariant?: string): string {
    if (isPergolaLuxeModel(model)) {
        // Pergola Luxe uses dedicated table names per variant
        if (model === 'Pergola Luxe Electric') {
            return pergolaLuxeVariant === 'wood' ? 'Pergola Luxe - Electric Wood' : 'Pergola Luxe - Electric';
        }
        // Manual variants
        if (pergolaLuxeVariant === 'wood') return 'Pergola Luxe - Manual Wood LED';
        if (pergolaLuxeVariant === 'led') return 'Pergola Luxe - Manual LED';
        return 'Pergola Luxe - Manual Standard';
    }
    if (isTerandaModel(model)) {
        const coverName = cover === 'Poly' ? 'Poly' : 'Glass';
        return `Teranda - ${model} ${coverName} (Zone 2)`;
    }
    const prefix = 'Aluxe V2 - ';
    if (model === 'Skyline' || model === 'Carport') {
        if (construction === 'freestanding') return `${prefix}${model} Freestanding (Zone ${zone})`;
        return `${prefix}${model} (Zone ${zone})`;
    }
    const coverName = cover === 'Poly' ? 'Poly' : 'Glass';
    if (construction === 'freestanding') return `${prefix}${model} Freestanding ${coverName} (Zone ${zone})`;
    return `${prefix}${model} ${coverName} (Zone ${zone})`;
}

// ======= HELPER: Build DB-compatible table name (from migration format) =======
function buildDbTableName(model: string, cover: CoverType, zone: number): string {
    const dbModel = modelToDbName(model);
    const subtype = cover === 'Poly' ? 'polycarbonate' : 'glass';
    return `${dbModel} - Zone ${zone} - ${subtype}`;
}

// ======= HELPER: Build surcharge table name =======
function buildSurchargeTableName(model: string, cover: CoverType, zone: number, variant: string): string {
    if (isTerandaModel(model)) {
        // Teranda: each variant is stored as a full-price table (not surcharge delta)
        const coverName = cover === 'Poly' ? 'Poly' : 'Glass';
        const vMap: Record<string, string> = { matt: 'Matt', 'reflex-pearl': 'Reflex Pearl', stopsol: 'Reflex Pearl' };
        return `Teranda - ${model} ${coverName} ${vMap[variant] || variant} (Zone 2)`;
    }
    const dbModel = modelToDbName(model);
    const subtype = cover === 'Poly' ? 'polycarbonate' : 'glass';
    return `${dbModel} - Zone ${zone} - ${subtype} - surcharge_${variant}`;
}

// ======= HELPER: Try multiple table name formats =======
async function findPriceTable(supabase: any, model: string, cover: CoverType, zone: number, construction: ConstructionType, pergolaLuxeVariant?: string): Promise<{ id: string; name: string } | null> {
    const isNoCoverModel = model === 'Skyline' || model === 'Carport';
    const formats: string[] = [];

    if (isPergolaLuxeModel(model)) {
        formats.push(buildTableName(model, cover, zone, construction, pergolaLuxeVariant));
    } else if (isTerandaModel(model)) {
        formats.push(buildTableName(model, cover, zone, construction));
    } else if (isNoCoverModel) {
        formats.push(buildTableName(model, cover, zone, construction));
    } else {
        formats.push(buildDbTableName(model, cover, zone));
        formats.push(buildTableName(model, cover, zone, construction));
    }

    for (const name of formats) {
        const { data } = await supabase
            .from('price_tables')
            .select('id, name')
            .eq('name', name)
            .eq('is_active', true)
            .limit(1);
        if (data && data.length > 0) return data[0];
    }

    // Fallback: fuzzy match
    if (isPergolaLuxeModel(model)) {
        const { data: fuzzy } = await supabase.from('price_tables').select('id, name')
            .ilike('name', `%Pergola Luxe%`).eq('is_active', true).limit(1);
        if (fuzzy && fuzzy.length > 0) return fuzzy[0];
    } else if (isTerandaModel(model)) {
        const coverName = cover === 'Poly' ? 'Poly' : 'Glass';
        const { data: fuzzy } = await supabase.from('price_tables').select('id, name')
            .ilike('name', `%Teranda%${model}%${coverName}%`).eq('is_active', true).limit(1);
        if (fuzzy && fuzzy.length > 0) return fuzzy[0];
    } else if (isNoCoverModel) {
        const { data: fuzzy } = await supabase.from('price_tables').select('id, name')
            .ilike('name', `%${model}%Zone ${zone}%`).eq('is_active', true).limit(1);
        if (fuzzy && fuzzy.length > 0) return fuzzy[0];
    } else {
        const dbModel = modelToDbName(model);
        const subtype = cover === 'Poly' ? 'polycarbonate' : 'glass';
        const { data: fuzzy } = await supabase.from('price_tables').select('id, name')
            .ilike('name', `%${dbModel}%Zone ${zone}%${subtype}%`).eq('is_active', true).limit(1);
        if (fuzzy && fuzzy.length > 0) return fuzzy[0];
    }

    return null;
}

// ======= COMPONENT =======
export const ProductConfiguratorV2: React.FC = () => {
    // === HOOKS (must be first) ===
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    // === STEPS ===
    const [activeStep, setActiveStep] = useState(0);
    const steps: { id: number; label: string; icon: React.ReactNode }[] = [
        { id: 0, label: 'Model', icon: IC.roof() },
        { id: 1, label: 'Wymiary', icon: IC.ruler() },
        { id: 2, label: 'Specyfikacja', icon: IC.palette() },
        { id: 3, label: 'Dodatki', icon: IC.puzzle() },
    ];

    // === VIEW STATE ===
    const [view, setView] = useState<ViewState>('customer');
    const [customerState, setCustomerState] = useState<Customer | null>(null);
    const linkedLeadIdRef = useRef<string | null>(null);
    const location = useLocation();
    const [leadNotes, setLeadNotes] = useState<string>('');
    const [leadCustomerData, setLeadCustomerData] = useState<any>(null);
    const [leadConfig, setLeadConfig] = useState<LeadConfiguration | null>(null);
    const [contextOpen, setContextOpen] = useState(true);

    // === ROOF CONFIG ===
    const [model, setModel] = useState<string>('Trendline');
    const [cover, setCover] = useState<CoverType>('Poly');
    const [zone, setZone] = useState<number>(1);
    const [plzInput, setPlzInput] = useState<string>('');
    const [plzLoading, setPlzLoading] = useState(false);
    const [plzZoneResult, setPlzZoneResult] = useState<string | null>(null);
    const [construction, setConstruction] = useState<ConstructionType>('wall');
    const [width, setWidth] = useState<number>(3000);
    const [projection, setProjection] = useState<number>(3000);
    const [color, setColor] = useState('RAL 7016');
    const [glassVariant, setGlassVariant] = useState<string>('klar');
    const [polyVariant, setPolyVariant] = useState<string>('opal');
    const [sonderfarben, setSonderfarben] = useState<boolean>(false); // Special color +20% surcharge

    // === PERGOLA LUXE SPECIFIC ===
    const [pergolaLuxeColor, setPergolaLuxeColor] = useState<string>('anthracite');
    const [pergolaLuxeLed, setPergolaLuxeLed] = useState<boolean>(false);
    // Pergola Luxe accessory quantities { [accessoryId]: qty }
    const [pergolaLuxeAccQty, setPergolaLuxeAccQty] = useState<Record<string, number>>({});
    // Pergola Luxe variant for price table lookup
    const pergolaLuxeVariant = useMemo(() => {
        if (!isPergolaLuxeModel(model)) return undefined;
        if (pergolaLuxeColor === 'wood') return 'wood';
        if (model === 'Pergola Luxe' && pergolaLuxeLed) return 'led';
        return undefined; // standard
    }, [model, pergolaLuxeColor, pergolaLuxeLed]);

    // Reset variant to valid options when switching between Aluxe ↔ Teranda
    useEffect(() => {
        if (isTerandaModel(model)) {
            // Teranda only has klar/matt (glass) and klar/reflex-pearl (poly)
            if (!TERANDA_GLASS_VARIANTS.find(v => v.id === glassVariant)) setGlassVariant('klar');
            if (!TERANDA_POLY_VARIANTS.find(v => v.id === polyVariant)) setPolyVariant('klar');
        } else {
            // Aluxe: if coming from Teranda reflex-pearl, reset to opal
            if (polyVariant === 'reflex-pearl') setPolyVariant('opal');
        }
    }, [model]); // eslint-disable-line react-hooks/exhaustive-deps

    // === DESIGNLINE SCHIEBEEINHEIT (Sliding Roof Glass) ===
    const [schiebeeinheitCount, setSchiebeeinheitCount] = useState<number>(0); // Number of sliding roof fields
    const [schiebeeinheitUnitPrice, setSchiebeeinheitUnitPrice] = useState<number>(0); // Price per field
    const [schiebeeinheitTotalPrice, setSchiebeeinheitTotalPrice] = useState<number>(0); // Total surcharge

    // === DACHRECHNER / STRUCTURAL HEIGHTS ===
    // Per-model Dachrechner configuration
    const MODEL_DACHRECHNER_CONFIG: Record<string, {
        defaultH3: number; defaultH1: number; defaultOverhang?: number;
        needsH1: boolean; needsH3: boolean; needsOverhang: boolean;
        fixedAngle?: number; postWidth: number;
        label: string; hint: string;
    }> = {
        'Orangeline': { defaultH3: 2200, defaultH1: 2796, needsH1: false, needsH3: true, needsOverhang: false, fixedAngle: 8, postWidth: 110, label: 'Orangestyle', hint: '8% Gefälle (fest), nur H3 + Tiefe' },
        'Orangeline+': { defaultH3: 2200, defaultH1: 2796, needsH1: false, needsH3: true, needsOverhang: false, fixedAngle: 8, postWidth: 110, label: 'Orangestyle+', hint: '8% Gefälle (fest), nur H3 + Tiefe' },
        'Trendline': { defaultH3: 2200, defaultH1: 2650, needsH1: true, needsH3: true, needsOverhang: false, postWidth: 110, label: 'Trendstyle', hint: 'Profilhöhe 47.5mm, Neigung berechnet aus H3/H1/Tiefe' },
        'Trendline+': { defaultH3: 2200, defaultH1: 2700, needsH1: true, needsH3: true, needsOverhang: false, postWidth: 110, label: 'Trendstyle+', hint: 'Profilhöhe 57.5mm, verstärkt, Neigung berechnet' },
        'Topline': { defaultH3: 2200, defaultH1: 2796, needsH1: true, needsH3: true, needsOverhang: false, postWidth: 149, label: 'Topstyle', hint: 'Profilhöhe 93.2mm, massive Konstruktion' },
        'Topline XL': { defaultH3: 2200, defaultH1: 2900, needsH1: true, needsH3: true, needsOverhang: false, postWidth: 196, label: 'Topstyle XL', hint: 'Profilhöhe 117mm, Pfosten 196mm' },
        'Designline': { defaultH3: 2200, defaultH1: 2796, needsH1: true, needsH3: true, needsOverhang: false, postWidth: 196, label: 'Designstyle', hint: 'Pfosten 196mm, eleganter Anschluss' },
        'Ultraline': { defaultH3: 2200, defaultH1: 2796, defaultOverhang: 300, needsH1: true, needsH3: false, needsOverhang: true, postWidth: 196, label: 'Ultrastyle', hint: 'Kein H3 erforderlich — Überstand + H1 + Tiefe' },
        'Skyline': { defaultH3: 2400, defaultH1: 2796, needsH1: false, needsH3: true, needsOverhang: false, postWidth: 160, label: 'Skystyle', hint: 'Flachdach, Glashöhe 95mm, nur H3 + Tiefe' },
        'Carport': { defaultH3: 2400, defaultH1: 2796, needsH1: false, needsH3: true, needsOverhang: false, postWidth: 160, label: 'Carport', hint: 'Flachdach, Glashöhe 28mm, nur H3 + Tiefe' },
        // Teranda models — use simplified calculation (H3 + Tiefe only)
        'TR10': { defaultH3: 2200, defaultH1: 2650, needsH1: true, needsH3: true, needsOverhang: false, postWidth: 100, label: 'Orangestyle 10', hint: 'Einstiegsprofil, VSG 44.2' },
        'TR15': { defaultH3: 2200, defaultH1: 2650, needsH1: true, needsH3: true, needsOverhang: false, postWidth: 120, label: 'Trendstyle 15', hint: 'Standard Profil, VSG 44.2' },
        'TR20': { defaultH3: 2200, defaultH1: 2650, needsH1: true, needsH3: true, needsOverhang: false, postWidth: 140, label: 'Topstyle 20', hint: 'Premium Profil, VSG 55.2' },
        // Pergola Luxe — simplified (no slope, fixed height 230cm)
        'Pergola Luxe': { defaultH3: 2300, defaultH1: 2300, needsH1: false, needsH3: false, needsOverhang: false, postWidth: 100, label: 'Pergola Luxe', hint: 'Bioklimatische Pergola, Lamellen drehbar' },
        'Pergola Luxe Electric': { defaultH3: 2300, defaultH1: 2300, needsH1: false, needsH3: false, needsOverhang: false, postWidth: 100, label: 'Pergola Luxe Electric', hint: 'Bioklimatische Pergola, motorisiert + LED' },
    };
    const modelDrConfig = MODEL_DACHRECHNER_CONFIG[model] || MODEL_DACHRECHNER_CONFIG['Topline'];

    const [dachH3, setDachH3] = useState<number>(modelDrConfig.defaultH3);
    const [dachH1, setDachH1] = useState<number>(modelDrConfig.defaultH1);
    const [dachOverhang, setDachOverhang] = useState<number>(modelDrConfig.defaultOverhang || 300);
    const [wallDimsAuto, setWallDimsAuto] = useState<boolean>(true);

    // === WALL CONFIG ===
    const [wallProduct, setWallProduct] = useState<string>('Side Wall (Glass)');
    const [wallPlacement, setWallPlacement] = useState<'left' | 'right' | 'front'>('left');
    const [keilfensterSide, setKeilfensterSide] = useState<'left' | 'right'>('left');
    const [wallWidth, setWallWidth] = useState<number>(2000);
    const [wallHeight, setWallHeight] = useState<number>(2200);
    const [wallTab, setWallTab] = useState<'walls' | 'awnings' | 'led' | 'materials' | 'wpc' | 'aluminum'>('walls');
    const [wallPrice, setWallPrice] = useState<number | null>(null);
    const [wallPriceLoading, setWallPriceLoading] = useState(false);
    const [materialLightbox, setMaterialLightbox] = useState<{ src: string; name: string } | null>(null);
    const [wallCategory, setWallCategory] = useState<'fixed' | 'sliding' | 'panorama' | 'keilfenster'>('fixed');
    const [wallGlassType, setWallGlassType] = useState<'klar' | 'matt' | 'iso'>('klar');
    const [structuralMetadata, setStructuralMetadata] = useState<{
        posts_count: number;
        fields_count: number;
        rafter_type: string | null;
    } | null>(null);

    // === EXTRA POSTS (Zusatzpfosten) ===
    const [extraPosts, setExtraPosts] = useState<number>(0);
    const [extraPostHeight, setExtraPostHeight] = useState<2400 | 3000>(2400);
    const EXTRA_POST_BASE_PRICE = 58.20; // per extra post, 2400mm
    const EXTRA_POST_3000_SURCHARGE = 14.55; // per post surcharge for 3000mm from Aluxe Materialien sheet — applies to ALL posts (base + extra)
    const totalPostCount = (structuralMetadata?.posts_count || 2) + extraPosts;
    const heightSurcharge = extraPostHeight === 3000 ? totalPostCount * EXTRA_POST_3000_SURCHARGE : 0;
    const extraPostTotalPrice = (extraPosts * EXTRA_POST_BASE_PRICE) + heightSurcharge;

    // === SCHIEBETÜR OPTIONS ===
    const [schiebetuerHandle, setSchiebetuerHandle] = useState<string>('ACSL2042');
    const [schiebetuerOpening, setSchiebetuerOpening] = useState<string>('left');

    // === PANORAMA ACCESSORIES ===
    const [panoramaOpeningType, setPanoramaOpeningType] = useState<'side' | 'center'>('side');
    const [panoramaHandleType, setPanoramaHandleType] = useState<'griff' | 'knauf'>('griff');
    const [panoramaSteelLook, setPanoramaSteelLook] = useState<boolean>(false);
    const [panoramaGlassType, setPanoramaGlassType] = useState<'klar' | 'planibel_grau'>('klar');
    const [panoramaAccessoriesPrice, setPanoramaAccessoriesPrice] = useState<number>(0);

    // === ACCESSORIES ===
    const [accessories, setAccessories] = useState<Accessory[]>([]);
    const [accessoryQuantities, setAccessoryQuantities] = useState<Record<string, number>>({});
    const [loadingAccessories, setLoadingAccessories] = useState(false);

    // === AWNING CONFIG ===
    const [awningType, setAwningType] = useState<'aufdach' | 'unterdach' | 'zip'>('aufdach');
    const [awningWidth, setAwningWidth] = useState<number>(3000);
    const [awningProjection, setAwningProjection] = useState(3000);
    const [awningMotorCount, setAwningMotorCount] = useState<1 | 2>(1);

    // Keilfenster Options
    const [wedgeGlassType, setWedgeGlassType] = useState('clear');
    const [wedgeAccessories, setWedgeAccessories] = useState<Record<string, boolean>>({
        uProfil: false,
        schraubenSet: false,
        kippFenster: false,
        abdeckungEL891: false
    });

    // === WPC FLOORING ===
    const [wpcArea, setWpcArea] = useState<number>(0);
    const [wpcPricePerM2, setWpcPricePerM2] = useState<number>(0);
    const [wpcTotal, setWpcTotal] = useState<number>(0);

    // === ALUMINUM WALLS ===
    const [aluWallType, setAluWallType] = useState<'full' | 'lamellar'>('full');
    const [aluWallWidth, setAluWallWidth] = useState<number>(2000);
    const [aluWallHeight, setAluWallHeight] = useState<number>(2200);
    const [aluWallPrice, setAluWallPrice] = useState<number | null>(null);
    const [aluWallPriceLoading, setAluWallPriceLoading] = useState(false);

    // === PRICE STATE ===
    const [awningPrice, setAwningPrice] = useState<number | null>(null);

    // === MATERIALS ===
    const [materials, setMaterials] = useState<any[]>([]);
    const [materialQuantities, setMaterialQuantities] = useState<Record<string, number>>({});
    const [loadingMaterials, setLoadingMaterials] = useState(false);

    // === PRICING STATE ===
    const [price, setPrice] = useState<number | null>(null);
    const [freestandingSurchargePrice, setFreestandingSurchargePrice] = useState<number>(0);
    const [variantSurchargePrice, setVariantSurchargePrice] = useState<number>(0);
    const [sonderfarbenSurcharge, setSonderfarbenSurcharge] = useState<number>(0); // +20% for special colors
    const [includeFoundations, setIncludeFoundations] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // === DIMENSION LIMITS (from price table) ===
    const [dimensionLimits, setDimensionLimits] = useState<{
        maxWidth: number;
        maxDepth: number;
        minWidth: number;
        minDepth: number;
    } | null>(null);
    const [structureCount, setStructureCount] = useState<number>(1);
    const [structureNote, setStructureNote] = useState<string>('');

    // === BASKET ===
    const [basket, setBasket] = useState<BasketItem[]>([]);
    const [showBasket, setShowBasket] = useState(false);



    // === SUMMARY VIEW ===

    const [margin, setMargin] = useState(40); // Default 40%
    const [discount, setDiscount] = useState(0); // Default 0%
    const [purchaseDiscount, setPurchaseDiscount] = useState(0); // Global purchase discount from Admin
    const [savingOffer, setSavingOffer] = useState(false);
    const [savedOfferId, setSavedOfferId] = useState<string | null>(null);
    const [savedOffer, setSavedOffer] = useState<Offer | null>(null); // Store full offer for PDF
    const savedOfferRef = useRef<Offer | null>(null); // Ref for immediate access (bypasses React batching)
    const [publicLink, setPublicLink] = useState<string | null>(null);
    // Email Workflow State — uses proven SendEmailModal from leads
    const [showSendEmailModal, setShowSendEmailModal] = useState(false);

    // === CUSTOM ITEMS (Manual Positions) ===
    const [customItems, setCustomItems] = useState<{ id: string; name: string; price: number }[]>([]);
    const [newItemName, setNewItemName] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');

    // === MANUAL OFFER MODE ===
    const [isManualMode, setIsManualMode] = useState(false);
    const [manualModel, setManualModel] = useState<string>('Trendline');
    const [manualWidth, setManualWidth] = useState<string>('');
    const [manualDepth, setManualDepth] = useState<string>('');
    const [manualInstallationCost, setManualInstallationCost] = useState<string>('');

    // === MONTAGE (INSTALLATION) ===
    const [montagePrice, setMontagePrice] = useState<number>(0);

    // === PLN PRICING (for sales_rep_pl) ===
    const [eurRate, setEurRate] = useState<number>(4.35);
    const isPL = currentUser?.role === 'sales_rep_pl';


    // === CALCULATED VALUES ===
    const areaM2 = (width * projection) / 1_000_000; // Convert mm² to m²

    // === DACHRECHNER INTEGRATION ===
    // Map V2 model IDs to Dachrechner model keys
    // Freestanding Skyline/Carport use separate calc functions (extra post subtracted)
    const getDachrechnerModelId = (v2ModelId: string, constr: ConstructionType): RoofModelId | null => {
        if (v2ModelId === 'Skyline') return constr === 'freestanding' ? 'skyline_freistand' : 'skyline';
        if (v2ModelId === 'Carport') return constr === 'freestanding' ? 'carport_freistand' : 'carport';
        const map: Record<string, RoofModelId> = {
            'Orangeline': 'orangeline',
            'Orangeline+': 'orangeline+',
            'Trendline': 'trendline',
            'Trendline+': 'trendline+',
            'Topline': 'topline',
            'Topline XL': 'topline_xl',
            'Designline': 'designline',
            'Ultraline': 'ultraline_classic',
            // Teranda models use Trendline calculation (similar sloped roof geometry)
            'TR10': 'trendline',
            'TR15': 'trendline',
            'TR20': 'trendline',
        };
        return map[v2ModelId] || null;
    };

    // Run Dachrechner calculation whenever roof config changes
    const dachrechnerResults = useMemo<DachrechnerResults | null>(() => {
        const drModelId = getDachrechnerModelId(model, construction);
        if (!drModelId || !projection) return null;
        try {
            return calculateDachrechner(drModelId, {
                h3: modelDrConfig.needsH3 ? dachH3 : undefined,
                depth: projection,
                h1: modelDrConfig.needsH1 ? dachH1 : undefined,
                width: width,
                overhang: modelDrConfig.needsOverhang ? dachOverhang : undefined,
                postCount: (structuralMetadata?.posts_count || 2) + extraPosts,
            });
        } catch {
            return null;
        }
    }, [model, construction, projection, width, dachH3, dachH1, dachOverhang, modelDrConfig, structuralMetadata, extraPosts]);

    // === PRE-FILL FROM LEAD (Navigation State) ===
    useEffect(() => {
        const navState = location.state as { customer?: any; leadId?: string; leadNotes?: string; leadCustomerData?: any } | null;
        if (navState?.customer) {
            const c = navState.customer;
            setCustomerState({
                firstName: c.firstName || '',
                lastName: c.lastName || '',
                email: c.email || '',
                phone: c.phone || '',
                companyName: c.companyName || '',
                postalCode: c.postalCode || '',
                city: c.city || '',
                street: c.street || '',
                houseNumber: c.houseNumber || '',
                salutation: c.salutation || 'Herr',
            } as Customer);
            // Auto-skip customer form when coming from a lead
            setView('config');
        }
        if (navState?.leadId) {
            linkedLeadIdRef.current = navState.leadId;
            // Load configurator form data
            ConfiguratorService.getByLeadId(navState.leadId).then(configs => {
                const completed = configs.find(c => c.status === 'completed') || configs[0];
                if (completed) setLeadConfig(completed);
            }).catch(console.error);
        }
        if (navState?.leadNotes) setLeadNotes(navState.leadNotes);
        if (navState?.leadCustomerData) setLeadCustomerData(navState.leadCustomerData);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-fill wall dimensions from Dachrechner when product changes
    useEffect(() => {
        if (!wallDimsAuto || !dachrechnerResults) return;

        const isWedge = wallProduct.includes('Wedge') || wallProduct.includes('Keilfenster');
        const isFrontPlacement = wallPlacement === 'front';

        // Side wall width = fensterF2 (depth-based: distance from front post to house wall)
        // Front segment width = calculated from BASE posts only (extras are structural, not glass boundaries)
        const sideWallWidth = dachrechnerResults.fensterF2 ? Math.round(dachrechnerResults.fensterF2) : null;
        const basePosts = structuralMetadata?.posts_count || 2;
        const pw = dachrechnerResults.postWidth || 120; // Model-specific post width from Dachrechner
        // Glass systems span between BASE posts only — extra posts are structural reinforcement
        const frontSegmentWidth = basePosts > 1
            ? Math.round((width - basePosts * pw) / (basePosts - 1))
            : (width ? Math.round(width - pw) : null);
        const postHeight = dachH3;

        if (isWedge) {
            if (sideWallWidth) setWallWidth(sideWallWidth);
            if (dachrechnerResults.keilhoeheK1) setWallHeight(Math.round(dachrechnerResults.keilhoeheK1));
        } else if (isFrontPlacement) {
            // ANY product on front: width = segment between BASE posts, height = H3
            if (frontSegmentWidth) setWallWidth(frontSegmentWidth);
            setWallHeight(postHeight);
        } else {
            // ANY product on side (left/right): width = fensterF2, height = H3
            if (sideWallWidth) setWallWidth(sideWallWidth);
            setWallHeight(postHeight);
        }
    }, [wallProduct, wallPlacement, dachrechnerResults, wallDimsAuto, width, dachH3]);


    // Mailbox fetching is handled by SendEmailModal via currentUser.mailboxes

    // === AUTO-SWITCH COVER TYPE FOR GLASS-ONLY OR SPECIAL MODELS ===
    useEffect(() => {
        const currentModelConfig = ROOF_MODELS.find(m => m.id === model);
        if (currentModelConfig) {
            // Skyline/Carport have neither Poly nor Glass - leave cover as-is (it's ignored anyway)
            if (!currentModelConfig.hasPoly && !currentModelConfig.hasGlass) {
                // Do nothing - these models don't use cover type in pricing
                return;
            }
            // If model doesn't support Poly, switch to Glass
            if (!currentModelConfig.hasPoly && cover === 'Poly') {
                setCover('Glass');
            }
            // If model doesn't support Glass, switch to Poly
            if (!currentModelConfig.hasGlass && cover === 'Glass') {
                setCover('Poly');
            }
        }
    }, [model, cover]);

    // === FETCH EUR/PLN RATE (for PL sales rep) ===
    useEffect(() => {
        if (isPL) {
            SettingsService.getEurRate().then(rate => { if (rate) setEurRate(rate); });
        }
    }, [isPL]);

    // === FETCH PURCHASE DISCOUNT FROM ADMIN ===
    useEffect(() => {
        const fetchPurchaseDiscount = async () => {
            try {
                // Try to find discount for specific model, fallback to GLOBAL
                const { data } = await supabase
                    .from('pricing_discounts')
                    .select('model_family, discount_percent')
                    .in('model_family', [model, 'GLOBAL']);

                if (data && data.length > 0) {
                    // Prefer model-specific discount, fallback to GLOBAL
                    const modelDiscount = data.find(d => d.model_family === model);
                    const globalDiscount = data.find(d => d.model_family === 'GLOBAL');

                    const discountPercent = modelDiscount?.discount_percent ?? globalDiscount?.discount_percent ?? 0;
                    setPurchaseDiscount(discountPercent);
                } else {
                    setPurchaseDiscount(0);
                }
            } catch (e) {
                console.error('Error fetching purchase discount:', e);
                setPurchaseDiscount(0);
            }
        };
        fetchPurchaseDiscount();
    }, [model]);

    // === LOAD ACCESSORIES ===
    useEffect(() => {
        const loadAccessories = async () => {
            setLoadingAccessories(true);
            try {
                const { data: tables } = await supabase
                    .from('price_tables')
                    .select('id, name')
                    .eq('is_active', true)
                    .eq('type', 'fixed')
                    .ilike('name', 'Aluxe V2%')
                    .order('name');

                if (!tables) return;

                const accessoryList: Accessory[] = [];
                for (const table of tables) {
                    const { data: priceData } = await supabase
                        .from('price_matrix_entries')
                        .select('price')
                        .eq('price_table_id', table.id)
                        .limit(1);

                    const price = priceData?.[0]?.price || 0;
                    const name = table.name.toLowerCase();
                    let category: Accessory['category'] = 'other';
                    if (name.includes('led') || name.includes('stripe') || name.includes('spots')) category = 'led';
                    else if (name.includes('profil') || name.includes('leiste')) category = 'profile';
                    else if (name.includes('fundament')) category = 'mounting';
                    else if (name.includes('poly')) category = 'polycarbonate';
                    else if (name.includes('pvc')) category = 'pvc';

                    accessoryList.push({
                        id: table.id,
                        name: table.name.replace('Aluxe V2 - ', ''),
                        price: Number(price),
                        category,
                        unit: 'szt'
                    });
                }
                setAccessories(accessoryList);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingAccessories(false);
            }
        };
        loadAccessories();
    }, []);

    // === LOAD MATERIALS ===
    useEffect(() => {
        const loadMaterials = async () => {
            setLoadingMaterials(true);
            try {
                const { data } = await supabase
                    .from('aluxe_materials')
                    .select('*')
                    .eq('is_active', true)
                    .order('sort_order');

                if (data) {
                    // Filter by current model
                    const filtered = data.filter(m =>
                        m.model_family === 'all' ||
                        m.model_family === model ||
                        (m.compatible_models && m.compatible_models.includes(model))
                    );
                    setMaterials(filtered);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingMaterials(false);
            }
        };
        loadMaterials();
    }, [model]);

    // === CALCULATE AWNING PRICE ===
    useEffect(() => {
        const fetchAwningPrice = async () => {
            setAwningPrice(null);

            // Build table name based on type and motor count
            let tableName: string;
            if (awningType === 'aufdach') {
                tableName = awningMotorCount === 1
                    ? 'Aluxe V2 - Markise Aufdach ZIP (1 Motor)'
                    : 'Aluxe V2 - Markise Aufdach ZIP (2 Motors)';
            } else if (awningType === 'unterdach') {
                tableName = awningMotorCount === 1
                    ? 'Aluxe V2 - Markise Unterdach ZIP (1 Motor)'
                    : 'Aluxe V2 - Markise Unterdach ZIP (2 Motors)';
            } else {
                tableName = 'Aluxe V2 - ZIP Screen'; // Fallback for vertical ZIP
            }

            try {
                const { data: tables } = await supabase
                    .from('price_tables')
                    .select('id')
                    .eq('name', tableName)
                    .limit(1);

                if (tables && tables.length > 0) {
                    const price = await PricingService.calculateMatrixPrice(
                        tables[0].id,
                        awningWidth,
                        awningProjection
                    );
                    if (price !== null) {
                        // Add mandatory BOM accessories (Befestigungswinkel — always in Aluxe orders)
                        const markiseBom = MARKISE_BOM_ACCESSORIES.reduce((s, a) => s + a.price, 0);
                        setAwningPrice(price + markiseBom);
                    }
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchAwningPrice();
    }, [awningType, awningWidth, awningProjection, awningMotorCount]);

    // === CALCULATE WALL/ENCLOSURE PRICE ===
    useEffect(() => {
        const fetchWallPrice = async () => {
            setWallPrice(null);
            setWallPriceLoading(true);

            // Determine target table name based on selected product
            let tableName = '';
            if (wallProduct.includes('Side Wall')) {
                tableName = 'Aluxe V2 - Side Wall (Glass)';
            } else if (wallProduct.includes('Front Wall')) {
                tableName = 'Aluxe V2 - Front Wall (Glass)';
            } else if (wallProduct.includes('Wedge') || wallProduct.includes('Keilfenster')) {
                // Keilfenster is always Glass (per pricelist), even if roof is Poly
                tableName = `Aluxe V2 - Wedge (Glass)`;
            } else if (wallProduct.includes('Schiebetür')) {
                // Each glass variant has its own full-price table in the database
                tableName = `Aluxe V2 - ${wallProduct}`;
            } else if (wallProduct.includes('Panorama')) {
                // Handle Panorama systems (AL22-AL26)
                tableName = `Aluxe V2 - ${wallProduct}`;
            }

            if (!tableName) {
                setWallPriceLoading(false);
                return;
            }

            try {
                const { data: tables } = await supabase
                    .from('price_tables')
                    .select('id')
                    .eq('name', tableName)
                    .limit(1);

                if (tables && tables.length > 0) {
                    // Pattern 643: Linearized Matrix lookup
                    // Side Wall: price by HEIGHT (projection_mm = wallHeight), width_mm = 0
                    // Wedge: price by ROOF PROJECTION (not wall height!), width_mm = 0
                    // Front Wall / Schiebetür: price by WIDTH, projection_mm = 0
                    // Panorama: fixed price per panel × number of panels
                    const isPanorama = wallProduct.includes('Panorama');

                    let finalPrice: number | null = null;

                    if (isPanorama) {
                        // Panorama pricing: price per PANEL per METER of height (stored at width=850 as representative)
                        // Formula: price_per_panel * number_of_panels * height_in_meters
                        const panoramaProduct = PANORAMA_PRODUCTS.find(p => wallProduct.includes(p.id.replace('Panorama ', '')));
                        const trackCount = panoramaProduct?.tracks || 3;

                        const panelPrice = await PricingService.calculateMatrixPrice(
                            tables[0].id,
                            1, // Lookup key for panel price (1mm is standard in new tables, 850mm only in legacy)
                            0
                        );


                        if (panelPrice !== null) {
                            // Calculate total price: price_per_panel × number_of_tracks
                            // The DB price is "Per Panel" (up to max height), NOT per meter height.
                            finalPrice = panelPrice * trackCount;

                            // Add accessory prices
                            let accessoriesTotal = 0;

                            // Lock based on opening type
                            const lockPrice = panoramaOpeningType === 'center' ? 97.92 : 73.44;
                            accessoriesTotal += lockPrice;

                            // Handle type
                            const handlePrice = panoramaHandleType === 'knauf' ? 36.68 : 14.21;
                            accessoriesTotal += handlePrice;

                            // Verriegelung (always included)
                            accessoriesTotal += 9.80;

                            // Glass surcharge for Planibel Grau (per m²)
                            if (panoramaGlassType === 'planibel_grau') {
                                // Panel area: panel width (max 1100mm) × height
                                const panelWidthM = Math.min(wallWidth / trackCount, 1100) / 1000;
                                const panelHeightM = wallHeight / 1000;
                                const panelArea = panelWidthM * panelHeightM;
                                const glassSurcharge = 47.95 * panelArea * trackCount;
                                accessoriesTotal += glassSurcharge;
                            }

                            // Steel-Look profiles (2 side profiles per system)
                            if (panoramaSteelLook) {
                                accessoriesTotal += 18.95 * 2;
                            }

                            // Mandatory BOM accessories (Koppelprofil + Silikon — always in Aluxe orders)
                            const bomTotal = PANORAMA_BOM_ACCESSORIES.reduce((s, a) => s + a.price, 0);
                            accessoriesTotal += bomTotal;

                            setPanoramaAccessoriesPrice(accessoriesTotal);
                            finalPrice += accessoriesTotal;
                        }
                    } else {
                        // Determine correct lookup dimensions based on product type
                        const isWedge = wallProduct.includes('Wedge') || wallProduct.includes('Keilfenster');
                        const isSideWall = wallProduct.includes('Side');
                        const isSchiebetur = wallProduct.includes('Schiebetür');

                        let lookupWidth: number;
                        let lookupProjection: number;

                        if (isWedge) {
                            // Keilfenster: price by D1 (Breite) dimension from pricelist
                            // D1 ranges from 2000mm to 5000mm in manufacturer pricelist
                            // User enters this as wallWidth in the UI
                            // SQL data has width_mm=0, projection_mm = D1 dimension
                            lookupWidth = 0;
                            lookupProjection = wallWidth; // Use wallWidth as D1 (Breite) dimension
                        } else if (isSideWall) {
                            // Side Wall: price by wall height (stored as projection_mm)
                            lookupWidth = 0;
                            lookupProjection = wallHeight;
                        } else {
                            // Front Wall: price by width, projection = 0
                            // Schiebetür: price by width, projection = 2200 (fixed height in pricelist)
                            // wallWidth is already set to innerWidth (per-segment) by auto-fill
                            lookupWidth = wallWidth;
                            lookupProjection = isSchiebetur ? 2200 : 0;
                        }


                        finalPrice = await PricingService.calculateMatrixPrice(
                            tables[0].id,
                            lookupWidth,
                            lookupProjection
                        );

                        // WEDGE SURCHARGES (Matt / Iso)
                        if (isWedge && finalPrice !== null) {
                            let surcharge = 0;
                            // Matt Glass Surcharge
                            if (wedgeGlassType === 'matt') {
                                const { data: mattTables } = await supabase
                                    .from('price_tables')
                                    .select('id')
                                    .eq('name', 'Aluxe V2 - Wedge (Glass) Surcharge Matt')
                                    .limit(1);
                                if (mattTables?.[0]) {
                                    const mattPrice = await PricingService.calculateMatrixPrice(mattTables[0].id, 0, lookupProjection);
                                    if (mattPrice) surcharge += mattPrice;
                                }
                            }
                            // Iso Glass Surcharge
                            if (wedgeGlassType === 'iso') {
                                const { data: isoTables } = await supabase
                                    .from('price_tables')
                                    .select('id')
                                    .eq('name', 'Aluxe V2 - Wedge (Glass) Surcharge Iso')
                                    .limit(1);
                                if (isoTables?.[0]) {
                                    const isoPrice = await PricingService.calculateMatrixPrice(isoTables[0].id, 0, lookupProjection);
                                    if (isoPrice) surcharge += isoPrice;
                                }
                            }
                            finalPrice += surcharge;
                        }

                        // SIDE/FRONT WALL SURCHARGES (Matt / Iso)
                        if ((isSideWall || (!isWedge && !isSchiebetur)) && finalPrice !== null && wallGlassType !== 'klar') {
                            const wallTypeName = isSideWall ? 'Side Wall' : 'Front Wall';
                            const surchargeType = wallGlassType === 'matt' ? 'Surcharge Matt' : 'Surcharge Iso';
                            const surchargeName = `Aluxe V2 - ${wallTypeName} (Glass) ${surchargeType}`;
                            const { data: surchargeTables } = await supabase
                                .from('price_tables')
                                .select('id')
                                .eq('name', surchargeName)
                                .limit(1);
                            if (surchargeTables?.[0]) {
                                const surchargePrice = await PricingService.calculateMatrixPrice(
                                    surchargeTables[0].id,
                                    lookupWidth,
                                    lookupProjection
                                );
                                if (surchargePrice) {
                                    finalPrice += surchargePrice;
                                }
                            }
                        }

                        // Schiebetür: full price already included in per-glass-type table, no surcharge needed
                    }

                    if (finalPrice !== null) setWallPrice(finalPrice);
                } else {
                    console.warn(`Table not found: ${tableName}`);
                }
            } catch (e) {
                console.error('Wall price fetch error:', e);
            } finally {
                setWallPriceLoading(false);
            }
        };

        const t = setTimeout(fetchWallPrice, 300);
        return () => clearTimeout(t);
    }, [wallProduct, wallWidth, wallHeight, projection, wedgeGlassType, wallGlassType, panoramaOpeningType, panoramaHandleType, panoramaGlassType, panoramaSteelLook, wallPlacement]);

    // === AUTO-CALCULATE PANORAMA TRACKS ===
    useEffect(() => {
        if (wallCategory === 'panorama' && wallProduct.includes('Panorama')) {
            // Extract current model from ID
            const currentModelMatch = wallProduct.match(/Panorama (AL\d+)/);
            const currentModel = currentModelMatch ? currentModelMatch[1] : 'AL22';

            const bestVariantId = getBestPanoramaVariant(currentModel, wallWidth);

            // Only update if different to avoid loop
            if (bestVariantId !== wallProduct) {
                setWallProduct(bestVariantId);
            }
        }
    }, [wallWidth, wallCategory]); // Intentionally exclude wallProduct to avoid loops, logic handles manual model changes via click

    // === STRUCTURAL METADATA FETCH ===
    useEffect(() => {
        const fetchStructural = async () => {
            try {
                // Teranda models: posts are determined by width thresholds (not from DB)
                if (isTerandaModel(model)) {
                    const terandaPostThresholds: Record<string, number> = {
                        'TR10': 4500,  // ≤4500mm → 2 Pfosten
                        'TR15': 4520,  // ≤4520mm → 2 Pfosten
                        'TR20': 7000,  // ≤7000mm → 2 Pfosten
                    };
                    const threshold = terandaPostThresholds[model] || 4500;
                    const postsCount = width <= threshold ? 2 : Math.ceil(width / threshold) + 1;
                    // Fields = posts + 1 (each segment between posts)
                    const fieldsCount = postsCount + 1;
                    setStructuralMetadata({
                        posts_count: postsCount,
                        fields_count: fieldsCount,
                        rafter_type: null,
                    });
                    return;
                }

                const table = await findPriceTable(supabase, model, cover, zone, construction, pergolaLuxeVariant);

                if (table) {
                    // Posts count depends primarily on width — find nearest width ≤ user's width
                    // Also fetch fields_count and rafter_type for the exact width×projection if possible
                    const { data: exactEntries } = await supabase
                        .from('price_matrix_entries')
                        .select('posts_count, fields_count, rafter_type, width_mm')
                        .eq('price_table_id', table.id)
                        .eq('width_mm', width)
                        .eq('projection_mm', projection)
                        .not('posts_count', 'is', null)
                        .limit(1);

                    if (exactEntries && exactEntries.length > 0 && exactEntries[0].posts_count) {
                        setStructuralMetadata({
                            posts_count: exactEntries[0].posts_count,
                            fields_count: exactEntries[0].fields_count || 0,
                            rafter_type: exactEntries[0].rafter_type || null,
                        });
                    } else {
                        // Fallback: nearest width ≤ user's width for posts_count
                        const { data: nearEntries } = await supabase
                            .from('price_matrix_entries')
                            .select('posts_count, fields_count, rafter_type, width_mm')
                            .eq('price_table_id', table.id)
                            .lte('width_mm', width)
                            .eq('projection_mm', projection)
                            .not('posts_count', 'is', null)
                            .order('width_mm', { ascending: false })
                            .limit(1);

                        if (nearEntries && nearEntries.length > 0 && nearEntries[0].posts_count) {
                            setStructuralMetadata({
                                posts_count: nearEntries[0].posts_count,
                                fields_count: nearEntries[0].fields_count || 0,
                                rafter_type: nearEntries[0].rafter_type || null,
                            });
                        } else {
                            // Fallback: if width is beyond max in table, get the highest width entry
                            const { data: maxEntries } = await supabase
                                .from('price_matrix_entries')
                                .select('posts_count, fields_count, rafter_type, width_mm')
                                .eq('price_table_id', table.id)
                                .not('posts_count', 'is', null)
                                .order('width_mm', { ascending: false })
                                .limit(1);

                            if (maxEntries && maxEntries.length > 0 && maxEntries[0].posts_count) {
                                setStructuralMetadata({
                                    posts_count: maxEntries[0].posts_count,
                                    fields_count: maxEntries[0].fields_count || 0,
                                    rafter_type: maxEntries[0].rafter_type || null,
                                });
                            } else {
                                setStructuralMetadata(null);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('Structural fetch error:', e);
            }
        };
        fetchStructural();
    }, [model, cover, zone, construction, width, projection]);

    // === CALCULATE SCHIEBEEINHEIT (Sliding Roof) PRICE FOR DESIGNLINE ===
    useEffect(() => {
        const fetchSchiebeeinheitPrice = async () => {
            // Only applies to Designline model
            if (model !== 'Designline') {
                setSchiebeeinheitUnitPrice(0);
                setSchiebeeinheitTotalPrice(0);
                return;
            }

            try {
                // Lookup surcharge table for Schiebeeinheit
                const { data: tables } = await supabase
                    .from('price_tables')
                    .select('id')
                    .ilike('name', '%Designline%Schiebeeinheit%')
                    .eq('is_active', true)
                    .limit(1);

                if (tables && tables.length > 0) {
                    // Price is by projection (depth) dimension
                    const unitPrice = await PricingService.calculateMatrixPrice(
                        tables[0].id,
                        0,
                        projection
                    );

                    if (unitPrice !== null) {
                        setSchiebeeinheitUnitPrice(unitPrice);
                        setSchiebeeinheitTotalPrice(unitPrice * schiebeeinheitCount);
                    }
                } else {
                    // Fallback: calculate based on formula from Excel (89.10 EUR per meter depth per field)
                    const fallbackUnitPrice = Math.round((projection / 1000) * 89.10 * 100) / 100;
                    setSchiebeeinheitUnitPrice(fallbackUnitPrice);
                    setSchiebeeinheitTotalPrice(fallbackUnitPrice * schiebeeinheitCount);
                }
            } catch (e) {
                console.error('Schiebeeinheit price fetch error:', e);
            }
        };

        fetchSchiebeeinheitPrice();
    }, [model, projection, schiebeeinheitCount]);

    // === CALCULATE ROOF PRICE ===
    useEffect(() => {
        const fetchPrice = async () => {
            setLoading(true);
            setPrice(null);
            setError(null);
            setFreestandingSurchargePrice(0);

            try {
                // 1. Fetch BASE Price
                let tableName = buildTableName(model, cover, zone, construction, pergolaLuxeVariant);
                // IF Freestanding AND (Trendline OR Topline), we use the WALL table for base price
                // and add surcharge separately.
                // UNLESS logical "Freestanding" tables exist for other models (Skyline/Carport) which usually do.

                // Models that use the Freestanding Surcharge table (per Excel sheet 'Freistehende TerrassendächerR')
                // Applies to: Orangeline, Trendline, Topline, Designline and their Plus/XL variants
                const isSurchargeModel = [
                    'Orangeline', 'Orangeline+',
                    'Trendline', 'Trendline+',
                    'Topline', 'Topline XL',
                    'Designline'
                ].includes(model);

                const effectiveConstruction = (construction === 'freestanding' && isSurchargeModel) ? 'wall' : construction;

                // Use the new findPriceTable helper that tries multiple naming formats
                let table = await findPriceTable(supabase, model, cover, zone, effectiveConstruction, pergolaLuxeVariant);

                if (!table) {
                    // For Skyline/Carport: if freestanding table not found, DON'T fallback to wall
                    // They have separate tables and shouldn't be mixed
                    const isNoCoverModel = model === 'Skyline' || model === 'Carport';
                    if (!isNoCoverModel && construction === 'freestanding' && !isSurchargeModel) {
                        // Only for regular models with surcharge approach, try wall table
                        table = await findPriceTable(supabase, model, cover, zone, 'wall', pergolaLuxeVariant);
                    }
                }

                if (!table) {
                    setError(`Preisliste nicht gefunden: ${tableName} oder ${buildDbTableName(model, cover, zone)}`);
                    setLoading(false);
                    return;
                }

                // Fetch dimension limits for this table (for UI constraints)
                const limits = await PricingService.getTableDimensionLimits(table.id);
                if (limits) {
                    setDimensionLimits({
                        maxWidth: limits.maxWidth,
                        maxDepth: limits.maxDepth,
                        minWidth: limits.minWidth,
                        minDepth: limits.minDepth
                    });

                    // Auto-constrain dimensions: only clamp UPPER bounds
                    // Lower bounds are NOT clamped — the matrix lookup (gte) naturally snaps to nearest available size
                    let needsRerun = false;

                    // Check WIDTH upper limit (allow up to 2x for combined constructions)
                    if (width > limits.maxWidth * 2) {
                        setWidth(limits.maxWidth * 2);
                        needsRerun = true;
                    }

                    // Check PROJECTION/DEPTH upper limit
                    if (projection > limits.maxDepth) {
                        setProjection(limits.maxDepth);
                        needsRerun = true;
                    }

                    if (needsRerun) {
                        // Re-run calculation will happen due to state change
                        setLoading(false);
                        return;
                    }
                }

                // Use combined pricing (handles multi-structure automatically)
                const combinedResult = await PricingService.calculateCombinedPrice(table.id, width, projection);

                if (combinedResult !== null) {
                    // Pergola Luxe prices are stored in PLN (from Mirpol) — convert to EUR
                    const rawPrice = combinedResult.totalPrice;
                    const finalPrice = isPergolaLuxeModel(model) ? Math.round(rawPrice / 4.1) : rawPrice;
                    setPrice(finalPrice);
                    setStructureCount(combinedResult.structureCount);
                    setStructureNote(combinedResult.note);
                } else {
                    setError(`Maß nicht in der Preisliste verfügbar`);
                    setLoading(false);
                    return;
                }

                // 2. Fetch Freestanding SURCHARGE if applicable
                if (construction === 'freestanding') {
                    if (isSurchargeModel) {
                        // Ultraline has its own surcharge table (no foundations variant only)
                        let surchargeTableName = '';
                        if (model === 'Ultraline') {
                            surchargeTableName = 'Aluxe V2 - Ultraline Freestanding Surcharge (No Foundation)';
                        } else {
                            surchargeTableName = includeFoundations
                                ? 'Aluxe V2 - Freestanding Surcharge (With Foundation)'
                                : 'Aluxe V2 - Freestanding Surcharge (No Foundation)';
                        }

                        const { data: surchargeTables } = await supabase
                            .from('price_tables')
                            .select('id')
                            .eq('name', surchargeTableName)
                            .limit(1);


                        if (surchargeTables && surchargeTables.length > 0) {
                            // Surcharge is based on WIDTH only. Projection is irrelevant (pass 0).
                            // IMPORTANT: For combined structures, calculate surcharge per segment
                            let totalSurcharge = 0;

                            if (combinedResult && combinedResult.structures.length > 1) {
                                // Multiple structures: calculate surcharge for EACH segment's width
                                for (const structure of combinedResult.structures) {
                                    const segmentSurcharge = await PricingService.calculateMatrixPrice(
                                        surchargeTables[0].id,
                                        structure.width,
                                        0
                                    );
                                    if (segmentSurcharge !== null) {
                                        totalSurcharge += segmentSurcharge;
                                    }
                                }
                            } else {
                                // Single structure: use total width
                                const surcharge = await PricingService.calculateMatrixPrice(surchargeTables[0].id, width, 0);
                                totalSurcharge = surcharge || 0;
                            }

                            if (totalSurcharge > 0) {
                                setFreestandingSurchargePrice(totalSurcharge);
                            } else {
                                console.warn('Surcharge not found for width', width);
                            }
                        }
                    } else {
                        // Logic for other models (e.g. Ultraline) if they fallback to simplified +15%
                        // If we are here, it means we found a base table.
                        // If it was a 'Freestanding' table (Skyline/Carport), price covers everything.
                        // If it was a 'Wall' table (fallback logic above), we might need to add 15%.
                        if (table.name.includes('Freestanding')) {
                            // Price is already full
                        } else {
                            // Price is Wall base, add 15% manually?
                            // Legacy logic was +15%. Let's keep it consistent for non-surcharge models.
                            // Currently `freestandingSurchargePrice` is absolute. 15% of base price.
                            setFreestandingSurchargePrice((combinedResult?.totalPrice || 0) * 0.15);
                        }
                    }
                }

                // 3. Fetch VARIANT SURCHARGE from database (Glass Matt/Stopsol or Poly IR Gold)
                // Surcharge tables exist in format: "Aluxe V2 - {Model} {Poly/Glass} {Variant} Surcharge (Zone {N})"
                // For Teranda: variant is a separate full-price table (not surcharge delta)
                setVariantSurchargePrice(0); // Reset

                // Only apply surcharge for non-default variants
                const needsSurcharge = (cover === 'Glass' && glassVariant !== 'klar') ||
                    (cover === 'Poly' && (isTerandaModel(model) ? polyVariant === 'reflex-pearl' : polyVariant === 'ir-gold'));

                // TERANDA: variant = separate full-price table, replace base price
                if (isTerandaModel(model) && needsSurcharge && combinedResult?.totalPrice) {
                    const variantKey = cover === 'Glass' ? glassVariant : polyVariant;
                    const variantTableName = buildSurchargeTableName(model, cover, zone, variantKey);
                    
                    const { data: vtData } = await supabase
                        .from('price_tables')
                        .select('id, name')
                        .eq('name', variantTableName)
                        .eq('is_active', true)
                        .limit(1);
                    
                    if (vtData && vtData.length > 0) {
                        const variantFullPrice = await PricingService.calculateMatrixPrice(
                            vtData[0].id, width, projection
                        );
                        if (variantFullPrice !== null && variantFullPrice > 0) {
                            // Calculate delta from base price and set as surcharge
                            const delta = variantFullPrice - combinedResult.totalPrice;
                            setVariantSurchargePrice(delta);
                        }
                    }
                } else if (needsSurcharge && combinedResult?.totalPrice) {
                    // Map model name to DB format (e.g., "Trendline" stays as "Trendline")
                    const dbModel = model.charAt(0).toUpperCase() + model.slice(1).toLowerCase();

                    // Determine surcharge type and build table name
                    let surchargeType = '';
                    let coverType = '';

                    if (cover === 'Glass' && glassVariant === 'matt') {
                        surchargeType = 'Glass Matt';
                        coverType = 'Glass';
                    } else if (cover === 'Glass' && glassVariant === 'stopsol') {
                        surchargeType = 'Glass Stopsol';
                        coverType = 'Glass';
                    } else if (cover === 'Poly' && polyVariant === 'ir-gold') {
                        surchargeType = 'Poly IR Gold';
                        coverType = 'Poly';
                    }

                    if (surchargeType) {
                        // Table name format: "Aluxe V2 - Trendline Glass Matt Surcharge (Zone 1)"
                        const surchargeTableName = `Aluxe V2 - ${dbModel} ${surchargeType} Surcharge (Zone ${zone})`;

                        // Try exact match first
                        let { data: surchargeTable } = await supabase
                            .from('price_tables')
                            .select('id, name')
                            .eq('name', surchargeTableName)
                            .limit(1);

                        // If not found, try ILIKE for flexible matching
                        if (!surchargeTable || surchargeTable.length === 0) {
                            const searchPattern = `%${dbModel}%${surchargeType}%Zone ${zone}%`;

                            const { data: fuzzyResult } = await supabase
                                .from('price_tables')
                                .select('id, name')
                                .ilike('name', searchPattern)
                                .limit(1);
                            surchargeTable = fuzzyResult;
                        }

                        if (surchargeTable && surchargeTable.length > 0) {

                            // Get price from matrix
                            const surchargePrice = await PricingService.calculateMatrixPrice(
                                surchargeTable[0].id, width, projection
                            );


                            if (surchargePrice !== null && surchargePrice > 0) {
                                setVariantSurchargePrice(surchargePrice);
                            }
                        } else {
                            console.warn('[SURCHARGE DEBUG] Surcharge table not found:', surchargeTableName);
                        }
                    }
                }

                // 4. Calculate SONDERFARBEN surcharge (+20% on construction price)
                if (sonderfarben && combinedResult?.totalPrice) {
                    const constructionPrice = combinedResult.totalPrice;
                    const sonderfarbenAmount = Math.round(constructionPrice * 0.20 * 100) / 100;
                    setSonderfarbenSurcharge(sonderfarbenAmount);
                } else {
                    setSonderfarbenSurcharge(0);
                }

            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        const t = setTimeout(fetchPrice, 300);
        return () => clearTimeout(t);
    }, [model, cover, zone, construction, width, projection, includeFoundations, glassVariant, polyVariant, sonderfarben, pergolaLuxeVariant]);

    // === FETCH WPC PRICE PER M² ===
    useEffect(() => {
        const fetchWpcPrice = async () => {
            try {
                const { data: tables } = await supabase
                    .from('price_tables')
                    .select('id')
                    .eq('name', 'Aluxe V2 - WPC Flooring')
                    .limit(1);

                if (tables && tables.length > 0) {
                    const { data: entries } = await supabase
                        .from('price_matrix_entries')
                        .select('price')
                        .eq('price_table_id', tables[0].id)
                        .limit(1);

                    if (entries && entries.length > 0) {
                        const pricePerM2 = parseFloat(entries[0].price);
                        setWpcPricePerM2(pricePerM2);
                        setWpcTotal(wpcArea * pricePerM2);
                    }
                }
            } catch (e) {
                console.error('WPC price fetch error:', e);
            }
        };
        fetchWpcPrice();
    }, [wpcArea]); // Re-fetch to update total when area changes

    // === FETCH ALUMINUM WALL PRICE ===
    useEffect(() => {
        const fetchAluWallPrice = async () => {
            setAluWallPriceLoading(true);
            try {
                const tableName = aluWallType === 'full'
                    ? 'Aluxe V2 - Aluminum Wall Full'
                    : 'Aluxe V2 - Aluminum Wall Lamellar';

                const { data: tables } = await supabase
                    .from('price_tables')
                    .select('id')
                    .eq('name', tableName)
                    .limit(1);

                if (tables && tables.length > 0) {
                    if (aluWallType === 'full') {
                        // Matrix lookup: width × height
                        const { data: entries } = await supabase
                            .from('price_matrix_entries')
                            .select('price')
                            .eq('price_table_id', tables[0].id)
                            .eq('width_mm', aluWallWidth)
                            .eq('projection_mm', aluWallHeight)
                            .limit(1);

                        if (entries && entries.length > 0) {
                            setAluWallPrice(parseFloat(entries[0].price));
                        } else {
                            setAluWallPrice(null);
                        }
                    } else {
                        // Lamellar: price per mb × length × height_factor
                        // Get price for this height (stored as projection_mm)
                        const { data: entries } = await supabase
                            .from('price_matrix_entries')
                            .select('price')
                            .eq('price_table_id', tables[0].id)
                            .eq('projection_mm', aluWallHeight)
                            .limit(1);

                        if (entries && entries.length > 0) {
                            const pricePerMb = parseFloat(entries[0].price);
                            // aluWallWidth for lamellar is treated as length in mm
                            const lengthInMeters = aluWallWidth / 1000;
                            setAluWallPrice(pricePerMb * lengthInMeters);
                        } else {
                            setAluWallPrice(null);
                        }
                    }
                } else {
                    setAluWallPrice(null);
                }
            } catch (e) {
                console.error('Aluminum wall price fetch error:', e);
                setAluWallPrice(null);
            } finally {
                setAluWallPriceLoading(false);
            }
        };

        const t = setTimeout(fetchAluWallPrice, 300);
        return () => clearTimeout(t);
    }, [aluWallType, aluWallWidth, aluWallHeight]);

    // === TOTALS ===
    const currentModel = useMemo(() => ROOF_MODELS.find(m => m.id === model), [model]);

    // === MATERIAL BOM (physical materials: glass/poly panels, rafters, accessories) ===
    const materialBOM = useMemo(() => {
        if (!price || !structuralMetadata?.fields_count) return null;
        // Skyline/Carport/Pergola/Teranda/Pergola Luxe don't have standard BOM logic
        // Teranda prices from Excel are complete (includes materials)
        // Pergola Luxe prices from Mirpol are fixed per dimension (all-inclusive)
        if (['Skyline', 'Carport', 'Pergola', 'Pergola Deluxe'].includes(model)) return null;
        if (isTerandaModel(model)) return null;
        if (isPergolaLuxeModel(model)) return null;
        return calculateRoofMaterialCost(
            model, cover, width, projection,
            structuralMetadata.fields_count,
            structuralMetadata.posts_count || 2,
            polyVariant,
            glassVariant
        );
    }, [model, cover, width, projection, structuralMetadata, price, polyVariant, glassVariant]);

    const totalPrice = useMemo(() => {
        if (price === null) return null;
        const matCost = materialBOM?.total || 0;
        return price + freestandingSurchargePrice + variantSurchargePrice + sonderfarbenSurcharge + schiebeeinheitTotalPrice + extraPostTotalPrice + matCost;
    }, [price, freestandingSurchargePrice, variantSurchargePrice, sonderfarbenSurcharge, schiebeeinheitTotalPrice, extraPostTotalPrice, materialBOM]);

    const addToBasket = (itemName: string, itemPrice: number, configStr: string, dimStr: string, category: BasketItem['category']) => {
        const newItem: BasketItem = {
            id: crypto.randomUUID(),
            category,
            name: itemName,
            config: configStr,
            dimensions: dimStr,
            price: itemPrice,
            quantity: 1
        };
        setBasket(prev => [...prev, newItem]);
        toast.success(`Hinzugefügt: ${itemName}`);
    };

    const handleAddRoofToBasket = () => {
        if (!totalPrice) return;

        let configStr: string;
        
        if (isPergolaLuxeModel(model)) {
            // Pergola Luxe detailed config string for German offer
            const colorName = PERGOLA_LUXE_COLORS.find(c => c.id === pergolaLuxeColor)?.name || pergolaLuxeColor;
            if (model === 'Pergola Luxe Electric') {
                configStr = `Bioklimatische Pergola (elektrisch), Motorisierte Lamellen mit Fernbedienung (Somfy Motor), integrierte LED-Beleuchtung, Aluminium-Konstruktion 100x100mm, ${colorName}, Freistehend`;
            } else {
                const ledStr = pergolaLuxeLed ? ', LED-Beleuchtung integriert' : '';
                configStr = `Bioklimatische Pergola (manuell), Manuell verstellbare Lamellen, Aluminium-Konstruktion 100x100mm${ledStr}, ${colorName}, Freistehend`;
            }
            if (structureNote) configStr += ` (${structureNote})`;
        } else {
            const glassVarList = isTerandaModel(model) ? TERANDA_GLASS_VARIANTS : GLASS_VARIANTS;
            const polyVarList = isTerandaModel(model) ? TERANDA_POLY_VARIANTS : POLY_VARIANTS;
            const variantName = cover === 'Glass'
                ? glassVarList.find(v => v.id === glassVariant)?.name || glassVariant
                : polyVarList.find(v => v.id === polyVariant)?.name || polyVariant;
            const displayZone = isTerandaModel(model) ? 2 : zone;
            configStr = `${cover} (${variantName})${variantSurchargePrice > 0 ? ` +${formatCurrency(variantSurchargePrice)}` : ''}, Zone ${displayZone}, ${construction === 'wall' ? 'Wandmontage' : 'Freistehend'}` +
                (freestandingSurchargePrice > 0 ? ` (+${formatCurrency(freestandingSurchargePrice)})` : '') +
                (construction === 'freestanding' && includeFoundations ? ' + Fundamente' : '') +
                (sonderfarben ? ` | Sonderfarben +20% (+${formatCurrency(sonderfarbenSurcharge)})` : '') +
                (schiebeeinheitCount > 0 ? ` | Schiebeeinheit: ${schiebeeinheitCount}x (+${formatCurrency(schiebeeinheitTotalPrice)})` : '') +
                (extraPosts > 0 ? ` | Zusatzpfosten: ${extraPosts}x ${extraPostHeight}mm (+${formatCurrency(extraPostTotalPrice)})` : '') +
                (materialBOM ? ` | Material: +${formatCurrency(materialBOM.total)}` : '') +
                (structureNote ? ` (${structureNote})` : '');
        }
        const roofDisplayName = ROOF_MODELS.find(m => m.id === model)?.name || model;
        addToBasket(roofDisplayName, totalPrice, configStr, `${width}x${projection}mm`, 'roof');

        // Auto-add selected Pergola Luxe accessories as separate basket items
        if (isPergolaLuxeModel(model)) {
            const accItems = Object.entries(pergolaLuxeAccQty)
                .filter(([_, qty]) => qty > 0)
                .map(([accId, qty]) => {
                    const acc = PERGOLA_LUXE_ACCESSORIES.find(a => a.id === accId)!;
                    return {
                        id: crypto.randomUUID(),
                        category: 'accessory' as const,
                        name: acc.nameDE,
                        config: `${qty} x ${formatCurrency(acc.priceEUR)} (${acc.description})`,
                        dimensions: acc.size,
                        price: acc.priceEUR * qty,
                        quantity: qty
                    };
                });
            if (accItems.length > 0) {
                setBasket(prev => [...prev, ...accItems]);
            }
            // Reset accessory quantities
            setPergolaLuxeAccQty({});
        }
    };

    const handleAddAccessoryBatch = () => {
        const items = Object.entries(accessoryQuantities)
            .filter(([_, qty]) => qty > 0)
            .map(([id, qty]) => {
                const acc = accessories.find(a => a.id === id)!;
                return {
                    id: crypto.randomUUID(),
                    category: 'accessory' as const,
                    name: acc.name,
                    config: `${qty} x ${formatCurrency(acc.price)}`,
                    dimensions: '',
                    price: acc.price * qty,
                    quantity: qty
                };
            });

        if (items.length === 0) {
            toast.error('Wybierz dodatki');
            return;
        }
        setBasket(prev => [...prev, ...items]);
        setAccessoryQuantities({});
        toast.success(`${items.length} Zubehörteile hinzugefügt`);
    };

    const basketTotal = useMemo(() => basket.reduce((sum, item) => sum + item.price, 0), [basket]);

    // === PFAND (packaging deposits) — internal only, not shown to customer ===
    const pfandTotal = useMemo(() => {
        let total = 0;
        for (const item of basket) {
            if (item.category === 'roof') {
                total += PFAND_RATES.roof_palette + PFAND_RATES.roof_glass_crate;
            } else if (item.name.includes('Panorama') || item.category === 'panorama') {
                total += PFAND_RATES.panorama_crate;
            } else if (item.name.includes('Keilfenster') || item.name.includes('Wedge')) {
                total += PFAND_RATES.keilfenster_crate;
            } else if (item.name.includes('Markise') || item.name.includes('markise')) {
                total += PFAND_RATES.markise_palette;
            } else if (item.name.includes('Schiebetür')) {
                total += PFAND_RATES.schiebetuer_crate;
            }
        }
        return total;
    }, [basket]);

    const removeFromBasket = (itemId: string) => {
        setBasket(prev => prev.filter(item => item.id !== itemId));
        toast.success('Entfernt');
    };


    // === CUSTOMER HANDLER ===
    const handleCustomerComplete = (data: Customer, snowZoneData: any) => {
        setCustomerState(data);

        // Map snow zone if provided
        if (snowZoneData && snowZoneData.value) {
            const zoneId = parseInt(snowZoneData.id);
            if (!isNaN(zoneId)) {
                setZone(zoneId);
            }
        }

        setView('mode-select'); // Go to mode selection (calculator vs manual)
    };



    // === CALCULATED SUMMARY VALUES ===
    const customItemsTotal = customItems.reduce((sum, item) => sum + item.price, 0);
    const subtotal = basketTotal + customItemsTotal;

    // Step 1: Apply purchase discount (this is the cost price after your discount from supplier)
    const purchaseDiscountValue = subtotal * (purchaseDiscount / 100);
    const purchasePrice = subtotal - purchaseDiscountValue;

    // Internal costs (not shown to customer, but factored into true purchase cost)
    // Teranda: transport and pfand are free (included in Excel price)
    const terandaDisplayNames = ROOF_MODELS.filter(m => isTerandaModel(m.id)).map(m => m.name);
    const hasTerandaInBasket = basket.some(item => terandaDisplayNames.includes(item.name));
    const isTerandaOnlyBasket = basket.length > 0 && basket.every(item => terandaDisplayNames.includes(item.name));
    const effectiveTransport = isTerandaOnlyBasket ? 0 : TRANSPORT_COST;
    const effectivePfand = isTerandaOnlyBasket ? 0 : pfandTotal;
    const internalCosts = effectivePfand + effectiveTransport;
    const totalPurchaseCostInternal = purchasePrice + internalCosts; // True cost to company

    // Step 2: Apply margin on top of purchase price (margin covers product + pfand + transport)
    const marginValue = totalPurchaseCostInternal * (margin / 100);
    const priceAfterMargin = totalPurchaseCostInternal + marginValue;

    // Step 3: Apply customer discount (manual discount given to customer)
    const discountValue = priceAfterMargin * (discount / 100);
    const priceAfterDiscount = priceAfterMargin - discountValue;

    // Step 4: Add montage price (netto, not affected by margin/discount)
    const finalPrice = priceAfterDiscount + montagePrice;

    // === SAVE OFFER HANDLER ===
    const handleSaveOffer = async (): Promise<Offer | null> => {
        if (!currentUser) {
            toast.error('Bitte einloggen');
            return null;
        }
        // In manual mode, check customItems instead of basket
        if (!isManualMode && basket.length === 0) {
            toast.error('Keine Positionen vorhanden');
            return null;
        }
        if (isManualMode && customItems.length === 0) {
            toast.error('Bitte mindestens eine Position hinzufügen');
            return null;
        }
        // Validation using customerState
        if (!customerState || (!customerState.name && !customerState.lastName && !customerState.firstName)) {
            toast.error('Kundendaten fehlen');
            return null;
        }

        setSavingOffer(true);
        try {
            // 1. Prepare customer data from customerState
            // Ensure we have a valid structure for the DB service
            // customerState comes from CustomerForm which has correct fields
            const customerData = {
                firstName: customerState.firstName || '',
                lastName: customerState.lastName || customerState.name || '',
                email: customerState.email,
                phone: customerState.phone,
                address: customerState.street ? `${customerState.street} ${customerState.houseNumber || ''}, ${customerState.postalCode || ''} ${customerState.city || ''}` : customerState.address,
                street: customerState.street,
                houseNumber: customerState.houseNumber,
                postalCode: customerState.postalCode,
                city: customerState.city,
                name: customerState.name || `${customerState.firstName || ''} ${customerState.lastName || ''}`,
                companyName: customerState.companyName || '',
                salutation: customerState.salutation || 'Herr'
            };

            // 2. Reuse existing lead or create new one (NEVER duplicate)
            let lead: any;

            // If we came from a lead page, use that lead directly
            if (linkedLeadIdRef.current) {
                const { data: linkedLead } = await supabase
                    .from('leads')
                    .select('*')
                    .eq('id', linkedLeadIdRef.current)
                    .single();
                if (linkedLead) {
                    lead = linkedLead;
                    if (lead.status !== 'won' && lead.status !== 'lost') {
                        await LeadService.updateLead(lead.id, { status: 'offer_sent' as any });
                    }
                }
            }

            if (!lead && customerState.id) {
                // Customer already exists — check for existing lead
                const existingLeads = await LeadService.getCustomerLeads(customerState.id);
                if (existingLeads && existingLeads.length > 0) {
                    // Reuse the most recent lead — just update its status
                    lead = existingLeads[0];
                    // Update lead status to offer_sent if it's not already won/lost
                    if (lead.status !== 'won' && lead.status !== 'lost') {
                        await LeadService.updateLead(lead.id, { status: 'offer_sent' as any });
                    }
                }
            }
            // Also search by email/phone if no lead found yet (de-duplication)
            if (!lead && customerData.email) {
                const { data: emailLeads } = await supabase
                    .from('leads')
                    .select('*')
                    .contains('customer_data', { email: customerData.email })
                    .order('created_at', { ascending: false })
                    .limit(1);
                if (emailLeads && emailLeads.length > 0) {
                    lead = emailLeads[0];
                    if (lead.status !== 'won' && lead.status !== 'lost') {
                        await LeadService.updateLead(lead.id, { status: 'offer_sent' as any });
                    }
                }
            }
            if (!lead) {
                // No existing lead found — create a new one
                lead = await DatabaseService.createLead({
                    status: 'offer_sent',
                    source: 'calculator_v2',
                    customerData: customerData,
                    customerId: customerState.id,
                    notes: `Konfiguracja V2: ${basket.map(b => b.name).join(', ')}`
                });
            }

            const selectedModel = isManualMode ? manualModel : model;
            const selectedModelConfig = ROOF_MODELS.find(m => m.id === selectedModel);

            const productConfig = {
                modelId: selectedModel,
                isManual: isManualMode,
                width: isManualMode ? (parseInt(manualWidth) || 0) : width,
                projection: isManualMode ? (parseInt(manualDepth) || 0) : projection,
                roofType: isManualMode ? 'manual' as any : cover.toLowerCase() as any,
                construction: isManualMode ? 'wall' as any : construction,
                color: isManualMode ? '' : color,
                variant: isManualMode ? '' : (cover === 'Glass' ? glassVariant : polyVariant),
                // Include model image URL for interactive offer
                imageUrl: selectedModelConfig?.image_url || `/images/models/${selectedModel.toLowerCase().replace(/\s+/g, '-').replace(/\+/g, '-plus')}.jpg`,
                // Main items from V2 basket (empty in manual mode)
                items: isManualMode ? [] : basket.map(b => ({ name: b.name, config: b.config, dimensions: b.dimensions, price: b.price })),
                // Custom items — primary content in manual mode, supplementary in standard mode
                customItems: customItems.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: 1,
                    description: isManualMode ? 'Manuelle Angebotsposition' : 'Manuelle Position',
                })),
                // Dachrechner technical data
                dachrechnerData: dachrechnerResults ? {
                    h3: dachH3,
                    h1: dachH1,
                    angleAlpha: dachrechnerResults.angleAlpha,
                    angleBeta: dachrechnerResults.angleBeta,
                    inclinationMmM: dachrechnerResults.inclinationMmM,
                    heightH2: dachrechnerResults.heightH2,
                    depthD1: dachrechnerResults.depthD1,
                    depthD2: dachrechnerResults.depthD2,
                    depthD2alt: dachrechnerResults.depthD2alt,
                    depthD4post: dachrechnerResults.depthD4post,
                    depthD5: dachrechnerResults.depthD5,
                    fensterF1: dachrechnerResults.fensterF1,
                    fensterF2: dachrechnerResults.fensterF2,
                    fensterF3: dachrechnerResults.fensterF3,
                    keilhoeheK1: dachrechnerResults.keilhoeheK1,
                    keilhoeheK2: dachrechnerResults.keilhoeheK2,
                    sparrenMitte: dachrechnerResults.sparrenMitte,
                    sparrenAussen: dachrechnerResults.sparrenAussen,
                } : null,
                postWidth: ({ 'Orangeline': 110, 'Orangeline+': 110, 'Trendline': 110, 'Trendline+': 110, 'Topline': 149, 'Topline XL': 196, 'Designline': 196, 'Ultraline': 196, 'Skyline': 160, 'Carport': 160 } as Record<string, number>)[selectedModel] || null,
            };

            // 4. Build pricing object
            const manualInstallation = isManualMode ? (parseFloat(manualInstallationCost) || 0) : 0;
            const installationTotal = isManualMode ? manualInstallation : montagePrice;
            // PL VAT: 8% with installation (usługa budowlana), 23% without (materiał)
            const plVatRate = installationTotal > 0 ? 1.08 : 1.23;
            const pricing = {
                basePrice: basketTotal, // Base sum of basket components
                addonsPrice: 0,
                customItemsPrice: customItemsTotal, // Separate custom items sum
                marginPercentage: margin,
                marginValue: marginValue,
                discountPercentage: discount,
                discountValue: discountValue,
                sellingPriceNet: isPL ? finalPrice * eurRate : finalPrice,
                sellingPriceGross: isPL ? finalPrice * eurRate * plVatRate : finalPrice * 1.19,
                totalCost: isPL ? finalPrice * eurRate * plVatRate : finalPrice * 1.19,
                currency: isPL ? 'PLN' : 'EUR',
                vatRate: isPL ? plVatRate : 1.19,
                installationCosts: installationTotal > 0 ? {
                    totalInstallation: installationTotal,
                    installationBase: installationTotal,
                    transportCost: 0
                } : undefined
            };

            // 5. Create Offer
            const offer = await DatabaseService.createOffer({
                offerNumber: `V2-${Date.now()}`,
                customer: customerData as Customer,
                product: productConfig as any, // Cast for flexibility with V2 custom types
                pricing: pricing,
                status: 'draft',
                snowZone: { id: '1', value: 0.85, description: 'Zone 1' },
                commission: 0,
                leadId: lead.id
            });

            // 6. Generate public link
            // 6. Generate public link
            const token = await DatabaseService.ensurePublicToken(offer.id);
            const link = `${window.location.origin}/p/offer/${token}`;
            setPublicLink(link);
            setSavedOfferId(offer.id);
            setSavedOffer(offer); // Store full offer for PDF generation
            savedOfferRef.current = offer; // Immediately available (no React batching delay)

            toast.success('Oferta zapisana!');
            return offer;
        } catch (e: any) {
            console.error('Save offer error:', e);
            toast.error(e.message || 'Fehler beim Speichern');
            return null;
        } finally {
            setSavingOffer(false);
        }
    };

    // === FINAL SUMMARY VIEW ===
    if (view === 'summary') {
        const handleAddCustomItem = () => {
            if (!newItemName.trim()) return;
            const price = parseFloat(newItemPrice) || 0;
            setCustomItems([...customItems, {
                id: `custom-${Date.now()}`,
                name: newItemName.trim(),
                price
            }]);
            setNewItemName('');
            setNewItemPrice('');
        };

        const handleRemoveCustomItem = (id: string) => {
            setCustomItems(customItems.filter(item => item.id !== id));
        };



        // buildPDFData — prepares data for customer-facing PDF offer.
        // CRITICAL: positions must show CUSTOMER SALE PRICES, not our internal purchase prices.
        // The sale price per position = proportional share of the final price (before montage/discount).
        const buildPDFData = () => {
            // priceAfterMargin = what the customer pays for products (before discount, before montage)
            // subtotal = sum of basket catalog prices
            // We scale each position proportionally to distribute priceAfterMargin across items
            const saleMultiplier = subtotal > 0
                ? (priceAfterMargin) / subtotal
                : 1;

            const positions = [
                ...basket.map(b => ({
                    name: b.name,
                    description: b.config,
                    dimensions: b.dimensions || '',
                    price: Math.round(b.price * saleMultiplier * 100) / 100
                })),
                ...customItems.map(ci => ({
                    name: ci.name,
                    description: 'Manuelle Position',
                    dimensions: '',
                    price: Math.round(ci.price * saleMultiplier * 100) / 100
                }))
            ];

            // Recalculate sums from scaled positions
            const pdfSubtotal = positions.reduce((s, p) => s + p.price, 0);
            const pdfDiscountValue = pdfSubtotal * (discount / 100);
            const pdfNetAfterDiscount = pdfSubtotal - pdfDiscountValue;
            const pdfFinalNet = pdfNetAfterDiscount + montagePrice;

            return {
                customer: {
                    salutation: customerState?.salutation || '',
                    firstName: customerState?.firstName || '',
                    lastName: customerState?.lastName || customerState?.name || '',
                    companyName: customerState?.companyName || '',
                    street: customerState?.street || '',
                    houseNumber: customerState?.houseNumber || '',
                    postalCode: customerState?.postalCode || '',
                    city: customerState?.city || '',
                    phone: customerState?.phone || '',
                    email: customerState?.email || ''
                },
                technical: isManualMode ? undefined : {
                    model: ROOF_MODELS.find(m => m.id === model)?.name || model,
                    width,
                    projection,
                    cover,
                    variant: cover === 'Glass'
                        ? (GLASS_VARIANTS.find(v => v.id === glassVariant)?.name || glassVariant)
                        : (POLY_VARIANTS.find(v => v.id === polyVariant)?.name || polyVariant),
                    construction,
                    color,
                    postsCount: structuralMetadata?.posts_count,
                    extraPosts,
                    extraPostHeight,
                    rafterType: structuralMetadata?.rafter_type,
                    fieldsCount: structuralMetadata?.fields_count,
                    pfostenDim: PROFILE_SPECS[model]?.pfosten,
                    sparrenDim: structuralMetadata?.rafter_type && PROFILE_SPECS[model]
                        ? PROFILE_SPECS[model].sparrenTypes.find(s => s.type === structuralMetadata.rafter_type)?.dim
                            || PROFILE_SPECS[model].sparrenTypes[0]?.dim
                        : PROFILE_SPECS[model]?.sparrenTypes[0]?.dim,
                },
                positions,
                pricing: {
                    subtotal: pdfSubtotal,
                    marginPercent: 0, // margin is already baked into position prices
                    marginValue: 0,
                    discountPercent: discount,
                    discountValue: pdfDiscountValue,
                    montagePrice,
                    extraPostTotal: 0, // already in positions
                    finalPriceNet: pdfFinalNet,
                    finalPriceGross: pdfFinalNet * 1.19,
                    ...(isPL ? { currency: 'PLN', eurRate, finalPriceNetPLN: pdfFinalNet * eurRate, finalPriceGrossPLN8: pdfFinalNet * eurRate * 1.08, finalPriceGrossPLN23: pdfFinalNet * eurRate * 1.23 } : { currency: 'EUR' })
                },
                offerNumber: savedOffer?.offerNumber || `V2-${Date.now()}`,
                offerDate: new Date().toLocaleDateString('de-DE'),
                salesPerson: currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : undefined,
                ...(isPL ? { currency: 'PLN', eurRate } : {})
            };
        };



        const handleGeneratePDF = () => {
            generateOfferPDF(buildPDFData());
            toast.success('PDF wurde erstellt');
        };

        return (
            <>
                <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
                    <div className="max-w-4xl mx-auto space-y-6">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => setView(isManualMode ? 'manual' : 'config')}
                                className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
                            >
                                ← {isManualMode ? 'Zurück zur manuellen Eingabe' : 'Zurück zur Konfiguration'}
                            </button>
                            <h1 className="text-2xl font-black text-slate-900">Angebotszusammenfassung</h1>
                        </div>

                        {/* Technical Specs — hidden in manual mode */}
                        {!isManualMode ? (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5">{IC.compass('w-4 h-4')} Technische Daten</span>
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div className="bg-slate-50 p-3 rounded-lg text-center">
                                        <p className="text-slate-500 text-xs uppercase">Breite</p>
                                        <p className="font-bold text-lg">{(width / 1000).toFixed(2)} m</p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-lg text-center">
                                        <p className="text-slate-500 text-xs uppercase">Tiefe</p>
                                        <p className="font-bold text-lg">{(projection / 1000).toFixed(2)} m</p>
                                    </div>
                                    <div className="bg-indigo-50 p-3 rounded-lg text-center border border-indigo-200">
                                        <p className="text-indigo-600 text-xs uppercase font-bold">Fläche</p>
                                        <p className="font-black text-xl text-indigo-700">{areaM2.toFixed(2)} m²</p>
                                    </div>
                                    <div className="bg-amber-50 p-3 rounded-lg text-center border border-amber-200">
                                        <p className="text-amber-600 text-xs uppercase font-bold">Pfosten</p>
                                        <p className="font-black text-xl text-amber-700">{structuralMetadata?.posts_count || '-'}</p>
                                    </div>
                                </div>
                                <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                                    <div><span className="text-slate-500">Modell:</span> <strong>{ROOF_MODELS.find(m => m.id === model)?.name || model}</strong></div>
                                    <div><span className="text-slate-500">Dachtyp:</span> <strong>{cover}</strong></div>
                                    <div><span className="text-slate-500">Bauweise:</span> <strong>{construction === 'wall' ? 'Wandmontage' : 'Freistehend'}</strong></div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5">{IC.clipboard('w-5 h-5')} Manuelles Angebot</span>
                                </h2>
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-xl bg-indigo-50 flex items-center justify-center overflow-hidden border border-indigo-100">
                                        <img
                                            src={ROOF_MODELS.find(m => m.id === manualModel)?.image_url || '/images/models/trendline.jpg'}
                                            alt={manualModel}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs uppercase">Ausgewähltes Modell</p>
                                        <p className="font-bold text-xl text-slate-800">{manualModel}</p>
                                        <p className="text-xs text-slate-400">{ROOF_MODELS.find(m => m.id === manualModel)?.description || ''}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Customer Info (REFRESHED) */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative">
                            <div className="flex justify-between items-start">
                                <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5">{IC.roof('w-5 h-5')} Kundendaten</span>
                                </h2>
                                <button
                                    onClick={() => setView('customer')}
                                    className="text-xs text-indigo-600 font-bold hover:underline"
                                >
                                    Bearbeiten
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-slate-500 block">Name:</span>
                                    <strong className="text-slate-800">
                                        {customerState ? (customerState.firstName ? `${customerState.firstName} ${customerState.lastName}` : customerState.name) : '-'}
                                    </strong>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">E-Mail:</span>
                                    <strong className="text-slate-800">{customerState?.email || '-'}</strong>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">Telefon:</span>
                                    <strong className="text-slate-800">{customerState?.phone || '-'}</strong>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">Adresse:</span>
                                    <strong className="text-slate-800">
                                        {[customerState?.street, customerState?.postalCode, customerState?.city].filter(Boolean).join(', ') || '-'}
                                    </strong>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">{IC.cart('w-5 h-5')} Positionen</h2>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="text-left py-2 text-slate-500">Produkt</th>
                                        <th className="text-left py-2 text-slate-500">Konfiguration</th>
                                        <th className="text-right py-2 text-slate-500">Preis</th>
                                        <th className="w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {basket.map((item) => (
                                        <tr key={item.id} className="border-b border-slate-50 last:border-0">
                                            <td className="py-3 font-medium">{item.name}</td>
                                            <td className="py-3 text-slate-600 text-xs max-w-[200px]">
                                                <div className="truncate">{item.config}</div>
                                                {item.dimensions && (
                                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">{IC.measure('w-3 h-3')} {item.dimensions}</div>
                                                )}
                                            </td>
                                            <td className="py-3 text-right font-bold">{formatCurrency(item.price)}</td>
                                            <td className="py-3 text-center">
                                                <button
                                                    onClick={() => removeFromBasket(item.id)}
                                                    className="text-red-500 hover:text-red-700 text-xs p-1 hover:bg-red-50 rounded"
                                                    title="Entfernen"
                                                >
                                                    ✕
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {customItems.map((item) => (
                                        <tr key={item.id} className="border-b border-slate-50 last:border-0 bg-blue-50">
                                            <td className="py-3 font-medium text-blue-700"><span className="inline-flex items-center gap-1">{IC.clipboard('w-3.5 h-3.5')} {item.name}</span></td>
                                            <td className="py-3 text-slate-600 text-xs">Manuell hinzugefügt</td>
                                            <td className="py-3 text-right font-bold">{formatCurrency(item.price)}</td>
                                            <td className="py-3 text-center">
                                                <button
                                                    onClick={() => handleRemoveCustomItem(item.id)}
                                                    className="text-red-500 hover:text-red-700 text-xs"
                                                >
                                                    ✕
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    {montagePrice > 0 && (
                                        <tr className="border-t border-slate-100 bg-blue-50">
                                            <td className="py-3 font-medium text-blue-700"><span className="inline-flex items-center gap-1">{IC.wrench('w-3.5 h-3.5')} Montage</span></td>
                                            <td className="py-3 text-slate-600 text-xs">Montagekosten (netto, ohne Aufschlag)</td>
                                            <td className="py-3 text-right font-bold text-blue-700">{formatCurrency(montagePrice)}</td>
                                            <td></td>
                                        </tr>
                                    )}
                                    {extraPostTotalPrice > 0 && (
                                        <tr className="border-t border-slate-100 bg-amber-50">
                                            <td className="py-3 font-medium text-amber-700"><span className="inline-flex items-center gap-1">{IC.build('w-4 h-4')} Zusatzpfosten</span></td>
                                            <td className="py-3 text-slate-600 text-xs">
                                                {extraPosts > 0 && `${extraPosts}× Zusatzpfosten`}
                                                {extraPostHeight === 3000 && ` + Höhenaufschlag 3000mm (${totalPostCount} Pfosten)`}
                                            </td>
                                            <td className="py-3 text-right font-bold text-amber-700">{formatCurrency(extraPostTotalPrice)}</td>
                                            <td></td>
                                        </tr>
                                    )}
                                    <tr className="border-t-2 border-slate-200">
                                        <td colSpan={2} className="py-3 font-bold">Zwischensumme</td>
                                        <td className="py-3 text-right font-bold">{formatCurrency(subtotal)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>

                            {/* Add Custom Item */}
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Position hinzufügen</p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newItemName}
                                        onChange={e => setNewItemName(e.target.value)}
                                        placeholder="Beschreibung..."
                                        className="flex-1 p-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                                    />
                                    <input
                                        type="number"
                                        value={newItemPrice}
                                        onChange={e => setNewItemPrice(e.target.value)}
                                        placeholder="Preis €"
                                        className="w-32 p-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm text-right"
                                    />
                                    <button
                                        onClick={handleAddCustomItem}
                                        disabled={!newItemName.trim()}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-sm disabled:opacity-50"
                                    >
                                        + Hinzufügen
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Margin & Discount */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">{IC.compass('w-5 h-5')} Marge & Rabatt</h2>

                            {/* Purchase Discount Info (from Admin) */}
                            {purchaseDiscount > 0 && (
                                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-green-700 inline-flex items-center gap-1">{IC.check('w-3.5 h-3.5')} Einkaufsrabatt (Admin):</span>
                                        <span className="font-bold text-green-800">{purchaseDiscount}%</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1 text-xs text-green-600">
                                        <span>Einkaufspreis (Produkte):</span>
                                        <span className="font-bold">{formatCurrency(purchasePrice)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Internal Costs: Pfand + Transport — visible only to sales rep */}
                            {subtotal > 0 && (
                                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <p className="text-xs font-bold text-amber-700 uppercase mb-2 flex items-center gap-1">{IC.cart('w-3.5 h-3.5')} Interne Kosten (nicht auf dem Angebot sichtbar)</p>
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center text-sm text-amber-800">
                                            <span>Pfand (Verpackungspfand):</span>
                                            <span className="font-bold">{formatCurrency(effectivePfand)}{isTerandaOnlyBasket ? ' (inkl.)' : ''}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm text-amber-800">
                                            <span>Transport:</span>
                                            <span className="font-bold">{formatCurrency(effectiveTransport)}{isTerandaOnlyBasket ? ' (inkl.)' : ''}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm font-bold text-amber-900 pt-1 border-t border-amber-200">
                                            <span>Gesamte Einkaufskosten:</span>
                                            <span>{formatCurrency(totalPurchaseCostInternal)}</span>
                                        </div>
                                    </div>
                                    {/* Profit display */}
                                    {finalPrice > 0 && (
                                        <div className="mt-2 pt-2 border-t border-amber-300">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-amber-800">Verkaufspreis (netto):</span>
                                                <span className="font-bold text-amber-900">{formatCurrency(finalPrice)}</span>
                                            </div>
                                            <div className={`flex justify-between items-center text-sm font-bold mt-1 ${(finalPrice - totalPurchaseCostInternal - montagePrice) > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                                <span className="inline-flex items-center gap-1">{IC.compass('w-3.5 h-3.5')} Rohertrag:</span>
                                                <span>{formatCurrency(finalPrice - totalPurchaseCostInternal - montagePrice)} ({totalPurchaseCostInternal > 0 ? (((finalPrice - totalPurchaseCostInternal - montagePrice) / totalPurchaseCostInternal) * 100).toFixed(1) : 0}%)</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Marge (%)</label>
                                    <input
                                        type="number"
                                        value={margin}
                                        onChange={e => setMargin(parseFloat(e.target.value) || 0)}
                                        min={0}
                                        max={100}
                                        className="w-full p-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-lg font-bold"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">+ {formatCurrency(marginValue)}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Rabat (%)</label>
                                    <input
                                        type="number"
                                        value={discount}
                                        onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                                        min={0}
                                        max={100}
                                        className="w-full p-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-lg font-bold"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">- {formatCurrency(discountValue)}</p>
                                </div>
                            </div>

                            {/* MONTAGE PRICE */}
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block flex items-center gap-1">{IC.wrench('w-3 h-3')} Montage (netto)</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        value={montagePrice || ''}
                                        onChange={e => setMontagePrice(parseFloat(e.target.value) || 0)}
                                        min={0}
                                        step={100}
                                        placeholder="0.00"
                                        className="w-full p-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-lg font-bold"
                                    />
                                    <span className="text-slate-500 font-bold text-lg flex-shrink-0">€ netto</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">Wird zum Endpreis addiert (keine Marge/Rabatt)</p>
                            </div>
                        </div>

                        {/* Final Price */}
                        <div className={`rounded-2xl shadow-lg p-6 text-white ${isPL ? 'bg-gradient-to-r from-red-600 to-red-700' : 'bg-gradient-to-r from-indigo-600 to-purple-600'}`}>
                            <div className="flex justify-between items-center">
                                <div>
                                    {isPL ? (
                                        <>
                                            <p className="text-red-200 text-sm">Cena końcowa (netto)</p>
                                            <p className="text-4xl font-black">{(finalPrice * eurRate).toFixed(2)} PLN</p>
                                            {montagePrice > 0 && <p className="text-red-200 text-xs">w tym montaż: {(montagePrice * eurRate).toFixed(2)} PLN</p>}
                                            {montagePrice > 0 ? (
                                                <>
                                                    <p className="text-white text-sm font-bold mt-1">✓ brutto (8% VAT z montażem) = {(finalPrice * eurRate * 1.08).toFixed(2)} PLN</p>
                                                    <p className="text-red-300/50 text-xs line-through">bez montażu (23% VAT) = {(finalPrice * eurRate * 1.23).toFixed(2)} PLN</p>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="text-white text-sm font-bold mt-1">✓ brutto (23% VAT) = {(finalPrice * eurRate * 1.23).toFixed(2)} PLN</p>
                                                    <p className="text-red-300/50 text-xs">z montażem byłoby: 8% VAT = {(finalPrice * eurRate * 1.08).toFixed(2)} PLN</p>
                                                </>
                                            )}
                                            <p className="text-red-300 text-[10px] mt-2">Kurs: 1 EUR = {eurRate.toFixed(4)} PLN | EUR netto: {formatCurrency(finalPrice)}</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-indigo-200 text-sm">Endpreis (netto)</p>
                                            <p className="text-4xl font-black">{formatCurrency(finalPrice)}</p>
                                            {montagePrice > 0 && <p className="text-indigo-200 text-xs">inkl. Montage: {formatCurrency(montagePrice)}</p>}
                                            <p className="text-indigo-200 text-sm mt-1">z 19% VAT = {formatCurrency(finalPrice * 1.19)}</p>
                                        </>
                                    )}
                                </div>
                                {!isManualMode && (
                                    <div className="text-right">
                                        <p className={`text-xs ${isPL ? 'text-red-200' : 'text-indigo-200'}`}>Powierzchnia</p>
                                        <p className="text-2xl font-bold">{areaM2.toFixed(2)} m²</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Save Button or Success State */}
                        {savedOfferId ? (
                            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 space-y-4">
                                <div className="flex items-center gap-3 text-green-700">
                                    <span className="text-2xl">{IC.check('w-8 h-8')}</span>
                                    <div>
                                        <p className="font-bold">Angebot erfolgreich gespeichert!</p>
                                        <p className="text-xs text-green-600">ID: {savedOfferId}</p>
                                    </div>
                                </div>

                                {/* Public Link Section */}
                                {publicLink && (
                                    <div className="bg-white p-4 rounded-xl border border-green-100 space-y-2">
                                        <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                            <span className="inline-flex items-center gap-1.5">{IC.link('w-4 h-4')} Link zur interaktiven Angebotsseite</span>
                                        </p>
                                        <div className="flex gap-2">
                                            <input
                                                readOnly
                                                value={publicLink}
                                                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 outline-none"
                                                onClick={(e) => e.currentTarget.select()}
                                            />
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(publicLink);
                                                    toast.success('Link skopiowany!');
                                                }}
                                                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium text-sm"
                                            >
                                                Kopiuj
                                            </button>
                                            <a
                                                href={publicLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium text-sm flex items-center"
                                            >
                                                ↗️
                                            </a>
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={() => setShowSendEmailModal(true)}
                                        className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                                    >
                                        <span className="inline-flex items-center gap-1.5">{IC.link('w-4 h-4')} E-Mail senden</span>
                                    </button>
                                    <button
                                        onClick={handleGeneratePDF}
                                        className="px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50"
                                    >
                                        <span className="inline-flex items-center gap-1.5">{IC.clipboard('w-4 h-4')} PDF herunterladen</span>
                                    </button>
                                    <button
                                        onClick={() => navigate('/dashboard')}
                                        className="px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50"
                                    >
                                        Beenden
                                    </button>
                                </div>
                            </div>

                        ) : (
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={handleSaveOffer}
                                    disabled={savingOffer || (!isManualMode && basket.length === 0) || (isManualMode && customItems.length === 0)}
                                    className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${savingOffer || (!isManualMode && basket.length === 0) || (isManualMode && customItems.length === 0)
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg'
                                        }`}
                                >
                                    {savingOffer ? 'Speichern...' : <><span className="inline-flex items-center gap-1.5">{IC.check('w-4 h-4')} Angebot speichern</span></>}
                                </button>
                                <button
                                    onClick={() => setShowSendEmailModal(true)}
                                    disabled={(!isManualMode && basket.length === 0) || (isManualMode && customItems.length === 0)}
                                    className={`py-4 px-6 rounded-xl font-bold text-lg transition-all ${(!isManualMode && basket.length === 0) || (isManualMode && customItems.length === 0)
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                                        }`}
                                >
                                    <span className="inline-flex items-center gap-1.5">{IC.link('w-4 h-4')} E-Mail senden</span>
                                </button>
                            </div>
                        )}
                    </div >
                </div >
                {/* SendEmailModal must be inside summary return — because summary does early return! */}
                <SendEmailModal
                    isOpen={showSendEmailModal}
                    onClose={() => setShowSendEmailModal(false)}
                    to={customerState?.email || ''}
                    leadData={{
                        firstName: customerState?.firstName,
                        lastName: customerState?.lastName || customerState?.name,
                        companyName: customerState?.companyName,
                    }}
                    leadId={savedOfferRef.current?.leadId}
                    offer={savedOfferRef.current || undefined}
                />
            </>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
            {/* CUSTOMER VIEW — full width centered */}
            {view === 'customer' && (
                <div className="col-span-12 max-w-3xl mx-auto">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
                        <CustomerForm
                            onComplete={handleCustomerComplete}
                            submitLabel="Weiter"
                            initialData={customerState || undefined}
                        />
                    </div>
                </div>
            )}

            {/* MODE SELECTION VIEW — full width centered */}
            {view === 'mode-select' && (
                <div className="col-span-12 max-w-3xl mx-auto space-y-8">
                    <div className="text-center">
                        <h1 className="text-3xl font-black text-slate-900 mb-2">Angebotsart wählen</h1>
                        <p className="text-slate-500">Wie möchten Sie das Angebot erstellen?</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Standard Calculator */}
                        <button
                            onClick={() => { setIsManualMode(false); setView('config'); }}
                            className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-8 hover:border-indigo-400 hover:shadow-lg transition-all text-left group"
                        >
                            <div className="flex items-center justify-center mb-4">{IC.compass('w-12 h-12 text-indigo-400')}</div>
                            <h2 className="text-xl font-black text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">Kalkulator</h2>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Automatische Preisberechnung basierend auf Modell, Maßen und Konfiguration.
                                Ideal für Standardprodukte aus dem Aluxe-Sortiment.
                            </p>
                            <div className="mt-4 text-xs text-slate-400">Dach • Wände • Markisen • Zubehör</div>
                        </button>

                        {/* Manual Offer */}
                        <button
                            onClick={() => { setIsManualMode(true); setView('manual'); }}
                            className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-8 hover:border-emerald-400 hover:shadow-lg transition-all text-left group"
                        >
                            <div className="flex items-center justify-center mb-4">{IC.clipboard('w-12 h-12 text-slate-400')}</div>
                            <h2 className="text-xl font-black text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">Manuelles Angebot</h2>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Positionen frei eingeben mit Name und Preis.
                                Ideal für individuelle Angebote und Sonderanfertigungen.
                            </p>
                            <div className="mt-4 text-xs text-slate-400">Freie Eingabe • Flexibel • Schnell</div>
                        </button>
                    </div>
                    <div className="text-center">
                        <button
                            onClick={() => setView('customer')}
                            className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            ← Zurück zu Kundendaten
                        </button>
                    </div>
                </div>
            )}

            {/* MANUAL OFFER VIEW — full width centered */}
            {view === 'manual' && (
                <div className="col-span-12 max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setView('mode-select')}
                            className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
                        >
                            ← Zurück zur Auswahl
                        </button>
                        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">{IC.clipboard('w-7 h-7')} Manuelles Angebot</h1>
                    </div>

                    {/* Customer compact header */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                <span className="text-xl">{IC.roof('w-6 h-6')}</span>
                            </div>
                            <div>
                                <span className="font-bold text-slate-800 block">
                                    {customerState ? (customerState.firstName ? `${customerState.firstName} ${customerState.lastName}` : customerState.name) : 'Kein Kunde'}
                                </span>
                                <span className="text-xs text-slate-400">{customerState?.email || ''}</span>
                            </div>
                        </div>
                        <button onClick={() => setView('customer')} className="text-xs text-indigo-600 font-bold hover:underline">
                            Bearbeiten
                        </button>
                    </div>

                    {/* Model Selection */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5">{IC.roof('w-5 h-5')} Modell auswählen</span> <span className="text-xs text-red-500 font-normal">(erforderlich)</span>
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {ROOF_MODELS.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => setManualModel(m.id)}
                                    className={`p-3 rounded-xl border-2 text-center transition-all ${manualModel === m.id
                                        ? 'border-indigo-500 bg-indigo-50 shadow-md'
                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                >
                                    <div className="w-full h-16 rounded-lg overflow-hidden mb-2 bg-slate-100">
                                        <img
                                            src={m.image_url}
                                            alt={m.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    </div>
                                    <p className={`text-xs font-bold ${manualModel === m.id ? 'text-indigo-700' : 'text-slate-700'}`}>{m.name}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Dimensions (optional) */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5">{IC.measure('w-5 h-5')} Abmessungen</span> <span className="text-xs text-slate-400 font-normal">(optional — wird in der Kundenansicht angezeigt)</span>
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Breite (mm)</label>
                                <input
                                    type="number"
                                    value={manualWidth}
                                    onChange={e => setManualWidth(e.target.value)}
                                    placeholder="z.B. 5000"
                                    className="w-full p-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tiefe / Ausladung (mm)</label>
                                <input
                                    type="number"
                                    value={manualDepth}
                                    onChange={e => setManualDepth(e.target.value)}
                                    placeholder="z.B. 3000"
                                    className="w-full p-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5">{IC.clipboard('w-5 h-5')} Angebotspositionen</span>
                        </h2>

                        {customItems.length > 0 && (
                            <table className="w-full text-sm mb-4">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="text-left py-2 text-slate-500 w-8">#</th>
                                        <th className="text-left py-2 text-slate-500">Bezeichnung</th>
                                        <th className="text-right py-2 text-slate-500">Preis (netto)</th>
                                        <th className="w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customItems.map((item, index) => (
                                        <tr key={item.id} className="border-b border-slate-50 last:border-0">
                                            <td className="py-3 text-slate-400 text-xs">{index + 1}</td>
                                            <td className="py-3 font-medium text-slate-800">{item.name}</td>
                                            <td className="py-3 text-right font-bold text-slate-800">{formatCurrency(item.price)}</td>
                                            <td className="py-3 text-center">
                                                <button
                                                    onClick={() => setCustomItems(prev => prev.filter(i => i.id !== item.id))}
                                                    className="text-red-500 hover:text-red-700 text-xs p-1 hover:bg-red-50 rounded"
                                                >
                                                    ✕
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-slate-200">
                                        <td colSpan={2} className="py-3 font-bold text-slate-800">Summe</td>
                                        <td className="py-3 text-right font-black text-indigo-600">{formatCurrency(customItemsTotal)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        )}

                        {customItems.length === 0 && (
                            <div className="text-center py-8 text-slate-400">
                                <p className="text-3xl mb-2 flex items-center justify-center">{IC.clipboard('w-10 h-10 text-slate-400')}</p>
                                <p className="text-sm">Noch keine Positionen. Fügen Sie Ihre erste Position hinzu.</p>
                            </div>
                        )}

                        {/* Add Item */}
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Neue Position hinzufügen</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newItemName}
                                    onChange={e => setNewItemName(e.target.value)}
                                    placeholder="Positionsbezeichnung..."
                                    className="flex-1 p-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && newItemName.trim()) {
                                            const price = parseFloat(newItemPrice) || 0;
                                            setCustomItems(prev => [...prev, { id: `manual-${Date.now()}`, name: newItemName.trim(), price }]);
                                            setNewItemName('');
                                            setNewItemPrice('');
                                        }
                                    }}
                                />
                                <input
                                    type="number"
                                    value={newItemPrice}
                                    onChange={e => setNewItemPrice(e.target.value)}
                                    placeholder="Preis €"
                                    className="w-36 p-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm text-right"
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && newItemName.trim()) {
                                            const price = parseFloat(newItemPrice) || 0;
                                            setCustomItems(prev => [...prev, { id: `manual-${Date.now()}`, name: newItemName.trim(), price }]);
                                            setNewItemName('');
                                            setNewItemPrice('');
                                        }
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        if (!newItemName.trim()) return;
                                        const price = parseFloat(newItemPrice) || 0;
                                        setCustomItems(prev => [...prev, { id: `manual-${Date.now()}`, name: newItemName.trim(), price }]);
                                        setNewItemName('');
                                        setNewItemPrice('');
                                    }}
                                    disabled={!newItemName.trim()}
                                    className="px-5 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-sm disabled:opacity-50 transition-all"
                                >
                                    + Hinzufügen
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Installation Cost (optional) */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5">{IC.wrench('w-5 h-5')} Montagekosten</span> <span className="text-xs text-slate-400 font-normal">(optional — wird dem Kunden separat angezeigt)</span>
                        </h2>
                        <div className="max-w-xs">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Montage netto (€)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={manualInstallationCost}
                                    onChange={e => setManualInstallationCost(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full p-3 pr-12 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">€</div>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Wird in der Kundenansicht als separate Position "Fachmontage & Logistik" angezeigt.</p>
                        </div>
                    </div>

                    {/* Margin & Discount */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">{IC.compass('w-5 h-5')} Marge & Rabatt</h2>

                        {purchaseDiscount > 0 && (
                            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-green-700 inline-flex items-center gap-1">{IC.check('w-3.5 h-3.5')} Rabat zakupowy (Admin):</span>
                                    <span className="font-bold text-green-800">{purchaseDiscount}%</span>
                                </div>
                                <div className="flex justify-between items-center mt-1 text-xs text-green-600">
                                    <span>Einkaufspreis (Produkte):</span>
                                    <span className="font-bold">{formatCurrency(purchasePrice)}</span>
                                </div>
                            </div>
                        )}

                        {/* Internal Costs: Pfand + Transport */}
                        {subtotal > 0 && (
                            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-xs font-bold text-amber-700 uppercase mb-2 flex items-center gap-1">{IC.cart('w-3.5 h-3.5')} Koszty wewnętrzne (nie widoczne dla klienta)</p>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center text-sm text-amber-800">
                                        <span>Pfand:</span>
                                        <span className="font-bold">{formatCurrency(effectivePfand)}{isTerandaOnlyBasket ? ' (inkl.)' : ''}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm text-amber-800">
                                        <span>Transport:</span>
                                        <span className="font-bold">{formatCurrency(effectiveTransport)}{isTerandaOnlyBasket ? ' (inkl.)' : ''}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-bold text-amber-900 pt-1 border-t border-amber-200">
                                        <span>Einkaufskosten gesamt:</span>
                                        <span>{formatCurrency(totalPurchaseCostInternal)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Marge (%)</label>
                                <input
                                    type="number"
                                    value={margin}
                                    onChange={e => setMargin(parseFloat(e.target.value) || 0)}
                                    min={0}
                                    max={100}
                                    className="w-full p-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-lg font-bold"
                                />
                                <p className="text-xs text-slate-400 mt-1">+ {formatCurrency(marginValue)}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Rabatt (%)</label>
                                <input
                                    type="number"
                                    value={discount}
                                    onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                                    min={0}
                                    max={100}
                                    className="w-full p-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-lg font-bold"
                                />
                                <p className="text-xs text-slate-400 mt-1">- {formatCurrency(discountValue)}</p>
                            </div>
                        </div>

                        {/* Montage Price */}
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block flex items-center gap-1">{IC.wrench('w-3 h-3')} Montage (netto)</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    value={montagePrice || ''}
                                    onChange={e => setMontagePrice(parseFloat(e.target.value) || 0)}
                                    min={0}
                                    step={100}
                                    placeholder="0.00"
                                    className="w-full p-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-lg font-bold"
                                />
                                <span className="text-slate-500 font-bold text-lg flex-shrink-0">€ netto</span>
                            </div>
                        </div>
                    </div>

                    {/* Final Price Preview */}
                    <div className={`rounded-2xl shadow-lg p-6 text-white ${isPL ? 'bg-gradient-to-r from-red-600 to-red-700' : 'bg-gradient-to-r from-emerald-600 to-teal-600'}`}>
                        <div className="flex justify-between items-center">
                            <div>
                                {isPL ? (
                                    <>
                                        <p className="text-red-200 text-sm">Cena końcowa (netto)</p>
                                        <p className="text-4xl font-black">{(finalPrice * eurRate).toFixed(2)} PLN</p>
                                        {montagePrice > 0 && <p className="text-red-200 text-xs">w tym montaż: {(montagePrice * eurRate).toFixed(2)} PLN</p>}
                                        <p className="text-red-200 text-sm mt-1">z montażem (8% VAT) = {(finalPrice * eurRate * 1.08).toFixed(2)} PLN</p>
                                        <p className="text-red-200 text-sm">bez montażu (23% VAT) = {(finalPrice * eurRate * 1.23).toFixed(2)} PLN</p>
                                        <p className="text-red-300 text-[10px] mt-2">Kurs: 1 EUR = {eurRate.toFixed(4)} PLN | EUR netto: {formatCurrency(finalPrice)}</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-emerald-200 text-sm">Endpreis (netto)</p>
                                        <p className="text-4xl font-black">{formatCurrency(finalPrice)}</p>
                                        {montagePrice > 0 && <p className="text-emerald-200 text-xs">inkl. Montage: {formatCurrency(montagePrice)}</p>}
                                        <p className="text-emerald-200 text-sm mt-1">inkl. 19% MwSt. = {formatCurrency(finalPrice * 1.19)}</p>
                                    </>
                                )}
                            </div>
                            <div className="text-right">
                                <p className={`text-xs ${isPL ? 'text-red-200' : 'text-emerald-200'}`}>Positionen</p>
                                <p className="text-2xl font-bold">{customItems.length}</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={() => setView('summary')}
                        disabled={customItems.length === 0}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${customItems.length === 0
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg'
                            }`}
                    >
                        Weiter zur Zusammenfassung →
                    </button>
                </div>
            )}

            {/* CONFIG/SUMMARY VIEW */}
            {(view === 'config') && (
                <>
                    {/* LEFT COLUMN: Config */}
                    <div className="col-span-12 lg:col-span-9 space-y-8">
                        {/* Compact Customer Header (replacing the old expandable card) */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-8 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                    <span className="text-xl">{IC.roof('w-6 h-6')}</span>
                                </div>
                                <div>
                                    <span className="font-bold text-slate-800 block">
                                        {customerState ?
                                            (customerState.firstName ? `${customerState.firstName} ${customerState.lastName}` : customerState.lastName)
                                            : 'Wybrany Klient'}
                                    </span>
                                    <span className="text-xs text-slate-500 block">
                                        {customerState?.email} • {customerState?.phone}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setView('customer')}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                            >
                                Ändern
                            </button>
                        </div>

                        {/* Stepper */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 relative overflow-hidden">
                            <div className="flex justify-between items-center relative z-10">
                                {steps.map((step, index) => (
                                    <button
                                        key={step.id}
                                        onClick={() => setActiveStep(index)}
                                        className={`flex flex-col items-center gap-2 group transition-all ${index <= activeStep ? 'opacity-100' : 'opacity-50'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${index === activeStep ? 'border-indigo-600 bg-white text-indigo-600 shadow-md scale-110' :
                                            index < activeStep ? 'border-indigo-600 bg-indigo-600 text-white' :
                                                'border-slate-300 bg-white text-slate-400'
                                            }`}>
                                            {index < activeStep ? IC.check('w-4 h-4') : step.icon}
                                        </div>
                                        <span className={`text-xs font-bold ${index === activeStep ? 'text-indigo-900' : 'text-slate-500'}`}>
                                            {step.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                            {/* Progress Bar Container */}
                            <div className="absolute top-9 left-0 w-full h-0.5 bg-slate-200 z-0" />
                            <div
                                className="absolute top-9 left-0 h-0.5 bg-indigo-600 transition-all duration-300 z-0"
                                style={{ width: `${(activeStep / (steps.length - 1)) * 100}%` }}
                            />
                        </div>

                        {/* CONTENT */}

                        {/* LEAD CONTEXT PANEL — only when creating offer from lead */}
                        {linkedLeadIdRef.current && (leadConfig || leadNotes || leadCustomerData?.configuredModel) && (
                            <div className="bg-white rounded-2xl shadow-sm border border-indigo-200 overflow-hidden mb-6">
                                <button
                                    onClick={() => setContextOpen(!contextOpen)}
                                    className="w-full flex items-center justify-between px-5 py-3 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                                >
                                    <span className="text-sm font-bold text-indigo-700 flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1">{IC.clipboard('w-4 h-4')} Ściąga z leada</span>
                                        {leadConfig?.status === 'completed' && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px]">Formularz {IC.check('w-3 h-3')}</span>}
                                    </span>
                                    <svg className={`w-4 h-4 text-indigo-500 transition-transform ${contextOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {contextOpen && (
                                    <div className="px-5 py-4 space-y-4 text-sm">
                                        {/* Configuration from form */}
                                        {(leadConfig || leadCustomerData?.configuredModel) && (
                                            <div>
                                                <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-1">{IC.palette('w-4 h-4')} Konfiguracja klienta</h4>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                    {(leadConfig?.modelDisplayName || leadCustomerData?.configuredModel) && (
                                                        <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                                            <div className="text-[10px] text-slate-400 uppercase">Model</div>
                                                            <div className="font-bold text-slate-800">{leadConfig?.modelDisplayName || leadCustomerData?.configuredModel}</div>
                                                        </div>
                                                    )}
                                                    {(leadConfig?.width || leadCustomerData?.configuredWidth) && (
                                                        <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                                            <div className="text-[10px] text-slate-400 uppercase">Szerokość</div>
                                                            <div className="font-bold text-slate-800">{leadConfig?.width || leadCustomerData?.configuredWidth} mm</div>
                                                        </div>
                                                    )}
                                                    {(leadConfig?.projection || leadCustomerData?.configuredProjection) && (
                                                        <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                                            <div className="text-[10px] text-slate-400 uppercase">Wysięg</div>
                                                            <div className="font-bold text-slate-800">{leadConfig?.projection || leadCustomerData?.configuredProjection} mm</div>
                                                        </div>
                                                    )}
                                                    {(leadConfig?.mountingType || leadCustomerData?.configuredMounting) && (
                                                        <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                                            <div className="text-[10px] text-slate-400 uppercase">Montaż</div>
                                                            <div className="font-bold text-slate-800 capitalize">{leadConfig?.mountingType || leadCustomerData?.configuredMounting}</div>
                                                        </div>
                                                    )}
                                                    {(leadConfig?.color || leadCustomerData?.configuredColor) && (
                                                        <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                                            <div className="text-[10px] text-slate-400 uppercase">Kolor</div>
                                                            <div className="font-bold text-slate-800">{leadConfig?.color || leadCustomerData?.configuredColor}</div>
                                                        </div>
                                                    )}
                                                    {(leadConfig?.roofCovering || leadCustomerData?.configuredRoofCovering) && (
                                                        <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                                            <div className="text-[10px] text-slate-400 uppercase">Pokrycie</div>
                                                            <div className="font-bold text-slate-800">{leadConfig?.roofCovering || leadCustomerData?.configuredRoofCovering}</div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Extras */}
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {(leadConfig?.heater || leadCustomerData?.configuredHeater) && (
                                                        <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold border border-orange-200 inline-flex items-center gap-0.5">{IC.sun('w-3 h-3')} Grzejnik</span>
                                                    )}
                                                    {(leadConfig?.led || leadCustomerData?.configuredLed) && (
                                                        <span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded text-[10px] font-bold border border-yellow-200 inline-flex items-center gap-0.5">{IC.sun('w-3 h-3')} LED</span>
                                                    )}
                                                    {leadConfig?.glazingSides && Object.entries(leadConfig.glazingSides).filter(([, v]) => v).map(([side, type]) => (
                                                        <span key={side} className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded text-[10px] font-bold border border-sky-200 inline-flex items-center gap-0.5">{IC.square('w-3 h-3')} {side}: {type}</span>
                                                    ))}
                                                    {leadConfig?.zipScreen?.enabled && (
                                                        <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold border border-purple-200 inline-flex items-center gap-0.5">{IC.square('w-3 h-3')} ZipScreen</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Notes from form */}
                                        {(leadConfig?.notes || leadCustomerData?.configuredNotes) && (
                                            <div>
                                                <h4 className="font-bold text-slate-700 mb-1 flex items-center gap-1">{IC.clipboard('w-4 h-4')} Uwagi klienta (z formularza)</h4>
                                                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-slate-700 text-sm whitespace-pre-wrap">
                                                    {leadConfig?.notes || leadCustomerData?.configuredNotes}
                                                </div>
                                            </div>
                                        )}

                                        {/* Lead Notizen */}
                                        {leadNotes && (
                                            <div>
                                                <h4 className="font-bold text-slate-700 mb-1 flex items-center gap-1">{IC.clipboard('w-4 h-4')} Notizen</h4>
                                                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-slate-700 text-sm whitespace-pre-wrap">
                                                    {leadNotes}
                                                </div>
                                            </div>
                                        )}

                                        {/* Photos from form */}
                                        {leadConfig?.photos && leadConfig.photos.length > 0 && (
                                            <div>
                                                <h4 className="font-bold text-slate-700 mb-1 flex items-center gap-1">{IC.link('w-4 h-4')} Zdjęcia klienta</h4>
                                                <div className="flex gap-2 overflow-x-auto pb-1">
                                                    {leadConfig.photos.map((url, i) => (
                                                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                                            <img src={url} alt={`Foto ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-slate-200 hover:ring-2 ring-indigo-400 transition-all" />
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* STEP 0: MODEL */}
                        {activeStep === 0 && (
                            <div className="space-y-6">
                                {/* Terrassenüberdachungen */}
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                    <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                        <span className="text-2xl">{IC.roof('w-7 h-7')}</span> Terrassenüberdachung
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {ROOF_MODELS.filter(m => !isPergolaLuxeModel(m.id)).map((m, idx, filtered) => (
                                            <React.Fragment key={m.id}>
                                                {/* Visual separator before Teranda line */}
                                                {isTerandaModel(m.id) && !isTerandaModel(filtered[idx - 1]?.id) && (
                                                    <div className="col-span-full my-2">
                                                        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => setModel(m.id)}
                                                    className={`relative p-5 rounded-xl border-2 text-left transition-all hover:shadow-md ${model === m.id
                                                        ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-200'
                                                        : isTerandaModel(m.id)
                                                            ? 'border-orange-100 hover:border-orange-300 bg-orange-50/30'
                                                            : 'border-slate-100 hover:border-indigo-200 bg-white'
                                                        }`}
                                                >
                                                    <h3 className="text-lg font-bold text-slate-900">{m.name}</h3>
                                                    <p className="text-xs text-slate-500 mt-1 mb-3">{m.description}</p>
                                                    <div className="flex gap-1 flex-wrap">
                                                        {m.hasPoly && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">Poly</span>}
                                                        {m.hasGlass && <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 text-[10px] font-bold rounded-full">Glass</span>}
                                                        {m.hasFreestanding && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">Freistehend</span>}
                                                    </div>
                                                    {model === m.id && (
                                                        <div className="absolute top-3 right-3 text-indigo-600">
                                                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                        </div>
                                                    )}
                                                </button>
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>

                                {/* Pergola Luxe — separate section */}
                                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-sm border border-emerald-200 p-6">
                                    <h2 className="text-xl font-bold text-emerald-900 mb-2 flex items-center gap-2">
                                        <span className="text-2xl">🌿</span> Pergola Luxe
                                    </h2>
                                    <p className="text-sm text-emerald-700 mb-5">Bioklimatische Pergola mit drehbaren Lamellen • Komplettsystem</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {ROOF_MODELS.filter(m => isPergolaLuxeModel(m.id)).map(m => (
                                            <button
                                                key={m.id}
                                                onClick={() => setModel(m.id)}
                                                className={`relative p-5 rounded-xl border-2 text-left transition-all hover:shadow-md ${model === m.id
                                                    ? 'border-emerald-600 bg-emerald-100 ring-2 ring-emerald-300'
                                                    : 'border-emerald-100 hover:border-emerald-300 bg-white'
                                                    }`}
                                            >
                                                <div className="flex gap-4 items-center">
                                                    <img src={m.image_url} alt={m.name} className="w-20 h-20 rounded-xl object-cover border border-emerald-200 shadow-sm" />
                                                    <div className="flex-1">
                                                        <h3 className="text-lg font-bold text-slate-900">{m.name}</h3>
                                                        <p className="text-xs text-slate-500 mt-1 mb-2">{m.description}</p>
                                                        <div className="flex gap-1 flex-wrap">
                                                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">Freistehend</span>
                                                            <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-[10px] font-bold rounded-full">Lamellen</span>
                                                            {m.id === 'Pergola Luxe Electric' && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">Motor + LED</span>}
                                                            {m.id === 'Pergola Luxe' && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full">Manuell</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                {model === m.id && (
                                                    <div className="absolute top-3 right-3 text-emerald-600">
                                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 1: DIMENSIONS */}
                        {activeStep === 1 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <span className="text-2xl">{IC.ruler('w-7 h-7')}</span> {isPergolaLuxeModel(model) ? 'Größe wählen' : 'Wymiary i Konstrukcja'}
                                </h2>

                                {/* PERGOLA LUXE: Fixed-size tile selector */}
                                {isPergolaLuxeModel(model) ? (
                                    <div>
                                        <p className="text-sm text-slate-500 mb-4">
                                            Wählen Sie die gewünschte Größe — Pergola Luxe ist ein Komplettsystem mit festen Abmessungen.
                                        </p>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                            {(PERGOLA_LUXE_SIZES[model] || []).map(size => {
                                                const isSelected = width === size.width && projection === size.depth;
                                                const area = ((size.width / 1000) * (size.depth / 1000)).toFixed(1);
                                                return (
                                                    <button
                                                        key={`${size.width}x${size.depth}`}
                                                        onClick={() => { setWidth(size.width); setProjection(size.depth); }}
                                                        className={`relative p-4 rounded-xl border-2 text-center transition-all hover:shadow-md ${isSelected
                                                            ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-200 shadow-md'
                                                            : 'border-slate-200 bg-white hover:border-emerald-300'
                                                            }`}
                                                    >
                                                        <div className={`text-lg font-black ${isSelected ? 'text-emerald-700' : 'text-slate-800'}`}>
                                                            {size.label}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400 mt-1">
                                                            {size.width} × {size.depth} mm
                                                        </div>
                                                        <div className={`text-xs font-bold mt-1.5 ${isSelected ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                            {area} m²
                                                        </div>
                                                        {isSelected && (
                                                            <div className="absolute top-2 right-2 text-emerald-600">
                                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Selected size summary */}
                                        {width > 0 && projection > 0 && (
                                            <div className="mt-5 bg-emerald-50 rounded-xl border border-emerald-200 p-4 flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 text-xl font-bold">📐</div>
                                                <div>
                                                    <p className="font-bold text-emerald-800">Ausgewählt: {(width / 1000).toFixed(1)} × {(projection / 1000).toFixed(1)} m</p>
                                                    <p className="text-xs text-emerald-600">Fläche: {((width / 1000) * (projection / 1000)).toFixed(1)} m² • Höhe: 2.300 mm (Standard)</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                /* STANDARD: Slider-based dimension selection */
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                    {/* Width */}
                                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                        <label className="flex justify-between mb-4">
                                            <span className="font-bold text-slate-700">Breite (mm)</span>
                                            <span className="text-indigo-600 font-black text-xl">{width} mm</span>
                                        </label>
                                        <input
                                            type="range" min="1500" max="14000" step="100"
                                            value={width} onChange={e => setWidth(Number(e.target.value))}
                                            className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer mb-4"
                                        />
                                        <div className="flex justify-between gap-2 flex-wrap">
                                            {[2000, 2500, 3000, 4000, 5000, 6000, 7000].map(w => (
                                                <button key={w} onClick={() => setWidth(w)} className="px-2 py-1 text-xs bg-white border border-slate-200 rounded hover:border-indigo-300 transition-colors shadow-sm text-slate-600">{w}</button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Projection */}
                                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                        <label className="flex justify-between mb-4">
                                            <span className="font-bold text-slate-700">Tiefe (mm)</span>
                                            <span className="text-indigo-600 font-black text-xl">{projection} mm</span>
                                        </label>
                                        <input
                                            type="range" min="1500" max={dimensionLimits?.maxDepth || 6000} step="100"
                                            value={projection} onChange={e => setProjection(Number(e.target.value))}
                                            className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer mb-4"
                                        />
                                        <div className="flex justify-between gap-2 flex-wrap">
                                            {[1500, 2000, 2500, 3000, 3500, 4000].filter(p => !dimensionLimits || p <= dimensionLimits.maxDepth).map(p => (
                                                <button key={p} onClick={() => setProjection(p)} className="px-2 py-1 text-xs bg-white border border-slate-200 rounded hover:border-indigo-300 transition-colors shadow-sm text-slate-600">{p}</button>
                                            ))}
                                        </div>
                                        {dimensionLimits && (
                                            <div className="mt-3 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                                                <span className="inline-flex items-center gap-1">{IC.alert('w-4 h-4')} Max. Tiefe für dieses Modell: <strong>{dimensionLimits.maxDepth} mm</strong></span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Model-specific Construction Heights */}
                                    {modelDrConfig.needsH3 && (
                                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                            <label className="flex justify-between mb-2">
                                                <span className="font-bold text-slate-700">H3 – Pfostenhöhe (mm)</span>
                                                <span className="text-indigo-600 font-black text-xl">{dachH3} mm</span>
                                            </label>
                                            <p className="text-xs text-slate-400 mb-3">Unterkante Rinne – Höhe der Pfosten</p>
                                            <input
                                                type="number"
                                                value={dachH3}
                                                onChange={e => setDachH3(Number(e.target.value))}
                                                className="w-full p-2 rounded-lg border border-slate-200 font-bold text-slate-800 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                            />
                                            <div className="flex gap-2 mt-2">
                                                {(model === 'Skyline' || model === 'Carport' ? [2200, 2400, 2600, 2800] : [2000, 2200, 2400, 2600]).map(h => (
                                                    <button key={h} onClick={() => setDachH3(h)} className={`px-2 py-1 text-xs border rounded transition-colors shadow-sm ${dachH3 === h ? 'bg-indigo-100 border-indigo-300 text-indigo-700 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}>{h}</button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {modelDrConfig.needsH1 && (
                                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                            <label className="flex justify-between mb-2">
                                                <span className="font-bold text-slate-700">H1 – Wandanschluss (mm)</span>
                                                <span className="text-indigo-600 font-black text-xl">{dachH1} mm</span>
                                            </label>
                                            <p className="text-xs text-slate-400 mb-3">Oberkante Wandprofil – Montagehöhe</p>
                                            <input
                                                type="number"
                                                value={dachH1}
                                                onChange={e => setDachH1(Number(e.target.value))}
                                                className="w-full p-2 rounded-lg border border-slate-200 font-bold text-slate-800 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                            />
                                            <div className="flex gap-2 mt-2">
                                                {(model === 'Topline XL' ? [2700, 2900, 3100, 3300] : [2500, 2700, 2796, 3000]).map(h => (
                                                    <button key={h} onClick={() => setDachH1(h)} className={`px-2 py-1 text-xs border rounded transition-colors shadow-sm ${dachH1 === h ? 'bg-indigo-100 border-indigo-300 text-indigo-700 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}>{h}</button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Ultraline Overhang */}
                                    {modelDrConfig.needsOverhang && (
                                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                            <label className="flex justify-between mb-2">
                                                <span className="font-bold text-slate-700">U1 – Dachüberstand (mm)</span>
                                                <span className="text-indigo-600 font-black text-xl">{dachOverhang} mm</span>
                                            </label>
                                            <p className="text-xs text-slate-400 mb-3">Überstand vorne (nur Ultrastyle Classic)</p>
                                            <input
                                                type="number"
                                                value={dachOverhang}
                                                onChange={e => setDachOverhang(Number(e.target.value))}
                                                className="w-full p-2 rounded-lg border border-slate-200 font-bold text-slate-800 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                            />
                                            <div className="flex gap-2 mt-2">
                                                {[200, 300, 400, 500].map(h => (
                                                    <button key={h} onClick={() => setDachOverhang(h)} className={`px-2 py-1 text-xs border rounded transition-colors shadow-sm ${dachOverhang === h ? 'bg-indigo-100 border-indigo-300 text-indigo-700 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}>{h}</button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                )}

                                {/* Dachrechner, Construction -- NOT for Pergola Luxe (fixed-size products) */}
                                {!isPergolaLuxeModel(model) && (
                                    <>
                                        {/* Model Info Badge + Dachrechner Results */}
                                        <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <h5 className="text-sm font-bold text-blue-800 flex items-center gap-2">{IC.compass('w-4 h-4')} {modelDrConfig.label} – Dachrechner</h5>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">Pfosten: {modelDrConfig.postWidth}mm</span>
                                                    {modelDrConfig.fixedAngle && (
                                                        <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">α = {modelDrConfig.fixedAngle}° (fest)</span>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-blue-600 mb-3 italic">{modelDrConfig.hint}</p>

                                            {dachrechnerResults ? (
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                                    {dachrechnerResults.angleAlpha != null && (
                                                        <div className="bg-white/60 rounded-lg p-2 text-center">
                                                            <span className="block text-blue-500 uppercase text-[9px] font-bold">α Neigung</span>
                                                            <span className="font-bold text-blue-900 text-sm">{dachrechnerResults.angleAlpha.toFixed(1)}°</span>
                                                        </div>
                                                    )}
                                                    {dachrechnerResults.inclinationMmM != null && (
                                                        <div className="bg-white/60 rounded-lg p-2 text-center">
                                                            <span className="block text-blue-500 uppercase text-[9px] font-bold">Gefälle</span>
                                                            <span className="font-bold text-blue-900 text-sm">{dachrechnerResults.inclinationMmM.toFixed(0)} mm/m</span>
                                                        </div>
                                                    )}
                                                    {dachrechnerResults.heightH2 != null && (
                                                        <div className="bg-white/60 rounded-lg p-2 text-center">
                                                            <span className="block text-blue-500 uppercase text-[9px] font-bold">H2 Oberkante</span>
                                                            <span className="font-bold text-blue-900">{Math.round(dachrechnerResults.heightH2)} mm</span>
                                                        </div>
                                                    )}
                                                    {dachrechnerResults.fensterF2 != null && (
                                                        <div className="bg-emerald-50 rounded-lg p-2 text-center border border-emerald-200">
                                                            <span className="block text-emerald-600 uppercase text-[9px] font-bold">Fensterbreite</span>
                                                            <span className="font-bold text-emerald-900">{Math.round(dachrechnerResults.fensterF2)} mm</span>
                                                        </div>
                                                    )}
                                                    {dachrechnerResults.depthD2 != null && (
                                                        <div className="bg-white/60 rounded-lg p-2 text-center">
                                                            <span className="block text-blue-500 uppercase text-[9px] font-bold">D2 + Rinne</span>
                                                            <span className="font-bold text-blue-900">{Math.round(dachrechnerResults.depthD2)} mm</span>
                                                        </div>
                                                    )}
                                                    {dachrechnerResults.sparrenMitte != null && (
                                                        <div className="bg-white/60 rounded-lg p-2 text-center">
                                                            <span className="block text-blue-500 uppercase text-[9px] font-bold">Sparren Mitte</span>
                                                            <span className="font-bold text-blue-900">{Math.round(dachrechnerResults.sparrenMitte)} mm</span>
                                                        </div>
                                                    )}
                                                    {dachrechnerResults.sparrenAussen != null && (
                                                        <div className="bg-white/60 rounded-lg p-2 text-center">
                                                            <span className="block text-blue-500 uppercase text-[9px] font-bold">Sparren Außen</span>
                                                            <span className="font-bold text-blue-900">{Math.round(dachrechnerResults.sparrenAussen)} mm</span>
                                                        </div>
                                                    )}
                                                    <div className="bg-white/60 rounded-lg p-2 text-center">
                                                        <span className="block text-blue-500 uppercase text-[9px] font-bold">Pfostenbreite</span>
                                                        <span className="font-bold text-blue-900">{modelDrConfig.postWidth} mm</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center text-xs text-blue-400 py-4">
                                                    Bitte Maße eingeben um Berechnung zu starten...
                                                </div>
                                            )}
                                        </div>

                                        {/* Structural Info Panel + Zusatzpfosten */}
                                        {structuralMetadata && (
                                            <div className="mt-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-4">
                                                <h5 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-3">
                                                    <span className="inline-flex items-center gap-1.5">{IC.build('w-4 h-4')} Konstruktionsdaten</span>
                                                </h5>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-4">
                                                    {/* Posts in price */}
                                                    <div className="bg-white/70 rounded-lg p-2.5 text-center border border-amber-100">
                                                        <span className="block text-amber-600 uppercase text-[9px] font-bold">Pfosten (im Preis)</span>
                                                        <span className="font-black text-amber-900 text-lg">{structuralMetadata.posts_count}</span>
                                                    </div>
                                                    {/* Fields */}
                                                    {structuralMetadata.fields_count > 0 && (
                                                        <div className="bg-white/70 rounded-lg p-2.5 text-center border border-amber-100">
                                                            <span className="block text-amber-600 uppercase text-[9px] font-bold">Felder</span>
                                                            <span className="font-black text-amber-900 text-lg">{structuralMetadata.fields_count}</span>
                                                        </div>
                                                    )}
                                                    {/* Rafter type */}
                                                    {structuralMetadata.rafter_type && (
                                                        <div className="bg-white/70 rounded-lg p-2.5 text-center border border-amber-100">
                                                            <span className="block text-amber-600 uppercase text-[9px] font-bold">Sparrentyp</span>
                                                            <span className="font-bold text-amber-900 text-sm">{structuralMetadata.rafter_type}</span>
                                                        </div>
                                                    )}
                                                    {/* Inner width per segment */}
                                                    {dachrechnerResults?.innerWidth != null && (
                                                        <div className="bg-emerald-50 rounded-lg p-2.5 text-center border border-emerald-200">
                                                            <span className="block text-emerald-600 uppercase text-[9px] font-bold">Breite/Segment</span>
                                                            <span className="font-black text-emerald-900 text-lg">{Math.round(dachrechnerResults.innerWidth)}</span>
                                                            <span className="text-emerald-600 text-[10px] ml-0.5">mm</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Zusatzpfosten control — Aluxe only */}
                                                {!isTerandaModel(model) && <div className="bg-white/80 rounded-xl p-3 border border-amber-200">
                                                    <div className="flex items-center justify-between flex-wrap gap-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-slate-700 inline-flex items-center gap-1">{IC.build('w-4 h-4')} Zusatzpfosten</span>
                                                            <span className="text-[10px] text-slate-400">(zusätzliche Pfosten)</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex gap-1">
                                                                {([2400, 3000] as const).map(h => (
                                                                    <button key={h} onClick={() => setExtraPostHeight(h)} className={`px-2 py-1 text-xs rounded-lg border font-bold transition-all ${extraPostHeight === h ? 'bg-amber-500 text-white border-amber-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'}`}>{h}mm</button>
                                                                ))}
                                                            </div>
                                                            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                                                                <button onClick={() => setExtraPosts(p => Math.max(0, p - 1))} disabled={extraPosts === 0} className="w-8 h-8 rounded-lg bg-white shadow-sm font-bold text-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-30">−</button>
                                                                <span className="w-8 text-center font-black text-lg text-slate-800">{extraPosts}</span>
                                                                <button onClick={() => setExtraPosts(p => p + 1)} className="w-8 h-8 rounded-lg bg-white shadow-sm font-bold text-lg text-slate-600 hover:bg-green-50 hover:text-green-600 transition-colors">+</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 flex items-center justify-between text-xs flex-wrap gap-1">
                                                        <span className="text-slate-500">
                                                            {extraPosts > 0 && <>{formatCurrency(EXTRA_POST_BASE_PRICE)} / Zusatzpfosten</>}
                                                            {extraPostHeight === 3000 && (
                                                                <span className="text-amber-600 ml-1">
                                                                    {extraPosts > 0 && ' + '}+{formatCurrency(EXTRA_POST_3000_SURCHARGE)}/Pfosten für 3000mm ({totalPostCount} Pfosten × {formatCurrency(EXTRA_POST_3000_SURCHARGE)} = {formatCurrency(heightSurcharge)})
                                                                </span>
                                                            )}
                                                        </span>
                                                        {extraPostTotalPrice > 0 && (
                                                            <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Σ {formatCurrency(extraPostTotalPrice)}</span>
                                                        )}
                                                    </div>
                                                    {(extraPosts > 0 || extraPostHeight === 3000) && (
                                                        <div className="mt-2 text-xs bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-emerald-800">
                                                            <span className="inline-flex items-center gap-1">{IC.check('w-4 h-4')} Gesamt: <strong>{totalPostCount} Pfosten</strong></span>
                                                            {extraPosts > 0 && <> ({structuralMetadata.posts_count} im Preis + {extraPosts} extra)</>}
                                                            {extraPostHeight === 3000 && <>, Höhe 3000mm</>}
                                                            {dachrechnerResults?.innerWidth != null && (
                                                                <span className="ml-2">→ <strong>{Math.round(dachrechnerResults.innerWidth)} mm</strong> pro Segment</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>}
                                            </div>
                                        )}

                                        {/* Construction/Zone */}
                                        <div className="border-t border-slate-100 pt-6 mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-600 mb-3">Montagetyp</label>
                                                <div className="flex gap-3">
                                                    {[{ id: 'wall', label: 'Wandmontage', icon: 'wall' }, { id: 'freestanding', label: 'Freistehend', icon: 'freestand' }].map(t => (
                                                        <button key={t.id} onClick={() => setConstruction(t.id as any)} className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${construction === t.id ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}>
                                                            {(IC as any)[t.icon]?.('w-5 h-5')} {t.label}
                                                        </button>
                                                    ))}
                                                </div>
                                                {construction === 'freestanding' && (
                                                    <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                                                        <label className="flex items-center gap-3 cursor-pointer">
                                                            <div className="relative">
                                                                <input type="checkbox" className="sr-only peer" checked={includeFoundations} onChange={e => setIncludeFoundations(e.target.checked)} />
                                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                                            </div>
                                                            <span className="text-sm font-medium text-slate-700">Fundamente berücksichtigen</span>
                                                        </label>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-600 mb-3">Schneelastzone</label>
                                                {isTerandaModel(model) ? (
                                                    <p className="text-xs text-slate-400 italic">Ohne Schneelaststufe (Zone 2 Standard)</p>
                                                ) : (
                                                    <>
                                                        {plzZoneResult && <p className="mb-2 text-xs text-green-600 font-medium flex items-center gap-1"><span className="inline-flex items-center gap-1">{IC.check('w-4 h-4')} {plzZoneResult}</span></p>}
                                                        <div className="flex gap-2">
                                                            {[1, 2, 3].map(z => (
                                                                <button key={z} onClick={() => { setZone(z); setPlzZoneResult(null); }} className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${zone === z ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300 text-slate-500'}`}>{z}</button>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* STEP 2: SPECIFICATION */}
                        {activeStep === 2 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5">{IC.clipboard('w-6 h-6')} Konfiguration</span>
                                </h2>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Cover */}
                                    {(currentModel?.hasPoly || currentModel?.hasGlass) && (
                                        <div>
                                            <h3 className="font-bold text-slate-700 mb-4">Dacheindeckung</h3>
                                            <div className="space-y-3">
                                                {currentModel?.hasPoly && (
                                                    <button
                                                        onClick={() => setCover('Poly')}
                                                        className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${cover === 'Poly'
                                                            ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                                                            : 'border-slate-200 hover:border-slate-300'
                                                            }`}
                                                    >
                                                        <div>
                                                            <div className="font-bold text-slate-900">Polycarbonat 16mm</div>
                                                            <div className="text-xs text-slate-500">Leicht, robust, wirtschaftlich</div>
                                                        </div>
                                                        {cover === 'Poly' && <span className="text-indigo-600 text-xl">✓</span>}
                                                    </button>
                                                )}
                                                {currentModel?.hasGlass && (
                                                    <button
                                                        onClick={() => setCover('Glass')}
                                                        className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${cover === 'Glass'
                                                            ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                                                            : 'border-slate-200 hover:border-slate-300'
                                                            }`}
                                                    >
                                                        <div>
                                                            <div className="font-bold text-slate-900">Sicherheitsglas VSG</div>
                                                            <div className="text-xs text-slate-500">Premium, maximales Licht</div>
                                                        </div>
                                                        {cover === 'Glass' && <span className="text-indigo-600 text-xl">✓</span>}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Variant Selector */}
                                            {cover === 'Glass' && currentModel?.hasGlass && (
                                                <div className="mt-4 p-4 bg-cyan-50 rounded-xl border border-cyan-200">
                                                    <h4 className="text-sm font-bold text-cyan-800 mb-3">Glasart</h4>
                                                    <div className={`grid ${isTerandaModel(model) ? 'grid-cols-2' : 'grid-cols-3'} gap-2`}>
                                                        {(isTerandaModel(model) ? TERANDA_GLASS_VARIANTS : GLASS_VARIANTS).map(v => (
                                                            <button
                                                                key={v.id}
                                                                onClick={() => setGlassVariant(v.id)}
                                                                className={`p-3 rounded-lg border-2 text-center transition-all ${glassVariant === v.id
                                                                    ? 'border-cyan-500 bg-white shadow-sm ring-1 ring-cyan-300'
                                                                    : 'border-cyan-100 bg-white/50 hover:border-cyan-300'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center justify-center mb-1"><span className="w-4 h-4 rounded-full border border-slate-200" style={{ background: v.color }} /></div>
                                                                <div className="font-bold text-xs text-slate-800">{v.name}</div>
                                                                <div className="text-[9px] text-slate-500 leading-tight">{v.description}</div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {cover === 'Poly' && currentModel?.hasPoly && (
                                                <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                                                    <h4 className="text-sm font-bold text-blue-800 mb-3">Polycarbonat-Typ</h4>
                                                    <div className={`grid ${isTerandaModel(model) ? 'grid-cols-2' : 'grid-cols-4'} gap-2`}>
                                                        {(isTerandaModel(model) ? TERANDA_POLY_VARIANTS : POLY_VARIANTS).map(v => (
                                                            <button
                                                                key={v.id}
                                                                onClick={() => setPolyVariant(v.id)}
                                                                className={`p-3 rounded-lg border-2 text-center transition-all ${polyVariant === v.id
                                                                    ? 'border-blue-500 bg-white shadow-sm ring-1 ring-blue-300'
                                                                    : 'border-blue-100 bg-white/50 hover:border-blue-300'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center justify-center mb-1"><span className="w-4 h-4 rounded-full border border-slate-200" style={{ background: v.color }} /></div>
                                                                <div className="font-bold text-xs text-slate-800">{v.name}</div>
                                                                <div className="text-[9px] text-slate-500 leading-tight">{v.description}</div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Color */}
                                    <div>
                                        <h3 className="font-bold text-slate-700 mb-4">Farbe</h3>

                                        {/* PERGOLA LUXE COLOR SELECTOR */}
                                        {isPergolaLuxeModel(model) ? (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-3 gap-3">
                                                    {PERGOLA_LUXE_COLORS.map(c => (
                                                        <button
                                                            key={c.id}
                                                            onClick={() => setPergolaLuxeColor(c.id)}
                                                            className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${pergolaLuxeColor === c.id ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'}`}
                                                        >
                                                            <img src={c.image} alt={c.name} className="w-full h-20 object-cover rounded-lg" />
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-4 h-4 rounded-full border border-slate-300" style={{ backgroundColor: c.color }} />
                                                                <span className="text-sm font-bold text-slate-700">{c.name}</span>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* LED Toggle (only for manual version) */}
                                                {model === 'Pergola Luxe' && (
                                                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                                                        <label className="flex items-center gap-3 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={pergolaLuxeLed}
                                                                onChange={(e) => setPergolaLuxeLed(e.target.checked)}
                                                                className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                                                            />
                                                            <div className="flex-1">
                                                                <span className="font-bold text-amber-800">💡 LED-Beleuchtung</span>
                                                                <span className="ml-2 text-sm text-amber-600">(integrierte LED-Spots)</span>
                                                            </div>
                                                        </label>
                                                    </div>
                                                )}
                                                {model === 'Pergola Luxe Electric' && (
                                                    <div className="p-3 bg-green-50 rounded-xl border border-green-200 flex items-center gap-2 text-sm text-green-700">
                                                        <span>✅</span>
                                                        <span className="font-bold">LED-Beleuchtung ist bei der Electric-Version inklusive</span>
                                                    </div>
                                                )}

                                                {/* ═══ PERGOLA LUXE ACCESSORIES ═══ */}
                                                {(() => {
                                                    // Determine which accessory sizes match selected pergola
                                                    const wM = width >= 1000 ? Math.round(width / 1000) : width;
                                                    const dM = projection >= 1000 ? Math.round(projection / 1000) : projection;
                                                    // Sides of pergola: width = front/back, depth = left/right sides
                                                    // Accessories 3M = fits 3m wall, 4M = fits 4m wall
                                                    const wallSizes: { size: '3M' | '4M'; label: string }[] = [];
                                                    // Left/Right sides = depth
                                                    if (dM === 3) wallSizes.push({ size: '3M', label: 'Seite (3m)' });
                                                    if (dM === 4) wallSizes.push({ size: '4M', label: 'Seite (4m)' });
                                                    if (dM === 3.5 || dM === 35) wallSizes.push({ size: '3M', label: 'Seite (~3,5m)' });
                                                    // Front/Back = width
                                                    if (wM === 3 && !wallSizes.find(w => w.size === '3M')) wallSizes.push({ size: '3M', label: 'Front/Rueckseite (3m)' });
                                                    else if (wM === 3 && wallSizes.find(w => w.size === '3M')) { /* same size, already included */ }
                                                    if (wM === 4 && !wallSizes.find(w => w.size === '4M')) wallSizes.push({ size: '4M', label: 'Front/Rueckseite (4m)' });
                                                    else if (wM === 4 && wallSizes.find(w => w.size === '4M')) { /* same size, already included */ }
                                                    // For larger pergolas (5.8m, 7.8m) show 4M as closest fit
                                                    if (wM >= 5 && !wallSizes.find(w => w.size === '4M')) wallSizes.push({ size: '4M', label: `Front (${(width/1000).toFixed(1)}m)` });
                                                    // Fallback: if nothing matches, show all
                                                    const availableSizes = wallSizes.length > 0 ? wallSizes.map(w => w.size) : ['3M' as const, '4M' as const];
                                                    // Filter by size AND by selected pergola color
                                                    const selectedColor = pergolaLuxeColor; // 'anthracite' | 'white' | 'wood'
                                                    const filteredAcc = PERGOLA_LUXE_ACCESSORIES.filter(a => 
                                                        availableSizes.includes(a.size) && a.colors.includes(selectedColor)
                                                    );
                                                    const colorLabel = PERGOLA_LUXE_COLORS.find(c => c.id === selectedColor)?.name || selectedColor;

                                                    const sizeLabel = (size: '3M' | '4M' | 'other') => {
                                                        const ws = wallSizes.find(w => w.size === size);
                                                        return ws ? ws.label : size;
                                                    };

                                                    // Group accessories
                                                    const groups: { key: string; label: string; icon: string; headingClass: string; priceClass: string; badgeClass: string; borderActive: string; bgActive: string; types: PergolaLuxeAccessoryType[] }[] = [
                                                        { key: 'markisen', label: 'Markisen (Sonnenschutz)', icon: '🪟', headingClass: 'text-orange-700', priceClass: 'text-orange-600', badgeClass: 'bg-orange-100 text-orange-700', borderActive: 'border-orange-400 bg-orange-50', bgActive: 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100', types: ['markiza_elektryczna', 'markiza_manualna'] },
                                                        { key: 'lamellen', label: 'Lamellenwande (Sichtschutz)', icon: '🏗️', headingClass: 'text-teal-700', priceClass: 'text-teal-600', badgeClass: 'bg-teal-100 text-teal-700', borderActive: 'border-teal-400 bg-teal-50', bgActive: 'border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100', types: ['panel_nieruchomy', 'panel_ruchomy'] },
                                                        { key: 'tueren', label: 'Glas- und Lamellentueren', icon: '🚪', headingClass: 'text-blue-700', priceClass: 'text-blue-600', badgeClass: 'bg-blue-100 text-blue-700', borderActive: 'border-blue-400 bg-blue-50', bgActive: 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100', types: ['drzwi_szklane', 'drzwi_zaluzjowe'] },
                                                    ];

                                                    return (
                                                        <div className="mt-6 border-t border-emerald-200 pt-6">
                                                            <h5 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-1">
                                                                <span className="text-lg">🧩</span> Seitenwande und Zubehoer
                                                            </h5>
                                                            <p className="text-xs text-slate-500 mb-4">
                                                                Passend zu Ihrer Pergola <strong>{(width/1000).toFixed(1)} x {(projection/1000).toFixed(1)} m</strong> in <strong>{colorLabel}</strong> — waehlen Sie Seitenelemente pro Wand.
                                                            </p>

                                                            {groups.map(group => {
                                                                const groupItems = filteredAcc.filter(a => group.types.includes(a.type));
                                                                if (groupItems.length === 0) return null;
                                                                return (
                                                                    <div key={group.key} className="mb-5">
                                                                        <h6 className={`text-sm font-bold ${group.headingClass} flex items-center gap-1.5 mb-2`}>
                                                                            <span>{group.icon}</span> {group.label}
                                                                        </h6>
                                                                        <div className="grid grid-cols-1 gap-2">
                                                                            {groupItems.map(acc => {
                                                                                const qty = pergolaLuxeAccQty[acc.id] || 0;
                                                                                const isActive = qty > 0;
                                                                                return (
                                                                                    <div key={acc.id} className={`p-3 rounded-xl border-2 transition-all ${isActive ? group.borderActive : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                                                                        <div className="flex gap-3 items-center">
                                                                                            <img src={acc.image} alt={acc.nameDE} className="w-20 h-14 object-cover rounded-lg flex-shrink-0 border border-slate-200" />
                                                                                            <div className="flex-1 min-w-0">
                                                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                                                    <p className="text-sm font-bold text-slate-800">{acc.nameDE}</p>
                                                                                                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${group.badgeClass}`}>{sizeLabel(acc.size)}</span>
                                                                                                </div>
                                                                                                <p className="text-xs text-slate-500 mt-0.5">{acc.description}</p>
                                                                                                <p className={`text-sm font-black ${group.priceClass} mt-1`}>{formatCurrency(acc.priceEUR)} / Stueck</p>
                                                                                            </div>
                                                                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                                                <button onClick={() => setPergolaLuxeAccQty(prev => ({ ...prev, [acc.id]: Math.max((prev[acc.id] || 0) - 1, 0) }))} className="w-8 h-8 rounded-lg border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100 text-lg font-bold">-</button>
                                                                                                <span className="w-7 text-center text-sm font-black">{qty}</span>
                                                                                                <button onClick={() => setPergolaLuxeAccQty(prev => ({ ...prev, [acc.id]: (prev[acc.id] || 0) + 1 }))} className={`w-8 h-8 rounded-lg border flex items-center justify-center text-lg font-bold ${group.bgActive}`}>+</button>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}

                                                            {/* Accessories total summary */}
                                                            {Object.values(pergolaLuxeAccQty).some(q => q > 0) && (
                                                                <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 mt-3">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-sm font-bold text-emerald-800">Zubehoer gesamt:</span>
                                                                        <span className="text-lg font-black text-emerald-700">
                                                                            {formatCurrency(Object.entries(pergolaLuxeAccQty).reduce((sum, [accId, qty]) => {
                                                                                const acc = PERGOLA_LUXE_ACCESSORIES.find(a => a.id === accId);
                                                                                return sum + (acc ? acc.priceEUR * qty : 0);
                                                                            }, 0))}
                                                                        </span>
                                                                    </div>
                                                                    <div className="mt-2 space-y-1">
                                                                        {Object.entries(pergolaLuxeAccQty).filter(([_, q]) => q > 0).map(([accId, qty]) => {
                                                                            const acc = PERGOLA_LUXE_ACCESSORIES.find(a => a.id === accId);
                                                                            if (!acc) return null;
                                                                            return (
                                                                                <div key={accId} className="flex justify-between text-xs text-emerald-700">
                                                                                    <span>{qty}x {acc.nameDE}</span>
                                                                                    <span className="font-bold">{formatCurrency(acc.priceEUR * qty)}</span>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        ) : (
                                        /* STANDARD RAL COLOR SELECTOR */
                                        <div className="grid grid-cols-2 gap-3">
                                            {['RAL 7016', 'RAL 9016', 'RAL 9005', 'RAL 9007'].map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => setColor(c)}
                                                    className={`p-3 rounded-xl border-2 flex items-center gap-3 transition-all ${color === c ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'
                                                        }`}
                                                >
                                                    <div className="w-6 h-6 rounded-full border border-slate-300 shadow-sm" style={{
                                                        backgroundColor: c.includes('7016') ? '#374151' : c.includes('9016') ? '#f3f4f6' : c.includes('9005') ? '#111827' : '#9ca3af'
                                                    }} />
                                                    <span className="text-sm font-bold text-slate-700">{c}</span>
                                                </button>
                                            ))}
                                        </div>
                                        )}

                                        {/* Sonderfarben Option (not for Pergola Luxe) */}
                                        {!isPergolaLuxeModel(model) && (
                                        <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={sonderfarben}
                                                    onChange={(e) => setSonderfarben(e.target.checked)}
                                                    className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                                                />
                                                <div className="flex-1">
                                                    <span className="font-bold text-amber-800">Sonderfarben</span>
                                                    <span className="ml-2 text-sm text-amber-600">(+20% Aufpreis)</span>
                                                </div>
                                                {sonderfarbenSurcharge > 0 && (
                                                    <span className="text-sm font-bold text-amber-700">
                                                        +{formatCurrency(sonderfarbenSurcharge)}
                                                    </span>
                                                )}
                                            </label>
                                            <p className="text-xs text-amber-600 mt-2">
                                                Sonderfarbe RAL auf Anfrage - Lieferzeit +3 Wochen
                                            </p>
                                        </div>
                                        )}

                                        {/* Schiebeeinheit (Sliding Roof) - Designline Only */}
                                        {model === 'Designline' && (
                                            <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                                                <h4 className="font-bold text-indigo-800 mb-3 flex items-center gap-2">
                                                    <span className="flex items-center justify-center">{IC.link('w-5 h-5')}</span>
                                                    Schiebeeinheit (Dach-Schiebeglas)
                                                </h4>
                                                <p className="text-xs text-indigo-600 mb-4">
                                                    Schiebbare Glasflächen ermöglichen das Öffnen des Dachs. Preis pro Schiebefeld.
                                                </p>

                                                <div className="flex items-center gap-4">
                                                    <label className="text-sm font-medium text-indigo-700">
                                                        Anzahl Schiebefelder:
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => setSchiebeeinheitCount(Math.max(0, schiebeeinheitCount - 1))}
                                                            className="w-8 h-8 rounded-lg bg-indigo-200 text-indigo-700 font-bold hover:bg-indigo-300 transition-colors"
                                                        >
                                                            −
                                                        </button>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="10"
                                                            value={schiebeeinheitCount}
                                                            onChange={(e) => setSchiebeeinheitCount(Math.max(0, Math.min(10, parseInt(e.target.value) || 0)))}
                                                            className="w-16 h-8 text-center rounded-lg border border-indigo-300 font-bold text-indigo-800"
                                                        />
                                                        <button
                                                            onClick={() => setSchiebeeinheitCount(Math.min(10, schiebeeinheitCount + 1))}
                                                            className="w-8 h-8 rounded-lg bg-indigo-200 text-indigo-700 font-bold hover:bg-indigo-300 transition-colors"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                    {schiebeeinheitCount > 0 && schiebeeinheitUnitPrice > 0 && (
                                                        <div className="ml-auto text-sm">
                                                            <span className="text-indigo-600">
                                                                {schiebeeinheitCount} × {formatCurrency(schiebeeinheitUnitPrice)} =
                                                            </span>
                                                            <span className="font-bold text-indigo-800 ml-1">
                                                                +{formatCurrency(schiebeeinheitTotalPrice)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {schiebeeinheitCount > 0 && (
                                                    <div className="mt-3 p-3 bg-indigo-100 rounded-lg">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-indigo-700">Aufpreis Schiebeglas:</span>
                                                            <span className="font-bold text-indigo-900">
                                                                +{formatCurrency(schiebeeinheitTotalPrice)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: ADDONS - Premium Redesign */}
                        {activeStep === 3 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                {/* Header */}
                                <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">{IC.puzzle('w-7 h-7 text-white')}</div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Zubehör & Optionen</h3>
                                        <p className="text-slate-300 text-sm">Verglasung, Markisen & mehr</p>
                                    </div>
                                </div>

                                {/* Main Category Tabs */}
                                <div className="flex border-b border-slate-200 bg-slate-50">
                                    {[
                                        { id: 'walls', label: 'Verglasung', icon: 'wall', desc: 'Wände & Glas' },
                                        { id: 'awnings', label: 'Markisen', icon: 'sun', desc: 'Markisen' },
                                        { id: 'wpc', label: 'WPC-Boden', icon: 'wood', desc: 'Terrassen' },
                                        { id: 'aluminum', label: 'Alu-Wände', icon: 'square', desc: 'Voll, Lamellen' },
                                        { id: 'materials', label: 'Material', icon: 'wrench', desc: 'Komponenten' },
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setWallTab(tab.id as any)}
                                            className={`flex-1 px-4 py-4 text-center transition-all border-b-3 ${wallTab === tab.id
                                                ? 'border-b-4 border-indigo-600 bg-white text-slate-800'
                                                : 'border-b-4 border-transparent text-slate-500 hover:bg-white/50'
                                                }`}
                                        >
                                            <div className="flex items-center justify-center mb-1">{(IC as any)[tab.icon]?.('w-6 h-6')}</div>
                                            <div className="font-bold text-sm">{tab.label}</div>
                                            <div className="text-[10px] opacity-60">{tab.desc}</div>
                                        </button>
                                    ))}
                                </div>

                                <div className="p-6">
                                    {/* ====== ZABUDOWA TAB ====== */}
                                    {/* ====== WALLS TAB ====== */}
                                    {wallTab === 'walls' && (
                                        <div className="space-y-6">
                                            {/* CONTROLS */}
                                            <div className="space-y-6">

                                                {/* 0. Wall Placement Selector - hidden for Keilfenster (has its own side selector) */}
                                                {wallCategory !== 'keilfenster' && (
                                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                                                    <h5 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5">{IC.measure('w-4 h-4')} Platzierung</h5>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {(() => {
                                                            // Keilfenster and Seitenwand: only Links/Rechts
                                                            // Frontwand, Schiebetür, Panorama: all three
                                                            const isSideOnly = wallProduct.includes('Side Wall') || wallProduct.includes('Wedge');
                                                            const allPlacements = [
                                                                { id: 'left' as const, label: 'Links', icon: '◀', desc: 'Linke Seite' },
                                                                { id: 'right' as const, label: 'Rechts', icon: '▶', desc: 'Rechte Seite' },
                                                                { id: 'front' as const, label: 'Front', icon: '⬛', desc: 'Frontseite' },
                                                            ];
                                                            const placements = isSideOnly
                                                                ? allPlacements.filter(p => p.id !== 'front')
                                                                : allPlacements;
                                                            // Auto-reset to 'left' if front was selected but product is side-only
                                                            if (isSideOnly && wallPlacement === 'front') {
                                                                setTimeout(() => setWallPlacement('left'), 0);
                                                            }
                                                            return placements.map(p => (
                                                            <button
                                                                key={p.id}
                                                                onClick={() => setWallPlacement(p.id)}
                                                                className={`p-3 rounded-xl border-2 text-center transition-all ${wallPlacement === p.id
                                                                    ? 'border-indigo-500 bg-indigo-50 shadow-sm ring-1 ring-indigo-200'
                                                                    : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'}`}
                                                            >
                                                                <div className="text-2xl mb-1">{p.icon}</div>
                                                                <div className="font-bold text-sm text-slate-800">{p.label}</div>
                                                                <div className="text-[10px] text-slate-400 mt-0.5">{p.desc}</div>
                                                            </button>
                                                        ));
                                                        })()}
                                                    </div>
                                                    {/* Dimension badge */}
                                                    {dachrechnerResults && (() => {
                                                        const postsCount = structuralMetadata?.posts_count || 2;
                                                        const frontSegments = postsCount - 1;
                                                        const isFrontPlacement = wallPlacement === 'front';
                                                        return (
                                                            <div className="mt-3 text-xs bg-blue-50 rounded-lg p-2 border border-blue-200 space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-blue-600 font-bold">{IC.measure('w-4 h-4')}</span>
                                                                    <span className="text-blue-800">
                                                                        {isFrontPlacement ? 'Front' : wallPlacement === 'left' ? 'Links' : 'Rechts'}:
                                                                        {' '}<strong>{wallWidth} × {wallHeight} mm</strong>
                                                                        {!isFrontPlacement && ' (1 element)'}
                                                                    </span>
                                                                </div>
                                                                {isFrontPlacement && (
                                                                    <div className="flex items-center gap-2 bg-amber-50 rounded p-1.5 border border-amber-200">
                                                                        <span className="text-amber-600 font-bold">⬛</span>
                                                                        <span className="text-amber-800">
                                                                            <strong>{frontSegments} {frontSegments === 1 ? 'Segment' : 'Segmente'}</strong> zwischen <strong>{postsCount} Pfosten</strong>
                                                                            <span className="text-amber-600 ml-1">→ je: <strong>{wallWidth} × {wallHeight} mm</strong></span>
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                                )}

                                                {/* 1. Category Selector */}
                                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                                    <div className="flex border-b border-slate-100">
                                                        {[
                                                            { id: 'fixed', label: 'Festverglasung', icon: 'square' },
                                                            { id: 'sliding', label: 'Schiebetür', icon: 'square' },
                                                            { id: 'panorama', label: 'Panorama', icon: 'sun' },
                                                            { id: 'keilfenster', label: 'Keilfenster', icon: 'measure' },
                                                        ].map(cat => (
                                                            <button
                                                                key={cat.id}
                                                                onClick={() => {
                                                                    setWallCategory(cat.id as any);
                                                                    // Auto-select first product in category
                                                                    if (cat.id === 'fixed') setWallProduct(WALL_PRODUCTS[0].id);
                                                                    if (cat.id === 'sliding') setWallProduct(SCHIEBETUR_PRODUCTS[0].id);
                                                                    if (cat.id === 'panorama') setWallProduct(PANORAMA_PRODUCTS[0].id);
                                                                    if (cat.id === 'keilfenster') setWallProduct('Wedge (Glass)');
                                                                }}
                                                                className={`flex-1 py-4 text-center transition-colors font-bold text-sm flex items-center justify-center gap-2 ${wallCategory === cat.id
                                                                    ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500'
                                                                    : 'bg-white text-slate-500 hover:bg-slate-50'
                                                                    }`}
                                                            >
                                                                <span>{(IC as any)[cat.icon]?.('w-4 h-4') || cat.icon}</span> {cat.label}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <div className="p-6">
                                                        {/* FIXED WALLS */}
                                                        {wallCategory === 'fixed' && (
                                                            <>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                    {WALL_PRODUCTS.map(p => (
                                                                        <button
                                                                            key={p.id}
                                                                            onClick={() => setWallProduct(p.id)}
                                                                            className={`text-left p-4 rounded-xl border transition-all flex items-center gap-3 ${wallProduct === p.id
                                                                                ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200 shadow-sm'
                                                                                : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'}`}
                                                                        >
                                                                            <span className="bg-white p-2 rounded-lg shadow-sm flex items-center justify-center">{(IC as any)[p.icon]?.('w-7 h-7 text-slate-600') || p.icon}</span>
                                                                            <div>
                                                                                <div className="font-bold text-slate-700">{p.name}</div>
                                                                                <div className="text-xs text-slate-400 mt-1">{p.description}</div>
                                                                            </div>
                                                                        </button>
                                                                    ))}
                                                                </div>

                                                                {/* GLASS TYPE FOR SIDE/FRONT WALLS */}
                                                                {(wallProduct.includes('Side Wall') || wallProduct.includes('Front Wall')) && (
                                                                    <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                                                                        <h4 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-1.5">{IC.square('w-4 h-4')} Glasart</h4>
                                                                        <div className="grid grid-cols-3 gap-2">
                                                                            {WALL_GLASS_TYPES.map(v => (
                                                                                <button
                                                                                    key={v.id}
                                                                                    onClick={() => setWallGlassType(v.id as any)}
                                                                                    className={`p-3 rounded-lg border-2 text-center transition-all ${wallGlassType === v.id
                                                                                        ? 'border-blue-500 bg-white shadow-sm ring-1 ring-blue-300'
                                                                                        : 'border-blue-100 bg-white/50 hover:border-blue-300'
                                                                                        }`}
                                                                                >
                                                                                    <div className="flex items-center justify-center mb-1"><span className="w-4 h-4 rounded-full border border-slate-200" style={{ background: v.color }} /></div>
                                                                                    <div className="font-bold text-xs text-slate-800">{v.name}</div>
                                                                                    <div className="text-[9px] text-slate-500 leading-tight">{v.price}</div>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Keilfenster content is now in its own tab below */}
                                                            </>
                                                        )}

                                                        {/* KEILFENSTER TAB */}
                                                        {wallCategory === 'keilfenster' && (
                                                            <>
                                                                {/* Side Selector */}
                                                                <div className="p-4 bg-orange-50 rounded-xl border border-orange-200 mb-4">
                                                                    <h4 className="text-sm font-bold text-orange-800 mb-3 flex items-center gap-1.5">{IC.measure('w-4 h-4')} Seite</h4>
                                                                    <div className="grid grid-cols-2 gap-3">
                                                                        {([
                                                                            { id: 'left' as const, label: 'Links', icon: '◀', desc: 'Keilfenster linke Seite' },
                                                                            { id: 'right' as const, label: 'Rechts', icon: '▶', desc: 'Keilfenster rechte Seite' },
                                                                        ]).map(s => (
                                                                            <button
                                                                                key={s.id}
                                                                                onClick={() => setKeilfensterSide(s.id)}
                                                                                className={`p-4 rounded-xl border-2 text-center transition-all ${keilfensterSide === s.id
                                                                                    ? 'border-orange-500 bg-white shadow-sm ring-1 ring-orange-300'
                                                                                    : 'border-orange-100 bg-white/50 hover:border-orange-300'}`}
                                                                            >
                                                                                <div className="text-2xl mb-1">{s.icon}</div>
                                                                                <div className="font-bold text-sm text-slate-800">{s.label}</div>
                                                                                <div className="text-[10px] text-slate-400">{s.desc}</div>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* K1/K2 Dimensions */}
                                                                {dachrechnerResults && (dachrechnerResults.keilhoeheK1 || dachrechnerResults.keilhoeheK2) && (
                                                                    <div className="grid grid-cols-3 gap-3 mb-4">
                                                                        <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-200">
                                                                            <span className="block text-orange-500 uppercase text-[9px] font-bold">K1 (Rinne)</span>
                                                                            <span className="font-bold text-lg text-orange-900">{dachrechnerResults.keilhoeheK1 ? Math.round(dachrechnerResults.keilhoeheK1) : '–'} mm</span>
                                                                        </div>
                                                                        <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-200">
                                                                            <span className="block text-orange-500 uppercase text-[9px] font-bold">K2 (Wand)</span>
                                                                            <span className="font-bold text-lg text-orange-900">{dachrechnerResults.keilhoeheK2 ? Math.round(dachrechnerResults.keilhoeheK2) : '–'} mm</span>
                                                                        </div>
                                                                        <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-200">
                                                                            <span className="block text-orange-500 uppercase text-[9px] font-bold">Breite (F2)</span>
                                                                            <span className="font-bold text-lg text-orange-900">{dachrechnerResults.fensterF2 ? Math.round(dachrechnerResults.fensterF2) : '–'} mm</span>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Glass Type */}
                                                                <div className="p-4 bg-orange-50 rounded-xl border border-orange-200 mb-4">
                                                                    <h4 className="text-sm font-bold text-orange-800 mb-3">Glasart</h4>
                                                                    <div className="grid grid-cols-3 gap-2">
                                                                        {[
                                                                            { id: 'clear', name: 'Klar (VSG 44.2)', color: '#22c55e', price: 'Standard' },
                                                                            { id: 'matt', name: 'Matt (VSG 44.2)', color: '#e5e7eb', price: '+ Aufpreis' },
                                                                            { id: 'iso', name: 'Isolierglas', color: '#ef4444', price: '+ Aufpreis' }
                                                                        ].map(v => (
                                                                            <button
                                                                                key={v.id}
                                                                                onClick={() => setWedgeGlassType(v.id)}
                                                                                className={`p-3 rounded-lg border-2 text-center transition-all ${wedgeGlassType === v.id
                                                                                    ? 'border-orange-500 bg-white shadow-sm ring-1 ring-orange-300'
                                                                                    : 'border-orange-100 bg-white/50 hover:border-orange-300'}`}
                                                                            >
                                                                                <div className="flex items-center justify-center mb-1"><span className="w-4 h-4 rounded-full border border-slate-200" style={{ background: v.color }} /></div>
                                                                                <div className="font-bold text-xs text-slate-800">{v.name}</div>
                                                                                <div className="text-[9px] text-slate-500">{v.price}</div>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* Accessories */}
                                                                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                                                                    <h4 className="text-sm font-bold text-blue-800 mb-3">Zubehör (Keilfenster)</h4>
                                                                    <div className="grid grid-cols-2 gap-3">
                                                                        {KEILFENSTER_ACCESSORIES.map(acc => (
                                                                            <label
                                                                                key={acc.id}
                                                                                className={`flex flex-col p-3 rounded-xl border-2 cursor-pointer transition-all ${wedgeAccessories[acc.id]
                                                                                    ? 'border-blue-500 bg-white shadow-sm ring-1 ring-blue-300'
                                                                                    : 'border-blue-100 bg-white/50 hover:border-blue-300'}`}
                                                                            >
                                                                                <div className="flex items-start gap-3">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={wedgeAccessories[acc.id] || false}
                                                                                        onChange={(e) => setWedgeAccessories(prev => ({
                                                                                            ...prev,
                                                                                            [acc.id]: e.target.checked
                                                                                        }))}
                                                                                        className="w-4 h-4 mt-0.5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                                                                                    />
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <span className="font-bold text-xs text-slate-800">{acc.name}</span>
                                                                                        <div className="text-[10px] text-slate-500">{acc.description}</div>
                                                                                        <div className="text-xs font-bold text-blue-600 mt-1">€{acc.price.toFixed(2)}</div>
                                                                                    </div>
                                                                                </div>
                                                                                {acc.image && (
                                                                                    <div className="mt-2 flex justify-center">
                                                                                        <img
                                                                                            src={acc.image}
                                                                                            alt={acc.name}
                                                                                            className="max-h-16 object-contain rounded opacity-80 hover:opacity-100 transition-opacity"
                                                                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                                                        />
                                                                                    </div>
                                                                                )}
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}

                                                        {/* SLIDING DOORS */}
                                                        {wallCategory === 'sliding' && (
                                                            <>
                                                                <div className="space-y-2">
                                                                    {SCHIEBETUR_PRODUCTS.map(p => (
                                                                        <button
                                                                            key={p.id}
                                                                            onClick={() => setWallProduct(p.id)}
                                                                            className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${wallProduct === p.id
                                                                                ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200 shadow-sm'
                                                                                : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'}`}
                                                                        >
                                                                            <span className="bg-white p-2 rounded-lg shadow-sm flex-shrink-0 flex items-center justify-center">{(IC as any)[p.icon]?.('w-6 h-6 text-slate-600') || p.icon}</span>
                                                                            <div className="min-w-0">
                                                                                <div className="font-bold text-slate-700 text-sm">{p.name}</div>
                                                                                <div className="text-xs text-slate-400 mt-0.5 truncate">{p.description}</div>
                                                                            </div>
                                                                            {wallProduct === p.id && <span className="ml-auto text-indigo-500 flex-shrink-0">✓</span>}
                                                                        </button>
                                                                    ))}
                                                                </div>

                                                                {/* PANEL COUNT INFO */}
                                                                {wallProduct.includes('Schiebetür') && (
                                                                    <div className="mt-4 p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="flex items-center justify-center">{IC.measure('w-5 h-5')}</span>
                                                                                <span className="text-sm font-bold text-indigo-800">Anzahl Flügel</span>
                                                                            </div>
                                                                            <span className="text-sm font-black text-indigo-700 bg-white px-3 py-1 rounded-lg shadow-sm">
                                                                                {getSchiebetuerPanelCount(wallWidth).count}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-[10px] text-indigo-500 mt-1">Automatisch nach Breite (max. Flügelbreite: 1500mm)</p>
                                                                    </div>
                                                                )}

                                                                {/* OPENING DIRECTION */}
                                                                {wallProduct.includes('Schiebetür') && (
                                                                    <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                                                        <h4 className="text-sm font-bold text-slate-700 mb-3">Kierunek otwierania</h4>
                                                                        <div className="grid grid-cols-3 gap-2">
                                                                            {SCHIEBETUR_OPENING.map(o => (
                                                                                <button
                                                                                    key={o.id}
                                                                                    onClick={() => setSchiebetuerOpening(o.id)}
                                                                                    className={`p-3 rounded-lg border-2 text-center transition-all ${schiebetuerOpening === o.id
                                                                                        ? 'border-indigo-500 bg-white shadow-sm ring-1 ring-indigo-300'
                                                                                        : 'border-slate-100 bg-white/50 hover:border-indigo-300'
                                                                                        }`}
                                                                                >
                                                                                    <div className="text-lg mb-1">{o.icon}</div>
                                                                                    <div className="font-bold text-xs text-slate-800">{o.name}</div>
                                                                                    <div className="text-[9px] text-slate-400 mt-0.5">{o.description}</div>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* HANDLE TYPE */}
                                                                {wallProduct.includes('Schiebetür') && (
                                                                    <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                                                        <h4 className="text-sm font-bold text-slate-700 mb-3">Typ uchwytu (Griff)</h4>
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            {SCHIEBETUR_HANDLES.map(h => (
                                                                                <button
                                                                                    key={h.id}
                                                                                    onClick={() => setSchiebetuerHandle(h.id)}
                                                                                    className={`text-left p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${schiebetuerHandle === h.id
                                                                                        ? 'border-indigo-500 bg-white shadow-sm ring-1 ring-indigo-300'
                                                                                        : 'border-slate-100 bg-white/50 hover:border-indigo-300'
                                                                                        }`}
                                                                                >
                                                                                    <span className="flex items-center justify-center">{(IC as any)[h.icon]?.('w-5 h-5') || h.icon}</span>
                                                                                    <div>
                                                                                        <div className="font-bold text-xs text-slate-800">{h.name}</div>
                                                                                        <div className="text-[9px] text-slate-400">{h.id}</div>
                                                                                    </div>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* INCLUDED INFO */}
                                                                {wallProduct.includes('Schiebetür') && (
                                                                    <div className="mt-4 p-3 bg-green-50 rounded-xl border border-green-200 text-xs text-green-700">
                                                                        <strong className="block mb-1 flex items-center gap-1">{IC.check('w-4 h-4')} W cenie zawarte:</strong>
                                                                        <ul className="list-disc list-inside space-y-0.5">
                                                                            <li>Uszczelki (Dichtung) 44.2 VSG klar</li>
                                                                            <li>Entwässerungskappen</li>
                                                                            <li>Kolor standardowy: RAL 7016 / 9007 / 9010 / 9016 / 9005 / DB703</li>
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}

                                                        {/* PANORAMA */}
                                                        {wallCategory === 'panorama' && (
                                                            <>
                                                                <div className="grid grid-cols-1 gap-3">
                                                                    {PANORAMA_MODELS.map(model => {
                                                                        const isActive = wallProduct.includes(`Panorama ${model.id}`);
                                                                        // Show current active variant description if active
                                                                        const currentVariant = isActive ? wallProduct : getBestPanoramaVariant(model.id, wallWidth);
                                                                        const variantInfo = PANORAMA_PRODUCTS.find(p => p.id === currentVariant);

                                                                        return (
                                                                            <button
                                                                                key={model.id}
                                                                                onClick={() => setWallProduct(getBestPanoramaVariant(model.id, wallWidth))}
                                                                                className={`text-left p-3 rounded-xl border transition-all flex items-center justify-between group ${isActive
                                                                                    ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-200 shadow-sm'
                                                                                    : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-slate-50'}`}
                                                                            >
                                                                                <div className="flex items-center gap-3">
                                                                                    <span className="text-2xl bg-white p-1.5 rounded-lg shadow-sm text-purple-600">{model.icon}</span>
                                                                                    <div>
                                                                                        <div className="font-bold text-slate-700">{model.name}</div>
                                                                                        <div className="text-xs text-slate-400">{model.description}</div>
                                                                                        {isActive && (
                                                                                            <div className="text-xs text-purple-600 font-bold mt-1">
                                                                                                Wybrano: {variantInfo?.tracks}-tory (Auto)
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                                {isActive && <span className="text-purple-600 font-bold">✓</span>}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>

                                                                {/* PANORAMA OPTIONS */}
                                                                <div className="mt-4 bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-4">
                                                                    <h6 className="text-xs font-bold text-slate-600 uppercase">Opcje Panorama</h6>

                                                                    {/* Opening Direction */}
                                                                    <div>
                                                                        <label className="text-xs font-medium text-slate-500 mb-2 block">Öffnungsrichtung</label>
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            <button
                                                                                onClick={() => setPanoramaOpeningType('side')}
                                                                                className={`p-2 text-sm rounded-lg border transition-all ${panoramaOpeningType === 'side'
                                                                                    ? 'border-purple-500 bg-purple-50 text-purple-700 font-bold'
                                                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-purple-300'}`}
                                                                            >
                                                                                ← Boczne
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setPanoramaOpeningType('center')}
                                                                                className={`p-2 text-sm rounded-lg border transition-all ${panoramaOpeningType === 'center'
                                                                                    ? 'border-purple-500 bg-purple-50 text-purple-700 font-bold'
                                                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-purple-300'}`}
                                                                            >
                                                                                ↔ Mittig
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {/* Handle Type */}
                                                                    <div>
                                                                        <label className="text-xs font-medium text-slate-500 mb-2 block">Typ uchwytu</label>
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            <button
                                                                                onClick={() => setPanoramaHandleType('griff')}
                                                                                className={`p-2 text-sm rounded-lg border transition-all ${panoramaHandleType === 'griff'
                                                                                    ? 'border-purple-500 bg-purple-50 text-purple-700 font-bold'
                                                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-purple-300'}`}
                                                                            >
                                                                                <span className="inline-flex items-center gap-1">{IC.square('w-3.5 h-3.5')} Griff (14.21 €)</span>
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setPanoramaHandleType('knauf')}
                                                                                className={`p-2 text-sm rounded-lg border transition-all ${panoramaHandleType === 'knauf'
                                                                                    ? 'border-purple-500 bg-purple-50 text-purple-700 font-bold'
                                                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-purple-300'}`}
                                                                            >
                                                                                <span className="inline-flex items-center gap-1">{IC.wrench('w-3.5 h-3.5')} Knauf (36.68 €)</span>
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {/* Glass Type */}
                                                                    <div>
                                                                        <label className="text-xs font-medium text-slate-500 mb-2 block">Glasart</label>
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            <button
                                                                                onClick={() => setPanoramaGlassType('klar')}
                                                                                className={`p-2 text-sm rounded-lg border transition-all ${panoramaGlassType === 'klar'
                                                                                    ? 'border-purple-500 bg-purple-50 text-purple-700 font-bold'
                                                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-purple-300'}`}
                                                                            >
                                                                                <span className="inline-flex items-center gap-1">{IC.square('w-3.5 h-3.5')} Klar (Standard)</span>
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setPanoramaGlassType('planibel_grau')}
                                                                                className={`p-2 text-sm rounded-lg border transition-all ${panoramaGlassType === 'planibel_grau'
                                                                                    ? 'border-purple-500 bg-purple-50 text-purple-700 font-bold'
                                                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-purple-300'}`}
                                                                            >
                                                                                <span className="inline-flex items-center gap-1">{IC.square('w-3.5 h-3.5')} Planibel Grau (+47.95 €/m²)</span>
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {/* Steel-Look Toggle */}
                                                                    <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
                                                                        <div>
                                                                            <span className="text-sm font-medium text-slate-700">Steel-Look Profile</span>
                                                                            <p className="text-xs text-slate-400">RAL 7016 / 9005 (+18.95 € pro Profil)</p>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => setPanoramaSteelLook(!panoramaSteelLook)}
                                                                            className={`w-12 h-6 rounded-full transition-all ${panoramaSteelLook ? 'bg-purple-500' : 'bg-slate-300'}`}
                                                                        >
                                                                            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-all ${panoramaSteelLook ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Compact Dachrechner Summary + Auto/Manual toggle */}
                                                {dachrechnerResults && (
                                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-200 p-3">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h5 className="text-xs font-bold text-blue-800 flex items-center gap-1">{IC.measure('w-3.5 h-3.5')} Maße aus Dachrechner</h5>
                                                            <button
                                                                onClick={() => setWallDimsAuto(!wallDimsAuto)}
                                                                className={`text-xs px-3 py-1 rounded-full font-bold transition-all ${wallDimsAuto
                                                                    ? 'bg-green-500 text-white'
                                                                    : 'bg-slate-200 text-slate-600'}`}
                                                            >
                                                                {wallDimsAuto ? <><span className="inline-flex items-center gap-0.5">{IC.sun('w-3 h-3')} Auto</span></> : <><span className="inline-flex items-center gap-0.5">{IC.clipboard('w-3 h-3')} Manuell</span></>}
                                                            </button>
                                                        </div>
                                                        <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                                                            <div className="bg-white/60 rounded p-1.5 text-center">
                                                                <span className="block text-blue-400 uppercase text-[8px]">H3</span>
                                                                <span className="font-bold text-blue-900">{dachH3}</span>
                                                            </div>
                                                            <div className="bg-white/60 rounded p-1.5 text-center">
                                                                <span className="block text-blue-400 uppercase text-[8px]">H1</span>
                                                                <span className="font-bold text-blue-900">{dachH1}</span>
                                                            </div>
                                                            {dachrechnerResults.fensterF2 != null && (
                                                                <div className="bg-emerald-50 rounded p-1.5 text-center border border-emerald-200">
                                                                    <span className="block text-emerald-500 uppercase text-[8px]">Breite</span>
                                                                    <span className="font-bold text-emerald-900">{Math.round(dachrechnerResults.fensterF2)}</span>
                                                                </div>
                                                            )}
                                                            {dachrechnerResults.angleAlpha != null && (
                                                                <div className="bg-white/60 rounded p-1.5 text-center">
                                                                    <span className="block text-blue-400 uppercase text-[8px]">α</span>
                                                                    <span className="font-bold text-blue-900">{dachrechnerResults.angleAlpha.toFixed(1)}°</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {/* Keilfenster K1/K2 */}
                                                        {(wallProduct.includes('Wedge') || wallProduct.includes('Keilfenster')) && (dachrechnerResults.keilhoeheK1 != null || dachrechnerResults.keilhoeheK2 != null) && (
                                                            <div className="mt-2 pt-2 border-t border-blue-200 grid grid-cols-3 gap-1.5 text-[10px]">
                                                                <div className="bg-orange-50 rounded p-1.5 text-center border border-orange-200">
                                                                    <span className="block text-orange-500 text-[8px]">K1</span>
                                                                    <span className="font-bold text-orange-900">{dachrechnerResults.keilhoeheK1 != null ? Math.round(dachrechnerResults.keilhoeheK1) : '–'}</span>
                                                                </div>
                                                                <div className="bg-orange-50 rounded p-1.5 text-center border border-orange-200">
                                                                    <span className="block text-orange-500 text-[8px]">K2</span>
                                                                    <span className="font-bold text-orange-900">{dachrechnerResults.keilhoeheK2 != null ? Math.round(dachrechnerResults.keilhoeheK2) : '–'}</span>
                                                                </div>
                                                                {dachrechnerResults.fensterF2 != null && (
                                                                    <div className="bg-orange-50 rounded p-1.5 text-center border border-orange-200">
                                                                        <span className="block text-orange-500 text-[8px]">D1</span>
                                                                        <span className="font-bold text-orange-900">{Math.round(dachrechnerResults.fensterF2)}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Dimensions Card */}
                                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h5 className="text-sm font-bold text-slate-700">Wymiary zabudowy</h5>
                                                        {wallDimsAuto && dachrechnerResults && (
                                                            <span className="text-[10px] text-green-600 bg-green-50 px-2 py-1 rounded-full font-bold inline-flex items-center gap-0.5">{IC.sun('w-3 h-3')} Automatisch berechnet</span>
                                                        )}
                                                    </div>

                                                    <div className={`grid ${(wallProduct.includes('Wedge') || wallProduct.includes('Keilfenster')) ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                                                                {wallProduct.includes('Wedge') || wallProduct.includes('Keilfenster')
                                                                    ? 'Breite D1'
                                                                    : wallProduct.includes('Side')
                                                                        ? 'Tiefe'
                                                                        : 'Breite'} (mm)
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={wallWidth}
                                                                onChange={e => { setWallWidth(Number(e.target.value)); setWallDimsAuto(false); }}
                                                                className="w-full p-3 rounded-lg border border-slate-200 font-bold text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                                                            />
                                                            {(wallProduct.includes('Wedge') || wallProduct.includes('Keilfenster')) && (
                                                                <p className="text-xs text-slate-400 mt-2">
                                                                    <span className="inline-flex items-center gap-1">{IC.measure('w-3 h-3')} Breite D1 z cennika producenta (2000-5000mm)</span>
                                                                </p>
                                                            )}
                                                        </div>
                                                        {!(wallProduct.includes('Wedge') || wallProduct.includes('Keilfenster')) && (
                                                            <div>
                                                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Höhe (mm)</label>
                                                                <input
                                                                    type="number"
                                                                    value={wallHeight}
                                                                    onChange={e => { setWallHeight(Number(e.target.value)); setWallDimsAuto(false); }}
                                                                    className="w-full p-3 rounded-lg border border-slate-200 font-bold text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Price & Action Card */}
                                            <div className="bg-slate-800 text-white rounded-xl p-6 shadow-xl relative overflow-hidden">
                                                {/* Background decoration */}
                                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>

                                                <div className="relative z-10 text-center space-y-4">
                                                    {(() => {
                                                        const postsCount = structuralMetadata?.posts_count || 2;
                                                        const frontSegments = postsCount - 1;
                                                        const isFrontPlacement = wallPlacement === 'front';
                                                        const segmentMultiplier = isFrontPlacement ? frontSegments : 1;
                                                        return (
                                                            <div>
                                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                                                    {isFrontPlacement ? `Preis pro Element (×${segmentMultiplier})` : 'Elementpreis'}
                                                                </div>
                                                                {wallPriceLoading ? (
                                                                    <div className="text-2xl font-bold text-white/50 animate-pulse">Berechnung...</div>
                                                                ) : wallPrice !== null ? (
                                                                    <>
                                                                        <div className="text-4xl font-black text-emerald-400 tracking-tight">
                                                                            {formatCurrency(wallPrice)}
                                                                        </div>
                                                                        {isFrontPlacement && segmentMultiplier > 1 && (
                                                                            <div className="mt-1 text-sm font-bold text-amber-400">
                                                                                × {segmentMultiplier} = <span className="text-emerald-300 text-lg">{formatCurrency(wallPrice * segmentMultiplier)}</span>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <div className="text-red-300 text-sm font-medium bg-red-500/10 py-1 px-3 rounded-full inline-block">Nicht verfügbar für dieses Maß</div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}

                                                    <div className="h-px bg-white/10 w-full"></div>

                                                    <button
                                                        onClick={() => {
                                                            if (!wallPrice) return;
                                                            const isWedge = wallProduct.includes('Wedge') || wallProduct.includes('Keilfenster');
                                                            const isSchiebetur = wallProduct.includes('Schiebetür');

                                                            // Calculate accessories total for Keilfenster
                                                            let accessoriesTotal = 0;
                                                            let accessoriesNames: string[] = [];
                                                            if (isWedge) {
                                                                KEILFENSTER_ACCESSORIES.forEach(acc => {
                                                                    if (wedgeAccessories[acc.id]) {
                                                                        accessoriesTotal += acc.price;
                                                                        accessoriesNames.push(acc.name);
                                                                    }
                                                                });
                                                            }

                                                            const totalWithAccessories = wallPrice + accessoriesTotal;

                                                            // Build display-friendly name
                                                            let displayName = WALL_PRODUCTS.find(p => p.id === wallProduct)?.name || wallProduct;
                                                            // Keilfenster: use proper display name with side
                                                            if (isWedge) {
                                                                const sideLabel = keilfensterSide === 'left' ? 'Links' : 'Rechts';
                                                                displayName = `Keilfenster ${sideLabel}`;
                                                            }
                                                            let configStr = '';
                                                            if (isSchiebetur) {
                                                                const schiebaturProduct = SCHIEBETUR_PRODUCTS.find(p => p.id === wallProduct);
                                                                const handleInfo = SCHIEBETUR_HANDLES.find(h => h.id === schiebetuerHandle);
                                                                const openingInfo = SCHIEBETUR_OPENING.find(o => o.id === schiebetuerOpening);
                                                                const panelInfo = getSchiebetuerPanelCount(wallWidth);
                                                                displayName = schiebaturProduct ? `Schiebetür – ${schiebaturProduct.name}` : wallProduct;
                                                                configStr = `${displayName} | ${panelInfo.count} | ${openingInfo?.name || ''} | ${handleInfo?.name || ''} (${schiebetuerHandle})`;
                                                            } else {
                                                                configStr = isWedge && accessoriesNames.length > 0
                                                                    ? `${displayName} + ${accessoriesNames.join(', ')}`
                                                                    : displayName;
                                                            }

                                                            const postsCount = structuralMetadata?.posts_count || 2;
                                                            const frontSegments = postsCount - 1;
                                                            const isFrontPlacement = wallPlacement === 'front';
                                                            const segmentMultiplier = isFrontPlacement ? frontSegments : 1;

                                                            // Build rich dimensions string for client visibility
                                                            let techDims = `${wallWidth} × ${wallHeight} mm`;
                                                            if (isWedge && dachrechnerResults) {
                                                                const k1 = dachrechnerResults.keilhoeheK1 ? Math.round(dachrechnerResults.keilhoeheK1) : null;
                                                                const k2 = dachrechnerResults.keilhoeheK2 ? Math.round(dachrechnerResults.keilhoeheK2) : null;
                                                                const f2 = dachrechnerResults.fensterF2 ? Math.round(dachrechnerResults.fensterF2) : null;
                                                                techDims = `F2: ${f2 || wallWidth} mm`;
                                                                if (k1) techDims += ` | K1 (Rinne): ${k1} mm`;
                                                                if (k2) techDims += ` | K2 (Wand): ${k2} mm`;
                                                            }
                                                            if (isFrontPlacement && segmentMultiplier > 1) {
                                                                techDims = `${segmentMultiplier}× ${wallWidth} × ${wallHeight} mm`;
                                                            }

                                                            // For front: add all segments at once with placement info
                                                            const placementLabel = isWedge
                                                                ? (keilfensterSide === 'left' ? 'Links' : 'Rechts')
                                                                : (wallPlacement === 'front' ? 'Front' : wallPlacement === 'left' ? 'Links' : 'Rechts');
                                                            const finalPrice = totalWithAccessories * segmentMultiplier;
                                                            const qtyNote = isFrontPlacement && segmentMultiplier > 1 ? ` (${segmentMultiplier}× Segment)` : '';
                                                            configStr = `${placementLabel}: ${configStr}${qtyNote}`;
                                                            addToBasket(displayName, finalPrice, configStr, techDims, 'wall');

                                                            // Reset accessories after adding
                                                            if (isWedge) {
                                                                setWedgeAccessories({
                                                                    uProfil: false,
                                                                    schraubenSet: false,
                                                                    kippFenster: false,
                                                                    abdeckungEL891: false
                                                                });
                                                            }
                                                        }}
                                                        disabled={!wallPrice}
                                                        className={`w-full py-4 px-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2 ${wallPrice
                                                            ? 'bg-emerald-500 hover:bg-emerald-400 text-white hover:scale-[1.02] active:scale-[0.98]'
                                                            : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-70'
                                                            }`}
                                                    >
                                                        <span>Hinzufügen</span>
                                                        <span>{IC.build('w-4 h-4')}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {/* ====== KOMFORT TAB (Awnings, LED) ====== */}
                                    {wallTab === 'awnings' && (
                                        <div className="space-y-6">
                                            {/* Awnings Section */}
                                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                                <h4 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2">
                                                    <span className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">{IC.sun('w-4 h-4')}</span>
                                                    Markizy & ZIP Screen
                                                </h4>

                                                {/* Type Selector with Images */}
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                                                    {[
                                                        { id: 'aufdach', label: 'Aufdachmarkise', desc: 'Markise auf dem Dach' },
                                                        { id: 'unterdach', label: 'Unterdachmarkise', desc: 'Markise unter dem Dach' },
                                                        { id: 'zip', label: 'ZIP Screen', desc: 'Senkrechtmarkise' },
                                                    ].map(type => (
                                                        <button
                                                            key={type.id}
                                                            onClick={() => setAwningType(type.id as any)}
                                                            className={`p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden ${awningType === type.id
                                                                ? 'border-orange-500 bg-orange-50/50 ring-1 ring-orange-200'
                                                                : 'border-slate-100 hover:border-orange-200 bg-white'}`}
                                                        >

                                                            <div className="font-bold text-sm text-slate-800">{type.label}</div>
                                                            <div className="text-[10px] text-slate-500">{type.desc}</div>
                                                            {awningType === type.id && (
                                                                <div className="absolute top-2 right-2 w-3 h-3 bg-orange-500 rounded-full"></div>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Dimensions and Price calculation area */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                                                    {/* Dimensions Inputs */}
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Breite (mm)</label>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    value={awningWidth}
                                                                    onChange={e => setAwningWidth(Number(e.target.value))}
                                                                    step={500}
                                                                    min={1000}
                                                                    max={6000}
                                                                    className="w-full p-3 pl-4 border border-slate-200 rounded-lg font-bold text-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                                                                />
                                                                <span className="absolute right-3 top-3.5 text-xs text-slate-400 font-bold">MM</span>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{awningType === 'zip' ? 'Höhe' : 'Ausfall'} (mm)</label>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    value={awningProjection}
                                                                    onChange={e => setAwningProjection(Number(e.target.value))}
                                                                    step={500}
                                                                    min={1000}
                                                                    max={5000}
                                                                    className="w-full p-3 pl-4 border border-slate-200 rounded-lg font-bold text-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                                                                />
                                                                <span className="absolute right-3 top-3.5 text-xs text-slate-400 font-bold">MM</span>
                                                            </div>
                                                        </div>

                                                        {/* Motor Count Selector - only for aufdach/unterdach */}
                                                        {awningType !== 'zip' && (
                                                            <div>
                                                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Anzahl Motoren</label>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <button
                                                                        onClick={() => setAwningMotorCount(1)}
                                                                        className={`p-3 rounded-lg border-2 text-center transition-all ${awningMotorCount === 1
                                                                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                                                                            : 'border-slate-200 hover:border-slate-300'
                                                                            }`}
                                                                    >
                                                                        <div className="font-bold text-sm">1 Motor</div>
                                                                        <div className="text-xs text-slate-500">do 6000mm</div>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setAwningMotorCount(2)}
                                                                        className={`p-3 rounded-lg border-2 text-center transition-all ${awningMotorCount === 2
                                                                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                                                                            : 'border-slate-200 hover:border-slate-300'
                                                                            }`}
                                                                    >
                                                                        <div className="font-bold text-sm">2 Motory</div>
                                                                        <div className="text-xs text-slate-500">6000-12000mm</div>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Price & Add Button */}
                                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between">
                                                        <div className="text-center mb-3">
                                                            {awningPrice !== null ? (
                                                                <>
                                                                    <div className="text-slate-500 text-xs uppercase font-bold mb-1">Nettopreis</div>
                                                                    <div className="text-3xl font-black text-slate-800">{formatCurrency(awningPrice)}</div>
                                                                </>
                                                            ) : (
                                                                <div className="text-slate-400 py-2">Wybierz wymiary...</div>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => awningPrice && addToBasket(
                                                                awningType === 'aufdach' ? 'Aufdachmarkise' : awningType === 'unterdach' ? 'Unterdachmarkise' : 'ZIP Screen',
                                                                awningPrice,
                                                                awningType === 'aufdach' ? 'Aufdachmarkise mit Somfy-Motor' : awningType === 'unterdach' ? 'Unterdachmarkise mit Somfy-Motor' : 'ZIP-Senkrechtmarkise mit Somfy-Motor',
                                                                `${awningWidth} × ${awningProjection} mm`,
                                                                'accessory'
                                                            )}
                                                            disabled={awningPrice === null}
                                                            className={`w-full py-3 rounded-lg font-bold transition-all shadow-sm ${awningPrice
                                                                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:shadow-md transform hover:-translate-y-0.5'
                                                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                                                        >
                                                            {awningPrice !== null ? <><span className="inline-flex items-center gap-1">{IC.build('w-4 h-4')} Hinzufügen</span></> : 'Berechnung...'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    )}

                                    {/* ====== MATERIALS TAB ====== */}
                                    {/* ====== MATERIALS TAB ====== */}
                                    {wallTab === 'materials' && (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                                <span className="text-indigo-900 font-medium">Materialien für Modell:</span>
                                                <span className="font-bold text-indigo-700 bg-white px-4 py-1.5 rounded-lg text-sm border border-indigo-200 shadow-sm">{ROOF_MODELS.find(m => m.id === model)?.name || model}</span>
                                            </div>

                                            {/* Selected Materials Summary Bar */}
                                            {Object.values(materialQuantities).some(q => q > 0) && (
                                                <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white p-4 rounded-xl flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        {IC.cart('w-5 h-5')}
                                                        <div>
                                                            <div className="font-bold text-sm">
                                                                {Object.values(materialQuantities).filter(q => q > 0).length} Positionen ausgewählt
                                                            </div>
                                                            <div className="text-xs text-slate-300">
                                                                Gesamt: {formatCurrency(Object.entries(materialQuantities).reduce((sum, [id, qty]) => {
                                                                    const mat = materials.find(m => m.id === id);
                                                                    return sum + (mat ? mat.base_price * qty : 0);
                                                                }, 0))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            Object.entries(materialQuantities).forEach(([id, qty]) => {
                                                                if (qty > 0) {
                                                                    const mat = materials.find(m => m.id === id);
                                                                    if (mat) {
                                                                        addToBasket(mat.name, mat.base_price * qty, mat.dimension || '', `${qty}x`, 'accessory');
                                                                    }
                                                                }
                                                            });
                                                            setMaterialQuantities({});
                                                        }}
                                                        className="px-6 py-2.5 bg-white text-slate-800 font-bold rounded-xl hover:bg-slate-100 transition-all transform hover:-translate-y-0.5 shadow-lg text-sm flex items-center gap-2"
                                                    >
                                                        {IC.build('w-4 h-4')} In den Warenkorb
                                                    </button>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Profile Column */}
                                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                                                    <h5 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
                                                        <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">{IC.ruler('w-4 h-4')}</span>
                                                        Profile & Sparren
                                                    </h5>
                                                    <div className="space-y-1.5 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                                                        {loadingMaterials ? (
                                                            <div className="text-center py-8 text-slate-400">Laden...</div>
                                                        ) : materials.filter(m => m.category === 'profile').map(mat => {
                                                            const qty = materialQuantities[mat.id] || 0;
                                                            const imgSrc = getMaterialImage(mat.name);
                                                            return (
                                                                <div key={mat.id} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${qty > 0 ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}>
                                                                    {/* Thumbnail — click to enlarge */}
                                                                    <div
                                                                        className={`w-12 h-12 rounded-lg bg-white border border-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center p-0.5 ${imgSrc ? 'cursor-zoom-in hover:border-indigo-300 hover:shadow-md' : ''} transition-all`}
                                                                        onClick={() => imgSrc && setMaterialLightbox({ src: imgSrc, name: mat.name })}
                                                                    >
                                                                        {imgSrc ? (
                                                                            <img src={imgSrc} alt={mat.name} className="w-full h-full object-contain" loading="lazy" />
                                                                        ) : (
                                                                            <span className="text-slate-300">{IC.square('w-6 h-6')}</span>
                                                                        )}
                                                                    </div>
                                                                    {/* Info */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="font-bold text-slate-700 text-sm leading-tight truncate">{mat.name}</div>
                                                                        <div className="text-[11px] text-slate-400 mt-0.5">{mat.dimension} · {formatCurrency(mat.base_price)}/{mat.unit}</div>
                                                                    </div>
                                                                    {/* Qty controls */}
                                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                        <button onClick={() => setMaterialQuantities(prev => ({ ...prev, [mat.id]: Math.max(0, (prev[mat.id] || 0) - 1) }))} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-red-500 transition-colors text-sm">−</button>
                                                                        <span className={`w-7 text-center text-sm font-bold ${qty > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>{qty}</span>
                                                                        <button onClick={() => setMaterialQuantities(prev => ({ ...prev, [mat.id]: (prev[mat.id] || 0) + 1 }))} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-indigo-500 hover:text-white transition-colors font-bold text-sm">+</button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Other Materials Column */}
                                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                                                    <h5 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
                                                        <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">{IC.wrench('w-4 h-4')}</span>
                                                        Sonstige Materialien
                                                    </h5>
                                                    <div className="space-y-1.5 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                                                        {materials.filter(m => m.category !== 'profile').map(mat => {
                                                            const qty = materialQuantities[mat.id] || 0;
                                                            const imgSrc = getMaterialImage(mat.name);
                                                            return (
                                                                <div key={mat.id} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${qty > 0 ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}>
                                                                    {/* Thumbnail — click to enlarge */}
                                                                    <div
                                                                        className={`w-12 h-12 rounded-lg bg-white border border-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center p-0.5 ${imgSrc ? 'cursor-zoom-in hover:border-emerald-300 hover:shadow-md' : ''} transition-all`}
                                                                        onClick={() => imgSrc && setMaterialLightbox({ src: imgSrc, name: mat.name })}
                                                                    >
                                                                        {imgSrc ? (
                                                                            <img src={imgSrc} alt={mat.name} className="w-full h-full object-contain" loading="lazy" />
                                                                        ) : (
                                                                            <span className="text-slate-300">{IC.wrench('w-6 h-6')}</span>
                                                                        )}
                                                                    </div>
                                                                    {/* Info */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="font-bold text-slate-700 text-sm leading-tight truncate">{mat.name}</div>
                                                                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                                                                            {formatCurrency(mat.base_price)}/{mat.unit}
                                                                            <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] uppercase tracking-wide font-bold text-slate-500">{mat.category}</span>
                                                                        </div>
                                                                    </div>
                                                                    {/* Qty controls */}
                                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                        <button onClick={() => setMaterialQuantities(prev => ({ ...prev, [mat.id]: Math.max(0, (prev[mat.id] || 0) - 1) }))} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-red-500 transition-colors text-sm">−</button>
                                                                        <span className={`w-7 text-center text-sm font-bold ${qty > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{qty}</span>
                                                                        <button onClick={() => setMaterialQuantities(prev => ({ ...prev, [mat.id]: (prev[mat.id] || 0) + 1 }))} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-emerald-500 hover:text-white transition-colors font-bold text-sm">+</button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bottom action (fallback if summary bar not visible) */}
                                            {!Object.values(materialQuantities).some(q => q > 0) && (
                                                <div className="text-center py-3 text-xs text-slate-400">
                                                    Wählen Sie Materialien aus und klicken Sie +, um sie zur Kalkulation hinzuzufügen
                                                </div>
                                            )}

                                            {/* ====== MATERIAL IMAGE LIGHTBOX MODAL ====== */}
                                            {materialLightbox && (
                                                <div
                                                    className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-8 backdrop-blur-sm"
                                                    onClick={() => setMaterialLightbox(null)}
                                                >
                                                    <div
                                                        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden"
                                                        onClick={e => e.stopPropagation()}
                                                    >
                                                        {/* Header */}
                                                        <div className="flex items-center justify-between p-4 border-b border-slate-200">
                                                            <h4 className="font-bold text-slate-800 text-base">{materialLightbox.name}</h4>
                                                            <button
                                                                onClick={() => setMaterialLightbox(null)}
                                                                className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                        {/* Image */}
                                                        <div className="p-6 flex items-center justify-center bg-slate-50" style={{ minHeight: '300px' }}>
                                                            <img
                                                                src={materialLightbox.src}
                                                                alt={materialLightbox.name}
                                                                className="max-w-full max-h-[60vh] object-contain"
                                                                style={{ imageRendering: 'auto' }}
                                                            />
                                                        </div>
                                                        {/* Footer info */}
                                                        <div className="p-3 border-t border-slate-200 text-center text-xs text-slate-400">
                                                            Technischer Profilquerschnitt · Quelle: Aluxe Preisliste
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}


                                    {/* ====== WPC FLOORING TAB ====== */}
                                    {wallTab === 'wpc' && (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between bg-amber-50 p-4 rounded-xl border border-amber-100">
                                                <span className="text-amber-900 font-medium">🪵 WPC-Boden (Terrasse)</span>
                                                <span className="font-bold text-amber-700 bg-white px-4 py-1.5 rounded-lg text-sm border border-amber-200 shadow-sm">Preis pro m²</span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Dimensions */}
                                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                                    <h5 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2">
                                                        <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">{IC.measure('w-4 h-4')}</span>
                                                        Wymiary Tarasu
                                                    </h5>
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Powierzchnia (m²)</label>
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                min="0"
                                                                value={wpcArea}
                                                                onChange={e => {
                                                                    const area = parseFloat(e.target.value) || 0;
                                                                    setWpcArea(area);
                                                                    setWpcTotal(area * wpcPricePerM2);
                                                                }}
                                                                className="w-full p-3 rounded-lg border border-slate-200 font-bold text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                                                                placeholder="np. 15.5"
                                                            />
                                                        </div>
                                                        <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600">
                                                            <strong>Hinweis:</strong> Berechne m² als Breite × Tiefe in Metern
                                                            <div className="mt-2 text-xs text-slate-400">
                                                                Beispiel: Dach {width}mm × {projection}mm = {((width * projection) / 1000000).toFixed(2)} m²
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    const area = (width * projection) / 1000000;
                                                                    setWpcArea(parseFloat(area.toFixed(2)));
                                                                    setWpcTotal(area * wpcPricePerM2);
                                                                }}
                                                                className="mt-2 text-xs text-amber-600 hover:text-amber-800 font-bold"
                                                            >
                                                                → Dachmaße verwenden
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Pricing */}
                                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                                    <h5 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2">
                                                        <span className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">{IC.compass('w-4 h-4')}</span>
                                                        Cena WPC
                                                    </h5>
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                                            <span className="text-slate-500">Cena za m²:</span>
                                                            <span className="font-bold text-lg">{formatCurrency(wpcPricePerM2)}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                                            <span className="text-slate-500">Powierzchnia:</span>
                                                            <span className="font-bold text-lg">{wpcArea.toFixed(2)} m²</span>
                                                        </div>
                                                        <div className="flex justify-between items-center py-3 bg-amber-50 rounded-lg px-3">
                                                            <span className="text-amber-900 font-bold">Suma:</span>
                                                            <span className="font-black text-2xl text-amber-700">{formatCurrency(wpcTotal)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-end pt-4">
                                                <button
                                                    onClick={() => {
                                                        if (wpcArea > 0 && wpcTotal > 0) {
                                                            addToBasket('WPC-Boden', wpcTotal, 'Terrasse WPC', `${wpcArea.toFixed(2)} m²`, 'accessory');
                                                            setWpcArea(0);
                                                            setWpcTotal(0);
                                                        }
                                                    }}
                                                    disabled={wpcArea <= 0 || wpcTotal <= 0}
                                                    className={`px-8 py-3 font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 ${wpcArea > 0 && wpcTotal > 0
                                                        ? 'bg-amber-600 text-white hover:bg-amber-700'
                                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                        }`}
                                                >
                                                    <span className="inline-flex items-center gap-1">{IC.build('w-4 h-4')} WPC hinzufügen</span>
                                                </button>
                                            </div>

                                            <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-700 border border-blue-100">
                                                <strong className="inline-flex items-center gap-1">{IC.sun('w-3.5 h-3.5')} Hinweis:</strong> WPC-Preis wird unter Admin → Preislisten V2 → WPC-Böden eingestellt.
                                            </div>
                                        </div>
                                    )}

                                    {/* ====== ALUMINUM WALLS TAB ====== */}
                                    {wallTab === 'aluminum' && (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between bg-slate-100 p-4 rounded-xl border border-slate-200">
                                                <span className="text-slate-900 font-medium inline-flex items-center gap-1">{IC.square('w-4 h-4')} Aluminium-Wände</span>
                                                <span className="font-bold text-slate-700 bg-white px-4 py-1.5 rounded-lg text-sm border border-slate-300 shadow-sm">Vollwand / Lamellen</span>
                                            </div>

                                            {/* Wall Type Selector */}
                                            <div className="grid grid-cols-2 gap-4">
                                                {[
                                                    { id: 'full', name: 'Vollwand', icon: '⬛', desc: 'Aluminium-Vollwand' },
                                                    { id: 'lamellar', name: 'Lamelowa', icon: '≡', desc: 'Lamele aluminiowe (mb × wys)' },
                                                ].map(type => (
                                                    <button
                                                        key={type.id}
                                                        onClick={() => setAluWallType(type.id as 'full' | 'lamellar')}
                                                        className={`p-4 rounded-xl border-2 text-left transition-all ${aluWallType === type.id
                                                            ? 'border-slate-800 bg-slate-50 shadow-md'
                                                            : 'border-slate-200 hover:border-slate-400'
                                                            }`}
                                                    >
                                                        <div className="text-2xl mb-2">{type.icon}</div>
                                                        <div className="font-bold text-slate-800">{type.name}</div>
                                                        <div className="text-xs text-slate-500">{type.desc}</div>
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Dimensions */}
                                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                                    <h5 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2">
                                                        <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">{IC.measure('w-4 h-4')}</span>
                                                        Wymiary
                                                    </h5>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                                                                {aluWallType === 'lamellar' ? 'Länge (m)' : 'Breite (mm)'}
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={aluWallWidth}
                                                                onChange={e => setAluWallWidth(Number(e.target.value))}
                                                                className="w-full p-3 rounded-lg border border-slate-200 font-bold text-slate-800 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 outline-none transition-all"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Höhe (mm)</label>
                                                            <input
                                                                type="number"
                                                                value={aluWallHeight}
                                                                onChange={e => setAluWallHeight(Number(e.target.value))}
                                                                className="w-full p-3 rounded-lg border border-slate-200 font-bold text-slate-800 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 outline-none transition-all"
                                                            />
                                                        </div>
                                                    </div>
                                                    {aluWallType === 'lamellar' && (
                                                        <div className="mt-4 bg-blue-50 p-3 rounded-lg text-xs text-blue-700">
                                                            <strong>Formel:</strong> Preis = Preis_pro_m × Länge_m × (Höhe_mm / 1000)
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Pricing */}
                                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                                    <h5 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2">
                                                        <span className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">{IC.compass('w-4 h-4')}</span>
                                                        Preis
                                                    </h5>
                                                    {aluWallPriceLoading ? (
                                                        <div className="flex items-center justify-center py-12">
                                                            <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full"></div>
                                                        </div>
                                                    ) : aluWallPrice !== null ? (
                                                        <div className="space-y-4">
                                                            <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                                                <span className="text-slate-500">Typ:</span>
                                                                <span className="font-bold">{aluWallType === 'full' ? 'Vollwand' : 'Lamellen'}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                                                <span className="text-slate-500">Wymiary:</span>
                                                                <span className="font-bold">{aluWallWidth} × {aluWallHeight} mm</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-3 bg-slate-100 rounded-lg px-3">
                                                                <span className="text-slate-900 font-bold">Preis:</span>
                                                                <span className="font-black text-2xl text-slate-800">{formatCurrency(aluWallPrice)}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-8 text-slate-400">
                                                            <div className="flex items-center justify-center mb-2">{IC.compass('w-10 h-10 text-slate-400')}</div>
                                                            <p>Kein Preis für gewählte Maße</p>
                                                            <p className="text-xs mt-2">Preisliste ergänzen: Admin → Preislisten V2 → Alu-Wände</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex justify-end pt-4">
                                                <button
                                                    onClick={() => {
                                                        if (aluWallPrice && aluWallPrice > 0) {
                                                            addToBasket(
                                                                `Alu-Wand ${aluWallType === 'full' ? 'Voll' : 'Lamellen'}`,
                                                                aluWallPrice,
                                                                aluWallType === 'full' ? 'Aluminum Wall Full' : 'Aluminum Wall Lamellar',
                                                                `${aluWallWidth}x${aluWallHeight}`,
                                                                'wall'
                                                            );
                                                        }
                                                    }}
                                                    disabled={!aluWallPrice || aluWallPrice <= 0}
                                                    className={`px-8 py-3 font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 ${aluWallPrice && aluWallPrice > 0
                                                        ? 'bg-slate-800 text-white hover:bg-slate-700'
                                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                        }`}
                                                >
                                                    <span className="inline-flex items-center gap-1">{IC.build('w-4 h-4')} Alu-Wand hinzufügen</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* LED tab redirect - merge into awnings */}
                                    {wallTab === 'led' && (
                                        <div className="text-center py-12">
                                            <div className="flex items-center justify-center mb-4">{IC.sun('w-12 h-12 text-slate-300')}</div>
                                            <p className="text-slate-500 mb-4">LED und Zubehör wurden in den Tab "Komfort" verschoben</p>
                                            <button onClick={() => setWallTab('awnings')} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold">
                                                Weiter zu Komfort →
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}


                        {/* Navigation Buttons */}
                        <div className="flex justify-between pt-8 border-t border-slate-200">
                            <button
                                onClick={() => setActiveStep(prev => Math.max(0, prev - 1))}
                                disabled={activeStep === 0}
                                className={`px-6 py-3 rounded-xl font-bold transition-all ${activeStep === 0 ? 'opacity-0 pointer-events-none' : 'bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                                ← Wstecz
                            </button>
                            <button
                                onClick={() => setActiveStep(prev => Math.min(steps.length - 1, prev + 1))}
                                disabled={activeStep === steps.length - 1}
                                className={`px-8 py-3 rounded-xl font-bold bg-slate-800 text-white hover:bg-slate-700 transition-all ${activeStep === steps.length - 1 ? 'hidden' : 'block'}`}
                            >
                                Dalej →
                            </button>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Summary (Always visible in Config/Summary view) */}
                    {
                        (view === 'config') && (
                            <div className="col-span-12 lg:col-span-3 space-y-4 lg:sticky lg:top-4">
                                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">{IC.clipboard('w-4 h-4')} Zusammenfassung</h3>

                                    {/* Main Config Summary */}
                                    <div className="mb-6 space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500">Model</span>
                                            <span className="font-bold text-slate-800">{ROOF_MODELS.find(m => m.id === model)?.name || model}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500">Wymiar</span>
                                            <span className="font-bold text-slate-800">{width} × {projection}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500">Montaż</span>
                                            <span className={`font-bold ${construction === 'freestanding' ? 'text-amber-600' : 'text-slate-800'}`}>
                                                {construction === 'wall' ? 'Wandmontage' : `Freistehend ${freestandingSurchargePrice > 0 ? '(+' + formatCurrency(freestandingSurchargePrice) + ')' : ''}`}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500">Pokrycie</span>
                                            <span className="font-bold text-slate-800">
                                                {cover === 'Glass'
                                                    ? `Glas VSG${isTerandaModel(model) ? (model === 'TR20' ? ' 55.2' : ' 44.2') : ''} (${glassVariant === 'klar' ? 'Klar' : glassVariant === 'matt' ? 'Matt' : glassVariant === 'stopsol' ? 'Stopsol' : glassVariant})`
                                                    : `Polycarbonat${isTerandaModel(model) ? ' 16mm' : ''} (${polyVariant === 'opal' ? 'Opal' : polyVariant === 'klar' ? 'Klar' : polyVariant === 'reflex-pearl' ? 'Reflex Pearl' : polyVariant})`
                                                }
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500">Kolor</span>
                                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                                <span className="w-3 h-3 rounded-full border border-slate-300" style={{ background: color === 'RAL 7016' ? '#383E42' : color === 'RAL 9016' ? '#F1F0EA' : color === 'RAL 9001' ? '#E9E0D2' : color === 'RAL 9006' ? '#A6A9AD' : color === 'RAL 9007' ? '#8F8F8C' : color === 'DB 703' ? '#695C4F' : '#666' }} />
                                                {color}{sonderfarben ? ' *' : ''}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500">Strefa śniegowa</span>
                                            <span className="font-bold text-slate-800">Zone {isTerandaModel(model) ? 2 : zone}</span>
                                        </div>
                                        {model === 'Designline' && schiebeeinheitCount > 0 && (
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-500">Schiebeeinheit</span>
                                                <span className="font-bold text-indigo-600">
                                                    {schiebeeinheitCount}× (+{formatCurrency(schiebeeinheitTotalPrice)})
                                                </span>
                                            </div>
                                        )}

                                        {/* Structural info */}
                                        {structuralMetadata && (
                                            <div className="mt-1 pt-2 border-t border-slate-100 space-y-1">
                                                {structuralMetadata.fields_count != null && structuralMetadata.fields_count > 0 && (
                                                    <div className="flex justify-between items-center text-xs text-slate-500">
                                                        <span>Sparren / Felder</span>
                                                        <span className="font-medium text-slate-700">{structuralMetadata.fields_count + 1} / {structuralMetadata.fields_count}</span>
                                                    </div>
                                                )}
                                                {structuralMetadata.posts_count != null && (
                                                    <div className="flex justify-between items-center text-xs text-slate-500">
                                                        <span>Pfosten</span>
                                                        <span className="font-medium text-slate-700">{structuralMetadata.posts_count + (extraPosts || 0)} Stk.</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {materialBOM && (
                                            <div className="mt-1 pt-2 border-t border-slate-100 space-y-0.5">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-500">Materialien</span>
                                                    <span className="font-bold text-amber-600">
                                                        +{formatCurrency(materialBOM.total)}
                                                    </span>
                                                </div>
                                                <div className="text-[10px] text-slate-400 pl-2 space-y-0.5">
                                                    <div className="flex justify-between">
                                                        <span>├ {cover === 'Glass' ? 'VSG' : 'Poly'} Eindeckung</span>
                                                        <span>{formatCurrency(materialBOM.coverCost)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>├ Sparren ({structuralMetadata?.fields_count ? structuralMetadata.fields_count + 1 : '?'}×)</span>
                                                        <span>{formatCurrency(materialBOM.sparrenCost)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>└ Zubehör</span>
                                                        <span>{formatCurrency(materialBOM.accessoriesCost)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div className="h-px bg-slate-100 my-2" />

                                        {/* Technical Specs from Technikmappe */}
                                        {TECH_SPECS[model] && (
                                            <div className="mb-2 p-2 bg-slate-50 rounded-lg">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">{IC.compass('w-3 h-3')} Technische Daten</p>
                                                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-slate-500">
                                                    <span>Glasgefälle:</span>
                                                    <span className="font-medium text-slate-700">{TECH_SPECS[model].glassFall}</span>
                                                    <span>Breite:</span>
                                                    <span className="font-medium text-slate-700">{TECH_SPECS[model].minWidth}–{TECH_SPECS[model].maxWidth}mm</span>
                                                    <span>Tiefe:</span>
                                                    <span className="font-medium text-slate-700">{TECH_SPECS[model].minDepth}–{TECH_SPECS[model].maxDepth}mm</span>
                                                    <span>Max. Höhe:</span>
                                                    <span className="font-medium text-slate-700">{TECH_SPECS[model].maxHeight}mm</span>
                                                    {TECH_SPECS[model].keilmassMin && (
                                                        <>
                                                            <span>Keilmaß min.:</span>
                                                            <span className="font-medium text-slate-700">{TECH_SPECS[model].keilmassMin}mm</span>
                                                        </>
                                                    )}
                                                </div>
                                                {/* Profile Specs from Excel */}
                                                {PROFILE_SPECS[model] && (
                                                    <div className="mt-1.5 pt-1.5 border-t border-slate-200">
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Profile</p>
                                                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-slate-500">
                                                            {PROFILE_SPECS[model].pfosten !== '—' && (
                                                                <>
                                                                    <span>Pfosten:</span>
                                                                    <span className="font-medium text-slate-700">{PROFILE_SPECS[model].pfosten}</span>
                                                                </>
                                                            )}
                                                            {structuralMetadata?.rafter_type && (
                                                                <>
                                                                    <span>Sparren:</span>
                                                                    <span className="font-medium text-slate-700">
                                                                        {structuralMetadata.rafter_type}-Sparren {PROFILE_SPECS[model].sparrenTypes.find(s => s.type === structuralMetadata.rafter_type)?.dim || ''}
                                                                    </span>
                                                                </>
                                                            )}
                                                            {structuralMetadata?.fields_count != null && structuralMetadata.fields_count > 0 && (
                                                                <>
                                                                    <span>Felder:</span>
                                                                    <span className="font-medium text-slate-700">{structuralMetadata.fields_count} Felder / {structuralMetadata.fields_count + 1} Sparren</span>
                                                                </>
                                                            )}
                                                            {structuralMetadata?.posts_count != null && (
                                                                <>
                                                                    <span>Pfosten Anz.:</span>
                                                                    <span className="font-medium text-slate-700">{structuralMetadata.posts_count + (extraPosts || 0)} Stk.</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Dimension validation warning */}
                                        {TECH_SPECS[model] && (width > TECH_SPECS[model].maxWidth || projection > TECH_SPECS[model].maxDepth || width < TECH_SPECS[model].minWidth || projection < TECH_SPECS[model].minDepth) && (
                                            <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                                                <p className="text-[10px] font-bold text-red-600">
                                                    <span className="inline-flex items-center gap-1">{IC.alert('w-3.5 h-3.5')} Abmessungen außerhalb der Spezifikation!</span>
                                                    {width > TECH_SPECS[model].maxWidth && ` Breite max. ${TECH_SPECS[model].maxWidth}mm.`}
                                                    {width < TECH_SPECS[model].minWidth && ` Breite min. ${TECH_SPECS[model].minWidth}mm.`}
                                                    {projection > TECH_SPECS[model].maxDepth && ` Tiefe max. ${TECH_SPECS[model].maxDepth}mm.`}
                                                    {projection < TECH_SPECS[model].minDepth && ` Tiefe min. ${TECH_SPECS[model].minDepth}mm.`}
                                                </p>
                                            </div>
                                        )}

                                        {/* Price Display */}
                                        <div className="text-center py-2">
                                            {price ? (
                                                <>
                                                    <div className="text-3xl font-black text-slate-900">{formatCurrency(totalPrice || 0)}</div>
                                                    <div className="text-[10px] text-slate-400 font-medium mt-1">Nettopreis (ohne MwSt.)</div>
                                                    {structureCount > 1 && (
                                                        <div className="text-xs text-amber-600 font-medium mt-2 bg-amber-50 rounded-lg py-1.5 px-3 inline-block">
                                                            <span className="inline-flex items-center gap-1">{IC.link('w-3.5 h-3.5')} {structureCount}× Verbundkonstruktion</span>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="text-slate-400 italic text-sm">{error || 'Wird berechnet...'}</div>
                                            )}
                                        </div>

                                        <button
                                            onClick={handleAddRoofToBasket}
                                            disabled={!totalPrice}
                                            className={`w-full py-3 rounded-xl font-bold transition-all ${totalPrice
                                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transform hover:-translate-y-0.5'
                                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                }`}
                                        >
                                            Dach hinzufügen +
                                        </button>
                                    </div>
                                </div>

                                {/* Basket Preview */}
                                <div className="bg-white rounded-2xl shadow border border-slate-200 p-4">
                                    <div className="flex justify-between items-center mb-4 cursor-pointer" onClick={() => setShowBasket(!showBasket)}>
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                            {IC.cart('w-5 h-5')} Positionen <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">{basket.length}</span>
                                        </h3>
                                        <span className="text-slate-400 text-sm">{showBasket ? '▼' : '▲'}</span>
                                    </div>

                                    {showBasket && (
                                        <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
                                            {basket.map((item, i) => (
                                                <div key={item.id} className="text-sm border-b border-slate-50 last:border-0 pb-2 group">
                                                    <div className="flex justify-between font-bold text-slate-700">
                                                        <span>{item.name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span>{formatCurrency(item.price)}</span>
                                                            <button
                                                                onClick={() => removeFromBasket(item.id)}
                                                                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 text-xs transition-opacity"
                                                                title="Entfernen"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-slate-400 truncate pr-4">{item.config}</div>
                                                    {item.dimensions && (
                                                        <div className="text-[10px] text-slate-400/70 font-mono truncate pr-4 flex items-center gap-1">{IC.measure('w-3 h-3')} {item.dimensions}</div>
                                                    )}
                                                </div>
                                            ))}
                                            {basket.length === 0 && <p className="text-center text-slate-400 text-xs py-2">Keine Positionen</p>}
                                        </div>
                                    )}

                                    <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                                        <span className="text-sm font-medium text-slate-500">Razem:</span>
                                        <span className="font-black text-lg text-indigo-600">{formatCurrency(basketTotal)}</span>
                                    </div>

                                    <button
                                        onClick={() => basket.length > 0 ? setView('summary') : toast.error('Bitte Positionen hinzufügen')}
                                        className={`w-full mt-3 py-2 rounded-lg font-bold text-sm ${basket.length > 0
                                            ? 'bg-slate-900 text-white hover:bg-slate-800'
                                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                            }`}
                                    >
                                        Weiter zum Angebot →
                                    </button>
                                </div>
                            </div>
                        )
                    }
                </>
            )}

            {/* Email Send Modal — proven SendEmailModal from leads */}
            <SendEmailModal
                isOpen={showSendEmailModal}
                onClose={() => setShowSendEmailModal(false)}
                to={customerState?.email || ''}
                leadData={{
                    firstName: customerState?.firstName,
                    lastName: customerState?.lastName || customerState?.name,
                    companyName: customerState?.companyName,
                }}
                leadId={savedOfferRef.current?.leadId}
                offer={savedOfferRef.current || undefined}
            />
        </div >
    );
};
