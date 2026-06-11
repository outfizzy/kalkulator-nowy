/**
 * MB Aluminium — kompletne dane cenowe wyciągnięte 1:1 z kalkulatora
 * "Konfigurator MB Aluminium.html" (wdrożenie: konfigurator-mb-aluminium.vercel.app),
 * który odwzorowuje cennik "Preisliste MB Aluminium – Mai 2026".
 *
 * WALUTA / POZIOM CEN:
 *   Wszystkie ceny w tym pliku to ceny ZAKUPU partnera/dealera — EK NETTO w EUR
 *   ("Suma netto (cena partnerska)" w kalkulatorze). Bez transportu i montażu.
 *   Narzut (marża), montaż i VAT (domyślnie 19%) są w kalkulatorze doliczane
 *   DOPIERO na poziomie koszyka: cenaKlientaNetto = netEK * (1 + marża%) + montażNetto;
 *   brutto = cenaKlientaNetto * (1 + VAT%). Macierze NIE zawierają marży ani VAT.
 *
 * ALGORYTM LOOKUPU (funkcja lookup() w źródle):
 *   - szerokość i głębokość/wysokość zaokrągla się W GÓRĘ do najbliższego progu
 *     z widthsCm / depthsCm (pierwszy próg >= wymiar, tolerancja 0.0001),
 *   - wymiar powyżej ostatniego progu => poza cennikiem (wycena indywidualna),
 *   - pricesNetEur[depthIdx][widthIdx] === null => kombinacja niedostępna,
 *   - kolory standardowe (per model) bez dopłaty; inne RAL "na zapytanie".
 *
 * Plik zawiera WYŁĄCZNIE dane i typy — bez funkcji kalkulujących.
 */

/* ============================================================
 * TYPY
 * ============================================================ */

/** Macierz cen szer×głęb (EK netto EUR). Indeksowanie: [depthIdx][widthIdx]. */
export interface MbPriceMatrix {
  /** Progi szerokości w cm, rosnąco — wymiar zaokrąglany W GÓRĘ do progu */
  widthsCm: number[];
  /** Progi głębokości (dachy/markizy) lub wysokości (ZIP) w cm, rosnąco — zaokrąglane W GÓRĘ */
  depthsCm: number[];
  /** Cena EK netto EUR; null = kombinacja niedostępna w cenniku */
  pricesNetEur: (number | null)[][];
  /** Liczba słupków w cenie wersji standardowej dla danej komórki (tylko niektóre macierze) */
  postCount?: (number | null)[][];
}

/** Wariant pokrycia dachu przypisany do modelu */
export interface MbRoofCovering {
  id: string;
  /** Etykieta z konfiguratora (PL) */
  label: string;
  /** Klucz macierzy w MB_PRICE_MATRICES */
  matrixKey: string;
  /** Dopłata EK netto EUR za m² wymiaru ROZLICZENIOWEGO (bw×bd/10000), np. IQ Relax / płyta warstwowa */
  surchargePerM2NetEur?: number;
  surchargeLabel?: string;
  /** true = pokrycie szklane: przy głęb. rozliczeniowej 400 wzmocnienie krokwi 2 m,
   *  przy >=450 krokwie w pełni wzmocnione — W CENIE (bez dopłaty, informacyjnie) */
  glassReinforcementNote?: boolean;
}

/** Zestaw "wolnostojący" — cennik metrowy doliczany do ceny przyściennej */
export interface MbFreestandingKit {
  /** EK netto EUR za metr profilu statycznego (długość = szer. rozliczeniowa / 100 m); brak = model bez profilu statycznego */
  statikEurPerM?: number;
  statikLabel?: string;
  /** EK netto EUR za metr słupka; koszt = szt × długość_m × stawka. Domyślna liczba szt. = postCount komórki, domyślna długość 3 m (opcje 2.5/3/3.5/5/6) */
  postEurPerM: number;
  postLabel: string;
}

export interface MbRoofModel {
  /** id w konfiguratorze (= prefiks kluczy macierzy) */
  id: string;
  /** Nazwa handlowa Polendach24 */
  marketingName: string;
  /** Oznaczenie producenta MB Aluminium */
  mbName: string;
  /** Zakres wymiarów wg cennika [minSzer, maxSzer] / [minGłęb, maxGłęb] w cm */
  widthRangeCm: [number, number];
  depthRangeCm: [number, number];
  /** Skok modułu głębokości (pergole lamelowe) w cm; głębokość dobierana do najbliższego większego modułu */
  depthModuleCm?: number;
  /** Kolory standardowe bez dopłaty */
  standardColors: string[];
  /** Informacja o kolorach spoza palety (dopłata "na zapytanie" — brak stawki w cenniku) */
  customColorNote?: string;
  /** Kolory tkaniny (tylko MB ADAPTIVE) — bez dopłaty */
  fabricColors?: string[];
  coverings: MbRoofCovering[];
  /** Dane do dokupienia wersji wolnostojącej (modele przyścienne) */
  freestandingKit?: MbFreestandingKit;
  /** true = cena obejmuje wersję wolnostojącą (carport) */
  freestandingIncluded?: boolean;
  /** true = cena ta sama dla przyściennej i wolnostojącej (pergole lamelowe/tekstylne) */
  wallOrFreestandingSamePrice?: boolean;
  /** Dostępne opcje LED: 'std' = punktowe LED 1W/3W (MB_LED_STD), 'strip' = taśma (carport), 'included' = LED w cenie */
  led: 'std' | 'strip' | 'included';
  notes?: string[];
}

/* ============================================================
 * MODELE DACHÓW / PERGOLI (Terrassendach)
 * ============================================================ */

