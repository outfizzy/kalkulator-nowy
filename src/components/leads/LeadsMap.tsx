import React, { useEffect, useRef, useState } from 'react';
import { normalizePhone, formatPhoneDisplay } from '../../utils/phone';
import { useNavigate } from 'react-router-dom';
import type { Lead, LeadStatus } from '../../types';
import { MapPin, AlertCircle } from 'lucide-react';

interface LeadsMapProps {
    leads: Lead[];
}

const GUBIN_COORDS = { lat: 51.9533, lng: 14.7233 };

const STATUS_COLORS: Record<LeadStatus, string> = {
    new: '#3B82F6',
    fair: '#EC4899',
    contacted: '#F59E0B',
    measurement_scheduled: '#06B6D4',
    offer_sent: '#6366F1',
    negotiation: '#8B5CF6',
    won: '#10B981',
    lost: '#EF4444',
};

const STATUS_LABELS: Record<LeadStatus, string> = {
    new: 'Nowy',
    fair: 'Targi',
    contacted: 'Skontaktowano',
    measurement_scheduled: 'Umówiony na pomiar',
    offer_sent: 'Oferta Wysłana',
    negotiation: 'Negocjacje',
    won: 'Wygrany',
    lost: 'Utracony',
};

// German PLZ prefix (first 2 digits) → approximate coordinates
const DE_PLZ: Record<string, [number, number]> = {
    '01': [51.05, 13.74], '02': [51.15, 14.97], '03': [51.76, 14.33], '04': [51.34, 12.37],
    '06': [51.48, 11.97], '07': [50.93, 11.59], '08': [50.72, 12.49], '09': [50.83, 12.92],
    '10': [52.52, 13.41], '11': [52.52, 13.41], '12': [52.44, 13.44], '13': [52.57, 13.35],
    '14': [52.40, 13.07], '15': [52.35, 14.55], '16': [52.76, 13.80], '17': [53.63, 13.38],
    '18': [54.08, 12.14], '19': [53.63, 11.41], '20': [53.55, 9.99], '21': [53.47, 9.97],
    '22': [53.60, 10.05], '23': [53.87, 10.69], '24': [54.32, 10.14], '25': [53.87, 9.30],
    '26': [53.14, 8.22], '27': [53.08, 8.80], '28': [53.08, 8.80], '29': [52.83, 10.23],
    '30': [52.37, 9.74], '31': [52.16, 9.95], '32': [52.02, 8.53], '33': [51.93, 8.55],
    '34': [51.32, 9.50], '35': [50.56, 8.50], '36': [50.55, 9.68], '37': [51.53, 9.93],
    '38': [52.27, 10.52], '39': [52.13, 11.63], '40': [51.23, 6.77], '41': [51.19, 6.44],
    '42': [51.26, 7.15], '44': [51.51, 7.47], '45': [51.46, 7.01], '46': [51.57, 6.77],
    '47': [51.43, 6.76], '48': [51.96, 7.63], '49': [52.28, 8.05], '50': [50.94, 6.96],
    '51': [50.94, 7.05], '52': [50.78, 6.08], '53': [50.73, 7.10], '54': [49.76, 6.64],
    '55': [50.00, 8.27], '56': [50.36, 7.59], '57': [50.87, 8.02], '58': [51.37, 7.46],
    '59': [51.66, 7.82], '60': [50.11, 8.68], '61': [50.14, 8.73], '63': [50.00, 8.96],
    '64': [49.87, 8.65], '65': [50.08, 8.24], '66': [49.23, 7.00], '67': [49.45, 8.44],
    '68': [49.49, 8.47], '69': [49.40, 8.69], '70': [48.78, 9.18], '71': [48.72, 9.12],
    '72': [48.49, 9.21], '73': [48.80, 9.49], '74': [49.14, 9.22], '75': [48.89, 8.69],
    '76': [49.01, 8.40], '77': [48.47, 7.95], '78': [47.66, 8.85], '79': [47.99, 7.85],
    '80': [48.14, 11.58], '81': [48.12, 11.60], '82': [48.06, 11.51], '83': [47.86, 12.13],
    '84': [48.23, 12.28], '85': [48.40, 11.74], '86': [48.37, 10.90], '87': [47.73, 10.31],
    '88': [47.65, 9.47], '89': [48.40, 9.99], '90': [49.45, 11.08], '91': [49.60, 11.01],
    '92': [49.40, 11.86], '93': [49.01, 12.10], '94': [48.57, 13.43], '95': [49.95, 11.58],
    '96': [50.10, 10.88], '97': [49.79, 9.97], '98': [50.68, 10.93], '99': [50.98, 11.03],
};

