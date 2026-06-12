// ============================================================================
// MB Aluminium Pricing Service — czysty kalkulator (bez przeglądarki!)
// Liczy ceny EK netto EUR z danych "Preisliste MB Aluminium – Mai 2026"
// wyciągniętych z konfiguratora (mb-price-data.ts). Odpowiedź w ~0 ms,
// więc MB zawsze startuje w porównaniu dostawców — nawet gdy Chromium padnie.
// ============================================================================

import {
  MB_PRICE_MATRICES,
  MB_ROOF_MODELS,
  MB_SCHIEBEWAND,
  MB_KEIL_WIDTHS_CM,
  MB_KEIL_PRICES_NET_EUR,
  MB_KEIL_GLASS_SURCHARGES_NET_EUR,
  type MbPriceMatrix,
  type MbRoofModel,
} from './mb-price-data';

export interface MbQuoteLine {
  label: string;
  netEur: number;
}

export interface MbQuote {
  success: true;
  priceNetEur: number;
  /** Wymiar rozliczeniowy (progi cennika, zaokrąglone W GÓRĘ) */
  billedWidthCm: number;
  billedDepthCm: number;
  breakdown: MbQuoteLine[];
  model?: MbRoofModel;
  postCount?: number;
}

export interface MbQuoteError {
  success: false;
  error: string;
}

export type MbQuoteResult = MbQuote | MbQuoteError;

/** Zaokrąglij wymiar W GÓRĘ do pierwszego progu cennika (jak lookup() w konfiguratorze) */
function bracket(thresholds: number[], valueCm: number): number {
  const idx = thresholds.findIndex(t => t >= valueCm - 0.0001);
  return idx; // -1 = poza cennikiem
}

function matrixLookup(matrix: MbPriceMatrix, widthCm: number, depthCm: number): {
  price: number; widthIdx: number; depthIdx: number;
} | null {
  const wIdx = bracket(matrix.widthsCm, widthCm);
  const dIdx = bracket(matrix.depthsCm, depthCm);
  if (wIdx === -1 || dIdx === -1) return null;
  const price = matrix.pricesNetEur[dIdx]?.[wIdx];
  if (price == null) return null; // null = kombinacja niedostępna (np. prime >500 głęb.)
  return { price, widthIdx: wIdx, depthIdx: dIdx };
}

// ---------------------------------------------------------------------------
// DACHY / PERGOLE / CARPORT
// ---------------------------------------------------------------------------

export interface MbRoofRequest {
  /** id modelu: solid | bold | cube | cubegrand | carport | prime | dynamic | advanced | adaptive */
  model: string;
  widthMm: number;
  depthMm: number;
  /** id pokrycia z MbRoofModel.coverings (np. 'pc', 'gk'); brak = pierwsze pokrycie modelu */
  coveringId?: string;
  freestanding?: boolean;
  /** Długość słupków wolnostojących w m (2.5/3/3.5/5/6), domyślnie 3 */
  postLengthM?: number;
}

