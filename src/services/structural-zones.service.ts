/**
 * Structural Zone Service — DIN EN 1991
 * 
 * Automatic wind zone (DIN EN 1991-1-4/NA) and snow zone (DIN EN 1991-1-3/NA)
 * detection based on German postal codes (PLZ).
 * 
 * Returns structural recommendations for construction reinforcement.
 */

// ============ TYPES ============

export interface WindZoneInfo {
  zone: 1 | 2 | 3 | 4;
  speedMs: number;    // Basic wind speed in m/s
  speedKmh: number;   // Converted to km/h for display
  pressureKn: number; // Wind pressure kN/m²
  label: string;
}

export interface SnowZoneInfoDIN {
  zone: string; // '1', '1a', '2', '2a', '3'
  loadKn: number; // Characteristic snow load kN/m²
  label: string;
}

export type StructuralRecommendation = 'standard' | 'reinforced' | 'heavy-duty';

export interface StructuralZoneResult {
  wind: WindZoneInfo;
  snow: SnowZoneInfoDIN;
  recommendation: StructuralRecommendation;
  warningMessage?: string; // German warning text for customer display
  plz: string;
}

// ============ WIND ZONES (DIN EN 1991-1-4/NA:2010) ============

const WIND_ZONES: Record<1 | 2 | 3 | 4, Omit<WindZoneInfo, 'zone'>> = {
  1: { speedMs: 22.5, speedKmh: 81,  pressureKn: 0.32, label: 'Windzone 1 — Binnenland' },
  2: { speedMs: 25.0, speedKmh: 90,  pressureKn: 0.39, label: 'Windzone 2 — Küstennah / Norddeutschland' },
  3: { speedMs: 27.5, speedKmh: 99,  pressureKn: 0.47, label: 'Windzone 3 — Küstengebiet' },
  4: { speedMs: 30.0, speedKmh: 108, pressureKn: 0.56, label: 'Windzone 4 — Nordseeküste / Inseln' },
};

// ============ SNOW ZONES (DIN EN 1991-1-3/NA:2019) ============

const SNOW_ZONES_DIN: Record<string, Omit<SnowZoneInfoDIN, 'zone'>> = {
  '1':  { loadKn: 0.65, label: 'Schneelastzone 1 — Flachland / Nordwest' },
  '1a': { loadKn: 0.81, label: 'Schneelastzone 1a — Erhöhtes Flachland' },
  '2':  { loadKn: 0.85, label: 'Schneelastzone 2 — Mittelgebirgsrand' },
  '2a': { loadKn: 1.06, label: 'Schneelastzone 2a — Höheres Mittelgebirge' },
  '3':  { loadKn: 1.10, label: 'Schneelastzone 3 — Alpen / Hochgebirge' },
};

// ============ PLZ PREFIX MAPPING ============
// Based on first 2 digits of German PLZ → [windZone, snowZone]

const PLZ_ZONE_MAP: Record<string, [1|2|3|4, string]> = {
  // Berlin / Brandenburg — WZ1, SZ1
  '10': [1, '1'], '12': [1, '1'], '13': [1, '1'], '14': [1, '1'], '15': [1, '1'], '16': [1, '1a'],
  // Mecklenburg-Vorpommern — WZ2-3, SZ1a
  '17': [2, '1a'], '18': [3, '1a'], '19': [2, '1a'],
  // Hamburg / Schleswig-Holstein — WZ2-3, SZ1
  '20': [3, '1'], '21': [2, '1'], '22': [3, '1'], '23': [3, '1a'], '24': [3, '1'], '25': [4, '1'],
  // Niedersachsen Nord — WZ2, SZ1
  '26': [2, '1'], '27': [2, '1'], '28': [2, '1'], '29': [2, '1a'],
  // Niedersachsen Süd / Harz — WZ1, SZ2
  '30': [1, '1'], '31': [1, '1a'], '32': [1, '1a'], '33': [1, '1a'],
  // Kassel / Nordhessen — WZ1, SZ2
  '34': [1, '2'], '35': [1, '2'], '36': [1, '2'], '37': [1, '2'], '38': [1, '2'], '39': [1, '1a'],
  // NRW — WZ1, SZ1-2
  '40': [1, '1'], '41': [1, '1'], '42': [1, '1a'], '43': [1, '1a'],
  '44': [1, '1'], '45': [1, '1'], '46': [1, '1'], '47': [1, '1'],
  '48': [1, '1'], '49': [1, '1'],
  // Rheinland — WZ1, SZ1
  '50': [1, '1'], '51': [1, '1'], '52': [1, '1'], '53': [1, '1'], '54': [1, '1a'],
  '55': [1, '1'], '56': [1, '1'], '57': [1, '2'], '58': [1, '1a'], '59': [1, '1'],
  // Rheinland-Pfalz / Saarland — WZ1, SZ1
  '60': [1, '1'], '61': [1, '1'], '62': [1, '1a'], '63': [1, '1'],
  '64': [1, '1'], '65': [1, '1'], '66': [1, '1'], '67': [1, '1'], '68': [1, '1'], '69': [1, '1'],
  // Baden-Württemberg — WZ1, SZ1-2a
  '70': [1, '1a'], '71': [1, '1a'], '72': [1, '2'], '73': [1, '1a'],
  '74': [1, '1a'], '75': [1, '2'], '76': [1, '1'], '77': [1, '2'],
  '78': [1, '2a'], '79': [1, '2'],
  // Bayern Süd — WZ1, SZ2-3
  '80': [1, '2'], '81': [1, '2'], '82': [1, '2a'], '83': [1, '3'],
  '84': [1, '2'], '85': [1, '2'], '86': [1, '2'], '87': [1, '3'],
  '88': [1, '2a'], '89': [1, '2'],
  // Bayern Nord / Franken — WZ1, SZ2
  '90': [1, '2'], '91': [1, '2'], '92': [1, '2'], '93': [1, '2'],
  '94': [1, '2a'], '95': [1, '2a'], '96': [1, '2'], '97': [1, '1a'], '98': [1, '2'], '99': [1, '2'],
  // Sachsen — WZ1, SZ2
  '01': [1, '2'], '02': [1, '2'], '03': [1, '1a'], '04': [1, '1a'],
  // Sachsen-Anhalt / Thüringen — WZ1, SZ1a-2
  '06': [1, '1a'], '07': [1, '2'], '08': [1, '2a'], '09': [1, '2'],
};

