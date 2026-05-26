// ============================================================================
// Aluxe Configurator Knowledge Base
// Generated from DOM snapshot analysis of 49 recorded steps
// ============================================================================

// All known product categories and their CSS section IDs
export const ALUXE_CATEGORIES = {
  trendline: '#d09da2f4cc10625',
  topline: '#d70f23ec18d4ea9',
  designline: '#3f53943e27ad89d',
  ultraline: '#d7c8b7e921f0dc8',
  skyline_carport: '#94cc9630dd060c5',
  panorama: '#ad510e82cce79d8',
  seitenwand_fenster: '#5e9ea4643697635',
  zonwering: '#f388f2d29412689',
  orangeline: '#cb4cbf12422c208',
  skyline: '#d4bd6c586500503',
  markise: '#d8172d8733e6e53',
} as const;

// Confirmed product_id → name mapping
export const ALUXE_PRODUCT_IDS: Record<string, { name: string; category: string }> = {
  '2908b3841950ae6': { name: 'Trendline veranda mit Platten', category: 'trendline' },
  '27b0ad19ba6ad08': { name: 'Ultraline veranda', category: 'ultraline' },
  '78f60e9bef64493': { name: 'Topline XL Veranda mit Platten', category: 'topline' },
  '505157f4638687f': { name: 'Panorama Schiebewand AL23 hoch', category: 'panorama' },
  'ca5707a0c10bf91': { name: 'Aluminum Seiten-Wand', category: 'seitenwand' },
  '4b388c1d11993a8': { name: 'Keilfenster', category: 'fenster' },
  '85c0f928be1771c': { name: 'Markise (Aufdach/Unterdach)', category: 'markise' },
  'ed9ad01b6234f2a': { name: 'Rahmen mit Schiebetüren', category: 'seitenwand' },
};

// Navigation selectors
export const ALUXE_NAV = {
  tabs: {
    informationen: '.rel-informatie',
    produkt: '.rel-product',
    materialien: '.rel-materialen',
    ubersicht: '.rel-overzicht',
  },
  actions: {
    next: '#next',
    save: '#save',
    cancel: '#cancel',
    addProduct: '#add_product',
    cancelChanges: '.button.grey.right.spacing',
  },
  topMenu: {
    bestellubersicht: '#menu > li:nth-child(1) > a',
    downloads: '.secure',
    logout: '.logout',
  },
} as const;

// Price selectors by page type
export const ALUXE_PRICE_SELECTORS = {
  cart: {
    productPrices: '#cart > table:nth-child(1) > tbody > tr > td:nth-child(3)',
    transport: '#cart > table:nth-child(3) > tbody > tr:nth-child(1) > td:nth-child(2)',
    grandTotal: '.grandtotal',
    total: '.total',
  },
  overview: {
    lineItemPrice: '#content > table:nth-child(1) > tbody > tr > td:nth-child(2)',
    lineItemTotal: '#content > table:nth-child(1) > tbody > tr > td:nth-child(4)',
    subtotal: '.subtotal.right',
    gesamt: '#content > table:nth-child(3) > tbody > tr:nth-child(3) > td:nth-child(2)',
  },
} as const;

// Color options (universal across most products)
export const ALUXE_COLORS = {
  '7016': '7016LC Anthrazitgrau',
  '9007': '9007 Graualuminium',
  '9010': '9010LC Reinweiß',
  '9016': '9016 Verkehrsweiß',
  '9005': '9005 mat schwarz',
  'db703': 'DB703 Metallic',
  'raw': 'RAL Strukturfarbe wählen',
} as const;

// Roof/glass options by product type
export const ALUXE_DACHPLATTEN = {
  trendline_topline: {
    '780e8916cf62ee5': 'Polycarbonat opal 5X 16mm - matt/milch (Standard)',
    '3b1613c9a16d80b': 'Polycarbonat 5X 16mm - klar (Standard)',
    '5a7bf2454e6a00f': 'Polykarb. smokey grey 16mm',
    'f963d751b5a2ad8': 'Polycarb. IR Gold 16mm - matt/milch',
    '2dcbee093a5bbec': 'Polycarb. IR Gold 16mm - klar',
    '': 'ohne Dacheindeckung',
  },
  ultraline: {
    '4715dc6ccf4dff9': 'VSG 8mm - klar',
    'a15acd23a51cd8d': 'VSG 8mm - matt/milch',
    'e5a6cf350582c46': 'VSG 8mm - grau',
    'd6a5cd2281f3b60': 'Glas 10mm VSG Klar',
    '933082dd3a64a46': 'VSG 10mm - matt/milch',
    '4fbe1497f9bc242': 'Sonnenschutzglas klar 55.2',
    'd5923718bad7bde': 'Iso Glas Klar 6-10-44.2 24mm',
    '': 'ohne Dacheindeckung',
  },
  seitenwand: {
    '4715dc6ccf4dff9': 'VSG 8mm - klar (Standard)',
    'a15acd23a51cd8d': 'VSG 8mm - matt/milch',
    'e5a6cf350582c46': 'VSG 8mm - grau (Standard)',
    'd19a7025c6278af': 'Iso Glas 33.1-10-33.1 23mm',
  },
} as const;

// Panorama Schiebewand glass options
export const ALUXE_PANORAMA_GLASS = {
  '6b89385110fae4d': 'Gehärtetes Glas ESG 10mm',
  'c81f86d63e52b00': 'ESG Planibel Grey 10mm',
  'cc086a09c19be33': 'Satinato ESG 10mm',
} as const;

