import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ContractService } from '../../services/database/contract.service';
import { generateBestellscheinPDF } from '../../utils/bestellscheinPDF';
import { toast } from 'react-hot-toast';
import type { Contract } from '../../types';
import { getBrand, normalizeVat } from '../../config/brandConfig';

// Polskie etykiety wyświetlane dla wartości kanonicznych (wartości zapisywane bez zmian,
// dzięki czemu dopasowanie checkboxów w PDF nadal działa).
const PL_OPT: Record<string, string> = {
  'Opal': 'Opal', 'Klar': 'Przezroczysty', 'UV Reflex Opal': 'UV Reflex Opal', 'UV Reflex Klar': 'UV Reflex przezroczysty',
  'Matt/milch': 'Matowe/mleczne', 'Sonnenschutzglass': 'Szkło przeciwsłoneczne', 'ISO (nur glass)': 'ISO (tylko szkło)',
  'Panoramaschiebesystem': 'System przesuwny panoramiczny', 'Rahmen mit Schiebelementen': 'Rama z elementami przesuwnymi',
  'Festwand': 'Ściana stała', 'ZIP Screen': 'Roleta ZIP', 'Markise': 'Markiza',
  'Andere': 'Inny', 'Polycarbonat': 'Poliwęglan', 'Glass': 'Szkło',
};

// ── Form State ──
interface BestellscheinData {
  // Client
  clientName: string;
  clientAddress: string;
  clientMobil: string;
  clientEmail: string;
  // Order
  datum: string;
  contractNumber: string;
  priceNet: number;
  priceGross: number;
  // Construction
  konstruktionstyp: string;
  befestigung: 'wall' | 'freestanding' | '';
  breite: string;
  tiefe: string;
  maxHoehe: string;
  farbe: string;
  farbeAndere: string;
  // Roof
  dachPolycarbonat: string;
  dachGlassThickness: string;
  dachGlassType: string;
  // Keilfenster
  keilfensterMaterial: string;
  keilfensterType: string;
  // Side options
  sideLeft: string[];
  sideFront: string[];
  sideRight: string[];
  // LED
  ledSpots: boolean;
  ledSpotsCount: string;
  ledStripe: boolean;
  ledStripeLength: string;
  // Heizstrahler
  heizTyp4: boolean;
  heizTyp5: boolean;
  // Montage
  montagePolendach: boolean;
  montageKunde: boolean;
  // Notes
  beschreibung: string;
}

const KONSTRUKTION_TYPES = [
  { id: 'trendstyle', label: 'Trendstyle' },
  { id: 'topstyle', label: 'Topstyle' },
  { id: 'topstyle_xl', label: 'Topstyle XL' },
  { id: 'carport', label: 'Carport' },
  { id: 'ultrastyle', label: 'Ultrastyle' },
  { id: 'skystyle', label: 'Skystyle' },
  { id: 'pergola', label: 'Pergola' },
  { id: 'pergola_deluxe', label: 'Pergola deluxe' },
];

const FARBEN = [
  { id: '7016', label: 'RAL 7016' },
  { id: '9005', label: 'RAL 9005' },
  { id: '9016', label: 'RAL 9016' },
  { id: '9007', label: 'RAL 9007' },
  { id: 'andere', label: 'Andere' },
];

const SIDE_OPTIONS = [
  'Panoramaschiebesystem',
  'Rahmen mit Schiebelementen',
  'Festwand',
  'ZIP Screen',
  'Markise',
];

