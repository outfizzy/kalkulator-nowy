import React, { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  getAliplastProducts,
  getAliplastPrices,
  lookupAliplastPrice,
  getAvailableDimensions,
  getAvailableColors,
  getAvailableVariants,
  getProductPriceStats,
  type AliplastProduct,
  type AliplastPrice,
} from '../../services/database/aliplast.service';

// ============================================================================
// Config maps
// ============================================================================
const COLOR_LABELS: Record<string, string> = {
  '7016ST': 'RAL 7016 (Anthrazit)',
  '9016ST': 'RAL 9016 (Weiß)',
  '8017ST': 'RAL 8017 (Braun)',
  '9005ST': 'RAL 9005 (Schwarz)',
};

const CATEGORY_CONFIG: Record<string, { label: string; emoji: string; desc: string }> = {
  pergola: { label: 'Pergola', emoji: '🏛️', desc: 'Pergole bioklimatyczne' },
  carport: { label: 'Carport', emoji: '🚗', desc: 'Wiaty garażowe aluminiowe' },
  zip_screen: { label: 'ZIP Screen', emoji: '🪟', desc: 'Rolety zewnętrzne ZIP' },
};

// Human labels for variant parts
const VARIANT_LABELS: Record<string, string> = {
  'Teleco': '🔌 Teleco',
  'Somfy': '🔌 Somfy',
  'noLED': '❌ Bez LED',
  'LED-slats': '💡 LED lamele',
  'LED-gutter': '💡 LED rynna',
  'LED-both': '💡 LED oba',
  'noSensors': '❌ Bez czujn.',
  'rain+temp+smart': '📡 Wszystkie czujniki',
  'Standalone': '🏗️ Wolnostojąca',
  'Wall': '🧱 Ścienna',
  'DACH': '🏠 Pokrycie DACH',
  'PIR': '🧊 Pokrycie PIR',
  'INNE': '📋 Inne pokrycie',
  'NONE': '❌ Bez pokrycia',
  'Standard': '💧 Odpływ Standard',
  'Quiet': '🤫 Odpływ Cichy',
  'Cube': '🔲 Cube (C)',
  'Quadro': '◻️ Quadro (Q)',
  'Round': '⚪ Round (R)',
  'Hide': '👁️ Hide (H)',
  'Fasade': '🏢 Fasada',
  'Niche1': '🔲 Wnęka 1',
  'Pergola': '🏛️ Pergola',
  'ACSCR110-std': '⚡ ACSCR110 standard',
  'ACSCR131-prem': '⚡ ACSCR131 premium',
  'ACRL525-RTS': '📻 ACRL525 RTS',
  '1%': '🔳 Tkanina 1%',
  '4%': '🔳 Tkanina 4%',
  '5%': '🔳 Tkanina 5%',
  'Soltis': '🧵 Soltis',
  'Techprotect': '🧵 Techprotect',
  'noCover': '❌ Bez daszka',
  'withCovers': '✅ Z daszkiem + maskownice',
  'noLED / noSensors': '❌ Bez LED, bez czujników',
};

const MODULE_LABELS: Record<string, string> = {
  'W1D1': '1×1 (pojedynczy)',
  'W2D1': '2×1 (podwójna szer.)',
  'W3D1': '3×1 (potrójna szer.)',
  'W4D1': '4×1 (poczwórna szer.)',
  'W1D2': '1×2 (podwójna głęb.)',
  'W2D2': '2×2 (podwójna oba)',
  'STD': 'Standardowy',
};

// ============================================================================
// Variant Parsing — split the variant label into categories for selectors
// ============================================================================
interface ParsedVariant {
  full: string;
  parts: string[];
}