// LED options
export const ALUXE_LED = {
  'd8fa7e4ed2c6116': '10er LED Set IP55 erweiterbar bis max. 13 spots',
  'fa1eccf1a06f6a1': '6er LED Set IP55 bis max. 9 spots',
  'f1e343da4d75daa': 'LED Set Ultra-Designline, 6 Spots inkl. Dimmer, max. 12',
} as const;

// LED extensions
export const ALUXE_LED_EXT = {
  'a0031b518c34350': '1er LED Erweiterung IP55',
  '876f9a511f258e0': 'LED Erweiterung 2 Spots Ultraline/Designline',
} as const;

// Foundation options
export const ALUXE_FUNDAMENT_LABELS: Record<string, string> = {
  'Betonfundament mit Ablauf': '11064',
  'Grundbügel Aluminium 104x80x5mm': '11151',
  'Stahlfundament zum einbetonieren': '11367',
  'Stahlfundament mit Montageplatte asymetrisch': '11369',
  'Stahlfundament mit Montageplatte symetrisch': '11370',
  'Stahlfundament zum Aufdübeln (verzinkt)': '11371',
  'Stahlmauerschuh (Set) Rechts/Links': '11376',
};

// Field mapping: Trendline veranda mit Platten
export const TRENDLINE_FIELDS = {
  // Dimensions
  width: { selector: '#width', type: 'text', label: 'Breite mm' },
  widthPreset: { selector: '#width-div > select', type: 'select', label: 'Breite Vorauswahl' },
  depth: { selector: '#depth', type: 'text', label: 'Tiefe mm' },
  depthPreset: { selector: '#depth-div > select', type: 'select', label: 'Tiefe Vorauswahl' },
  color: { selector: '#color', type: 'select', label: 'Farbe' },
  ralColor: { selector: '#ral_color', type: 'select', label: 'RAL-Farbe', conditional: true },
  postHeight: { selector: '#height', type: 'select', label: 'Pfosten/Ständer Länge' },
  postType: { selector: '#staander_type', type: 'select', label: 'Pfosten/Ständer Typ' },
  postCount: { selector: '#staander', type: 'text', label: 'Anzahl Pfosten' },
  
  // Roof
  roofType: { selector: '#dakplaten', type: 'select', label: 'Art der Dacheindeckung' },
  roofFields980: { selector: '#dakplaten_980_quantity', type: 'text', label: 'Anzahl Felder' },
  roofFields1200: { selector: '#dakplaten_1200_quantity', type: 'text', label: 'Anzahl große Felder', conditional: true },
  beamCount: { selector: '#ligger', type: 'text', label: 'Anzahl Dachträger' },
  beamType: { selector: '#ligger_type', type: 'select', label: 'Type liggers' },
  distanceProfiles: { selector: '#inzets', type: 'select', label: 'Distanzprofile' },
  
  // Gutter
  gutterReinforcement: { selector: '#goot_versteviging', type: 'select', label: 'Rinnenverstärkung' },
  
  // Foundation
  freestanding: { selector: '#freestanding', type: 'select', label: 'Freistehend' },
  
  // Extras
  trimProfile: { selector: '#sierlijst', type: 'select', label: 'Zierleiste' },
  bracketId: { selector: '#schoren-id-', type: 'select', label: 'Winkelstreben' },
  bracketQty: { selector: '#schoren-quantity-', type: 'text', label: 'Winkelstreben Anzahl' },
  ledId: { selector: '#verlichting-id-', type: 'select', label: 'Beleuchtung' },
  ledQty: { selector: '#verlichting-quantity-', type: 'text', label: 'Beleuchtung Anzahl' },
  ledExtId: { selector: '#verlichting_exp-id-', type: 'select', label: 'Erweiterung', conditional: true },
  ledExtQty: { selector: '#verlichting_exp-quantity-', type: 'text', label: 'Erweiterung Anzahl', conditional: true },
  siliconKit: { selector: '#standard_kit', type: 'select', label: 'Siliconen kit' },
  holeDrill: { selector: '#hole_drill', type: 'select', label: 'HWA boor 83mm' },
  bocht90: { selector: '#bocht_90', type: 'select', label: 'Bocht 90' },
  heightFront: { selector: '#height_front', type: 'text', label: 'Boden bis Unterseite Rinne in mm' },
  heightBack: { selector: '#height_back', type: 'text', label: 'Boden bis Unterseite Wandanschluss in mm' },
} as const;

// Glossary NL/DE → EN for machine understanding
export const GLOSSARY: Record<string, string> = {
  // NL terms
  'bestellen': 'order',
  'bestellübersicht': 'order_overview',
  'dakplaten': 'roof_plates',
  'ligger': 'beam/rafter',
  'staander': 'post/column',
  'goot': 'gutter',
  'fundering': 'foundation',
  'verlichting': 'lighting',
  'sierlijst': 'trim_profile',
  'schoren': 'brackets',
  'inzets': 'spacer_profiles',
  'bocht': 'elbow',
  'schiebewand': 'sliding_wall',
  'keilfenster': 'wedge_window',
  'zonwering': 'sun_screening',
  'markise': 'awning',
  // DE terms
  'breite': 'width',
  'tiefe': 'depth',
  'farbe': 'color',
  'pfosten': 'post',
  'dacheindeckung': 'roof_covering',
  'rinnenverstärkung': 'gutter_reinforcement',
  'freistehend': 'freestanding',
  'zierleiste': 'trim_profile',
  'winkelstreben': 'angle_braces',
  'beleuchtung': 'lighting',
  'distanzprofile': 'spacer_profiles',
  'wandanschluss': 'wall_connection',
};