function initFromContract(c: Contract): BestellscheinData {
  const p = c.product as any;
  const pr = c.pricing as any;
  const cl = c.client;
  const rawVat = pr?.vatRate;
  const vat = rawVat ? (rawVat < 1 ? 1 + rawVat : rawVat) : 1.19;
  const net = pr?.finalPriceNet || pr?.sellingPriceNet || 0;
  const modelId = (p?.modelId || '').toLowerCase().replace(/line/g, 'style');
  const colorRaw = (p?.color || '').toLowerCase();

  let farbe = '';
  if (colorRaw.includes('7016') || colorRaw.includes('anthrac')) farbe = '7016';
  else if (colorRaw.includes('9005')) farbe = '9005';
  else if (colorRaw.includes('9016') || colorRaw.includes('white')) farbe = '9016';
  else if (colorRaw.includes('9007')) farbe = '9007';
  else if (colorRaw) farbe = 'andere';

  return {
    clientName: `${cl.firstName || ''} ${cl.lastName || ''}`.trim(),
    clientAddress: `${cl.street || ''} ${cl.houseNumber || ''}, ${cl.postalCode || ''} ${cl.city || ''}`.trim(),
    clientMobil: cl.phone || '',
    clientEmail: cl.email || '',
    datum: c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    contractNumber: c.contractNumber || '',
    priceNet: net,
    priceGross: Math.round(net * vat * 100) / 100,
    konstruktionstyp: modelId,
    befestigung: (p?.installationType || '').toLowerCase().includes('free') ? 'freestanding' : 'wall',
    breite: String(p?.width || ''),
    tiefe: String(p?.projection || ''),
    maxHoehe: String(p?.maxHeight || ''),
    farbe,
    farbeAndere: farbe === 'andere' ? (p?.color || '') : '',
    dachPolycarbonat: '',
    dachGlassThickness: '',
    dachGlassType: '',
    keilfensterMaterial: '',
    keilfensterType: '',
    sideLeft: [],
    sideFront: [],
    sideRight: [],
    ledSpots: false,
    ledSpotsCount: '',
    ledStripe: false,
    ledStripeLength: '',
    heizTyp4: false,
    heizTyp5: false,
    montagePolendach: true,
    montageKunde: false,
    beschreibung: c.installationNotes || '',
  };
}

// ── Section wrapper ──
const Section: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <div className={`mb-6 ${className || ''}`}>
    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b-2 border-slate-800 pb-1 mb-4">{title}</h3>
    {children}
  </div>
);

// ── Checkbox ──
const Check: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; className?: string }> = ({ checked, onChange, label, className }) => (
  <label className={`flex items-center gap-2 cursor-pointer select-none ${className || ''}`}>
    <div
      className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${checked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-400 bg-white'}`}
      onClick={() => onChange(!checked)}
    >
      {checked && <span className="text-xs font-bold">✓</span>}
    </div>
    <span className="text-sm text-slate-700">{label}</span>
  </label>
);

// ── Input field ──
const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; className?: string; type?: string }> = ({ label, value, onChange, placeholder, className, type }) => (
  <div className={className || ''}>
    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">{label}</label>
    <input
      type={type || 'text'}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border-b-2 border-slate-300 focus:border-blue-600 outline-none py-1 px-0 text-sm bg-transparent transition-colors"
    />
  </div>
);

