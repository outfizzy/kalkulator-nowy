import React from 'react';
import type { ProductConfig } from '../../types';
import { getModelDisplayName } from '../../config/modelImages';

// ===== GERMAN TRANSLATIONS & DESCRIPTIONS =====
const GERMAN_LABELS: Record<string, { label: string; description?: string; icon?: string; category?: string; image?: string }> = {
    // Base Construction
    'trendstyle': { label: 'Trendstyle Basiskonstruktion', description: 'Hochwertiges Aluminiumprofilsystem mit Regenrinne, pulverbeschichtet nach GSB-Standard.', icon: '🏗️', category: 'base' },
    'trendstyle+': { label: 'Trendstyle+ Basiskonstruktion', description: 'Premium-Aluminiumsystem mit verstärkten Profilen und integrierter Entwässerung.', icon: '🏗️', category: 'base' },
    'topstyle': { label: 'Topstyle Basiskonstruktion', description: 'Elegantes Aluminium-Terrassendach mit schlanken Profilen und maximaler Lichtdurchflutung.', icon: '🏗️', category: 'base' },
    'topstyle xl': { label: 'Topstyle XL Basiskonstruktion', description: 'Großflächiges Aluminium-Terrassendach für überdurchschnittliche Spannweiten bis 7m.', icon: '🏗️', category: 'base' },
    'skystyle': { label: 'Skystyle Basiskonstruktion', description: 'Modernes Flachdach-System mit minimalistischer Optik und verdeckter Entwässerung.', icon: '🏗️', category: 'base' },
    'ultrastyle': { label: 'Ultrastyle Basiskonstruktion', description: 'Premium-Terrassendach mit extra-stabilen Profilen für höchste Belastbarkeitsanforderungen.', icon: '🏗️', category: 'base' },
    'orangestyle': { label: 'Orangestyle Basiskonstruktion', description: 'Klassisches Aluminium-Terrassendach mit bewährter Technik und zeitlosem Design.', icon: '🏗️', category: 'base' },
    'orangestyle+': { label: 'Orangestyle+ Basiskonstruktion', description: 'Erweiterte Version mit zusätzlichen Verstärkungen und optimierter Wasserabführung.', icon: '🏗️', category: 'base' },
    'designline': { label: 'Designline Basiskonstruktion', description: 'Designer-Terrassendach mit exklusiven Profilformen und Premium-Oberflächenfinish.', icon: '🏗️', category: 'base' },
    'carport': { label: 'Carport Basiskonstruktion', description: 'Robustes Aluminium-Carportsystem mit hoher Tragfähigkeit für Fahrzeugschutz.', icon: '🚗', category: 'base' },

    // Roof Types
    'polycarbonate': { label: 'Polycarbonat-Eindeckung', description: 'Bruchsicheres Stegplatten-System (16mm) mit UV-Schutz und hoher Lichtdurchlässigkeit.', icon: '🪟', category: 'roof' },
    'polycarbonat': { label: 'Polycarbonat-Eindeckung', description: 'Bruchsicheres Stegplatten-System (16mm) mit UV-Schutz und hoher Lichtdurchlässigkeit.', icon: '🪟', category: 'roof' },
    'glass': { label: 'Verbundsicherheitsglas (VSG)', description: 'Hochwertiges Sicherheitsglas 8mm VSG mit optimaler Transparenz und Splitterschutz.', icon: '✨', category: 'roof' },
    'vsg': { label: 'Verbundsicherheitsglas (VSG)', description: 'Hochwertiges Sicherheitsglas 8mm VSG mit optimaler Transparenz und Splitterschutz.', icon: '✨', category: 'roof' },
    'matt': { label: 'Mattglas-Eindeckung', description: 'Satiniertes VSG für angenehme Lichtstreuung und Sichtschutz von oben.', icon: '🌫️', category: 'roof' },
    'stopsol': { label: 'Sonnenschutzglas Stopsol', description: 'Wärmereflektierendes Spezialglas - reduziert Sonneneinstrahlung um bis zu 65%.', icon: '☀️', category: 'roof' },
    'ir-gold': { label: 'IR Gold Hitzeschutzglas', description: 'Premium Infrarot-Reflexionsglas für maximalen Hitzeschutz bei voller Transparenz.', icon: '🌡️', category: 'roof' },
    'opal': { label: 'Opal Polycarbonat', description: 'Milchig-transluzentes PC für gleichmäßige Lichtverteilung und Blendschutz.', icon: '💎', category: 'roof' },
    'klar': { label: 'Klar Polycarbonat', description: 'Transparentes Polycarbonat mit maximaler Lichtdurchlässigkeit.', icon: '🔍', category: 'roof' },

    // Walls & Enclosures
    'seitenwand': { label: 'Seitenwand', description: 'Fest montierte Seitenwand aus VSG oder Polycarbonat als Wetterschutz.', icon: '🧱', category: 'walls' },
    'side wall': { label: 'Seitenwand', description: 'Fest montierte Seitenwand aus VSG oder Polycarbonat als Wetterschutz.', icon: '🧱', category: 'walls' },
    'frontwand': { label: 'Frontwand', description: 'Festverglasung für die Frontseite mit Rahmen in Konstruktionsfarbe.', icon: '🧱', category: 'walls' },
    'front wall': { label: 'Frontwand', description: 'Festverglasung für die Frontseite mit Rahmen in Konstruktionsfarbe.', icon: '🧱', category: 'walls' },
    'sliding door': { label: 'Glasschiebetür', description: 'Leichtgängige Schiebetür-Elemente mit Softclose und bodengeführter Laufschiene.', icon: '🚪', category: 'walls' },
    'schiebetür': { label: 'Glasschiebetür', description: 'Leichtgängige Schiebetür-Elemente mit Softclose und bodengeführter Laufschiene.', icon: '🚪', category: 'walls' },
    'schiebewand': { label: 'Glasschiebewand', description: 'Großflächige Glaselemente zum Öffnen - perfekte Verbindung von Innen und Außen.', icon: '🚪', category: 'walls' },
    'keilfenster': { label: 'Keilfenster', description: 'Dreieckiges Festverglasungselement für die Giebelseite.', icon: '📐', category: 'walls' },
    'wedge': { label: 'Keilfenster', description: 'Dreieckiges Festverglasungselement für die Giebelseite.', icon: '📐', category: 'walls' },

    // Comfort & Extras
    'markise': { label: 'Unterdachmarkise', description: 'Elektrisch gesteuerte Gelenkarmmarkise für perfekten Sonnenschutz unter dem Dach.', icon: '🌂', category: 'comfort' },
    'awning': { label: 'Unterdachmarkise', description: 'Elektrisch gesteuerte Gelenkarmmarkise für perfekten Sonnenschutz unter dem Dach.', icon: '🌂', category: 'comfort' },
    'zip screen': { label: 'ZIP Screen Senkrechtmarkise', description: 'Windstabile Vertikalmarkise mit seitlicher Führung - ideal als Blend- und Sichtschutz.', icon: '🪟', category: 'comfort' },
    'led': { label: 'LED-Beleuchtung', description: 'Dimmbare LED-Spots oder Lichtleisten für stimmungsvolle Abendbeleuchtung.', icon: '💡', category: 'comfort' },
    'led spot': { label: 'LED Spotbeleuchtung', description: 'Einbau-Spots mit warmweißem Licht (3000K) für gezielte Akzentbeleuchtung.', icon: '💡', category: 'comfort' },
    'led strip': { label: 'LED Lichtleiste', description: 'Indirekte Beleuchtung mit dimmbaren LED-Streifen im Rinnenprofil.', icon: '💡', category: 'comfort' },
    'wpc': { label: 'WPC Terrassendiele', description: 'Premium Wood-Plastic-Composite Bodenbelag - pflegeleicht und witterungsbeständig.', icon: '🪵', category: 'comfort' },
    'heizstrahler': { label: 'Infrarot-Heizstrahler', description: 'Elektrische Wärmequelle für angenehme Temperaturen auch in kühlen Abenden.', icon: '🔥', category: 'comfort' },

    // Construction Options
    'freistehend': { label: 'Freistehende Montage', description: 'Konstruktion ohne Wandanbindung mit vier Stützpfosten.', icon: '🏛️', category: 'base' },
    'freestanding': { label: 'Freistehende Montage', description: 'Konstruktion ohne Wandanbindung mit vier Stützpfosten.', icon: '🏛️', category: 'base' },
    'wandmontage': { label: 'Wandmontage', description: 'Klassische Befestigung an der Hauswand mit Wandanschlussprofil.', icon: '🏠', category: 'base' },
};