// Polish PLZ prefix (first 2 digits) → approximate coordinates
const PL_PLZ: Record<string, [number, number]> = {
    '00': [52.23, 21.01], '01': [52.23, 20.95], '02': [52.19, 20.97], '03': [52.27, 21.04],
    '04': [52.20, 21.09], '05': [52.13, 20.85], '06': [52.42, 20.02], '07': [52.53, 20.67],
    '08': [52.40, 21.57], '09': [52.77, 19.45], '10': [53.78, 20.49], '11': [53.70, 20.50],
    '12': [53.02, 20.88], '13': [53.25, 18.58], '14': [53.92, 19.90], '15': [53.13, 23.16],
    '16': [53.83, 23.10], '17': [52.42, 22.97], '18': [53.43, 23.33], '19': [53.10, 23.00],
    '20': [51.25, 22.57], '21': [51.40, 22.60], '22': [50.67, 23.63], '23': [50.87, 22.40],
    '24': [51.22, 22.57], '25': [50.87, 20.63], '26': [51.43, 20.65], '27': [50.72, 21.42],
    '28': [50.67, 20.63], '29': [51.08, 20.57], '30': [50.06, 19.94], '31': [50.08, 19.95],
    '32': [50.06, 19.44], '33': [49.62, 19.83], '34': [49.97, 19.84], '35': [50.04, 22.00],
    '36': [50.58, 22.05], '37': [50.00, 21.99], '38': [49.47, 21.77], '39': [50.33, 21.80],
    '40': [50.27, 19.02], '41': [50.30, 18.95], '42': [50.07, 18.95], '43': [50.00, 18.95],
    '44': [50.20, 18.97], '45': [50.40, 18.16], '46': [50.55, 18.10], '47': [50.49, 17.34],
    '48': [50.13, 17.91], '49': [50.37, 17.57], '50': [51.10, 17.03], '51': [51.13, 17.00],
    '52': [51.08, 16.92], '53': [51.10, 16.97], '54': [51.15, 16.95], '55': [51.30, 16.95],
    '56': [51.40, 16.20], '57': [50.75, 16.28], '58': [50.77, 16.28], '59': [50.90, 15.73],
    '60': [52.41, 16.93], '61': [52.42, 16.97], '62': [52.12, 17.00], '63': [51.80, 17.87],
    '64': [52.45, 16.75], '65': [51.94, 15.51], '66': [51.95, 15.50], '67': [51.95, 15.25],
    '68': [51.95, 14.73], '69': [52.33, 14.55], '70': [53.43, 14.53], '71': [53.45, 14.57],
    '72': [53.93, 14.23], '73': [53.52, 14.55], '74': [53.76, 15.23], '75': [54.17, 15.58],
    '76': [54.47, 17.02], '77': [53.15, 16.73], '78': [54.10, 16.17], '80': [54.35, 18.65],
    '81': [54.52, 18.53], '82': [53.80, 18.80], '83': [54.18, 18.38], '84': [54.63, 18.00],
    '85': [53.12, 18.00], '86': [53.02, 18.60], '87': [53.00, 18.60], '88': [52.67, 18.23],
    '89': [53.02, 18.60], '90': [51.75, 19.47], '91': [51.78, 19.47], '92': [51.73, 19.53],
    '93': [51.72, 19.45], '94': [51.77, 19.50], '95': [51.57, 19.45], '96': [51.87, 20.15],
    '97': [51.42, 18.97], '98': [51.63, 18.93], '99': [51.77, 19.17],
};

