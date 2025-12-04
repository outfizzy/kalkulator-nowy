import React, { useState } from 'react';
import type { Contract, OrderedItem } from '../../types';
import { toast } from 'react-hot-toast';

interface Props {
    contract: Contract;
    onUpdate: (items: OrderedItem[]) => void;
    isEditing: boolean;
}

const CATEGORIES = {
    'Roofing': ['Aluxe', 'Deponti', 'Aliplast'],
    'Awning': ['Aluxe', 'Selt'],
    'ZIP Screen': ['Aluxe', 'Aliplast', 'Selt'],
    'Sliding Glass': ['Aluxe', 'Deponti'],
    'Accessories': ['LED Spots', 'Heizstrahler'],
    'Flooring': ['WPC Flooring']
};

export const OrderedItemsModule: React.FC<Props> = ({ contract, onUpdate, isEditing }) => {
    const [customItem, setCustomItem] = useState('');
    const [customCategory] = useState<OrderedItem['category']>('Accessories');

    const handleToggleItem = (category: OrderedItem['category'], name: string) => {
        if (!isEditing) return;

        const existingItemIndex = contract.orderedItems?.findIndex(
            item => item.category === category && item.name === name
        );

        const newItems = [...(contract.orderedItems || [])];

        if (existingItemIndex !== undefined && existingItemIndex >= 0) {
            // Remove if exists
            newItems.splice(existingItemIndex, 1);
        } else {
            // Add if doesn't exist
            newItems.push({
                id: crypto.randomUUID(),
                category,
                name,
                status: 'pending'
            });
        }

        onUpdate(newItems);
    };

    const handleAddCustomItem = () => {
        if (!customItem.trim()) return;

        const newItem: OrderedItem = {
            id: crypto.randomUUID(),
            category: customCategory,
            name: customItem,
            status: 'pending'
        };

        onUpdate([...(contract.orderedItems || []), newItem]);
        setCustomItem('');
        toast.success('Dodano element');
    };

    const isSelected = (category: string, name: string) => {
        return contract.orderedItems?.some(item => item.category === category && item.name === name);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Zamówione Elementy
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(CATEGORIES).map(([category, options]) => (
                    <div key={category} className="space-y-3">
                        <h4 className="font-medium text-slate-700 border-b pb-1">{category === 'Roofing' ? 'Zadaszenie' :
                            category === 'Awning' ? 'Markiza' :
                                category === 'Sliding Glass' ? 'Szyby Przesuwne' :
                                    category === 'Flooring' ? 'Podłoga' :
                                        category === 'Accessories' ? 'Dodatki' : category}</h4>
                        <div className="space-y-2">
                            {options.map(option => (
                                <label key={option} className={`flex items-center gap-3 p-2 rounded-lg border transition-colors cursor-pointer ${isSelected(category, option) ? 'bg-accent/5 border-accent' : 'hover:bg-slate-50 border-slate-200'
                                    }`}>
                                    <input
                                        type="checkbox"
                                        checked={isSelected(category, option)}
                                        onChange={() => handleToggleItem(category as OrderedItem['category'], option)}
                                        disabled={!isEditing}
                                        className="w-4 h-4 text-accent rounded focus:ring-accent"
                                    />
                                    <span className={`text-sm ${isSelected(category, option) ? 'font-medium text-accent-dark' : 'text-slate-600'}`}>
                                        {option}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Custom Items Section */}
                <div className="space-y-3">
                    <h4 className="font-medium text-slate-700 border-b pb-1">Inne / Własne</h4>

                    {/* List of custom items */}
                    <div className="space-y-2">
                        {contract.orderedItems?.filter(item => !Object.values(CATEGORIES).flat().includes(item.name)).map(item => (
                            <div key={item.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200">
                                <span className="text-sm text-slate-700">{item.name} <span className="text-xs text-slate-400">({item.category})</span></span>
                                {isEditing && (
                                    <button
                                        onClick={() => {
                                            const newItems = contract.orderedItems?.filter(i => i.id !== item.id) || [];
                                            onUpdate(newItems);
                                        }}
                                        className="text-red-400 hover:text-red-600"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {isEditing && (
                        <div className="flex gap-2 mt-2">
                            <input
                                value={customItem}
                                onChange={e => setCustomItem(e.target.value)}
                                placeholder="Np. Inny dodatek..."
                                className="flex-1 p-2 border rounded-lg text-sm"
                                onKeyDown={e => e.key === 'Enter' && handleAddCustomItem()}
                            />
                            <button
                                onClick={handleAddCustomItem}
                                className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