// Category configuration
const CATEGORIES = {
    base: { title: 'Basiskonstruktion', icon: '🏗️', order: 1 },
    roof: { title: 'Dacheindeckung', icon: '🏠', order: 2 },
    walls: { title: 'Seitliche Elemente', icon: '🧱', order: 3 },
    comfort: { title: 'Komfort & Ausstattung', icon: '✨', order: 4 },
    other: { title: 'Weitere Positionen', icon: '📦', order: 5 },
};

// Helper to find German label for item
function getGermanInfo(itemName: string): { label: string; description: string; icon: string; category: string; image?: string } {
    const lowerName = itemName.toLowerCase();

    // Try exact match first
    if (GERMAN_LABELS[lowerName]) {
        const match = GERMAN_LABELS[lowerName];
        return {
            label: match.label,
            description: match.description || '',
            icon: match.icon || '📦',
            category: match.category || 'other',
            image: match.image
        };
    }

    // Try partial match
    for (const [key, value] of Object.entries(GERMAN_LABELS)) {
        if (lowerName.includes(key) || key.includes(lowerName)) {
            return {
                label: value.label,
                description: value.description || '',
                icon: value.icon || '📦',
                category: value.category || 'other',
                image: value.image
            };
        }
    }

    // Fallback
    return { label: itemName, description: '', icon: '📦', category: 'other' };
}