// ============ SERVICE ============

export class StructuralZonesService {

  /**
   * Get structural zones for a German PLZ.
   * Returns null for invalid/non-German postal codes.
   */
  static getZones(postalCode: string): StructuralZoneResult | null {
    const clean = postalCode.replace(/\s/g, '').replace(/-/g, '');
    
    // Only German 5-digit PLZ
    if (!/^\d{5}$/.test(clean)) return null;

    const prefix = clean.substring(0, 2);
    const mapping = PLZ_ZONE_MAP[prefix];

    if (!mapping) {
      // Default for unmapped: WZ1, SZ1
      return this.buildResult(clean, 1, '1');
    }

    const [windZone, snowZone] = mapping;
    return this.buildResult(clean, windZone, snowZone);
  }

  private static buildResult(
    plz: string,
    windZoneId: 1 | 2 | 3 | 4,
    snowZoneId: string
  ): StructuralZoneResult {
    const wind: WindZoneInfo = {
      zone: windZoneId,
      ...WIND_ZONES[windZoneId],
    };

    const snowData = SNOW_ZONES_DIN[snowZoneId] || SNOW_ZONES_DIN['1'];
    const snow: SnowZoneInfoDIN = {
      zone: snowZoneId,
      ...snowData,
    };

    const recommendation = this.getRecommendation(windZoneId, snowZoneId);
    const warningMessage = this.getWarningMessage(wind, snow, recommendation);

    return { wind, snow, recommendation, warningMessage, plz };
  }

  private static getRecommendation(
    windZone: number,
    snowZone: string
  ): StructuralRecommendation {
    // Heavy-duty: Wind ≥ 3 OR Snow zone 3 or 2a
    if (windZone >= 3 || snowZone === '3' || snowZone === '2a') {
      return 'heavy-duty';
    }

    // Reinforced: Wind 2 OR Snow zone 2 or 1a
    if (windZone >= 2 || snowZone === '2' || snowZone === '1a') {
      return 'reinforced';
    }

    return 'standard';
  }

  private static getWarningMessage(
    wind: WindZoneInfo,
    snow: SnowZoneInfoDIN,
    recommendation: StructuralRecommendation
  ): string | undefined {
    if (recommendation === 'heavy-duty') {
      const parts: string[] = [];
      if (wind.zone >= 3) parts.push(`Wind ${wind.speedKmh} km/h`);
      if (['3', '2a'].includes(snow.zone)) parts.push(`Schneelast ${snow.loadKn.toFixed(2)} kN/m²`);
      return `Für diesen Standort empfehlen wir eine verstärkte Konstruktion (${parts.join(', ')}).`;
    }

    if (recommendation === 'reinforced') {
      const parts: string[] = [];
      if (wind.zone >= 2) parts.push(`Wind ${wind.speedKmh} km/h`);
      if (['2', '1a'].includes(snow.zone)) parts.push(`Schneelast ${snow.loadKn.toFixed(2)} kN/m²`);
      return `Erhöhte Wind-/Schneelast an diesem Standort (${parts.join(', ')}). Wir empfehlen ein robusteres Modell.`;
    }

    return undefined;
  }

  /**
   * Get a short summary label for display, e.g. "WZ1 / SZ2"
   */
  static getShortLabel(result: StructuralZoneResult): string {
    return `WZ${result.wind.zone} / SLZ${result.snow.zone.toUpperCase()}`;
  }
}