export const MB_ROOF_MODELS: MbRoofModel[] = [
  {
    id: 'solid', marketingName: 'Trendstyle', mbName: 'MB SOLID',
    widthRangeCm: [306, 1206], depthRangeCm: [200, 500],
    standardColors: ['RAL 9016', 'RAL 9007', 'RAL 7016', 'RAL 9005'],
    coverings: [
      { id: 'pc',   label: 'Poliwęglan 16 mm (standard)', matrixKey: 'solid_pc' },
      { id: 'iq',   label: 'Poliwęglan IQ Relax 16 mm', matrixKey: 'solid_pc', surchargePerM2NetEur: 12, surchargeLabel: 'Dopłata IQ Relax' },
      { id: 'sw24', label: 'Płyta warstwowa 24 mm', matrixKey: 'solid_pc', surchargePerM2NetEur: 17, surchargeLabel: 'Dopłata płyta warstwowa 24' },
      { id: 'sw25', label: 'Płyta warstwowa 25 mm', matrixKey: 'solid_pc', surchargePerM2NetEur: 17, surchargeLabel: 'Dopłata płyta warstwowa 25' },
      { id: 'gk',   label: 'Szkło VSG bezbarwne (klar)', matrixKey: 'solid_glas_klar', glassReinforcementNote: true },
      { id: 'go',   label: 'Szkło VSG mleczne (opal)', matrixKey: 'solid_glas_opal', glassReinforcementNote: true },
      { id: 'gt',   label: 'Szkło VSG przyciemniane (getönt)', matrixKey: 'solid_glas_getoent', glassReinforcementNote: true },
      { id: 'opc',  label: 'Bez pokrycia — konstrukcja pod poliwęglan', matrixKey: 'solid_ohne_pc' },
      { id: 'og',   label: 'Bez pokrycia — konstrukcja pod szkło', matrixKey: 'solid_ohne_glas', glassReinforcementNote: true },
    ],
    freestandingKit: { statikEurPerM: 70, statikLabel: 'Profil statyczny (max 806 cm/szt.)', postEurPerM: 34, postLabel: 'Słupek 13,6×13,6 cm' },
    led: 'std',
    notes: ['Klasyczne zadaszenie przyścienne ze spadkiem, słupki 13,6×13,6 cm.'],
  },
  {
    id: 'bold', marketingName: 'Topstyle', mbName: 'MB BOLD',
    widthRangeCm: [306, 1206], depthRangeCm: [200, 500],
    standardColors: ['RAL 9016', 'DB703', 'RAL 7016', 'RAL 9005'],
    coverings: [
      { id: 'pc',   label: 'Poliwęglan 16 mm (standard)', matrixKey: 'bold_pc' },
      { id: 'iq',   label: 'Poliwęglan IQ Relax 16 mm', matrixKey: 'bold_pc', surchargePerM2NetEur: 12, surchargeLabel: 'Dopłata IQ Relax' },
      { id: 'sw24', label: 'Płyta warstwowa 24 mm', matrixKey: 'bold_pc', surchargePerM2NetEur: 17, surchargeLabel: 'Dopłata płyta warstwowa 24' },
      { id: 'sw25', label: 'Płyta warstwowa 25 mm', matrixKey: 'bold_pc', surchargePerM2NetEur: 17, surchargeLabel: 'Dopłata płyta warstwowa 25' },
      { id: 'gk',   label: 'Szkło VSG bezbarwne (klar)', matrixKey: 'bold_glas_klar', glassReinforcementNote: true },
      { id: 'go',   label: 'Szkło VSG mleczne (opal)', matrixKey: 'bold_glas_opal', glassReinforcementNote: true },
      { id: 'gt',   label: 'Szkło VSG przyciemniane (getönt)', matrixKey: 'bold_glas_getoent', glassReinforcementNote: true },
      { id: 'opc',  label: 'Bez pokrycia — konstrukcja pod poliwęglan', matrixKey: 'bold_ohne_pc' },
      { id: 'og',   label: 'Bez pokrycia — konstrukcja pod szkło', matrixKey: 'bold_ohne_glas', glassReinforcementNote: true },
    ],
    freestandingKit: { statikEurPerM: 72, statikLabel: 'Profil statyczny (max 806 cm/szt.)', postEurPerM: 42, postLabel: 'Słupek 16×16 cm' },
    led: 'std',
    notes: ['Masywne słupki 16×16 cm.'],
  },
  {
    id: 'cube', marketingName: 'Skystyle', mbName: 'MB CUBE',
    widthRangeCm: [306, 1206], depthRangeCm: [200, 500],
    standardColors: ['RAL 9016', 'DB703', 'RAL 7016', 'RAL 9005'],
    coverings: [
      { id: 'pc',   label: 'Poliwęglan 16 mm (standard)', matrixKey: 'cube_pc' },
      { id: 'iq',   label: 'Poliwęglan IQ Relax 16 mm', matrixKey: 'cube_pc', surchargePerM2NetEur: 12, surchargeLabel: 'Dopłata IQ Relax' },
      { id: 'sw24', label: 'Płyta warstwowa 24 mm', matrixKey: 'cube_pc', surchargePerM2NetEur: 17, surchargeLabel: 'Dopłata płyta warstwowa 24' },
      { id: 'sw25', label: 'Płyta warstwowa 25 mm', matrixKey: 'cube_pc', surchargePerM2NetEur: 17, surchargeLabel: 'Dopłata płyta warstwowa 25' },
      { id: 'gk',   label: 'Szkło VSG bezbarwne (klar)', matrixKey: 'cube_glas_klar', glassReinforcementNote: true },
      { id: 'go',   label: 'Szkło VSG mleczne (opal)', matrixKey: 'cube_glas_opal', glassReinforcementNote: true },
      { id: 'gt',   label: 'Szkło VSG przyciemniane (getönt)', matrixKey: 'cube_glas_getoent', glassReinforcementNote: true },
      { id: 'opc',  label: 'Bez pokrycia — konstrukcja pod poliwęglan', matrixKey: 'cube_ohne_pc' },
      { id: 'og',   label: 'Bez pokrycia — konstrukcja pod szkło', matrixKey: 'cube_ohne_glas', glassReinforcementNote: true },
    ],
    freestandingKit: { statikEurPerM: 72, statikLabel: 'Profil statyczny (max 806 cm/szt.)', postEurPerM: 42, postLabel: 'Słupek 16×16 cm' },
    led: 'std',
    notes: ['Forma kubiczna — rynna ukryta w attyce, słupki 16×16 cm.'],
  },
  {
    id: 'cubegrand', marketingName: 'Skystyle Grand', mbName: 'MB CUBE GRAND',
    widthRangeCm: [300, 1200], depthRangeCm: [250, 400],
    standardColors: ['RAL 7016', 'RAL 9005'],
    coverings: [
      { id: 'gk', label: 'Szkło VSG bezbarwne (klar)', matrixKey: 'cubegrand_glas_klar' },
      { id: 'go', label: 'Szkło VSG mleczne (opal)', matrixKey: 'cubegrand_glas_opal' },
      { id: 'gt', label: 'Szkło VSG przyciemniane (getönt)', matrixKey: 'cubegrand_glas_getoent' },
      { id: 'og', label: 'Bez pokrycia — konstrukcja pod szkło', matrixKey: 'cubegrand_ohne_glas' },
    ],
    freestandingKit: { postEurPerM: 105, postLabel: 'Słupek XL 19×25 cm (pełni też rolę profilu statycznego)' },
    led: 'std',
    notes: ['Kubiczny model XL — wyłącznie dach szklany, słupki XL 19×25 cm.'],
  },
  {
    id: 'carport', marketingName: 'Carport', mbName: 'MB CARPORT',
    widthRangeCm: [300, 1200], depthRangeCm: [200, 1000],
    standardColors: ['RAL 9016', 'DB703', 'RAL 7016'],
    coverings: [
      { id: 'tr', label: 'Blacha trapezowa z włókniną antykondensacyjną', matrixKey: 'carport_trapez' },
      { id: 'oh', label: 'Bez pokrycia dachowego', matrixKey: 'carport_ohne' },
    ],
    freestandingIncluded: true,
    led: 'strip',
    notes: ['Wiata wolnostojąca, słupki 12×12 cm — 4–10 szt. W CENIE (liczba wg postCount macierzy).'],
  },
  {
    id: 'prime', marketingName: 'Pergola', mbName: 'MB PRIME',
    widthRangeCm: [200, 400], depthRangeCm: [209.6, 605.6], depthModuleCm: 13.2,
    standardColors: ['RAL 9016', 'RAL 9007', 'RAL 7016', 'RAL 9005'],
    customColorNote: 'Dowolny RAL za dopłatą (na zapytanie)',
    coverings: [{ id: 'lam', label: 'Dach lamelowy aluminiowy (lamele uchylne) + LED', matrixKey: 'prime' }],
    wallOrFreestandingSamePrice: true,
    led: 'included',
    notes: [
      'Głębokość rośnie skokiem modułu lameli 13,2 cm — cennik dobiera najbliższy większy moduł.',
      'Przy głębokości powyżej 500 cm maksymalna szerokość to 350 cm (null w macierzy).',
    ],
  },
  {
    id: 'dynamic', marketingName: 'MB Dynamic', mbName: 'MB DYNAMIC',
    widthRangeCm: [200, 400], depthRangeCm: [206, 594.5], depthModuleCm: 18.5,
    standardColors: ['RAL 9016', 'RAL 9007', 'RAL 7016', 'RAL 9005'],
    customColorNote: 'Dowolny RAL za dopłatą (na zapytanie)',
    coverings: [{ id: 'lam', label: 'Dach lamelowy aluminiowy (lamele uchylne) + LED', matrixKey: 'dynamic' }],
    wallOrFreestandingSamePrice: true,
    led: 'included',
    notes: ['Większe szerokości realizuje się łącząc moduły obok siebie (2× szer.).'],
  },
  {
    id: 'advanced', marketingName: 'Pergola Deluxe', mbName: 'MB ADVANCED',
    widthRangeCm: [200, 500], depthRangeCm: [207.4, 600.1], depthModuleCm: 23.1,
    standardColors: ['RAL 9016', 'RAL 9007', 'RAL 7016', 'RAL 9005'],
    customColorNote: 'Dowolny RAL za dopłatą (na zapytanie)',
    coverings: [{ id: 'lam', label: 'Dach lamelowy przesuwno-uchylny + LED', matrixKey: 'advanced' }],
    wallOrFreestandingSamePrice: true,
    led: 'included',
    notes: [
      'Głębokość (dłuższy bok) max 6,0 m; szerokość (krótszy bok) max 5 m.',
      'Jeśli lamele mają się przesuwać od domu w stronę ogrodu — szerokość max 4 m (większe tarasy = 2 jednostki obok siebie).',
    ],
  },
  {
    id: 'adaptive', marketingName: 'Adaptive', mbName: 'MB ADAPTIVE',
    widthRangeCm: [200, 700], depthRangeCm: [200, 700],
    standardColors: ['RAL 9010', 'RAL 7016', 'RAL 9005'],
    customColorNote: 'Dowolny RAL za dopłatą (na zapytanie)',
    fabricColors: ['B 8118/7500', 'B 8118/1622', 'B 8118/9002', 'B 8118/7024', 'B 8118/6028', 'B 8118/3017', 'B 8118/7999'],
    coverings: [{ id: 'tex', label: 'Dach tekstylny zwijany (oświetlenie w cenie)', matrixKey: 'adaptive' }],
    wallOrFreestandingSamePrice: true,
    led: 'included',
    notes: ['Pergola ze zwijanym dachem tekstylnym, oświetlenie w cenie.'],
  },
];

/* ============================================================
 * OPCJE / DOPŁATY WSPÓLNE — EK netto EUR
 * ============================================================ */

/** LED punktowe do dachów solid/bold/cube/cubegrand (opcja) */
export const MB_LED_STD = {
  led1: { label: 'LED 1W (ciepła biel, nieściemnialne, z montażem)', pricePerPcNetEur: 10 },
  led3: { label: 'LED 3W (ciepła biel, ściemnialne, z montażem)', pricePerPcNetEur: 20 },
  /** 1 zasilacz na każde rozpoczęte 24 szt. LED 1W */
  ps24: { label: 'Zasilacz LED (na każde 24 szt. LED 1W)', pricePerPcNetEur: 24, perLeds: 24 },
  /** 1 zasilacz na każde rozpoczęte 12 szt. LED 3W */
  ps12: { label: 'Zasilacz LED ściemnialny (na każde 12 szt. LED 3W)', pricePerPcNetEur: 58, perLeds: 12 },
} as const;

/** Taśma LED do carportu */
export const MB_LED_STRIP = {
  pricePerMeterNetEur: 36,
  /** 1 transformator 57 € na każde rozpoczęte 40 m taśmy */
  trafoNetEur: 57,
  trafoCoversMeters: 40,
} as const;