// Section Header
const SectionHeader = ({ title, icon }: { title: string, icon: string }) => (
    <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-t-xl border-b border-slate-200 mt-6 first:mt-0">
        <div className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-lg border border-slate-200">
            {icon}
        </div>
        <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
    </div>
);

// Spec Row
const SpecRow = ({ label, value }: { label: string, value: string | number | undefined }) => {
    if (!value) return null;
    return (
        <div className="flex justify-between items-center py-3 px-4 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
            <span className="text-slate-500 text-sm font-medium">{label}</span>
            <span className="text-slate-800 font-semibold text-sm text-right">{value}</span>
        </div>
    );
};

// Location translation
const LOCATION_LABELS: Record<string, string> = {
    'left': 'links',
    'right': 'rechts',
    'front': 'vorne',
    'linke': 'links',
    'rechte': 'rechts',
};

// Parse config string to extract dimensions and location
function parseItemConfig(config?: string): { location?: string; dimensions?: string; rawConfig?: string } {
    if (!config) return {};

    // Try to extract location from config (e.g., "left 2000x2500" or "linke Seite")
    const configLower = config.toLowerCase();
    let location: string | undefined;

    for (const [key, germanLabel] of Object.entries(LOCATION_LABELS)) {
        if (configLower.includes(key)) {
            location = germanLabel;
            break;
        }
    }

    // Try to extract dimensions (e.g., "2000x2500" or "2000 x 2500")
    const dimMatch = config.match(/(\d{3,5})\s*[xX×]\s*(\d{3,5})/);
    let dimensions: string | undefined;
    if (dimMatch) {
        const width = parseInt(dimMatch[1]);
        const height = parseInt(dimMatch[2]);
        dimensions = `${width} × ${height} mm`;
    }

    return { location, dimensions, rawConfig: config };
}