function parseVariantCategories(variantLabels: string[], productId: string): {
  categories: { name: string; options: string[] }[];
  getVariantLabel: (selections: Record<string, string>) => string;
} {
  // Split each variant label by " / " separator
  const parsed: ParsedVariant[] = variantLabels.map(v => ({
    full: v,
    parts: v.split(' / ').map(s => s.trim()),
  }));

  if (parsed.length === 0) return { categories: [], getVariantLabel: () => '' };

  const numParts = parsed[0].parts.length;

  // Determine category names based on product
  const categoryNames: string[] = [];
  if (productId === 'PergolaECO_1') {
    categoryNames.push('Napęd', 'Oświetlenie', 'Czujniki', 'Montaż');
  } else if (productId === 'CarPort') {
    categoryNames.push('Pokrycie dachu', 'Oświetlenie', 'Odpływ');
  } else if (productId === 'ZipScreenEco' || productId === 'ZipScreen') {
    categoryNames.push('Model', 'Montaż', 'Napęd', 'Tkanina');
  } else if (productId === 'PergolaNUUNFabric') {
    categoryNames.push('Kolekcja tkanin', 'Maskownice');
  }
  while (categoryNames.length < numParts) categoryNames.push(`Opcja ${categoryNames.length + 1}`);

  // Extract unique options per category
  const categories = categoryNames.map((name, idx) => {
    const optionSet = new Set<string>();
    parsed.forEach(p => {
      if (p.parts[idx]) optionSet.add(p.parts[idx]);
    });
    return { name, options: [...optionSet] };
  });

  const getVariantLabel = (selections: Record<string, string>): string => {
    return categoryNames.map(cat => selections[cat] || categories.find(c => c.name === cat)?.options[0] || '').join(' / ');
  };

  return { categories, getVariantLabel };
}