// ═══════════ MAIN COMPONENT ═══════════
export const BestellscheinPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [data, setData] = useState<BestellscheinData | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Brand-aware: PL = zadaszto.pl (polskie etykiety), DE = Polendach24 (niemieckie)
  const brandCfg = getBrand(contract?.brand);
  const isPL = brandCfg.language === 'pl';
  const L = (de: string, pl: string) => (isPL ? pl : de);
  const optL = (v: string) => (isPL ? (PL_OPT[v] || v) : v);
  const vatMult = 1 + normalizeVat((contract?.pricing as any)?.vatRate, brandCfg.defaultVatRate);
  const vatPct = Math.round((vatMult - 1) * 100);

  useEffect(() => {
    if (!id) return;
    ContractService.getById(id).then(c => {
      if (c) {
        setContract(c);
        setData(initFromContract(c));
      }
      setLoading(false);
    });
  }, [id]);

  const upd = (key: keyof BestellscheinData, val: any) => {
    setData(prev => prev ? { ...prev, [key]: val } : prev);
  };

  const toggleSide = (side: 'sideLeft' | 'sideFront' | 'sideRight', opt: string) => {
    setData(prev => {
      if (!prev) return prev;
      const arr = prev[side] as string[];
      return { ...prev, [side]: arr.includes(opt) ? arr.filter(x => x !== opt) : [...arr, opt] };
    });
  };

  const handleGeneratePDF = async () => {
    if (!contract || !data) return;
    setGenerating(true);
    try {
      // Merge form data back into a temporary contract object for PDF generation
      const merged: Contract = {
        ...contract,
        contractNumber: data.contractNumber,
        installationNotes: data.beschreibung,
        client: {
          ...contract.client,
          firstName: data.clientName.split(' ')[0] || '',
          lastName: data.clientName.split(' ').slice(1).join(' ') || '',
          phone: data.clientMobil,
          email: data.clientEmail,
        },
        pricing: {
          ...(contract.pricing as any),
          finalPriceNet: data.priceNet,
          sellingPriceNet: data.priceNet,
        },
        product: {
          ...(contract.product as any),
          modelId: data.konstruktionstyp,
          installationType: data.befestigung,
          width: data.breite ? Number(data.breite) : undefined,
          projection: data.tiefe ? Number(data.tiefe) : undefined,
          maxHeight: data.maxHoehe ? Number(data.maxHoehe) : undefined,
          color: data.farbe === 'andere' ? data.farbeAndere : data.farbe,
        },
      };
      // Pass the COMPLETE form selections — checkboxes in the PDF render from these values
      await generateBestellscheinPDF(merged, {
        datum: data.datum,
        dachPolycarbonat: data.dachPolycarbonat,
        dachGlassThickness: data.dachGlassThickness,
        dachGlassType: data.dachGlassType,
        keilfensterMaterial: data.keilfensterMaterial,
        keilfensterType: data.keilfensterType,
        sideLeft: data.sideLeft,
        sideFront: data.sideFront,
        sideRight: data.sideRight,
        ledSpots: data.ledSpots,
        ledSpotsCount: data.ledSpotsCount,
        ledStripe: data.ledStripe,
        ledStripeLength: data.ledStripeLength,
        heizTyp4: data.heizTyp4,
        heizTyp5: data.heizTyp5,
        montagePolendach: data.montagePolendach,
        montageKunde: data.montageKunde,
      });
      toast.success('Bestellschein PDF wygenerowany!');
    } catch (err) {
      console.error(err);
      toast.error('Błąd generowania PDF');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );

  if (!contract || !data) return (
    <div className="p-8 text-center">
      <p className="text-slate-500">Nie znaleziono kontraktu</p>
      <button onClick={() => navigate('/contracts')} className="mt-4 text-blue-600 hover:underline">← Wróć do listy</button>
    </div>
  );

  return (
    <div className="max-w-[900px] mx-auto py-6 px-4">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-6 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/contracts/${id}`)} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{L('Bestellschein und Vertrag', 'Karta zamówienia')}</h1>
            <p className="text-xs text-slate-500">{L('Umowa', 'Umowa')} {data.contractNumber}</p>
          </div>
        </div>
        <button
          onClick={handleGeneratePDF}
          disabled={generating}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors text-sm flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
          {generating ? '⏳ Generowanie...' : '📄 Generuj PDF'}
        </button>
      </div>

      {/* Form — styled to look like the paper template */}
      <div ref={formRef} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* ═══════════ PAGE 1 ═══════════ */}
        <div className="p-6 border-b-4 border-slate-800">
          {/* Logo + Date */}
          <div className="flex items-start justify-between mb-4">
            <img src={isPL ? '/zadaszto-logo.png' : '/logo.png'} alt={brandCfg.company.tradeName} className="h-12" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <Field label={L('Datum', 'Data')} value={data.datum} onChange={v => upd('datum', v)} type="date" className="w-40" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            {L('Bestellschein nr', 'Karta zamówienia nr')} {data.contractNumber}
          </h2>

          {/* Client vs Company */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase">{L('Zwischen (Kunde)', 'Zamawiający')}</p>
              <Field label={L('Name, Vorname', 'Imię i nazwisko')} value={data.clientName} onChange={v => upd('clientName', v)} />
              <Field label={L('Adresse', 'Adres')} value={data.clientAddress} onChange={v => upd('clientAddress', v)} />
              <Field label={L('Mobil', 'Telefon')} value={data.clientMobil} onChange={v => upd('clientMobil', v)} />
              <Field label="E-mail" value={data.clientEmail} onChange={v => upd('clientEmail', v)} />
            </div>
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase">{L('Und (Auftragnehmer)', 'Wykonawca')}</p>
              <div className="text-sm text-slate-700 space-y-1 pt-5">
                <p className="font-bold">{brandCfg.company.legalName}</p>
                <p>{brandCfg.company.address}</p>
                <p>📞 {brandCfg.company.phone}</p>
                <p>✉️ {brandCfg.company.email}</p>
              </div>
            </div>
          </div>

          {/* Prices */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <Field label={L('Gesamtpreis exkl. MwSt. — NETTO (EUR)', `Cena netto (${brandCfg.currency})`)} value={String(data.priceNet)} onChange={v => { upd('priceNet', Number(v) || 0); upd('priceGross', Math.round((Number(v) || 0) * vatMult * 100) / 100); }} type="number" />
              <Field label={L('Gesamtpreis inkl. MwSt. (19%) — BRUTTO (EUR)', `Cena brutto (VAT ${vatPct}%) (${brandCfg.currency})`)} value={String(data.priceGross)} onChange={v => upd('priceGross', Number(v) || 0)} type="number" />
            </div>
          </div>

          {/* Konstruktionstyp */}
          <Section title={L('Konstruktionstyp', 'Typ konstrukcji')}>
            <div className="grid grid-cols-4 gap-3">
              {KONSTRUKTION_TYPES.map(kt => (
                <Check key={kt.id} checked={data.konstruktionstyp === kt.id} onChange={() => upd('konstruktionstyp', kt.id)} label={kt.label} />
              ))}
            </div>
          </Section>

          {/* Art der Befestigung */}
          <Section title={L('Art der Befestigung', 'Rodzaj mocowania')}>
            <div className="flex gap-8">
              <Check checked={data.befestigung === 'wall'} onChange={() => upd('befestigung', 'wall')} label={L('Wandmontage', 'Montaż ścienny')} />
              <Check checked={data.befestigung === 'freestanding'} onChange={() => upd('befestigung', 'freestanding')} label={L('Freistehende Konstruktion', 'Konstrukcja wolnostojąca')} />
            </div>
          </Section>

          {/* Maße */}
          <Section title={L('Maße der Konstruktion', 'Wymiary konstrukcji')}>
            <div className="grid grid-cols-3 gap-4">
              <Field label={L('Breite (mm)', 'Szerokość (mm)')} value={data.breite} onChange={v => upd('breite', v)} placeholder="np. 5000" />
              <Field label={L('Tiefe (mm)', 'Głębokość (mm)')} value={data.tiefe} onChange={v => upd('tiefe', v)} placeholder="np. 3500" />
              <Field label={L('Max. Höhe (mm)', 'Maks. wysokość (mm)')} value={data.maxHoehe} onChange={v => upd('maxHoehe', v)} placeholder="np. 2800" />
            </div>
          </Section>

          {/* Farbe */}
          <Section title={L('Farbe', 'Kolor')}>
            <div className="flex gap-4 flex-wrap">
              {FARBEN.map(f => (
                <Check key={f.id} checked={data.farbe === f.id} onChange={() => upd('farbe', f.id)} label={optL(f.label)} />
              ))}
            </div>
            {data.farbe === 'andere' && (
              <Field label={L('Andere Farbe (RAL)', 'Inny kolor (RAL)')} value={data.farbeAndere} onChange={v => upd('farbeAndere', v)} className="mt-3 max-w-xs" />
            )}
          </Section>
        </div>

        {/* ═══════════ PAGE 2 ═══════════ */}
        <div className="p-6 border-b-4 border-slate-800">
          <Section title={L('Art der Dacheindeckung (Polycarbonat)', 'Pokrycie dachu (poliwęglan)')}>
            <div className="flex gap-4 flex-wrap">
              {['Opal', 'Klar', 'UV Reflex Opal', 'UV Reflex Klar'].map(opt => (
                <Check key={opt} checked={data.dachPolycarbonat === opt} onChange={() => upd('dachPolycarbonat', data.dachPolycarbonat === opt ? '' : opt)} label={optL(opt)} />
              ))}
            </div>
          </Section>

          <Section title={L('Art der Dacheindeckung (Glass)', 'Pokrycie dachu (szkło)')}>
            <div className="flex gap-6 mb-3">
              <Check checked={data.dachGlassThickness === '8mm'} onChange={() => upd('dachGlassThickness', '8mm')} label="8 mm" />
              <Check checked={data.dachGlassThickness === '10mm'} onChange={() => upd('dachGlassThickness', '10mm')} label="10 mm" />
            </div>
            <div className="flex gap-4 flex-wrap">
              {['Matt/milch', 'Klar', 'Sonnenschutzglass'].map(opt => (
                <Check key={opt} checked={data.dachGlassType === opt} onChange={() => upd('dachGlassType', data.dachGlassType === opt ? '' : opt)} label={optL(opt)} />
              ))}
            </div>
          </Section>

          <Section title={L('Keilfenster', 'Okno klinowe')}>
            <div className="flex gap-6 mb-3">
              <Check checked={data.keilfensterMaterial === 'poly'} onChange={() => upd('keilfensterMaterial', 'poly')} label={L('Polycarbonat', 'Poliwęglan')} />
              <Check checked={data.keilfensterMaterial === 'glass'} onChange={() => upd('keilfensterMaterial', 'glass')} label={L('Glass', 'Szkło')} />
            </div>
            <div className="flex gap-4 flex-wrap">
              {['Matt/milch', 'Klar', 'ISO (nur glass)'].map(opt => (
                <Check key={opt} checked={data.keilfensterType === opt} onChange={() => upd('keilfensterType', data.keilfensterType === opt ? '' : opt)} label={optL(opt)} />
              ))}
            </div>
          </Section>

          {/* Seitliche Optionen — with diagram */}
          <Section title={L('Seitliche Optionen', 'Opcje boczne')}>
            <div className="grid grid-cols-3 gap-4">
              {/* Left */}
              <div className="border border-slate-200 rounded-lg p-3">
                <p className="text-xs font-bold text-slate-600 mb-2 text-center">{L('← Linke Seite', '← Lewa strona')}</p>
                <div className="space-y-2">
                  {SIDE_OPTIONS.map(opt => (
                    <Check key={opt} checked={data.sideLeft.includes(opt)} onChange={() => toggleSide('sideLeft', opt)} label={optL(opt)} className="text-xs" />
                  ))}
                </div>
              </div>
              {/* Front */}
              <div className="border border-blue-200 bg-blue-50/30 rounded-lg p-3">
                <p className="text-xs font-bold text-blue-700 mb-2 text-center">{L('↑ Front', '↑ Przód')}</p>
                <div className="space-y-2">
                  {SIDE_OPTIONS.map(opt => (
                    <Check key={opt} checked={data.sideFront.includes(opt)} onChange={() => toggleSide('sideFront', opt)} label={optL(opt)} className="text-xs" />
                  ))}
                </div>
              </div>
              {/* Right */}
              <div className="border border-slate-200 rounded-lg p-3">
                <p className="text-xs font-bold text-slate-600 mb-2 text-center">{L('Rechte Seite →', 'Prawa strona →')}</p>
                <div className="space-y-2">
                  {SIDE_OPTIONS.map(opt => (
                    <Check key={opt} checked={data.sideRight.includes(opt)} onChange={() => toggleSide('sideRight', opt)} label={optL(opt)} className="text-xs" />
                  ))}
                </div>
              </div>
            </div>
            {/* Mini diagram */}
            <div className="mt-4 flex justify-center">
              <div className="relative w-48 h-32 border-2 border-slate-400 bg-slate-50 rounded">
                <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 font-bold">{L('HAUS', 'DOM')}</div>
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-blue-600 font-bold">{L('Front', 'Przód')}</div>
                <div className="absolute top-1/2 -left-10 -translate-y-1/2 text-[10px] text-slate-500 font-bold -rotate-90">{L('Links', 'Lewa')}</div>
                <div className="absolute top-1/2 -right-12 -translate-y-1/2 text-[10px] text-slate-500 font-bold rotate-90">{L('Rechts', 'Prawa')}</div>
              </div>
            </div>
          </Section>

          <Section title="LED">
            <div className="flex gap-8">
              <div className="flex items-center gap-3">
                <Check checked={data.ledSpots} onChange={v => upd('ledSpots', v)} label="SPOTS" />
                {data.ledSpots && <Field label={L('Anzahl (Stk.)', 'Ilość (szt.)')} value={data.ledSpotsCount} onChange={v => upd('ledSpotsCount', v)} className="w-24" />}
              </div>
              <div className="flex items-center gap-3">
                <Check checked={data.ledStripe} onChange={v => upd('ledStripe', v)} label="LED STRIPE" />
                {data.ledStripe && <Field label={L('Länge (m)', 'Długość (m)')} value={data.ledStripeLength} onChange={v => upd('ledStripeLength', v)} className="w-24" />}
              </div>
            </div>
          </Section>
        </div>

        {/* ═══════════ PAGE 3 ═══════════ */}
        <div className="p-6 border-b-4 border-slate-800">
          <Section title={L('Heizstrahler', 'Promiennik grzewczy')}>
            <div className="flex gap-8">
              <Check checked={data.heizTyp4} onChange={v => upd('heizTyp4', v)} label="2000W (Typ 4)" />
              <Check checked={data.heizTyp5} onChange={v => upd('heizTyp5', v)} label="2000W (Typ 5) + Music" />
            </div>
          </Section>

          <Section title={L('Montage / Lieferung', 'Montaż / Dostawa')}>
            <div className="flex gap-8">
              <Check checked={data.montagePolendach} onChange={v => { upd('montagePolendach', v); if (v) upd('montageKunde', false); }} label={brandCfg.company.tradeName} />
              <Check checked={data.montageKunde} onChange={v => { upd('montageKunde', v); if (v) upd('montagePolendach', false); }} label={L('Kunde', 'Klient')} />
            </div>
          </Section>

          <Section title={L('Zusätzliche Auftragsbeschreibung', 'Dodatkowy opis zamówienia')}>
            <textarea
              value={data.beschreibung}
              onChange={e => upd('beschreibung', e.target.value)}
              rows={8}
              className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none resize-y"
              placeholder={L('Zusätzliche Informationen, besondere Wünsche, Bemerkungen...', 'Dodatkowe informacje, szczególne życzenia, uwagi...')}
            />
          </Section>
        </div>

        {/* ═══════════ AGB Note ═══════════ */}
        <div className="p-6 bg-slate-50">
          <p className="text-xs text-slate-500 text-center">
            📋 {L('AGB (Allgemeine Geschäftsbedingungen §1-§14 + Datenschutz) werden automatisch zum PDF hinzugefügt.', 'OWU (Ogólne Warunki Umowy §1-§14 + RODO) zostaną automatycznie dołączone do PDF.')}
          </p>
        </div>

        {/* Footer with PDF button */}
        <div className="p-6 bg-white border-t border-slate-200 flex items-center justify-between">
          <button onClick={() => navigate(`/contracts/${id}`)} className="text-slate-500 hover:text-slate-700 text-sm">
            {L('← Zurück zum Vertrag', '← Powrót do umowy')}
          </button>
          <button
            onClick={handleGeneratePDF}
            disabled={generating}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md disabled:opacity-50"
          >
            {generating ? '⏳ Generowanie...' : L('📄 Bestellschein PDF generieren', '📄 Generuj PDF Karty zamówienia')}
          </button>
        </div>
      </div>
    </div>
  );
};