// V2 Item Card with position and dimensions
const V2ItemCard = ({ item }: { item: { name: string; config?: string; price?: number } }) => {
    const info = getGermanInfo(item.name);
    const parsed = parseItemConfig(item.config);

    // Build display label with position
    let displayLabel = info.label;
    if (parsed.location) {
        // Check if it's a wall type item
        const isWallType = info.category === 'walls' ||
            item.name.toLowerCase().includes('wall') ||
            item.name.toLowerCase().includes('wand') ||
            item.name.toLowerCase().includes('schiebe');
        if (isWallType) {
            displayLabel = `${info.label} (${parsed.location})`;
        }
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all">
            {info.image && (
                <div className="aspect-[16/9] bg-slate-100 overflow-hidden">
                    <img
                        src={info.image}
                        alt={info.label}
                        className="w-full h-full object-cover"
                    />
                </div>
            )}
            <div className="p-4">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-lg text-xl shrink-0">
                        {info.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 text-sm leading-tight">
                            {displayLabel}
                        </div>
                        {parsed.dimensions && (
                            <div className="text-xs text-blue-600 font-medium mt-0.5">
                                📐 {parsed.dimensions}
                            </div>
                        )}
                        {!parsed.dimensions && item.config && (
                            <div className="text-xs text-blue-600 font-medium mt-0.5">
                                {item.config}
                            </div>
                        )}
                        {info.description && (
                            <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                                {info.description}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="bg-slate-50 px-4 py-2 border-t border-slate-100">
                <span className="text-xs font-semibold text-green-600">✓ Inklusive</span>
            </div>
        </div>
    );
};

interface OfferSpecificationProps {
    product: ProductConfig;
}

export const OfferSpecification: React.FC<OfferSpecificationProps> = ({ product }) => {
    // === MANUAL OFFER MODE ===
    if (product.isManual) {
        const hasCustomItems = product.customItems && product.customItems.length > 0;
        const hasDescription = product.manualDescription && product.manualDescription.trim().length > 0;

        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Header */}
                <div className="bg-slate-900 p-6 text-white">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">Technische Spezifikation</h2>
                        <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-mono opacity-70">
                            Individuelles Angebot
                        </span>
                    </div>
                    <p className="text-slate-400 text-sm mt-1">Ihre maßgeschneiderte Konfiguration im Detail</p>
                </div>

                <div className="p-6">
                    {/* Manual Description */}
                    {hasDescription && (
                        <>
                            <SectionHeader title="Beschreibung" icon="📝" />
                            <div className="bg-white border-x border-b border-slate-200 rounded-b-xl mb-6 p-4">
                                <div className="whitespace-pre-wrap text-slate-700 leading-relaxed font-medium text-sm">
                                    {product.manualDescription}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Custom Items (Manual Positions) */}
                    {hasCustomItems && (
                        <>
                            <SectionHeader title="Leistungsumfang" icon="🛠️" />
                            <div className="bg-white border-x border-b border-slate-200 rounded-b-xl mb-6">
                                {product.customItems!.map((item, idx) => (
                                    <div
                                        key={`manual-item-${idx}`}
                                        className="flex items-center justify-between py-3 px-4 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg text-sm font-bold text-slate-500 shrink-0">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-800 text-sm">{item.name}</div>
                                                {item.description && item.description !== 'Manuelle Angebotsposition' && item.description !== 'Manuelle Position' && (
                                                    <div className="text-xs text-slate-500 mt-0.5">{item.description}</div>
                                                )}
                                                {item.quantity > 1 && (
                                                    <div className="text-xs text-blue-600 font-medium mt-0.5">Menge: {item.quantity} Stk.</div>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-xs font-semibold text-green-600 shrink-0">✓ Inklusive</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Quality Badges */}
                    <div className="mt-8 pt-6 border-t border-slate-200">
                        <div className="flex flex-wrap justify-center gap-6 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <span className="flex items-center gap-1.5"><span className="text-green-500">✓</span> 5 Jahre Garantie</span>
                            <span className="flex items-center gap-1.5"><span className="text-green-500">✓</span> GSB-Zertifiziert</span>
                            <span className="flex items-center gap-1.5"><span className="text-green-500">✓</span> Made in EU</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Get V2 items if available
    const v2Items: Array<{ name: string; config?: string; price?: number }> = (product as any).items || [];

    // Group V2 items by category
    const groupedItems = v2Items.reduce((acc, item) => {
        // Skip base model item (it's shown separately in header)
        const lowerName = item.name.toLowerCase();
        if (lowerName.includes(product.modelId?.toLowerCase() || '')) {
            return acc;
        }

        const info = getGermanInfo(item.name);
        const cat = info.category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {} as Record<string, typeof v2Items>);

    // Sort categories
    const sortedCategories = Object.entries(groupedItems)
        .sort(([a], [b]) => (CATEGORIES[a as keyof typeof CATEGORIES]?.order || 99) - (CATEGORIES[b as keyof typeof CATEGORIES]?.order || 99));

    const displayName = getModelDisplayName(product.modelId);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-slate-900 p-6 text-white">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Technische Spezifikation</h2>
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-mono opacity-70">
                        {displayName}
                    </span>
                </div>
                <p className="text-slate-400 text-sm mt-1">Ihre individuelle Konfiguration im Detail</p>
            </div>

            <div className="p-6">
                {/* 1. Dimensions & Structure */}
                <SectionHeader title="Abmessungen & Konstruktion" icon="📐" />
                <div className="bg-white border-x border-b border-slate-200 rounded-b-xl mb-6">
                    <SpecRow label="Modell" value={displayName} />
                    <SpecRow label="Breite" value={`${product.width} mm`} />
                    <SpecRow label="Tiefe (Ausladung)" value={`${product.projection} mm`} />
                    {product.postsHeight && <SpecRow label="Pfostenhöhe" value={`${product.postsHeight} mm`} />}
                    {product.numberOfPosts && <SpecRow label="Anzahl Pfosten" value={`${product.numberOfPosts} Stk.`} />}
                    {product.numberOfFields && <SpecRow label="Anzahl Felder" value={`${product.numberOfFields}`} />}
                    <SpecRow label="Montage" value={(product as any).construction === 'freestanding' ? 'Freistehend' : 'Wandmontage'} />
                </div>

                {/* 2. Aesthetics */}
                <SectionHeader title="Farbgestaltung" icon="🎨" />
                <div className="bg-white border-x border-b border-slate-200 rounded-b-xl mb-6">
                    <SpecRow label="Konstruktionsfarbe" value={product.customColor ? 'Individuell (RAL)' : (product.color || 'RAL 7016 Anthrazit')} />
                    {product.customColor && <SpecRow label="RAL-Nummer" value={product.customColorRAL} />}
                </div>

                {/* 3. Roof */}
                <SectionHeader title="Dacheindeckung" icon="🏠" />
                <div className="bg-white border-x border-b border-slate-200 rounded-b-xl mb-6">
                    <SpecRow label="Dachtyp" value={product.roofType === 'glass' ? 'Verbundsicherheitsglas (VSG 8mm)' : 'Polycarbonat (16mm Stegplatten)'} />
                    {product.roofType === 'glass' && product.glassType && (
                        <SpecRow label="Glasart" value={getGermanInfo(product.glassType).label} />
                    )}
                    {product.roofType !== 'glass' && (product as any).variant && (
                        <SpecRow label="Polycarbonatart" value={getGermanInfo((product as any).variant).label} />
                    )}
                </div>

                {/* 4. V2 Items grouped by category */}
                {sortedCategories.map(([category, items]) => {
                    if (items.length === 0) return null;
                    const catConfig = CATEGORIES[category as keyof typeof CATEGORIES] || CATEGORIES.other;

                    return (
                        <React.Fragment key={category}>
                            <SectionHeader title={catConfig.title} icon={catConfig.icon} />
                            <div className="bg-white border-x border-b border-slate-200 rounded-b-xl mb-6 p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {items.map((item, idx) => (
                                        <V2ItemCard key={`v2-${category}-${idx}`} item={item} />
                                    ))}
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}

                {/* 5. Legacy Addons (for backward compatibility) */}
                {(product.addons?.length > 0 || (product.selectedAccessories?.length || 0) > 0) && (
                    <>
                        <SectionHeader title="Zubehör & Ausstattung" icon="✨" />
                        <div className="bg-white border-x border-b border-slate-200 rounded-b-xl mb-6 p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {product.addons?.map((addon, idx) => (
                                    <V2ItemCard key={`addon-${idx}`} item={{ name: addon.name, config: addon.variant }} />
                                ))}
                                {product.selectedAccessories?.map((acc, idx) => (
                                    <V2ItemCard key={`acc-${idx}`} item={{ name: acc.name, config: `${acc.quantity} Stk.` }} />
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* 6. Custom Items */}
                {product.customItems && product.customItems.length > 0 && (
                    <>
                        <SectionHeader title="Sonderausstattung" icon="🛠️" />
                        <div className="bg-white border-x border-b border-slate-200 rounded-b-xl">
                            {product.customItems.map((item, idx) => (
                                <SpecRow
                                    key={`custom-${idx}`}
                                    label={`${item.name} (${item.quantity} Stk.)`}
                                    value={item.description || 'Sonderbestellung'}
                                />
                            ))}
                        </div>
                    </>
                )}

                {/* Quality Badges */}
                <div className="mt-8 pt-6 border-t border-slate-200">
                    <div className="flex flex-wrap justify-center gap-6 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5"><span className="text-green-500">✓</span> 5 Jahre Garantie</span>
                        <span className="flex items-center gap-1.5"><span className="text-green-500">✓</span> GSB-Zertifiziert</span>
                        <span className="flex items-center gap-1.5"><span className="text-green-500">✓</span> Made in EU</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
