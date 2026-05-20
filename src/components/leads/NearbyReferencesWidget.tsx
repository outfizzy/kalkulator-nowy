import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { GeocodingService } from '../../services/GeocodingService';
import { MapPin, Award, ChevronDown, ChevronUp, ExternalLink, Copy, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface NearbyReferencesWidgetProps {
    leadAddress: string;
    leadCity?: string;
    leadPostalCode?: string;
    leadId: string;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface NearbyRef {
    id: string;
    name: string;
    city: string;
    address: string;
    distanceKm: number;
    product?: string;
    wonDate: string;
}

export const NearbyReferencesWidget: React.FC<NearbyReferencesWidgetProps> = ({
    leadAddress, leadCity, leadPostalCode, leadId
}) => {
    const [references, setReferences] = useState<NearbyRef[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadReferences();
    }, [leadAddress, leadCity, leadPostalCode]);

    const loadReferences = async () => {
        setLoading(true);
        try {
            // 1. Geocode lead
            const fullAddress = [leadAddress, leadPostalCode, leadCity].filter(Boolean).join(', ');
            if (!fullAddress || fullAddress.length < 5) { setLoading(false); return; }

            const leadCoords = await GeocodingService.search(fullAddress);
            if (!leadCoords) { setLoading(false); return; }

            // 2. Load won leads (signed contracts = reference points)
            const { data: wonLeads, error } = await supabase
                .from('leads')
                .select('id, customer_data, status, updated_at')
                .eq('status', 'won')
                .neq('id', leadId)
                .limit(500);

            if (error || !wonLeads?.length) { setLoading(false); return; }

            // 3. Pre-filter by PLZ prefix (first 2 digits = same German region ~100km)
            // This avoids geocoding hundreds of leads
            const leadPlzPrefix = leadPostalCode?.replace(/\s/g, '').substring(0, 2);
            const leadPlzFull = leadPostalCode?.replace(/\s/g, '');

            const preFiltered = wonLeads.filter(wl => {
                const cd = wl.customer_data || {};
                const plz = (cd.postalCode || '').replace(/\s/g, '');
                const city = (cd.city || '').toLowerCase();

                // PLZ prefix match (same region) — extend to ±1 for border areas
                if (leadPlzPrefix && plz.length >= 2) {
                    const refPrefix = parseInt(plz.substring(0, 2), 10);
                    const myPrefix = parseInt(leadPlzPrefix, 10);
                    if (!isNaN(refPrefix) && !isNaN(myPrefix)) {
                        return Math.abs(refPrefix - myPrefix) <= 2;
                    }
                }

                // Fallback: same city name
                if (leadCity && city && city === leadCity.toLowerCase()) return true;

                return false;
            });

            // 4. Geocode only pre-filtered leads and compute distances
            const refs: NearbyRef[] = [];
            let geocodeCount = 0;

            for (const wl of preFiltered) {
                const cd = wl.customer_data || {};
                const addr = cd.address || cd.street || '';
                const city = cd.city || '';
                const plz = cd.postalCode || '';
                const refAddress = [addr, plz, city].filter(Boolean).join(', ');

                if (refAddress.length < 5) continue;

                // Rate limit for Nominatim
                if (geocodeCount > 0) {
                    await new Promise(r => setTimeout(r, 250));
                }

                const refCoords = await GeocodingService.search(refAddress);
                geocodeCount++;
                if (!refCoords) continue;

                const dist = haversineKm(leadCoords.lat, leadCoords.lng, refCoords.lat, refCoords.lng);

                if (dist <= 100) {
                    refs.push({
                        id: wl.id,
                        name: [cd.firstName, cd.lastName].filter(Boolean).join(' ') || 'Klient',
                        city: city,
                        address: refAddress,
                        distanceKm: Math.round(dist * 10) / 10,
                        product: cd.product,
                        wonDate: wl.updated_at ? new Date(wl.updated_at).toLocaleDateString('pl-PL') : ''
                    });
                }

                // Stop after finding 20 nearby references or geocoding 40 leads
                if (refs.length >= 20 || geocodeCount >= 40) break;
            }

            refs.sort((a, b) => a.distanceKm - b.distanceKm);
            setReferences(refs);
        } catch (err) {
            console.error('[NearbyReferencesWidget]', err);
        } finally {
            setLoading(false);
        }
    };

    const distanceBadge = (km: number) => {
        if (km <= 10) return { dot: 'bg-emerald-500', text: 'text-emerald-700' };
        if (km <= 30) return { dot: 'bg-blue-500', text: 'text-blue-700' };
        if (km <= 60) return { dot: 'bg-amber-500', text: 'text-amber-700' };
        return { dot: 'bg-slate-400', text: 'text-slate-500' };
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <div className="animate-spin w-4 h-4 border-2 border-slate-300 border-t-emerald-500 rounded-full" />
                    Szukam referencji w okolicy...
                </div>
            </div>
        );
    }

    if (references.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400">
                        <Award className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-500">Referencje w pobliżu</div>
                        <div className="text-[10px] text-slate-400">Brak podpisanych umów w promieniu 100 km</div>
                    </div>
                </div>
            </div>
        );
    }

    const shown = expanded ? references : references.slice(0, 3);

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
                        <Award className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-700">Referencje w pobliżu</div>
                        <div className="text-[10px] text-slate-400">
                            {references.length} podpisanych umów w promieniu 100 km
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                        {references.length}
                    </span>
                </div>
            </div>

            {/* Reference list */}
            <div className="px-3 pb-3 space-y-1.5">
                {shown.map((ref, idx) => {
                    const db = distanceBadge(ref.distanceKm);
                    return (
                        <div key={ref.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors group">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${db.dot}`} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-semibold text-slate-700 truncate">{ref.name}</span>
                                    {ref.city && <span className="text-[10px] text-slate-400 flex-shrink-0">• {ref.city}</span>}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                    {ref.product && <span className="truncate">{ref.product}</span>}
                                    {ref.wonDate && <span className="flex-shrink-0">• {ref.wonDate}</span>}
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className={`text-[11px] font-bold ${db.text}`}>{ref.distanceKm} km</span>
                                <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ref.address)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 transition-opacity"
                                    title="Pokaż na mapie"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </div>
                    );
                })}

                {/* Expand/collapse */}
                {references.length > 3 && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="w-full py-1.5 text-[10px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center justify-center gap-1"
                    >
                        {expanded ? (
                            <><ChevronUp className="w-3 h-3" /> Zwiń</>
                        ) : (
                            <><ChevronDown className="w-3 h-3" /> Pokaż {references.length - 3} więcej</>
                        )}
                    </button>
                )}

                {/* Distance summary */}
                <div className="flex items-center gap-3 pt-1.5 border-t border-slate-100">
                    <div className="flex items-center gap-1 text-[10px]">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-slate-400">&lt;10 km</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px]">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-slate-400">&lt;30 km</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px]">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-slate-400">&lt;60 km</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px]">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        <span className="text-slate-400">&lt;100 km</span>
                    </div>
                </div>

                {/* Sales argument — copy to clipboard */}
                <button
                    onClick={() => {
                        const closest = references[0];
                        const cities = [...new Set(references.slice(0, 5).map(r => r.city).filter(Boolean))];
                        const text = `Wir haben ${references.length} erfolgreich abgeschlossene Projekte in Ihrer Nähe` +
                            (closest ? `, das nächste ist nur ${closest.distanceKm} km entfernt` : '') +
                            (cities.length > 0 ? ` (u.a. in ${cities.join(', ')})` : '') +
                            `. Gerne können wir Ihnen Referenzen vor Ort zeigen.`;
                        navigator.clipboard.writeText(text);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                        toast.success('Argument skopiowany!');
                    }}
                    className="w-full py-1.5 mt-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[10px] text-emerald-700 font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                    {copied ? <><Check className="w-3 h-3" /> Skopiowano!</> : <><Copy className="w-3 h-3" /> Kopiuj argument sprzedażowy (DE)</>}
                </button>
            </div>
        </div>
    );
};