/** Opcje pergoli lamelowych (prime / dynamic / advanced) */
export const MB_LAMELL_OPTIONS = {
  /** Izolacja PU lameli — liczona od powierzchni ROZLICZENIOWEJ dachu (bw×bd/10000 m²) */
  puInsulationPerM2NetEur: 40,
  /** Oświetlenie RGB zamiast standardowego LED */
  rgbSetNetEur: 550,
  extraPostNetEur: 380,
} as const;

/** Opcje MB ADAPTIVE */
export const MB_ADAPTIVE_OPTIONS = {
  remote5chNetEur: 66,
  seitenprofilNetEur: 250,
  post3mNetEur: 275,
} as const;

/** Kolory RAL — paleta standardowa kalkulatora (bez dopłat); inne RAL: wycena na zapytanie */
export const MB_RAL_HEX: Record<string, string> = {
  '9016': '#f1f0ea', '9007': '#878581', '7016': '#383e42', '9005': '#0a0a0d',
  'DB703': '#4a4d52', '9001': '#e9e0d2', '9010': '#f1ece1',
};

/* ============================================================
 * ŚCIANKI PRZESUWNE SZKLANE (Schiebewand / zabudowa panoramiczna)
 * 10 mm ESG — cena ZA SZYBĘ z systemem szyn
 * (zestaw: szyna górna+dolna, profile U, rolki, listwy, 1 uchwyt)
 * ============================================================ */

export interface MbSchiebewandStdHeightRule {
  /** Zakres wysokości zabudowy (Einbauhöhe) w cm, włącznie */
  minHeightCm: number;
  maxHeightCm: number;
  /** Dostępne standardowe szerokości szyb [cm] w tym zakresie wysokości */
  panelWidthsCm: number[];
}

export const MB_SCHIEBEWAND = {
  /** Cena EK netto EUR za 1 szybę (z systemem szyn) */
  pricePerPanelNetEur: {
    standard: { klar: 150, getoent: 175 },
    /** szkło na wymiar (maßgefertigt) */
    custom:   { klar: 238, getoent: 266 },
  },
  /** Zakresy, w których istnieje szkło STANDARDOWE (poza nimi: tylko na wymiar) */
  standardGlass: {
    klar: {
      minHeightCm: 198, maxHeightCm: 262,
      /** reguły z kodu: h<=202 → [90,98,103]; 202<h<=237 → [82,90,98,103]; 237<h<=262 → [90,98,103] */
      rules: [
        { minHeightCm: 198, maxHeightCm: 202, panelWidthsCm: [90, 98, 103] },
        { minHeightCm: 203, maxHeightCm: 237, panelWidthsCm: [82, 90, 98, 103] },
        { minHeightCm: 238, maxHeightCm: 262, panelWidthsCm: [90, 98, 103] },
      ] as MbSchiebewandStdHeightRule[],
    },
    getoent: {
      minHeightCm: 208, maxHeightCm: 237,
      /** reguły z kodu: 213<=h<=227 → [90,98,103]; pozostałe wysokości w zakresie → [103] */
      rules: [
        { minHeightCm: 208, maxHeightCm: 212, panelWidthsCm: [103] },
        { minHeightCm: 213, maxHeightCm: 227, panelWidthsCm: [90, 98, 103] },
        { minHeightCm: 228, maxHeightCm: 237, panelWidthsCm: [103] },
      ] as MbSchiebewandStdHeightRule[],
    },
  },
  /** Sugerowana liczba szyb: max(2, ceil(szerokośćOtworuCm / 100)) */
  suggestedPanelCountDivisorCm: 100,
  minPanels: 2,
  /** Warunek doboru szyby standardowej: n × szerSzyby >= szerOtworu + (n−1) × overlap */
  panelOverlapCm: 4,
  /** System szyn ma max 6 torów — powyżej dzielić zabudowę na 2 zestawy */
  maxTracks: 6,
  accessories: {
    lockSetNetEur: 123,      // Zestaw zamka (Schließsystem + zabierak)
    extraHandleNetEur: 10,   // Dodatkowy uchwyt
    mitnehmerNetEur: 9,      // Zabierak (Mitnehmer)
  },
  colors: ['RAL 9016', 'RAL 9007', 'DB703', 'RAL 7016', 'RAL 9005'],
} as const;

/* ============================================================
 * ZIP-SCREEN (Senkrechtmarkise / refleksol pionowy) — z silnikiem
 * Macierze: zip9 (kaseta 9×9, szer. ≤300) i zip11 (kaseta 11×11, szer. ≤600);
 * depthsCm = WYSOKOŚĆ zabudowy. Tryb auto: tańsza z pasujących kaset.
 * ============================================================ */

export const MB_ZIP_OPTIONS = {
  /** Napęd solarny — tylko do 15 m² powierzchni rozliczeniowej */
  solarDriveNetEur: 198,
  solarMaxM2: 15,
  /** Tkanina spoza standardu (standard: Soltis Veozip) — od powierzchni rozliczeniowej */
  nonStandardFabricPerM2NetEur: 14,
  rainSensorOndeisNetEur: 200,
  windSensorEolisNetEur: 108,
  remote1chNetEur: 43,
  remote5chNetEur: 69,
  cassettes: {
    zip9:  { label: 'Kaseta 9×9',  maxWidthCm: 300, maxHeightCm: 300 },
    zip11: { label: 'Kaseta 11×11', maxWidthCm: 600, maxHeightCm: 300 },
  },
  colors: ['RAL 9016', 'RAL 9001', 'RAL 9007', 'DB703', 'RAL 7016', 'RAL 9005'],
} as const;

/* ============================================================
 * KLINY (Keilfenster — trójkąty boczne nad ścianą)
 * Lookup 1-wymiarowy: szerokość zaokrąglana W GÓRĘ do progu MB_KEIL_WIDTHS_CM.
 * Cena za 1 sztukę, EK netto EUR.
 * ============================================================ */

/** Progi szerokości klinów [cm] — indeksy odpowiadają tablicom cen poniżej */
export const MB_KEIL_WIDTHS_CM = [250, 300, 350, 400, 450, 500] as const;

export const MB_KEIL_PRICES_NET_EUR = {
  poly:  { label: 'Poliwęglan', prices: [85, 101, 114, 131, 146, 160] },
  alu16: { label: 'Aluminium lamele 16 cm (96 cm z F-profilem)', prices: [187, 224, 260, 296, 369, 369] },
  alu20: { label: 'Aluminium lamele 20 cm (100 cm z F-profilem)', prices: [226, 270, 314, 359, 447, 447] },
  /** Szkło bezbarwne, wysokość klina max 70 cm */
  glas:  { label: 'Szkło bezbarwne (wys. max 70 cm)', prices: [279, 356, 438, 516, 595, 673] },
} as const;

/** Dopłaty do klina szklanego — indeksy jak MB_KEIL_WIDTHS_CM */
export const MB_KEIL_GLASS_SURCHARGES_NET_EUR = {
  opal:    [38, 46, 53, 61, 69, 77],     // szkło mleczne
  getoent: [140, 168, 197, 225, 253, 281], // szkło przyciemniane
} as const;

/** Klin 8° — szkło bezbarwne, stałe rozmiary (głębokość zaokrąglana W GÓRĘ do progu) */
export const MB_KEIL_8DEG = [
  { maxDepthCm: 250, sizeMm: '350×2430', priceNetEur: 265 },
  { maxDepthCm: 300, sizeMm: '420×2930', priceNetEur: 338 },
  { maxDepthCm: 350, sizeMm: '490×3430', priceNetEur: 406 },
  { maxDepthCm: 400, sizeMm: '560×3930', priceNetEur: 480 },
] as const;

/* ============================================================
 * LIMITY WYMIARÓW (skrót; pełne progi w macierzach)
 * ============================================================ */

export const MB_DIMENSION_LIMITS = {
  solid:     { widthCm: [306, 1206], depthCm: [200, 500] },
  bold:      { widthCm: [306, 1206], depthCm: [200, 500] },
  cube:      { widthCm: [306, 1206], depthCm: [200, 500] },
  cubegrand: { widthCm: [300, 1200], depthCm: [250, 400] },
  carport:   { widthCm: [300, 1200], depthCm: [200, 1000] },
  prime:     { widthCm: [200, 400], depthCm: [209.6, 605.6], note: 'głęb. > 500 → max szer. 350 (null w macierzy)' },
  dynamic:   { widthCm: [200, 400], depthCm: [206, 594.5] },
  advanced:  { widthCm: [200, 500], depthCm: [207.4, 600.1], note: 'lamele przesuwane od domu w stronę ogrodu → szer. max 400' },
  adaptive:  { widthCm: [200, 700], depthCm: [200, 700] },
  zip9:      { widthCm: [100, 300], heightCm: [150, 300] },
  zip11:     { widthCm: [100, 600], heightCm: [150, 300] },
  keil:      { widthCm: [250, 500], glassHeightMaxCm: 70 },
  keil8deg:  { depthCm: [250, 400] },
  schiebewandStdGlass: { klarHeightCm: [198, 262], getoentHeightCm: [208, 237] },
} as const;

/* ============================================================
 * SEMANTYKA CENY KOŃCOWEJ (jak liczy kalkulator — informacyjnie)
 *   netEK     = suma pozycji z tego pliku (EK netto EUR, cena partnerska)
 *   netClient = netEK × (1 + marża%/100) + montażNetto   (montaż BEZ marży)
 *   gross     = netClient × (1 + VAT%/100)               (VAT domyślnie 19%)
 * ============================================================ */
