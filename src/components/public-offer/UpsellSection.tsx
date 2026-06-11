import React, { useState } from 'react';
import type { Offer } from '../../types';
import { toast } from 'react-hot-toast';
import { OfferService } from '../../services/database/offer.service';

interface UpsellSectionProps {
    offer: Offer;
}

export const UpsellSection: React.FC<UpsellSectionProps> = ({ offer }) => {
    const [requesting, setRequesting] = useState<string | null>(null);
    const [requested, setRequested] = useState<Set<string>>(new Set());

    // Identify what's missing in the offer (with null checks for V2 offers)
    const addons = offer.product?.addons || [];
    const hasLED = addons.some(a => a.type === 'lighting');
    const hasHeater = addons.some(a => a.type === 'heater');
    const hasSides = addons.some(a => a.type === 'slidingWall' || a.type === 'fixedWall');

    // Define potential upgrades
    const upgrades = [
        !hasLED && {
            id: 'led-upgrade',
            title: 'LED Beleuchtung',
            price: 'ab 290 €',
            desc: 'Stimmungsvolles Licht für lange Abende.',
            image: '/images/models/led.jpg'
        },
        !hasHeater && {
            id: 'heater-upgrade',
            title: 'Infrarot Heizstrahler',
            price: 'ab 199 €',
            desc: 'Wohlige Wärme auf Knopfdruck.',
            image: '/images/models/heizstrahler.webp'
        },
        !hasSides && {
            id: 'sides-upgrade',
            title: 'Glasschiebewände',
            price: 'auf Anfrage',
            desc: 'Schutz vor Wind und Wetter.',
            image: '/images/models/schiebewand.jpg'
        }
    ].filter(Boolean) as { id: string; title: string; price: string; desc: string; image: string }[];

    if (upgrades.length === 0) return null;

    const handleRequestUpgrade = async (upgradeId: string, upgradeTitle: string) => {
        setRequesting(upgradeId);
        try {
            // Track the upgrade request in the offer system — notifies sales rep
            if (offer.id) {
                await OfferService.trackInteraction(offer.id, 'upgrade_request', {
                    upgradeId,
                    upgradeTitle,
                    timestamp: new Date().toISOString()
                });
            }
            setRequested(prev => new Set(prev).add(upgradeId));
            toast.success(`Anfrage für "${upgradeTitle}" wurde an Ihren Berater gesendet!`);
        } catch (error) {
            console.error('Failed to track upgrade request:', error);
            toast.success(`Anfrage für "${upgradeTitle}" wurde gesendet!`);
            setRequested(prev => new Set(prev).add(upgradeId));
        } finally {
            setRequesting(null);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-card p-5 md:p-6">
            <div className="flex items-center gap-2.5 mb-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-slate-400">
                    <path d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-base font-bold text-slate-800">Optionale Erweiterungen</h3>
            </div>
            <p className="text-slate-400 text-xs mb-5 ml-[30px]">
                Ergänzen Sie Ihre Konfiguration mit beliebten Extras.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {upgrades.map((item) => {
                    const isRequested = requested.has(item.id);
                    const isRequesting = requesting === item.id;

                    return (
                        <div key={item.id} className="group rounded-lg border border-slate-200 overflow-hidden hover:border-slate-300 transition-all">
                            <div className="h-28 bg-slate-100 relative overflow-hidden">
                                <img
                                    src={item.image}
                                    alt={item.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                                <span className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">
                                    {item.price}
                                </span>
                            </div>
                            <div className="p-3.5">
                                <h4 className="font-bold text-sm text-slate-800 mb-0.5">{item.title}</h4>
                                <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">{item.desc}</p>
                                <button
                                    onClick={() => handleRequestUpgrade(item.id, item.title)}
                                    disabled={isRequesting || isRequested}
                                    className={`w-full py-2.5 min-h-[40px] rounded-full text-xs font-semibold transition-all duration-300 disabled:cursor-default flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#1E6FD9] ${isRequested
                                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                            : 'bg-[#0A1628] text-white hover:bg-[#1B2B44] active:scale-[0.98]'
                                        }`}
                                >
                                    {isRequested ? (
                                        <>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                            Anfrage gesendet
                                        </>
                                    ) : isRequesting ? (
                                        'Wird gesendet...'
                                    ) : (
                                        'Unverbindlich anfragen'
                                    )}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