export function getMbRoofPrice(req: MbRoofRequest): MbQuoteResult {
  const model = MB_ROOF_MODELS.find(m => m.id === req.model);
  if (!model) return { success: false, error: `Unbekanntes MB-Modell: ${req.model}` };

  const widthCm = req.widthMm / 10;
  const depthCm = req.depthMm / 10;
  if (widthCm < model.widthRangeCm[0] - 0.0001) {
    return { success: false, error: `Breite ${widthCm}cm unter Minimum ${model.widthRangeCm[0]}cm` };
  }
  if (depthCm < model.depthRangeCm[0] - 0.0001) {
    return { success: false, error: `Tiefe ${depthCm}cm unter Minimum ${model.depthRangeCm[0]}cm` };
  }

  const covering = req.coveringId
    ? model.coverings.find(c => c.id === req.coveringId)
    : model.coverings[0];
  if (!covering) return { success: false, error: `Unbekannte Eindeckung '${req.coveringId}' für ${model.id}` };

  const matrix = MB_PRICE_MATRICES[covering.matrixKey];
  if (!matrix) return { success: false, error: `Fehlende Matrix: ${covering.matrixKey}` };

  // Pergole lamelowe/tekstylne: oś lamel ma twardy limit z cennika (prime/dynamic
  // 400cm, advanced 500cm), ale konstrukcję montuje się w OBU orientacjach —
  // np. taras 600×400 = lamele 400 + jazda 600. Liczymy obie orientacje
  // i bierzemy tańszą dostępną (tak konfiguruje się to u MB).
  const PERGOLA_SWAP_MODELS = new Set(['prime', 'dynamic', 'advanced', 'adaptive']);
  let hit = matrixLookup(matrix, widthCm, depthCm);
  let axesSwapped = false;
  if (PERGOLA_SWAP_MODELS.has(model.id)) {
    const alt = matrixLookup(matrix, depthCm, widthCm);
    if (alt && (!hit || alt.price < hit.price)) { hit = alt; axesSwapped = true; }
  }
  if (!hit) {
    return { success: false, error: `${widthCm}×${depthCm}cm außerhalb der Preisliste für ${model.mbName} (${covering.label})` };
  }

  const billedWidthCm = matrix.widthsCm[hit.widthIdx];
  const billedDepthCm = matrix.depthsCm[hit.depthIdx];
  const billedAreaM2 = (billedWidthCm * billedDepthCm) / 10000;

  const breakdown: MbQuoteLine[] = [
    { label: `${model.mbName} ${covering.label} — ${billedWidthCm}×${billedDepthCm}cm (Abrechnungsmaß)${axesSwapped ? ' — Lamellenachse quer' : ''}`, netEur: hit.price },
  ];
  let total = hit.price;

  // Dopłata pokrycia liczona od powierzchni ROZLICZENIOWEJ
  if (covering.surchargePerM2NetEur) {
    const sur = billedAreaM2 * covering.surchargePerM2NetEur;
    breakdown.push({ label: `${covering.surchargeLabel || 'Eindeckungs-Aufpreis'} (${billedAreaM2.toFixed(2)} m²)`, netEur: sur });
    total += sur;
  }

  // Liczba słupków z meta-macierzy (jeśli cennik ją koduje)
  const postCount = matrix.postCount?.[hit.depthIdx]?.[hit.widthIdx] ?? undefined;

  // Wolnostojący: carport w cenie; pergole — ta sama cena; solid/bold/cube/cubegrand — zestaw
  if (req.freestanding && !model.freestandingIncluded && !model.wallOrFreestandingSamePrice) {
    const kit = model.freestandingKit;
    if (!kit) return { success: false, error: `${model.mbName} hat keine Freistehend-Option` };
    if (kit.statikEurPerM) {
      const statik = kit.statikEurPerM * (billedWidthCm / 100);
      breakdown.push({ label: `${kit.statikLabel || 'Profil statyczny'} ${(billedWidthCm / 100).toFixed(2)} m`, netEur: statik });
      total += statik;
    }
    const posts = postCount ?? 2;
    const postLen = req.postLengthM ?? 3;
    const postsCost = posts * postLen * kit.postEurPerM;
    breakdown.push({ label: `${kit.postLabel} — ${posts} szt. × ${postLen} m`, netEur: postsCost });
    total += postsCost;
  }

  return {
    success: true,
    priceNetEur: Math.round(total * 100) / 100,
    billedWidthCm, billedDepthCm,
    breakdown, model, postCount: postCount ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// ZIP-SCREEN (Senkrechtmarkise) — auto-dobór tańszej kasety 9×9 / 11×11
// ---------------------------------------------------------------------------

export function getMbZipPrice(req: { widthMm: number; heightMm: number }): MbQuoteResult {
  const widthCm = req.widthMm / 10;
  const heightCm = req.heightMm / 10;
  const candidates: MbQuote[] = [];

  for (const key of ['zip9', 'zip11'] as const) {
    const matrix = MB_PRICE_MATRICES[key];
    if (!matrix) continue;
    const hit = matrixLookup(matrix, widthCm, heightCm);
    if (!hit) continue;
    candidates.push({
      success: true,
      priceNetEur: hit.price,
      billedWidthCm: matrix.widthsCm[hit.widthIdx],
      billedDepthCm: matrix.depthsCm[hit.depthIdx],
      breakdown: [{ label: `ZIP-Screen Kassette ${key === 'zip9' ? '9×9' : '11×11'} — ${matrix.widthsCm[hit.widthIdx]}×${matrix.depthsCm[hit.depthIdx]}cm`, netEur: hit.price }],
    });
  }

  if (candidates.length === 0) {
    return { success: false, error: `ZIP ${widthCm}×${heightCm}cm außerhalb der Preisliste (max 600×300)` };
  }
  return candidates.reduce((a, b) => (a.priceNetEur <= b.priceNetEur ? a : b));
}

// ---------------------------------------------------------------------------
// SCHIEBEWAND (panorama / ścianka przesuwna) — cena ZA SZYBĘ
// ---------------------------------------------------------------------------

export function getMbSchiebewandPrice(req: {
  openingWidthMm: number;
  /** Wysokość zabudowy (Einbauhöhe) w mm */
  heightMm: number;
  tint?: 'klar' | 'getoent';
  /** Wymuś liczbę szyb (domyślnie max(2, ceil(szer/100cm))) */
  panelCount?: number;
}): MbQuoteResult {
  const widthCm = req.openingWidthMm / 10;
  const heightCm = req.heightMm / 10;
  const tint = req.tint || 'klar';

  const n = Math.max(
    MB_SCHIEBEWAND.minPanels,
    req.panelCount ?? Math.ceil(widthCm / MB_SCHIEBEWAND.suggestedPanelCountDivisorCm)
  );
  if (n > MB_SCHIEBEWAND.maxTracks) {
    // System szyn ma max 6 torów — większe otwory dzieli się na 2 zestawy,
    // cena liniowa za szybę pozostaje, więc liczymy dalej (informacyjnie).
  }

  // Szkło standardowe możliwe, gdy wysokość w zakresie ORAZ istnieje standardowa
  // szerokość szyby w spełniająca: n × w >= szerokość + (n−1) × zakład(4cm)
  const std = MB_SCHIEBEWAND.standardGlass[tint];
  let isStandard = false;
  if (heightCm >= std.minHeightCm && heightCm <= std.maxHeightCm) {
    const rule = std.rules.find(r => heightCm >= r.minHeightCm && heightCm <= r.maxHeightCm);
    if (rule) {
      const required = widthCm + (n - 1) * MB_SCHIEBEWAND.panelOverlapCm;
      isStandard = rule.panelWidthsCm.some(w => n * w >= required - 0.0001);
    }
  }

  const rate = isStandard
    ? MB_SCHIEBEWAND.pricePerPanelNetEur.standard[tint]
    : MB_SCHIEBEWAND.pricePerPanelNetEur.custom[tint];
  const total = n * rate;

  return {
    success: true,
    priceNetEur: total,
    billedWidthCm: widthCm,
    billedDepthCm: heightCm,
    breakdown: [{
      label: `Schiebewand ESG 10mm ${tint === 'klar' ? 'klar' : 'getönt'} — ${n} Scheiben (${isStandard ? 'Standardmaß' : 'Maßanfertigung'}) à ${rate}€`,
      netEur: total,
    }],
  };
}

// ---------------------------------------------------------------------------
// KEILFENSTER (klin trójkątny) — lookup 1-D po szerokości
// ---------------------------------------------------------------------------

export function getMbKeilPrice(req: {
  widthMm: number;
  type?: keyof typeof MB_KEIL_PRICES_NET_EUR; // 'poly' | 'alu16' | 'alu20' | 'glas'
  glassVariant?: 'opal' | 'getoent';
}): MbQuoteResult {
  const widthCm = req.widthMm / 10;
  const type = req.type || 'glas';
  const idx = bracket([...MB_KEIL_WIDTHS_CM], widthCm);
  if (idx === -1) return { success: false, error: `Keil ${widthCm}cm breiter als Maximum ${MB_KEIL_WIDTHS_CM[MB_KEIL_WIDTHS_CM.length - 1]}cm` };

  const def = MB_KEIL_PRICES_NET_EUR[type];
  let total = def.prices[idx];
  const breakdown: MbQuoteLine[] = [
    { label: `Keilfenster ${def.label} — bis ${MB_KEIL_WIDTHS_CM[idx]}cm`, netEur: def.prices[idx] },
  ];

  if (type === 'glas' && req.glassVariant) {
    const sur = MB_KEIL_GLASS_SURCHARGES_NET_EUR[req.glassVariant][idx];
    breakdown.push({ label: `Aufpreis Glas ${req.glassVariant}`, netEur: sur });
    total += sur;
  }

  return {
    success: true,
    priceNetEur: total,
    billedWidthCm: MB_KEIL_WIDTHS_CM[idx],
    billedDepthCm: 0,
    breakdown,
  };
}
