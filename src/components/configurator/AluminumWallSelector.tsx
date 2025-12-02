import React from 'react';
import type { SelectedAddon } from '../../types';

interface AluminumWallSelectorProps {
    onAdd: (addon: SelectedAddon) => void;
    onRemove: (id: string) => void;
    currentAddons: SelectedAddon[];
    maxRoofWidth: number;
    maxRoofDepth: number;
}

export const AluminumWallSelector: React.FC<AluminumWallSelectorProps> = () => {
    return (
        <div className="p-4 bg-yellow-100 border border-yellow-400 rounded text-yellow-700">
            <h3 className="font-bold">Debug Mode</h3>
            <p>Aluminum Wall Selector is temporarily disabled for debugging.</p>
        </div>
    );
};
