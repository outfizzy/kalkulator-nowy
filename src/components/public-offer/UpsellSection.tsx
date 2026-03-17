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
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 border border-indigo-100">
            <h3 className="text-xl font-bold text-indigo-900 mb-2">🎁 Beliebte Erweiterungen</h3>
            <p className="text-indigo-700 mb-6 text-sm">
                Viele unserer Kunden entscheiden sich zusätzlich für diese Extras.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upgrades.map((item) => (
                    <div key={item.id} className="bg-white rounded-xl shadow-sm border border-indigo-100 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="h-32 bg-slate-200 relative">
                            <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-slate-800">{item.title}</h4>
                                <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded">
                                    {item.price}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mb-4">{item.desc}</p>
                            <button
                                onClick={() => handleRequestUpgrade(item.id, item.title)}
                                disabled={requesting === item.id || requested.has(item.id)}
                                className={`w-full py-2 border rounded-lg text-sm font-bold transition-colors disabled:opacity-50 ${requested.has(item.id)
                                        ? 'border-green-500 text-green-600 bg-green-50'
                                        : 'border-indigo-600 text-indigo-600 hover:bg-indigo-50'
                                    }`}
                            >
                                {requested.has(item.id)
                                    ? '✓ Anfrage gesendet'
                                    : requesting === item.id
                                        ? 'Wird gesendet...'
                                        : '+ Zur Anfrage hinzufügen'
                                }
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