export const MB_PRICING_DEFAULTS = {
  currency: 'EUR',
  priceLevel: 'EK netto (cena zakupu partnera/dealera od MB Aluminium)',
  defaultVatPercent: 19,
  defaultMarginPercent: 0,
  excludes: ['transport', 'montaż'],
  source: 'Preisliste MB Aluminium – Mai 2026',
} as const;

/* ============================================================
 * MACIERZE CEN szer.×głęb. — EK NETTO EUR
 * Wygenerowane 1:1 z obiektu MAT konfiguratora (bez modyfikacji wartości).
 * prime/dynamic = scalone strony cennika (prime_1+prime_2, dynamic_1+dynamic_2),
 * dokładnie tak jak robi to funkcja mergeMat() w konfiguratorze.
 * ============================================================ */

export const MB_PRICE_MATRICES: Record<string, MbPriceMatrix> = {
  solid_pc: {
    widthsCm: [306, 406, 506, 606, 706, 806, 906, 1006, 1106, 1206],
    depthsCm: [200, 250, 300, 350, 400, 450, 500],
    pricesNetEur: [
      /* 200 */ [725, 890, 1003, 1125, 1395, 1612, 1856, 2010, 2198, 2425],
      /* 250 */ [853, 1050, 1200, 1349, 1584, 1741, 2073, 2189, 2446, 2634],
      /* 300 */ [942, 1151, 1318, 1483, 1736, 1912, 2273, 2408, 2687, 2895],
      /* 350 */ [1103, 1247, 1453, 1624, 1879, 2079, 2459, 2615, 2913, 3140],
      /* 400 */ [1249, 1542, 1590, 1732, 2021, 2240, 2674, 3067, 3411, 3679],
      /* 450 */ [1418, 1677, 2012, 2268, 2646, 2936, 3163, 3559, 3954, 4267],
      /* 500 */ [1569, 1843, 2211, 2501, 2914, 3236, 3669, 3927, 4360, 4707]
    ],
    postCount: [
      /* 200 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 250 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 300 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 350 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 400 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 450 */ [2, 2, 2, 3, 3, 3, 3, 4, 4, 4],
      /* 500 */ [2, 2, 2, 3, 3, 3, 3, 4, 4, 4]
    ],
  },
  solid_ohne_pc: {
    widthsCm: [306, 406, 506, 606, 706, 806, 906, 1006, 1106, 1206],
    depthsCm: [200, 250, 300, 350, 400, 450, 500],
    pricesNetEur: [
      /* 200 */ [665, 810, 903, 1005, 1255, 1452, 1676, 1810, 1978, 2185],
      /* 250 */ [778, 950, 1075, 1199, 1409, 1541, 1848, 1939, 2171, 2334],
      /* 300 */ [852, 1031, 1168, 1303, 1526, 1672, 2003, 2108, 2357, 2535],
      /* 350 */ [998, 1107, 1278, 1414, 1634, 1799, 2144, 2265, 2528, 2720],
      /* 400 */ [1129, 1382, 1390, 1492, 1741, 1920, 2314, 2667, 2971, 3199],
      /* 450 */ [1283, 1497, 1787, 1998, 2331, 2576, 2758, 3109, 3459, 3727],
      /* 500 */ [1419, 1643, 1961, 2201, 2564, 2836, 3219, 3427, 3810, 4107]
    ],
    postCount: [
      /* 200 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 250 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 300 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 350 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 400 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 450 */ [2, 2, 2, 3, 3, 3, 3, 4, 4, 4],
      /* 500 */ [2, 2, 2, 3, 3, 3, 3, 4, 4, 4]
    ],
  },
  solid_glas_klar: {
    widthsCm: [306, 406, 506, 606, 706, 806, 906, 1006, 1106, 1206],
    depthsCm: [200, 250, 300, 350, 400, 450, 500],
    pricesNetEur: [
      /* 200 */ [1117, 1374, 1633, 1845, 2139, 2352, 2671, 2833, 3148, 3386],
      /* 250 */ [1266, 1563, 1713, 1940, 2276, 2508, 2981, 3245, 3595, 3871],
      /* 300 */ [1448, 1752, 2014, 2183, 2559, 2822, 3347, 3655, 4044, 4356],
      /* 350 */ [1789, 2107, 2426, 2744, 3029, 3355, 3778, 4200, 4641, 5002],
      /* 400 */ [2105, 2524, 2830, 3148, 3614, 3824, 4494, 5012, 5520, 5949],
      /* 450 */ [2529, 3127, 3530, 4026, 4850, 5383, 6021, 6494, 7135, 7692],
      /* 500 */ [2843, 3529, 4233, 4847, 5830, 6483, 7248, 7838, 8300, 9127]
    ],
    postCount: [
      /* 200 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 250 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 300 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 350 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 400 */ [2, 2, 2, 3, 3, 3, 3, 4, 4, 4],
      /* 450 */ [2, 2, 2, 3, 3, 3, 3, 4, 4, 4],
      /* 500 */ [2, 2, 2, 3, 3, 3, 3, 4, 4, 4]
    ],
  },
  solid_glas_opal: {
    widthsCm: [306, 406, 506, 606, 706, 806, 906, 1006, 1106, 1206],
    depthsCm: [200, 250, 300, 350, 400, 450, 500],
    pricesNetEur: [
      /* 200 */ [1213, 1502, 1793, 2037, 2363, 2608, 2959, 3153, 3500, 3770],
      /* 250 */ [1386, 1723, 1913, 2180, 2556, 2828, 3341, 3645, 4035, 4351],
      /* 300 */ [1592, 1944, 2254, 2471, 2895, 3206, 3779, 4135, 4572, 4932],
      /* 350 */ [1957, 2331, 2706, 3080, 3421, 3803, 4282, 4760, 5257, 5674],
      /* 400 */ [2297, 2780, 3150, 3532, 4062, 4336, 5070, 5652, 6224, 6717],
      /* 450 */ [2745, 3415, 3890, 4458, 5354, 5959, 6669, 7214, 7927, 8556],
      /* 500 */ [3083, 3849, 4633, 5327, 6390, 7123, 7968, 8638, 9180, 10087]
    ],
    postCount: [
      /* 200 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 250 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 300 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 350 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 400 */ [2, 2, 2, 3, 3, 3, 3, 4, 4, 4],
      /* 450 */ [2, 2, 2, 3, 3, 3, 3, 4, 4, 4],
      /* 500 */ [2, 2, 2, 3, 3, 3, 3, 4, 4, 4]
    ],
  },
  solid_glas_getoent: {
    widthsCm: [306, 406, 506, 606, 706, 806, 906, 1006, 1106, 1206],
    depthsCm: [200, 250, 300, 350, 400, 450, 500],
    pricesNetEur: [
      /* 200 */ [1327, 1654, 1983, 2265, 2629, 2912, 3301, 3533, 3918, 4226],
      /* 250 */ [1529, 1913, 2150, 2465, 2889, 3208, 3768, 4120, 4558, 4921],
      /* 300 */ [1763, 2172, 2539, 2813, 3294, 3662, 4292, 4705, 5199, 5616],
      /* 350 */ [2157, 2597, 3038, 3479, 3887, 4335, 4880, 5425, 5989, 6472],
      /* 400 */ [2525, 3084, 3530, 3988, 4594, 4944, 5754, 6412, 7060, 7629],
      /* 450 */ [3001, 3757, 4318, 4971, 5953, 6643, 7439, 8069, 8867, 9582],
      /* 500 */ [3368, 4229, 5108, 5897, 7055, 7883, 8823, 9588, 10225, 11227]
    ],
    postCount: [
      /* 200 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 250 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 300 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 350 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 400 */ [2, 2, 2, 3, 3, 3, 3, 4, 4, 4],
      /* 450 */ [2, 2, 2, 3, 3, 3, 3, 4, 4, 4],
      /* 500 */ [2, 2, 2, 3, 3, 3, 3, 4, 4, 4]
    ],
  },
  solid_ohne_glas: {
    widthsCm: [306, 406, 506, 606, 706, 806, 906, 1006, 1106, 1206],
    depthsCm: [200, 250, 300, 350, 400, 450, 500],
    pricesNetEur: [
      /* 200 */ [903, 1090, 1279, 1421, 1645, 1788, 2037, 2129, 2374, 2542],
      /* 250 */ [999, 1208, 1370, 1510, 1759, 1903, 2188, 2364, 2627, 2816],
      /* 300 */ [1127, 1326, 1483, 1547, 1818, 1976, 2396, 2599, 2882, 3090],
      /* 350 */ [1414, 1610, 1806, 2001, 2164, 2367, 2668, 2968, 3286, 3525],
      /* 400 */ [1640, 1907, 2061, 2227, 2541, 2599, 3117, 3483, 3839, 4116],
      /* 450 */ [1909, 2305, 2506, 2799, 3420, 3750, 4186, 4457, 4895, 5250],
      /* 500 */ [2078, 2514, 2968, 3332, 4065, 4468, 4983, 5323, 5535, 6112]
    ],
    postCount: [
      /* 200 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 250 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 300 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 350 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 400 */ [2, 2, 2, 3, 3, 3, 3, 4, 4, 4],
      /* 450 */ [2, 2, 2, 3, 3, 3, 3, 4, 4, 4],
      /* 500 */ [2, 2, 2, 3, 3, 3, 3, 4, 4, 4]
    ],
  },
  bold_pc: {
    widthsCm: [306, 406, 506, 606, 706, 806, 906, 1006, 1106, 1206],
    depthsCm: [200, 250, 300, 350, 400, 450, 500],
    pricesNetEur: [
      /* 200 */ [879, 1072, 1248, 1438, 1693, 1882, 2135, 2230, 2470, 2648],
      /* 250 */ [990, 1211, 1392, 1606, 1884, 2096, 2422, 2542, 2807, 3011],
      /* 300 */ [1093, 1339, 1540, 1729, 2050, 2282, 2615, 2755, 3038, 3263],
      /* 350 */ [1198, 1458, 1657, 1914, 2236, 2491, 2850, 3013, 3320, 3568],
      /* 400 */ [1415, 1712, 1772, 2050, 2390, 2666, 3094, 3279, 3611, 3883],
      /* 450 */ [1520, 1830, 2150, 2487, 2897, 3232, 3639, 3866, 4255, 4576],
      /* 500 */ [1676, 2010, 2363, 2736, 3183, 3552, 3997, 4255, 4680, 5038]
    ],
    postCount: [
      /* 200 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 250 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 300 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 350 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 400 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 450 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 500 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4]
    ],
  },
  bold_ohne_pc: {
    widthsCm: [306, 406, 506, 606, 706, 806, 906, 1006, 1106, 1206],
    depthsCm: [200, 250, 300, 350, 400, 450, 500],
    pricesNetEur: [
      /* 200 */ [819, 992, 1148, 1318, 1553, 1722, 1955, 2030, 2250, 2408],
      /* 250 */ [915, 1111, 1267, 1456, 1709, 1896, 2197, 2292, 2532, 2711],
      /* 300 */ [1003, 1219, 1390, 1549, 1840, 2042, 2345, 2455, 2708, 2903],
      /* 350 */ [1093, 1318, 1482, 1704, 1991, 2211, 2535, 2663, 2935, 3148],
      /* 400 */ [1295, 1552, 1572, 1810, 2110, 2346, 2734, 2879, 3171, 3403],
      /* 450 */ [1385, 1650, 1925, 2217, 2582, 2872, 3234, 3416, 3760, 4036],
      /* 500 */ [1526, 1810, 2113, 2436, 2833, 3152, 3547, 3755, 4130, 4438]
    ],
    postCount: [
      /* 200 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 250 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 300 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 350 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 400 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 450 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 500 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4]
    ],
  },
  bold_glas_klar: {
    widthsCm: [306, 406, 506, 606, 706, 806, 906, 1006, 1106, 1206],
    depthsCm: [200, 250, 300, 350, 400, 450, 500],
    pricesNetEur: [
      /* 200 */ [1215, 1482, 1746, 1958, 2291, 2529, 2854, 3010, 3335, 3571],
      /* 250 */ [1374, 1675, 1883, 2196, 2618, 2895, 3311, 3509, 3879, 4160],
      /* 300 */ [1558, 1869, 2138, 2441, 2909, 3222, 3680, 3914, 4321, 4638],
      /* 350 */ [1898, 2221, 2560, 2880, 3249, 3604, 4112, 4387, 4837, 5196],
      /* 400 */ [2219, 2618, 2958, 3378, 3845, 4333, 4930, 5278, 5804, 6238],
      /* 450 */ [2651, 3247, 3763, 4369, 5231, 5812, 6168, 6632, 7278, 7829],
      /* 500 */ [2973, 3673, 4364, 5073, 6069, 6753, 7541, 8120, 8603, 9263]
    ],
    postCount: [
      /* 200 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 250 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 300 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 350 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 400 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 450 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 500 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4]
    ],
  },
  bold_glas_opal: {
    widthsCm: [306, 406, 506, 606, 706, 806, 906, 1006, 1106, 1206],
    depthsCm: [200, 250, 300, 350, 400, 450, 500],
    pricesNetEur: [
      /* 200 */ [1311, 1610, 1906, 2150, 2515, 2785, 3142, 3330, 3687, 3955],
      /* 250 */ [1494, 1835, 2083, 2436, 2898, 3215, 3671, 3909, 4319, 4640],
      /* 300 */ [1702, 2061, 2378, 2729, 3245, 3606, 4112, 4394, 4849, 5214],
      /* 350 */ [2066, 2445, 2840, 3216, 3641, 4052, 4616, 4947, 5453, 5868],
      /* 400 */ [2411, 2874, 3278, 3762, 4293, 4845, 5506, 5918, 6508, 7006],
      /* 450 */ [2867, 3535, 4123, 4801, 5735, 6388, 6816, 7352, 8070, 8693],
      /* 500 */ [3213, 3993, 4764, 5553, 6629, 7393, 8261, 8920, 9483, 10223]
    ],
    postCount: [
      /* 200 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 250 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 300 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 350 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 400 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 450 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 500 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4]
    ],
  },
  bold_glas_getoent: {
    widthsCm: [306, 406, 506, 606, 706, 806, 906, 1006, 1106, 1206],
    depthsCm: [200, 250, 300, 350, 400, 450, 500],
    pricesNetEur: [
      /* 200 */ [1425, 1762, 2096, 2378, 2781, 3089, 3484, 3710, 4105, 4411],
      /* 250 */ [1637, 2025, 2320, 2721, 3230, 3595, 4098, 4384, 4841, 5210],
      /* 300 */ [1873, 2289, 2663, 3071, 3644, 4062, 4625, 4964, 5476, 5898],
      /* 350 */ [2266, 2711, 3172, 3615, 4106, 4584, 5214, 5612, 6185, 6666],
      /* 400 */ [2639, 3178, 3658, 4218, 4825, 5453, 6190, 6678, 7344, 7918],
      /* 450 */ [3123, 3877, 4550, 5314, 6333, 7072, 7585, 8207, 9010, 9719],
      /* 500 */ [3498, 4373, 5239, 6123, 7294, 8153, 9116, 9870, 10528, 11363]
    ],
    postCount: [
      /* 200 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 250 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 300 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 350 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 400 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 450 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 500 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4]
    ],
  },
  bold_ohne_glas: {
    widthsCm: [306, 406, 506, 606, 706, 806, 906, 1006, 1106, 1206],
    depthsCm: [200, 250, 300, 350, 400, 450, 500],
    pricesNetEur: [
      /* 200 */ [1001, 1197, 1392, 1534, 1797, 1965, 2220, 2306, 2561, 2727],
      /* 250 */ [1107, 1320, 1440, 1665, 2000, 2190, 2518, 2629, 2911, 3105],
      /* 300 */ [1237, 1443, 1607, 1805, 2167, 2376, 2729, 2858, 3159, 3372],
      /* 350 */ [1524, 1723, 1940, 2138, 2384, 2616, 3002, 3155, 3483, 3719],
      /* 400 */ [1754, 2001, 2189, 2457, 2772, 3108, 3553, 3749, 4123, 4405],
      /* 450 */ [2031, 2425, 2738, 3142, 3801, 4180, 4333, 4595, 5038, 5386],
      /* 500 */ [2208, 2658, 3099, 3558, 4304, 4738, 5276, 5605, 5838, 6248]
    ],
    postCount: [
      /* 200 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 250 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 300 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 350 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 400 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 450 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 500 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4]
    ],
  },
  cube_pc: {
    widthsCm: [306, 406, 506, 606, 706, 806, 906, 1006, 1106, 1206],
    depthsCm: [200, 250, 300, 350, 400, 450, 500],
    pricesNetEur: [
      /* 200 */ [1285, 1506, 1721, 1953, 2254, 2473, 2762, 2979, 3194, 3488],
      /* 250 */ [1464, 1715, 1929, 2187, 2514, 2759, 3125, 3372, 3616, 3942],
      /* 300 */ [1628, 1907, 2144, 2391, 2742, 3057, 3402, 3672, 3940, 4289],
      /* 350 */ [1797, 2104, 2366, 2636, 3063, 3363, 3737, 4034, 4329, 4707],
      /* 400 */ [1972, 2309, 2637, 2936, 3351, 3679, 4082, 4409, 4733, 5141],
      /* 450 */ [2204, 2580, 2948, 3334, 3800, 4172, 4316, 4661, 5005, 5431],
      /* 500 */ [2443, 2858, 3266, 3694, 4201, 4613, 5108, 5321, 5714, 5983]
    ],
    postCount: [
      /* 200 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 250 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 300 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 350 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 400 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 450 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 500 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4]
    ],
  },
  cube_ohne_pc: {
    widthsCm: [306, 406, 506, 606, 706, 806, 906, 1006, 1106, 1206],
    depthsCm: [200, 250, 300, 350, 400, 450, 500],
    pricesNetEur: [
      /* 200 */ [1225, 1426, 1621, 1833, 2114, 2313, 2582, 2779, 2974, 3248],
      /* 250 */ [1389, 1615, 1804, 2037, 2339, 2559, 2900, 3122, 3341, 3642],
      /* 300 */ [1538, 1787, 1994, 2211, 2532, 2817, 3132, 3372, 3610, 3929],
      /* 350 */ [1692, 1964, 2191, 2426, 2818, 3083, 3422, 3684, 3944, 4287],
      /* 400 */ [1852, 2149, 2437, 2696, 3071, 3359, 3722, 4009, 4293, 4661],
      /* 450 */ [2069, 2400, 2723, 3064, 3485, 3812, 3911, 4211, 4510, 4891],
      /* 500 */ [2293, 2658, 3016, 3394, 3851, 4213, 4658, 4821, 5164, 5383]
    ],
    postCount: [
      /* 200 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 250 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 300 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 350 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 400 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 450 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 500 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4]
    ],
  },
  cube_glas_klar: {
    widthsCm: [306, 406, 506, 606, 706, 806, 906, 1006, 1106, 1206],
    depthsCm: [200, 250, 300, 350, 400, 450, 500],
    pricesNetEur: [
      /* 200 */ [1556, 1847, 2112, 2398, 2768, 3043, 3322, 3603, 3879, 4293],
      /* 250 */ [1804, 2143, 2415, 2744, 3156, 3474, 3858, 4185, 4509, 4986],
      /* 300 */ [2036, 2418, 2730, 3051, 3502, 3921, 4286, 4652, 5013, 5539],
      /* 350 */ [2275, 2703, 3053, 3414, 3910, 4309, 4712, 5202, 5608, 6193],
      /* 400 */ [2693, 3201, 3687, 4121, 4707, 5193, 5683, 6173, 6660, 7372],
      /* 450 */ [3380, 4038, 4675, 5332, 6082, 6727, 6868, 7473, 8072, 8949],
      /* 500 */ [3888, 4657, 5406, 6175, 7042, 7799, 8560, 8976, 9705, 10185]
    ],
    postCount: [
      /* 200 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 250 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 300 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 350 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 400 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 450 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 500 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4]
    ],
  },
  cube_glas_opal: {
    widthsCm: [306, 406, 506, 606, 706, 806, 906, 1006, 1106, 1206],
    depthsCm: [200, 250, 300, 350, 400, 450, 500],
    pricesNetEur: [
      /* 200 */ [1652, 1975, 2272, 2590, 2992, 3299, 3610, 3923, 4231, 4677],
      /* 250 */ [1924, 2303, 2615, 2984, 3436, 3794, 4218, 4585, 4949, 5466],
      /* 300 */ [2180, 2610, 2970, 3339, 3838, 4305, 4718, 5132, 5541, 6115],
      /* 350 */ [2443, 2927, 3333, 3750, 4302, 4757, 5216, 5762, 6224, 6865],
      /* 400 */ [2885, 3457, 4007, 4505, 5155, 5705, 6259, 6813, 7364, 8140],
      /* 450 */ [3596, 4326, 5035, 5764, 6586, 7303, 7516, 8193, 8864, 9813],
      /* 500 */ [4128, 4977, 5806, 6655, 7602, 8439, 9280, 9776, 10585, 11145]
    ],
    postCount: [
      /* 200 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 250 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 300 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 350 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 400 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 450 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 500 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4]
    ],
  },
  cube_glas_getoent: {
    widthsCm: [306, 406, 506, 606, 706, 806, 906, 1006, 1106, 1206],
    depthsCm: [200, 250, 300, 350, 400, 450, 500],
    pricesNetEur: [
      /* 200 */ [1766, 2127, 2462, 2818, 3258, 3603, 3952, 4303, 4649, 5133],
      /* 250 */ [2066, 2493, 2853, 3269, 3769, 4174, 4645, 5060, 5471, 6036],
      /* 300 */ [2351, 2838, 3255, 3681, 4237, 4761, 5231, 5702, 6168, 6799],
      /* 350 */ [2643, 3193, 3666, 4149, 4768, 5289, 5815, 6427, 6956, 7663],
      /* 400 */ [3113, 3761, 4387, 4961, 5687, 6313, 6943, 7573, 8200, 9052],
      /* 450 */ [3853, 4668, 5462, 6277, 7185, 7987, 8285, 9048, 9805, 10839],
      /* 500 */ [4413, 5357, 6281, 7225, 8267, 9199, 10135, 10726, 11630, 12285]
    ],
    postCount: [
      /* 200 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 250 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 300 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 350 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 400 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 450 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 500 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4]
    ],
  },
  cube_ohne_glas: {
    widthsCm: [306, 406, 506, 606, 706, 806, 906, 1006, 1106, 1206],
    depthsCm: [200, 250, 300, 350, 400, 450, 500],
    pricesNetEur: [
      /* 200 */ [1342, 1563, 1757, 1974, 2274, 2479, 2688, 2898, 3105, 3449],
      /* 250 */ [1536, 1788, 1972, 2213, 2539, 2769, 3065, 3305, 3541, 3931],
      /* 300 */ [1715, 1992, 2199, 2415, 2760, 3074, 3335, 3595, 3851, 4272],
      /* 350 */ [1901, 2205, 2434, 2671, 3045, 3322, 3603, 3969, 4253, 4716],
      /* 400 */ [2228, 2584, 2917, 3200, 3634, 3968, 4305, 4644, 4979, 5539],
      /* 450 */ [2761, 3216, 3650, 4104, 4653, 5095, 5233, 5435, 5833, 6507],
      /* 500 */ [3123, 3642, 4141, 4660, 5277, 5784, 6295, 6461, 6940, 7170]
    ],
    postCount: [
      /* 200 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 250 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 300 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 350 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 400 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 450 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
      /* 500 */ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4]
    ],
  },
  cubegrand_glas_klar: {
    widthsCm: [300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200],
    depthsCm: [250, 300, 350, 400],
    pricesNetEur: [
      /* 250 */ [2812, 3234, 3669, 4078, 4823, 5249, 5893, 6255, 6805, 7372],
      /* 300 */ [3078, 3547, 4029, 4486, 5280, 5752, 6443, 6852, 7530, 8075],
      /* 350 */ [3344, 3859, 4395, 4903, 5744, 6265, 6992, 7448, 8115, 8796],
      /* 400 */ [3790, 4389, 5008, 5598, 6523, 7128, 7938, 8478, 9345, 10040]
    ],
    postCount: [
      /* 250 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 300 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 350 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 400 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4]
    ],
  },
  cubegrand_glas_opal: {
    widthsCm: [300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200],
    depthsCm: [250, 300, 350, 400],
    pricesNetEur: [
      /* 250 */ [2932, 3394, 3869, 4318, 5103, 5569, 6253, 6655, 7245, 7852],
      /* 300 */ [3222, 3739, 4269, 4774, 5616, 6136, 6875, 7332, 8058, 8651],
      /* 350 */ [3512, 4083, 4675, 5239, 6136, 6713, 7496, 8008, 8731, 9468],
      /* 400 */ [3982, 4645, 5328, 5982, 6971, 7640, 8514, 9118, 10049, 10808]
    ],
    postCount: [
      /* 250 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 300 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 350 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 400 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4]
    ],
  },
  cubegrand_glas_getoent: {
    widthsCm: [300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200],
    depthsCm: [250, 300, 350, 400],
    pricesNetEur: [
      /* 250 */ [3080, 3589, 4112, 4608, 5919, 5954, 6685, 7135, 7773, 8427],
      /* 300 */ [3399, 3974, 4561, 5122, 6559, 6598, 7394, 7908, 8692, 9342],
      /* 350 */ [3719, 4357, 5015, 5645, 7267, 7253, 8101, 8680, 9470, 10274],
      /* 400 */ [4256, 5006, 5777, 6519, 8228, 8353, 9315, 10007, 11026, 11874]
    ],
    postCount: [
      /* 250 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 300 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 350 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 400 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4]
    ],
  },
  cubegrand_ohne_glas: {
    widthsCm: [300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200],
    depthsCm: [250, 300, 350, 400],
    pricesNetEur: [
      /* 250 */ [2549, 2884, 3231, 3553, 4211, 4549, 5105, 5380, 5843, 6322],
      /* 300 */ [2763, 3127, 3504, 3856, 4545, 4912, 5498, 5802, 6375, 6815],
      /* 350 */ [2977, 3369, 3783, 4168, 4887, 5285, 5889, 6223, 6768, 7326],
      /* 400 */ [3370, 3829, 4308, 4758, 5543, 6008, 6678, 7078, 7805, 8360]
    ],
    postCount: [
      /* 250 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 300 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 350 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      /* 400 */ [2, 2, 2, 2, 3, 3, 3, 4, 4, 4]
    ],
  },
  carport_trapez: {
    widthsCm: [300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200],
    depthsCm: [200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950, 1000],
    pricesNetEur: [
      /* 200 */ [1329, 1547, 1786, 2024, 2594, 2819, 3044, 3256, 3836, 4068],
      /* 250 */ [1436, 1664, 1913, 2163, 2784, 3020, 3255, 3478, 4069, 4311],
      /* 300 */ [1703, 1982, 2289, 2596, 3345, 3635, 3924, 4198, 4842, 5139],
      /* 350 */ [1801, 2092, 2409, 2727, 3525, 3826, 4125, 4411, 5065, 5374],
      /* 400 */ [2038, 2380, 2749, 3119, 4041, 4394, 4746, 5082, 5789, 6149],
      /* 450 */ [2136, 2489, 2870, 3250, 4221, 4585, 4948, 5295, 6012, 6384],
      /* 500 */ [2337, 2736, 3163, 3588, 4667, 5078, 5485, 5879, 6636, 7053],
      /* 550 */ [2434, 2844, 3280, 3717, 4845, 5265, 5685, 6088, 6857, 7285],
      /* 600 */ [2667, 3128, 3616, 4103, 5353, 5825, 6295, 6750, 7569, 8048],
      /* 650 */ [2873, 3344, 3843, 4342, 5693, 6176, 6657, 7123, 7790, 8280],
      /* 700 */ [3061, 3576, 4118, 4659, 6112, 6638, 7162, 7672, 8379, 8912],
      /* 750 */ [3156, 3682, 4235, 4786, 6286, 6824, 7358, 7878, 8597, 9140],
      /* 800 */ [3338, 3906, 4499, 5094, 6692, 7270, 7847, 8408, 9167, 9751],
      /* 850 */ [3431, 4010, 4614, 5219, 6863, 7452, 8040, 8612, 9381, 9977],
      /* 900 */ [3667, 4296, 4950, 5605, 7370, 8009, 8647, 9268, 10087, 10734],
      /* 950 */ [3760, 4400, 5065, 5731, 7542, 8192, 8840, 9472, 10303, 10959],
      /* 1000 */ [3987, 4676, 5391, 6106, 8037, 8736, 9433, 10115, 10995, 11700]
    ],
    postCount: [
      /* 200 */ [4, 4, 4, 4, 6, 6, 6, 6, 6, 6],
      /* 250 */ [4, 4, 4, 4, 6, 6, 6, 6, 6, 6],
      /* 300 */ [4, 4, 4, 4, 6, 6, 6, 6, 6, 6],
      /* 350 */ [4, 4, 4, 4, 6, 6, 6, 6, 6, 6],
      /* 400 */ [4, 4, 4, 4, 6, 6, 6, 6, 6, 6],
      /* 450 */ [4, 4, 4, 4, 6, 6, 6, 7, 7, 7],
      /* 500 */ [4, 4, 4, 4, 6, 6, 6, 7, 7, 7],
      /* 550 */ [4, 4, 4, 4, 6, 6, 6, 7, 7, 7],
      /* 600 */ [4, 4, 4, 4, 6, 6, 6, 7, 7, 7],
      /* 650 */ [6, 6, 6, 6, 9, 9, 9, 9, 10, 10],
      /* 700 */ [6, 6, 6, 6, 9, 9, 9, 9, 10, 10],
      /* 750 */ [6, 6, 6, 6, 9, 9, 9, 9, 10, 10],
      /* 800 */ [6, 6, 6, 6, 9, 9, 9, 9, 10, 10],
      /* 850 */ [6, 6, 6, 6, 9, 9, 9, 9, 10, 10],
      /* 900 */ [6, 6, 6, 6, 9, 9, 9, 9, 10, 10],
      /* 950 */ [6, 6, 6, 6, 9, 9, 9, 9, 10, 10],
      /* 1000 */ [6, 6, 6, 6, 9, 9, 9, 9, 10, 10]
    ],
  },
  carport_ohne: {
    widthsCm: [300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200],
    depthsCm: [200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950, 1000],
    pricesNetEur: [
      /* 200 */ [1221, 1403, 1605, 1808, 2340, 2531, 2720, 2896, 3440, 3635],
      /* 250 */ [1301, 1484, 1688, 1893, 2468, 2660, 2850, 3027, 3573, 3771],
      /* 300 */ [1541, 1766, 2019, 2271, 2966, 3203, 3438, 3657, 4246, 4490],
      /* 350 */ [1612, 1840, 2094, 2348, 3083, 3321, 3558, 3780, 4371, 4617],
      /* 400 */ [1822, 2092, 2389, 2686, 3536, 3818, 4097, 4361, 4995, 5284],
      /* 450 */ [1892, 2164, 2463, 2764, 3653, 3936, 4218, 4484, 5120, 5411],
      /* 500 */ [2072, 2381, 2718, 3056, 4046, 4367, 4686, 4991, 5660, 5988],
      /* 550 */ [2141, 2453, 2792, 3131, 4160, 4484, 4805, 5111, 5782, 6113],
      /* 600 */ [2348, 2702, 3083, 3464, 4607, 4973, 5336, 5685, 6398, 6769],
      /* 650 */ [2526, 2883, 3266, 3649, 4886, 5253, 5619, 5969, 6521, 6895],
      /* 700 */ [2693, 3086, 3505, 3924, 5255, 5658, 6060, 6447, 7032, 7442],
      /* 750 */ [2763, 3157, 3578, 3998, 5368, 5774, 6177, 6566, 7154, 7565],
      /* 800 */ [2923, 3354, 3809, 4265, 5726, 6166, 6605, 7029, 7648, 8096],
      /* 850 */ [2991, 3423, 3881, 4339, 5837, 6279, 6720, 7146, 7768, 8217],
      /* 900 */ [3201, 3674, 4174, 4674, 6283, 6767, 7249, 7716, 8380, 8871],
      /* 950 */ [3269, 3743, 4245, 4747, 6396, 6881, 7365, 7834, 8500, 8992],
      /* 1000 */ [3470, 3986, 4528, 5070, 6829, 7355, 7880, 8391, 9097, 9631]
    ],
    postCount: [
      /* 200 */ [4, 4, 4, 4, 6, 6, 6, 6, 6, 6],
      /* 250 */ [4, 4, 4, 4, 6, 6, 6, 6, 6, 6],
      /* 300 */ [4, 4, 4, 4, 6, 6, 6, 6, 6, 6],
      /* 350 */ [4, 4, 4, 4, 6, 6, 6, 6, 6, 6],
      /* 400 */ [4, 4, 4, 4, 6, 6, 6, 6, 6, 6],
      /* 450 */ [4, 4, 4, 4, 6, 6, 6, 7, 7, 7],
      /* 500 */ [4, 4, 4, 4, 6, 6, 6, 7, 7, 7],
      /* 550 */ [4, 4, 4, 4, 6, 6, 6, 7, 7, 7],
      /* 600 */ [4, 4, 4, 4, 6, 6, 6, 7, 7, 7],
      /* 650 */ [6, 6, 6, 6, 9, 9, 9, 9, 10, 10],
      /* 700 */ [6, 6, 6, 6, 9, 9, 9, 9, 10, 10],
      /* 750 */ [6, 6, 6, 6, 9, 9, 9, 9, 10, 10],
      /* 800 */ [6, 6, 6, 6, 9, 9, 9, 9, 10, 10],
      /* 850 */ [6, 6, 6, 6, 9, 9, 9, 9, 10, 10],
      /* 900 */ [6, 6, 6, 6, 9, 9, 9, 9, 10, 10],
      /* 950 */ [6, 6, 6, 6, 9, 9, 9, 9, 10, 10],
      /* 1000 */ [6, 6, 6, 6, 9, 9, 9, 9, 10, 10]
    ],
  },
  prime: {
    widthsCm: [200, 225, 250, 275, 300, 325, 350, 375, 400],
    depthsCm: [209.6, 222.8, 236, 249.2, 262.4, 275.6, 288.8, 302, 315.2, 328.4, 341.6, 354.8, 368, 381.2, 394.4, 407.6, 420.8, 434, 447.2, 460.4, 473.6, 486.8, 500, 513.2, 526.4, 539.6, 552.8, 566, 579.2, 592.4, 605.6],
    pricesNetEur: [
      /* 209.6 */ [6425, 6525, 6624, 6724, 6823, 6923, 7022, 7451, 7550],
      /* 222.8 */ [6495, 6599, 6703, 6806, 6910, 7014, 7118, 7552, 7656],
      /* 236 */ [6564, 6672, 6782, 6890, 6998, 7107, 7215, 7653, 7762],
      /* 249.2 */ [6633, 6747, 6860, 6973, 7085, 7199, 7312, 7755, 7868],
      /* 262.4 */ [6702, 6821, 6938, 7056, 7173, 7291, 7409, 7856, 7973],
      /* 275.6 */ [6772, 6894, 7016, 7139, 7260, 7383, 7506, 8163, 8285],
      /* 288.8 */ [6841, 6968, 7095, 7221, 7348, 7475, 7602, 8265, 8391],
      /* 302 */ [6910, 7042, 7173, 7305, 7436, 7567, 7698, 8469, 8599],
      /* 315.2 */ [6979, 7115, 7251, 7387, 7523, 7659, 7795, 8570, 8706],
      /* 328.4 */ [7152, 7292, 7432, 7574, 7714, 7958, 8304, 8775, 8915],
      /* 341.6 */ [7221, 7367, 7512, 7656, 7801, 8049, 8401, 8876, 9021],
      /* 354.8 */ [7393, 7543, 7693, 7842, 8095, 8245, 8601, 9182, 9332],
      /* 368 */ [7462, 7617, 7771, 7926, 8182, 8337, 8697, 9283, 9438],
      /* 381.2 */ [7532, 7691, 7850, 8008, 8270, 8428, 8794, 9385, 9544],
      /* 394.4 */ [7601, 7764, 7928, 8092, 8357, 8521, 8890, 9486, 9650],
      /* 407.6 */ [7670, 7838, 8006, 8174, 8445, 8613, 8987, 9587, 9755],
      /* 420.8 */ [7842, 8015, 8187, 8361, 8533, 8706, 9084, 9689, 9861],
      /* 434 */ [8014, 8192, 8369, 8546, 8723, 8900, 9180, 9790, 9967],
      /* 447.2 */ [8187, 8369, 8550, 8732, 8914, 9096, 9277, 9994, 10176],
      /* 460.4 */ [8256, 8443, 8629, 8815, 9001, 9188, 9374, 10096, 10281],
      /* 473.6 */ [8428, 8619, 8811, 9001, 9192, 9382, 9574, 10197, 10388],
      /* 486.8 */ [8498, 8693, 8889, 9084, 9279, 9475, 9670, 10401, 10597],
      /* 500 */ [8671, 8870, 9070, 9270, 9470, 9670, 9869, 10502, 10703],
      /* 513.2 */ [9533, 9737, 9942, 10147, 10350, 10555, 10759, null, null],
      /* 526.4 */ [9602, 9811, 10020, 10229, 10438, 10647, 10856, null, null],
      /* 539.6 */ [9774, 9988, 10201, 10415, 10629, 10842, 11056, null, null],
      /* 552.8 */ [9844, 10061, 10279, 10498, 10716, 10934, 11153, null, null],
      /* 566 */ [10016, 10238, 10461, 10684, 10907, 11129, 11353, null, null],
      /* 579.2 */ [10085, 10312, 10540, 10767, 10994, 11222, 11449, null, null],
      /* 592.4 */ [10154, 10385, 10618, 10850, 11082, 11314, 11545, null, null],
      /* 605.6 */ [10224, 10460, 10697, 10932, 11169, 11509, 11745, null, null]
    ],
  },
  dynamic: {
    widthsCm: [200, 225, 250, 275, 300, 325, 350, 375, 400],
    depthsCm: [206, 224.5, 243, 261.5, 280, 298.5, 317, 335.5, 354, 372.5, 391, 409.5, 428, 446.5, 465, 483.5, 502, 520.5, 539, 557.5, 576, 594.5],
    pricesNetEur: [
      /* 206 */ [7735, 7851, 7967, 8083, 8200, 8316, 8433, 8549, 8665],
      /* 224.5 */ [7859, 7981, 8104, 8227, 8349, 8472, 8594, 8717, 8839],
      /* 243 */ [7984, 8112, 8242, 8371, 8500, 8628, 8757, 8886, 9015],
      /* 261.5 */ [8211, 8346, 8482, 8617, 8752, 8887, 9022, 9157, 9293],
      /* 280 */ [8336, 8477, 8619, 8760, 8901, 9042, 9185, 9326, 9467],
      /* 298.5 */ [8615, 8762, 8911, 9058, 9205, 9353, 9501, 9649, 9796],
      /* 317 */ [8740, 8893, 9048, 9201, 9355, 9509, 9663, 9817, 9971],
      /* 335.5 */ [8864, 9024, 9185, 9344, 9505, 9666, 9825, 9986, 10146],
      /* 354 */ [9040, 9206, 9373, 9540, 9706, 9873, 10039, 10205, 10372],
      /* 372.5 */ [9165, 9337, 9510, 9683, 9855, 10028, 10201, 10374, 10546],
      /* 391 */ [9289, 9468, 9647, 9826, 10005, 10185, 10363, 10542, 10721],
      /* 409.5 */ [9413, 9599, 9784, 9969, 10155, 10340, 10526, 10711, 10896],
      /* 428 */ [9538, 9729, 9921, 10113, 10304, 10496, 10687, 10879, 11070],
      /* 446.5 */ [9662, 9860, 10058, 10256, 10455, 10652, 10850, 11048, 11246],
      /* 465 */ [9787, 9991, 10195, 10400, 10604, 10808, 11012, 11216, 11421],
      /* 483.5 */ [9912, 10122, 10332, 10543, 10753, 10963, 11174, 11385, 11595],
      /* 502 */ [10139, 10356, 10573, 10789, 11006, 11223, 11439, 11655, 11873],
      /* 520.5 */ [10264, 10486, 10710, 10932, 11156, 11378, 11601, 11824, 12047],
      /* 539 */ [10389, 10617, 10847, 11076, 11305, 11534, 11764, 11992, 12222],
      /* 557.5 */ [10513, 10748, 10984, 11219, 11455, 11691, 11925, 12161, 12397],
      /* 576 */ [10637, 10879, 11121, 11363, 11604, 11846, 12088, 12330, 12571],
      /* 594.5 */ [10761, 11010, 11258, 11506, 11754, 12002, 12250, 12498, 12746]
    ],
  },
  advanced: {
    widthsCm: [200, 225, 250, 275, 300, 325, 350, 375, 400, 425, 450, 475, 500],
    depthsCm: [207.4, 230.5, 253.6, 276.7, 299.8, 322.9, 346, 369.1, 392.2, 415.3, 438.4, 461.5, 484.6, 507.7, 530.8, 553.9, 577, 600.1],
    pricesNetEur: [
      /* 207.4 */ [8023, 8151, 8281, 8410, 8540, 8668, 8798, 8927, 9056, 9482, 9615, 9748, 9881],
      /* 230.5 */ [8189, 8327, 8465, 8604, 8742, 8880, 9018, 9156, 9294, 9760, 9902, 10044, 10186],
      /* 253.6 */ [8457, 8605, 8752, 8899, 9046, 9193, 9340, 9487, 9635, 10141, 10292, 10443, 10611],
      /* 276.7 */ [8623, 8780, 8935, 9092, 9247, 9404, 9560, 9716, 9873, 10419, 10597, 10756, 10916],
      /* 299.8 */ [8840, 9006, 9171, 9336, 9501, 9667, 9831, 9996, 10161, 10767, 10936, 11104, 11272],
      /* 322.9 */ [9006, 9180, 9354, 9529, 9703, 9877, 10051, 10225, 10399, 11045, 11222, 11400, 11578],
      /* 346 */ [9172, 9355, 9539, 9722, 9904, 10088, 10271, 10453, 10637, 11323, 11509, 11696, 11883],
      /* 369.1 */ [9339, 9531, 9722, 9915, 10106, 10299, 10491, 10682, 10875, 11601, 11797, 11992, 12188],
      /* 392.2 */ [9556, 9757, 9958, 10159, 10360, 10561, 10761, 10962, 11164, 11930, 12135, 12339, 12544],
      /* 415.3 */ [9722, 9932, 10141, 10352, 10562, 10772, 10982, 11192, 11401, 12209, 12422, 12636, 12849],
      /* 438.4 */ [9888, 10106, 10326, 10544, 10764, 10983, 11201, 11421, 11639, 12487, 12709, 12932, 13155],
      /* 461.5 */ [10054, 10281, 10509, 10738, 10965, 11193, 11421, 11649, 11877, 12765, 12997, 13331, 13563],
      /* 484.6 */ [10220, 10457, 10693, 10930, 11167, 11404, 11641, 11878, 12115, 13043, 13284, 13730, 13971],
      /* 507.7 */ [10385, 10632, 10877, 11123, 11369, 11614, 11860, 12107, 12353, 13321, 13570, 14027, 14276],
      /* 530.8 */ [10551, 10806, 11061, 11316, 11571, 11825, 12081, 12335, 12590, 13599, 13961, 14425, 14684],
      /* 553.9 */ [10820, 11084, 11348, 11611, 11876, 12140, 12403, 12667, 12931, 13980, 14454, 14928, 15196],
      /* 577 */ [10986, 11259, 11532, 11805, 12078, 12350, 12623, 12896, 13169, 14361, 14741, 15223, 15500],
      /* 600.1 */ [11255, 11537, 11818, 12100, 12382, 12664, 12946, 13227, 13509, 14845, 15131, 15623, 15908]
    ],
  },
  adaptive: {
    widthsCm: [200, 300, 400, 500, 600, 700],
    depthsCm: [200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700],
    pricesNetEur: [
      /* 200 */ [4655, 4971, 5292, 6236, 6587, 6702],
      /* 250 */ [4805, 5136, 5492, 6504, 6755, 6846],
      /* 300 */ [4973, 5341, 5722, 6699, 6887, 7201],
      /* 350 */ [5123, 5506, 5843, 6950, 7173, 7520],
      /* 400 */ [5292, 5644, 5955, 7258, 7492, 7874],
      /* 450 */ [5383, 5730, 6112, 7396, 7653, 8081],
      /* 500 */ [5533, 5904, 6301, 7545, 7869, 8207],
      /* 550 */ [5701, 6078, 6466, 7749, 8084, 8453],
      /* 600 */ [5827, 6252, 6623, 7878, 8247, 8682],
      /* 650 */ [5934, 6426, 6806, 8063, 8410, 8876],
      /* 700 */ [6076, 6600, 6983, 8299, 8678, 9157]
    ],
  },
  zip9: {
    widthsCm: [100, 150, 200, 250, 300],
    depthsCm: [150, 200, 250, 270, 300],
    pricesNetEur: [
      /* 150 */ [486, 556, 597, 662, 707],
      /* 200 */ [512, 582, 634, 708, 758],
      /* 250 */ [542, 640, 702, 791, 853],
      /* 270 */ [589, 653, 719, 814, 878],
      /* 300 */ [641, 678, 762, 855, 915]
    ],
  },
  zip11: {
    widthsCm: [100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600],
    depthsCm: [150, 200, 250, 270, 300],
    pricesNetEur: [
      /* 150 */ [511, 586, 628, 698, 745, 811, 853, 911, 950, 986, 1403],
      /* 200 */ [539, 614, 668, 746, 798, 874, 928, 1005, 1047, 1086, 1510],
      /* 250 */ [570, 673, 739, 833, 898, 995, 1061, 1133, 1175, 1219, 1710],
      /* 270 */ [620, 687, 756, 857, 925, 1020, 1086, 1156, 1199, 1243, 1764],
      /* 300 */ [675, 713, 802, 900, 963, 1049, 1141, 1216, 1284, 1317, 1841]
    ],
  },
};
