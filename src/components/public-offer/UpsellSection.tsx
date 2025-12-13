import React, { useState } from 'react';
import type { Offer } from '../../types';
import { toast } from 'react-hot-toast';

interface UpsellSectionProps {
    offer: Offer;
}

export const UpsellSection: React.FC<UpsellSectionProps> = ({ offer }) => {
    const [requesting, setRequesting] = useState<string | null>(null);

    // Identify what's missing in the offer
    const hasLED = offer.product.addons.some(a => a.type === 'lighting');
    const hasHeater = offer.product.addons.some(a => a.type === 'heater');
    const hasSides = offer.product.addons.some(a => a.type === 'slidingWall' || a.type === 'fixedWall');

    // Define potential upgrades
    const upgrades = [
        !hasLED && {
            id: 'led-upgrade',
            title: 'LED Beleuchtung',
            price: 'ab 290 €',
            desc: 'Stimmungsvolles Licht für lange Abende.',
            image: 'https://images.unsplash.com/photo-1565538810643-b5bdb6390360?auto=format&fit=crop&w=300&q=80'
        },
        !hasHeater && {
            id: 'heater-upgrade',
            title: 'Infrarot Heizstrahler',
            price: 'ab 199 €',
            desc: 'Wohlige Wärme auf Knopfdruck.',
            image: 'https://images.unsplash.com/photo-1623157390772-2d334b220c5c?auto=format&fit=crop&w=300&q=80'
        },
        !hasSides && {
            id: 'sides-upgrade',
            title: 'Glasschiebewände',
            price: 'auf Anfrage',
            desc: 'Schutz vor Wind und Wetter.',
            image: 'https://images.unsplash.com/photo-1600607686527-6fb886090705?auto=format&fit=crop&w=300&q=80'
        }
    ].filter(Boolean) as { id: string; title: string; price: string; desc: string; image: string }[];

    if (upgrades.length === 0) return null;

    const handleRequestUpgrade = (upgradeTitle: string) => {
        setRequesting(upgradeTitle);
        // Simulate API call to notify sales rep
        setTimeout(() => {
            toast.success(`Anfrage für "${upgradeTitle}" wurde gesendet!`);
            setRequesting(null);
        }, 1000);
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
                                onClick={() => handleRequestUpgrade(item.title)}
                                disabled={requesting === item.title}
                                className="w-full py-2 border border-indigo-600 text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-50 transition-colors disabled:opacity-50"
                            >
                                {requesting === item.title ? 'Wird gesendet...' : '+ Zur Anfrage hinzufügen'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