interface GeocodedLead {
    lead: Lead;
    lat: number;
    lng: number;
}

function resolveCoordinates(lead: Lead): GeocodedLead | null {
    const cd = lead.customerData;
    if (!cd) return null;

    const postalCode = cd.postalCode?.trim();
    if (!postalCode || postalCode.length < 2) return null;

    const digits = postalCode.replace(/[^0-9]/g, '');
    const prefix = digits.substring(0, 2);
    if (prefix.length < 2) return null;

    // Polish codes have dash (XX-XXX), German are plain 5 digits
    const isPolish = postalCode.includes('-');
    const lookup = isPolish ? PL_PLZ : DE_PLZ;
    const coords = lookup[prefix];
    if (!coords) return null;

    // Small jitter to prevent overlapping pins
    const jitter = () => (Math.random() - 0.5) * 0.08;

    return {
        lead,
        lat: coords[0] + jitter(),
        lng: coords[1] + jitter(),
    };
}

export const LeadsMap: React.FC<LeadsMapProps> = ({ leads }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [geocodedLeads, setGeocodedLeads] = useState<GeocodedLead[]>([]);
    const markersRef = useRef<google.maps.Marker[]>([]);
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
    const navigate = useNavigate();
    const [filterStatus, setFilterStatus] = useState<LeadStatus | 'all'>('all');

    // Initialize map
    useEffect(() => {
        if (!mapRef.current || !window.google) return;
        const mapInstance = new google.maps.Map(mapRef.current, {
            center: GUBIN_COORDS,
            zoom: 7,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
            styles: [
                { featureType: 'poi', stylers: [{ visibility: 'off' }] },
                { featureType: 'transit', stylers: [{ visibility: 'off' }] },
            ],
        });
        setMap(mapInstance);
        infoWindowRef.current = new google.maps.InfoWindow();
    }, []);

    // Resolve coordinates offline (no API calls)
    useEffect(() => {
        const newLeads = leads.filter(l => l.status === 'new' || l.status === 'fair');
        const resolved = newLeads
            .map(l => resolveCoordinates(l))
            .filter((r): r is GeocodedLead => r !== null);
        setGeocodedLeads(resolved);
    }, [leads]);

    // Render markers
    useEffect(() => {
        if (!map) return;

        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];

        const filtered = filterStatus === 'all'
            ? geocodedLeads
            : geocodedLeads.filter(gl => gl.lead.status === filterStatus);

        const bounds = new google.maps.LatLngBounds();
        let hasPoints = false;

        filtered.forEach(({ lead, lat, lng }) => {
            const color = STATUS_COLORS[lead.status] || '#6B7280';
            const statusLabel = STATUS_LABELS[lead.status] || lead.status;
            const cd = lead.customerData;

            const marker = new google.maps.Marker({
                position: { lat, lng },
                map,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: color,
                    fillOpacity: 0.9,
                    strokeColor: '#fff',
                    strokeWeight: 2,
                },
                title: `${cd?.firstName || ''} ${cd?.lastName || ''}`,
            });

            marker.addListener('click', () => {
                const iw = infoWindowRef.current;
                if (!iw) return;
                iw.setContent(`
                    <div style="padding:8px;max-width:260px;font-family:system-ui,sans-serif;">
                        <div style="font-weight:700;font-size:15px;margin-bottom:4px;">
                            ${cd?.firstName || ''} ${cd?.lastName || ''}
                        </div>
                        ${cd?.companyName ? `<div style="font-size:12px;color:#64748b;">${cd.companyName}</div>` : ''}
                        <div style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;margin:6px 0;color:white;background:${color};">
                            ${statusLabel}
                        </div>
                        <div style="font-size:12px;color:#475569;margin-top:4px;">
                            ${[cd?.address, cd?.postalCode, cd?.city].filter(Boolean).join(', ')}
                        </div>
                        ${cd?.phone ? `<div style="font-size:12px;margin-top:4px;">📞 <a href="tel:${normalizePhone(cd.phone)}" style="color:#3B82F6;text-decoration:none;">${formatPhoneDisplay(cd.phone)}</a></div>` : ''}
                        ${cd?.email ? `<div style="font-size:12px;">✉️ ${cd.email}</div>` : ''}
                        <div style="margin-top:8px;text-align:center;">
                            <a href="/leads/${lead.id}" 
                               style="display:inline-block;padding:4px 16px;background:#3B82F6;color:white;border-radius:8px;text-decoration:none;font-size:12px;font-weight:600;"
                               onclick="event.preventDefault();window.__leadsMapNavigate&&window.__leadsMapNavigate('${lead.id}');">
                                Otwórz Lead →
                            </a>
                        </div>
                    </div>
                `);
                iw.open(map, marker);
            });

            markersRef.current.push(marker);
            bounds.extend({ lat, lng });
            hasPoints = true;
        });

        if (hasPoints) {
            map.fitBounds(bounds);
            const listener = google.maps.event.addListener(map, 'idle', () => {
                if (map.getZoom()! > 14) map.setZoom(14);
                google.maps.event.removeListener(listener);
            });
        }
    }, [map, geocodedLeads, filterStatus]);

    // Navigation for info window
    useEffect(() => {
        (window as any).__leadsMapNavigate = (id: string) => navigate(`/leads/${id}`);
        return () => { delete (window as any).__leadsMapNavigate; };
    }, [navigate]);

    const statusCounts = geocodedLeads.reduce((acc, gl) => {
        acc[gl.lead.status] = (acc[gl.lead.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const newLeadsCount = leads.filter(l => l.status === 'new' || l.status === 'fair').length;

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-slate-800">Mapa Nowych Leadów</h3>
                    <span className="text-sm text-slate-500">
                        ({geocodedLeads.length} z {newLeadsCount} nowych na mapie)
                    </span>
                </div>
                {geocodedLeads.length < newLeadsCount && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                        {newLeadsCount - geocodedLeads.length} bez kodu pocztowego
                    </span>
                )}
            </div>

            <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
                <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${filterStatus === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                >
                    Wszystkie ({geocodedLeads.length})
                </button>
                {Object.entries(STATUS_COLORS).map(([status, color]) => {
                    const count = statusCounts[status] || 0;
                    if (count === 0) return null;
                    return (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status as LeadStatus)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${filterStatus === status ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            style={{ backgroundColor: filterStatus === status ? color : undefined }}
                        >
                            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
                            {STATUS_LABELS[status as LeadStatus]} ({count})
                        </button>
                    );
                })}
            </div>

            <div className="relative" style={{ height: '600px' }}>
                {!window.google && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
                        <div className="text-center text-slate-500">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                            <p>Google Maps nie jest załadowane</p>
                        </div>
                    </div>
                )}
                <div ref={mapRef} className="w-full h-full" />
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-sm">
                <div className="flex gap-4">
                    <span className="text-slate-600">
                        <strong className="text-blue-600">{statusCounts['new'] || 0}</strong> nowych
                    </span>
                    <span className="text-slate-600">
                        <strong className="text-pink-600">{statusCounts['fair'] || 0}</strong> z targów
                    </span>
                </div>
                <span className="text-slate-400 text-xs">
                    Lokalizacja wg kodu pocztowego • Kliknij pin aby zobaczyć szczegóły
                </span>
            </div>
        </div>
    );
};