// ============================================================================
// Component
// ============================================================================
export const AliplastConfiguratorPage: React.FC = () => {
  const [products, setProducts] = useState<AliplastProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [prices, setPrices] = useState<AliplastPrice[]>([]);
  const [availableDims, setAvailableDims] = useState<{ widths: number[]; depths: number[]; heights: number[] }>({ widths: [], depths: [], heights: [] });
  const [availableColors, setAvailableColorsState] = useState<string[]>([]);
  const [stats, setStats] = useState<{ minPrice: number; maxPrice: number; avgPrice: number; totalEntries: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // Variant state
  const [availableVariants, setAvailableVariants] = useState<string[]>([]);
  const [availableModules, setAvailableModules] = useState<string[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [variantSelections, setVariantSelections] = useState<Record<string, string>>({});

  // Dimension/config state
  const [width, setWidth] = useState<number>(0);
  const [depth, setDepth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [color, setColor] = useState<string>('');

  // Result
  const [foundPrice, setFoundPrice] = useState<AliplastPrice | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'configurator' | 'table' | 'summary'>('configurator');

  // ── Basket (aligned with ProductConfiguratorV2 BasketItem pattern) ──
  interface AliplastBasketItem {
    id: string;
    category: 'pergola' | 'carport' | 'zip_screen' | 'accessory' | 'custom';
    name: string;
    config: string;
    dimensions: string;
    priceNet: number;
    quantity: number;
  }
  const [basket, setBasket] = useState<AliplastBasketItem[]>([]);

  // ── Pricing controls (aligned with ProductConfiguratorV2) ──
  const [margin, setMargin] = useState(40);
  const [discount, setDiscount] = useState(0);
  const [montagePrice, setMontagePrice] = useState(0);

  // ── Custom items / extras ──
  const [customItems, setCustomItems] = useState<{ id: string; name: string; price: number }[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  // ── Load products ──
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getAliplastProducts();
        setProducts(data);
        if (data.length > 0) setSelectedProductId(data[0].id);
      } catch { toast.error('Błąd ładowania produktów Aliplast'); }
      finally { setLoading(false); }
    })();
  }, []);

  // ── Parse variant categories ──
  const { categories: variantCategories, getVariantLabel } = useMemo(
    () => parseVariantCategories(availableVariants, selectedProductId || ''),
    [availableVariants, selectedProductId]
  );

  // Current variant suffix from selections
  const currentVariantLabel = useMemo(() => {
    if (variantCategories.length === 0) return '';
    return getVariantLabel(variantSelections);
  }, [variantCategories, variantSelections, getVariantLabel]);

  // ── Load product data ──
  const loadProductData = useCallback(async (productId: string) => {
    // Immediately clear old data
    setStats(null);
    setPrices([]);
    setAvailableDims({ widths: [], depths: [], heights: [] });
    setAvailableColorsState([]);
    setAvailableVariants([]);
    setAvailableModules([]);
    setFoundPrice(null);

    try {
      const [colorsData, variantsData] = await Promise.all([
        getAvailableColors(productId),
        getAvailableVariants(productId),
      ]);
      
      setAvailableColorsState(colorsData);
      setAvailableVariants(variantsData.variants);
      setAvailableModules(variantsData.moduleConfigs);

      // Set default module
      const defaultModule = variantsData.moduleConfigs[0] || '';
      setSelectedModule(defaultModule);

      // Set default variant selections
      const parsed = parseVariantCategories(variantsData.variants, productId);
      const defaults: Record<string, string> = {};
      parsed.categories.forEach(cat => {
        if (cat.options.length > 0) defaults[cat.name] = cat.options[0];
      });
      setVariantSelections(defaults);

      if (colorsData.length > 0) setColor(colorsData[0]);

      // Load dims for default module
      const dimsData = await getAvailableDimensions(productId, { moduleConfig: defaultModule });
      setAvailableDims(dimsData);
      if (dimsData.widths.length > 0) setWidth(dimsData.widths[Math.floor(dimsData.widths.length / 2)]);
      if (dimsData.depths.length > 0) setDepth(dimsData.depths[Math.floor(dimsData.depths.length / 2)]);
      if (dimsData.heights.length > 0) setHeight(dimsData.heights[Math.floor(dimsData.heights.length / 2)]);

      // Load stats
      const statsData = await getProductPriceStats(productId);
      setStats(statsData);

      // Load prices for table view
      const pricesData = await getAliplastPrices(productId, { moduleConfig: defaultModule });
      setPrices(pricesData);
    } catch { toast.error('Błąd ładowania danych produktu'); }
  }, []);

  useEffect(() => {
    if (selectedProductId) loadProductData(selectedProductId);
  }, [selectedProductId, loadProductData]);

  // ── Reload dims when module changes ──
  useEffect(() => {
    if (!selectedProductId || !selectedModule) return;
    (async () => {
      const dimsData = await getAvailableDimensions(selectedProductId, { moduleConfig: selectedModule });
      setAvailableDims(dimsData);
      if (dimsData.widths.length > 0 && !dimsData.widths.includes(width)) {
        setWidth(dimsData.widths[Math.floor(dimsData.widths.length / 2)]);
      }
      if (dimsData.depths.length > 0 && !dimsData.depths.includes(depth)) {
        setDepth(dimsData.depths[Math.floor(dimsData.depths.length / 2)]);
      }
    })();
  }, [selectedModule, selectedProductId]);

  // ── Derived ──
  const selectedProduct = useMemo(() => products.find(p => p.id === selectedProductId), [products, selectedProductId]);
  const isZipScreen = selectedProduct?.category === 'zip_screen';
  const catConfig = selectedProduct ? CATEGORY_CONFIG[selectedProduct.category] || CATEGORY_CONFIG.pergola : CATEGORY_CONFIG.pergola;

  // ── Price lookup ──
  const handlePriceLookup = async () => {
    if (!selectedProductId) return;
    setPriceLoading(true);
    try {
      const result = await lookupAliplastPrice({
        productId: selectedProductId,
        width,
        depth: !isZipScreen ? depth : undefined,
        height: isZipScreen ? height : undefined,
        colorProfile: color || undefined,
        variantSuffix: currentVariantLabel,
        moduleConfig: selectedModule || undefined,
      });
      setFoundPrice(result);
      if (result?.price_net) {
        toast.success(`Cena: ${formatPrice(result.price_net)} PLN`);
      } else {
        toast.error('Nie znaleziono ceny dla podanych parametrów');
      }
    } catch { toast.error('Błąd wyszukiwania ceny'); }
    finally { setPriceLoading(false); }
  };

  // ── Add to basket ──
  const handleAddToBasket = () => {
    if (!foundPrice || !selectedProduct) return;
    const priceNet = typeof foundPrice.price_net === 'string' ? parseFloat(foundPrice.price_net) : (foundPrice.price_net || 0);
    if (priceNet <= 0) return;

    const dimStr = isZipScreen
      ? `${foundPrice.dimensions?.width || width}×${foundPrice.dimensions?.height || height} mm`
      : `${foundPrice.dimensions?.width || width}×${foundPrice.dimensions?.depth || depth} mm`;

    const configParts = [selectedModule, currentVariantLabel].filter(Boolean).join(' / ');

    const item: AliplastBasketItem = {
      id: `aliplast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      category: selectedProduct.category as AliplastBasketItem['category'],
      name: selectedProduct.name,
      config: configParts,
      dimensions: dimStr,
      priceNet,
      quantity: 1,
    };
    setBasket(prev => [...prev, item]);
    toast.success('Dodano do koszyka');
  };

  const removeFromBasket = (id: string) => setBasket(prev => prev.filter(i => i.id !== id));

  const addCustomItem = () => {
    if (!newItemName || !newItemPrice) return;
    const price = parseFloat(newItemPrice);
    if (isNaN(price)) return;
    setCustomItems(prev => [...prev, { id: `custom_${Date.now()}`, name: newItemName, price }]);
    setNewItemName('');
    setNewItemPrice('');
  };

  const removeCustomItem = (id: string) => setCustomItems(prev => prev.filter(i => i.id !== id));

  // ── Calculated totals ──
  const basketTotal = basket.reduce((sum, i) => sum + i.priceNet * i.quantity, 0);
  const customTotal = customItems.reduce((sum, i) => sum + i.price, 0);
  const purchaseTotal = basketTotal + customTotal + montagePrice;
  const sellingPrice = purchaseTotal * (1 + margin / 100) * (1 - discount / 100);
  const profitAmount = sellingPrice - purchaseTotal;

  // ── Helpers ──
  const formatPrice = (price: number | string | null): string => {
    if (!price) return '–';
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return num.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const groupedProducts = useMemo(() => {
    const groups: Record<string, AliplastProduct[]> = {};
    products.forEach(p => {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    });
    return groups;
  }, [products]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <span className="text-3xl">🏭</span>
            Konfigurator Aliplast
          </h1>
          <p className="text-slate-500 mt-1">Sprawdź ceny produktów Aliplast — wszystkie warianty</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode('configurator')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'configurator' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            🎛️ Konfigurator
          </button>
          <button onClick={() => setViewMode('table')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            📊 Tabela cen
          </button>
          <button onClick={() => setViewMode('summary')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${viewMode === 'summary' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            🛒 Koszyk
            {basket.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {basket.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Product Selector ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Wybierz produkt</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(groupedProducts).map(([, prods]) =>
            prods.map(product => (
              <button key={product.id} onClick={() => setSelectedProductId(product.id)}
                className={`relative p-5 rounded-xl border-2 text-left transition-all ${
                  selectedProductId === product.id
                    ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/10'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md'
                }`}>
                {selectedProductId === product.id && (
                  <div className="absolute top-3 right-3">
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <div className="text-2xl mb-2">{CATEGORY_CONFIG[product.category]?.emoji || '📦'}</div>
                <h3 className="font-bold text-slate-800">{product.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{CATEGORY_CONFIG[product.category]?.desc}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Najniższa cena" value={`${formatPrice(stats.minPrice)} PLN`} icon="📉" color="green" />
          <StatCard label="Najwyższa cena" value={`${formatPrice(stats.maxPrice)} PLN`} icon="📈" color="red" />
          <StatCard label="Średnia cena" value={`${formatPrice(stats.avgPrice)} PLN`} icon="📊" color="blue" />
          <StatCard label="Pozycji w cenniku" value={String(stats.totalEntries)} icon="🗃️" color="slate" />
        </div>
      )}

      {viewMode === 'configurator' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Config Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Module Config Selector (for Pergola) */}
            {availableModules.length > 1 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2 mb-4">
                  🧩 Konfiguracja modułów
                </h2>
                <div className="flex flex-wrap gap-2">
                  {availableModules.map(mod => (
                    <button key={mod} onClick={() => setSelectedModule(mod)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-all border-2 ${
                        selectedModule === mod
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-800 shadow-md'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'
                      }`}>
                      <div className="font-bold">{mod}</div>
                      <div className="text-xs opacity-70 mt-0.5">{MODULE_LABELS[mod] || mod}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Variant Selectors */}
            {variantCategories.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2 mb-4">
                  ⚙️ Opcje konfiguracji
                </h2>
                <div className="space-y-5">
                  {variantCategories.map(cat => (
                    <div key={cat.name}>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">{cat.name}</label>
                      <div className="flex flex-wrap gap-2">
                        {cat.options.map(opt => {
                          const isSelected = variantSelections[cat.name] === opt;
                          return (
                            <button key={opt}
                              onClick={() => setVariantSelections(prev => ({ ...prev, [cat.name]: opt }))}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-sm'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
                              }`}>
                              {VARIANT_LABELS[opt] || opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dimensions */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
              <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                📐 Wymiary
              </h2>

              {/* Width */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Szerokość (mm)</label>
                <div className="flex flex-wrap gap-2">
                  {availableDims.widths.map(w => (
                    <button key={w} onClick={() => setWidth(w)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        width === w ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-blue-100'
                      }`}>
                      {w}
                    </button>
                  ))}
                  {availableDims.widths.length === 0 && (
                    <span className="text-sm text-slate-400 italic">Brak danych wymiarowych — oczekiwanie na scraper</span>
                  )}
                </div>
              </div>

              {/* Depth (for pergolas/carports) */}
              {!isZipScreen && availableDims.depths.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Głębokość / Wysięg (mm)</label>
                  <div className="flex flex-wrap gap-2">
                    {availableDims.depths.map(d => (
                      <button key={d} onClick={() => setDepth(d)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          depth === d ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-emerald-100'
                        }`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Height (for ZIP screens) */}
              {isZipScreen && availableDims.heights.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Wysokość (mm)</label>
                  <div className="flex flex-wrap gap-2">
                    {availableDims.heights.map(h => (
                      <button key={h} onClick={() => setHeight(h)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          height === h ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-amber-100'
                        }`}>
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Color */}
              {availableColors.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Kolor profilu</label>
                  <div className="flex flex-wrap gap-2">
                    {availableColors.map(c => (
                      <button key={c} onClick={() => setColor(c)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          color === c ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}>
                        {COLOR_LABELS[c] || c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Button */}
              <button onClick={handlePriceLookup}
                disabled={priceLoading || !width}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg">
                {priceLoading ? (
                  <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> Szukam ceny...</>
                ) : (
                  <>🔍 Sprawdź cenę</>
                )}
              </button>
            </div>
          </div>

          {/* Right: Result */}
          <div className="space-y-4">
            {/* Price Card */}
            <div className={`bg-white rounded-xl border-2 p-6 shadow-sm transition-all ${foundPrice ? 'border-green-500 bg-green-50/30' : 'border-slate-200'}`}>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">💰 Wynik cenowy</h3>
              {foundPrice ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-black text-slate-800">{formatPrice(foundPrice.price_net)}</div>
                    <div className="text-lg text-slate-500 font-medium">PLN netto</div>
                    {foundPrice.price_net && (
                      <div className="text-sm text-slate-400 mt-1">
                        ≈ {formatPrice(parseFloat(String(foundPrice.price_net)) * 1.23)} PLN brutto
                      </div>
                    )}
                  </div>
                  <div className="border-t border-slate-200 pt-4 space-y-2">
                    <DetailRow label="Wymiary" value={`${foundPrice.dimensions?.width || '–'} × ${foundPrice.dimensions?.depth || foundPrice.dimensions?.height || '–'} mm`} />
                    <DetailRow label="Kolor" value={COLOR_LABELS[foundPrice.color_profile || ''] || foundPrice.color_profile || 'Standard'} />
                    <DetailRow label="Moduł" value={foundPrice.module_config || 'STD'} />
                    {foundPrice.price_details?.variant && (
                      <DetailRow label="Wariant" value={foundPrice.price_details.variant} />
                    )}
                    <DetailRow label="Data" value={foundPrice.scraped_at ? new Date(foundPrice.scraped_at).toLocaleDateString('pl-PL') : '–'} />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">🔎</div>
                  <p className="text-slate-500 text-sm">Wybierz opcje i kliknij &quot;Sprawdź cenę&quot;</p>
                </div>
              )}
              {/* Add to basket button */}
              {foundPrice && foundPrice.price_net && (
                <button onClick={handleAddToBasket}
                  className="w-full mt-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2">
                  🛒 Dodaj do koszyka
                </button>
              )}
            </div>

            {/* Config Summary */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">📋 Konfiguracja</h3>
              <div className="space-y-2">
                <DetailRow label="Produkt" value={selectedProduct?.name || '–'} />
                {selectedModule && <DetailRow label="Moduł" value={`${selectedModule} (${MODULE_LABELS[selectedModule] || ''})`} />}
                <DetailRow label="Szerokość" value={width ? `${width} mm` : '–'} />
                {!isZipScreen && <DetailRow label="Głębokość" value={depth ? `${depth} mm` : '–'} />}
                {isZipScreen && <DetailRow label="Wysokość" value={height ? `${height} mm` : '–'} />}
                <DetailRow label="Kolor" value={COLOR_LABELS[color] || color || '–'} />
                {currentVariantLabel && (
                  <div className="border-t border-slate-100 pt-2 mt-2">
                    <div className="text-xs font-semibold text-slate-500 mb-1">Wariant:</div>
                    <div className="text-xs text-slate-600 leading-relaxed">
                      {currentVariantLabel.split(' / ').map((part, i) => (
                        <span key={i} className="inline-block bg-slate-100 rounded px-1.5 py-0.5 mr-1 mb-1">
                          {VARIANT_LABELS[part] || part}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : viewMode === 'summary' ? (
        /* ── SUMMARY / BASKET VIEW ── */
        <div className="space-y-6">
          {/* Basket Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h2 className="font-bold text-slate-800">🛒 Koszyk ({basket.length} pozycji)</h2>
            </div>
            {basket.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <th className="px-4 py-3 font-semibold text-slate-600">Produkt</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Konfiguracja</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Wymiary</th>
                      <th className="px-4 py-3 font-semibold text-slate-600 text-right">Cena netto</th>
                      <th className="px-4 py-3 font-semibold text-slate-600 text-center">Ilość</th>
                      <th className="px-4 py-3 font-semibold text-slate-600 text-right">Suma</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {basket.map(item => (
                      <tr key={item.id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium">{item.name}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-[250px]">{item.config}</td>
                        <td className="px-4 py-3 text-sm">{item.dimensions}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatPrice(item.priceNet)} PLN</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => setBasket(prev => prev.map(i => i.id === item.id ? {...i, quantity: Math.max(1, i.quantity - 1)} : i))}
                              className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold">-</button>
                            <span className="w-8 text-center font-semibold">{item.quantity}</span>
                            <button onClick={() => setBasket(prev => prev.map(i => i.id === item.id ? {...i, quantity: i.quantity + 1} : i))}
                              className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold">+</button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">{formatPrice(item.priceNet * item.quantity)} PLN</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => removeFromBasket(item.id)} className="text-red-400 hover:text-red-600 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400">
                <div className="text-4xl mb-3">🛒</div>
                <p>Koszyk jest pusty. Dodaj produkty z konfiguratora.</p>
              </div>
            )}
          </div>

          {/* Extras & Custom Items */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Custom items */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">🧱 Pozycje dodatkowe</h3>
              {customItems.map(item => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <span className="text-sm text-slate-700">{item.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm">{formatPrice(item.price)} PLN</span>
                    <button onClick={() => removeCustomItem(item.id)} className="text-red-400 hover:text-red-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 mt-3">
                <input type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Nazwa pozycji"
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="number" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} placeholder="Cena netto"
                  className="w-28 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={addCustomItem} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                  + Dodaj
                </button>
              </div>
              {/* Montage */}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <label className="block text-sm font-semibold text-slate-700 mb-2">🔧 Montaż (PLN netto)</label>
                <input type="number" value={montagePrice || ''} onChange={e => setMontagePrice(parseFloat(e.target.value) || 0)}
                  placeholder="0" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* Margin & Discount */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">💰 Kalkulacja ceny</h3>
              <div className="space-y-4">
                <div>
                  <label className="flex items-center justify-between text-sm font-semibold text-slate-700 mb-1">
                    <span>Marża</span>
                    <span className="text-blue-600">{margin}%</span>
                  </label>
                  <input type="range" min={0} max={100} step={5} value={margin} onChange={e => setMargin(parseInt(e.target.value))}
                    className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                </div>
                <div>
                  <label className="flex items-center justify-between text-sm font-semibold text-slate-700 mb-1">
                    <span>Rabat klienta</span>
                    <span className="text-orange-600">{discount}%</span>
                  </label>
                  <input type="range" min={0} max={50} step={1} value={discount} onChange={e => setDiscount(parseInt(e.target.value))}
                    className="w-full h-2 bg-orange-100 rounded-lg appearance-none cursor-pointer accent-orange-600" />
                </div>
              </div>

              {/* Totals */}
              <div className="mt-6 pt-4 border-t border-slate-200 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Produkty Aliplast</span>
                  <span className="font-medium">{formatPrice(basketTotal)} PLN</span>
                </div>
                {customTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Pozycje dodatkowe</span>
                    <span className="font-medium">{formatPrice(customTotal)} PLN</span>
                  </div>
                )}
                {montagePrice > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Montaż</span>
                    <span className="font-medium">{formatPrice(montagePrice)} PLN</span>
                  </div>
                )}
                <div className="flex justify-between text-sm border-t border-slate-100 pt-2">
                  <span className="text-slate-600 font-semibold">📦 Cena zakupu netto</span>
                  <span className="font-bold text-slate-800">{formatPrice(purchaseTotal)} PLN</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">+ Marża {margin}%</span>
                  <span className="text-emerald-600">+{formatPrice(purchaseTotal * margin / 100)} PLN</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">- Rabat {discount}%</span>
                    <span className="text-orange-600">-{formatPrice(sellingPrice / (1 - discount / 100) * discount / 100)} PLN</span>
                  </div>
                )}
                <div className="flex justify-between border-t-2 border-emerald-200 pt-3">
                  <span className="text-lg font-bold text-slate-800">💵 Cena sprzedaży</span>
                  <span className="text-2xl font-black text-emerald-600">{formatPrice(sellingPrice)} PLN</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Brutto (23% VAT)</span>
                  <span className="text-slate-500 font-medium">{formatPrice(sellingPrice * 1.23)} PLN</span>
                </div>
                <div className="flex justify-between text-sm bg-emerald-50 rounded-lg p-3 -mx-1">
                  <span className="text-emerald-700 font-semibold">📈 Zysk</span>
                  <span className="font-bold text-emerald-700">{formatPrice(profitAmount)} PLN</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── TABLE VIEW ── */
        <div className="space-y-4">
          {/* Filters bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center gap-4">
            {availableModules.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-600">Moduł:</span>
                <select value={selectedModule} onChange={e => setSelectedModule(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm bg-white">
                  {availableModules.map(m => (
                    <option key={m} value={m}>{m} — {MODULE_LABELS[m] || m}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-600">Wariant:</span>
              <select value={currentVariantLabel}
                onChange={e => {
                  const parts = e.target.value.split(' / ');
                  const newSelections: Record<string, string> = {};
                  variantCategories.forEach((cat, i) => {
                    newSelections[cat.name] = parts[i] || cat.options[0];
                  });
                  setVariantSelections(newSelections);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm bg-white max-w-[400px]">
                {availableVariants.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-bold text-slate-800">📊 Tabela cen — {selectedProduct?.name || ''}</h2>
              <span className="text-sm text-slate-500">
                {(() => {
                  const filtered = prices.filter(p => !currentVariantLabel || p.price_details?.variant === currentVariantLabel);
                  return `${filtered.length} pozycji (filtr: ${currentVariantLabel || 'wszystkie'})`;
                })()}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="px-4 py-3 font-semibold text-slate-600">Szerokość</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">{isZipScreen ? 'Wysokość' : 'Głębokość'}</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Moduł</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Wariant</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-right">Cena netto (PLN)</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-right">Cena brutto (PLN)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prices
                    .filter(p => !currentVariantLabel || p.price_details?.variant === currentVariantLabel)
                    .slice(0, 300)
                    .map((price, idx) => (
                    <tr key={price.id} className={`hover:bg-blue-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                      <td className="px-4 py-3 font-medium">{price.dimensions?.width || '–'} mm</td>
                      <td className="px-4 py-3">{(isZipScreen ? price.dimensions?.height : price.dimensions?.depth) || '–'} mm</td>
                      <td className="px-4 py-3 text-xs font-mono text-indigo-600">{price.module_config || '–'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-[250px] truncate" title={price.price_details?.variant || '–'}>
                        {price.price_details?.variant || '–'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800">{formatPrice(price.price_net)}</td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        {price.price_net ? formatPrice(parseFloat(String(price.price_net)) * 1.23) : '–'}
                      </td>
                    </tr>
                  ))}
                  {prices.filter(p => !currentVariantLabel || p.price_details?.variant === currentVariantLabel).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                        {prices.length === 0 ? 'Brak danych cenowych. Scraper w trakcie pracy...' : 'Brak danych dla wybranego wariantu. Może jeszcze nie został ściągnięty.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Sub-components
// ============================================================================
const StatCard: React.FC<{ label: string; value: string; icon: string; color: string }> = ({ label, value, icon, color }) => {
  const cc: Record<string, string> = {
    green: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    slate: 'bg-slate-50 border-slate-200 text-slate-800',
  };
  return (
    <div className={`rounded-xl border p-4 ${cc[color] || cc.slate}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</div>
      <div className="text-lg font-bold mt-1">{value}</div>
    </div>
  );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-slate-500">{label}</span>
    <span className="font-medium text-slate-800 text-right">{value}</span>
  </div>
);

export default AliplastConfiguratorPage;
