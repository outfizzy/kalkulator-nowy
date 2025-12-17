import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface MatrixEditorProps {
    tableId: string;
    onClose: () => void;
    tableName: string;
}

interface MatrixEntry {
    id?: string;
    width_mm: number;
    projection_mm: number;
    price: number; // Total price (legacy or calculated)
    structure_price?: number;
    glass_price?: number;
    properties?: {
        rafters?: number;
        posts?: number;
        [key: string]: any;
    };
    _changed?: boolean;
    _isNew?: boolean;
}

interface ComponentGroup {
    name: string;
    entries: MatrixEntry[];
}

export const MatrixEditor: React.FC<MatrixEditorProps> = ({ tableId, onClose, tableName }) => {
    const [entries, setEntries] = useState<MatrixEntry[]>([]);
    const [widths, setWidths] = useState<number[]>([]);
    const [projections, setProjections] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'groups'>('list'); // Default to list as requested
    const componentGroups = React.useMemo(() => {
        const groups: Record<string, MatrixEntry[]> = {};
        entries.forEach(d => {
            const name = d.properties?.name || 'Inne';
            if (!groups[name]) groups[name] = [];
            groups[name].push(d);
        });
        return Object.keys(groups).map(name => ({ name, entries: groups[name] }));
    }, [entries]);
    const [componentImages, setComponentImages] = useState<Record<string, string>>({}); // name -> url

    const loadMatrix = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('price_matrix_entries')
            .select('*')
            .eq('price_table_id', tableId)
            .order('width_mm', { ascending: true })
            .order('projection_mm', { ascending: true });

        if (error) {
            toast.error('Błąd pobierania danych');
            console.error(error);
        } else if (data) {
            setEntries(data.map(d => ({
                ...d,
                structure_price: d.structure_price || d.price, // Fallback
                glass_price: d.glass_price || 0,
                properties: d.properties || { rafters: 0, posts: 2 }
            })));

            // Fetch table attributes and TYPE
            const { data: tableData } = await supabase.from('price_tables').select('attributes, type').eq('id', tableId).single();

            if (tableData?.attributes?.component_images) {
                setComponentImages(tableData.attributes.component_images);
            }

            // Check if we have grouped data (components) OR explicit simple type
            const hasGroups = data.some(d => d.properties?.name);
            const isSimpleType = tableData?.type === 'simple' || tableData?.type === 'component';

            if (hasGroups || isSimpleType) {
                setViewMode('groups');
            } else {
                updateDimensions(data);
            }
        }
        setLoading(false);
    };

    const updateDimensions = (data: MatrixEntry[]) => {
        const distinctWidths = [...new Set(data.map(e => e.width_mm))].sort((a, b) => a - b);
        const distinctProjections = [...new Set(data.map(e => e.projection_mm))].sort((a, b) => a - b);
        setWidths(distinctWidths);
        setProjections(distinctProjections);
    };

    useEffect(() => {
        loadMatrix();
    }, [tableId]);

    const handleEntryChange = (id: string | undefined, field: keyof MatrixEntry | string, value: any, width?: number, projection?: number) => {
        setEntries(prev => prev.map(e => {
            const match = id ? e.id === id : (e.width_mm === width && e.projection_mm === projection);

            if (match) {
                let updated = { ...e, _changed: true };

                if (field === 'structure_price' || field === 'glass_price') {
                    // Update specific price component
                    updated = { ...updated, [field]: parseFloat(value) || 0 };
                    // Recalculate total price
                    updated.price = (updated.structure_price || 0) + (updated.glass_price || 0);
                } else if (field.startsWith('prop_')) {
                    // Update property
                    const propName = field.replace('prop_', '');
                    updated.properties = { ...updated.properties, [propName]: value };
                } else {
                    // Direct field update
                    // @ts-ignore
                    updated[field] = value;
                }
                return updated;
            }
            return e;
        }));
    };

    const handleAddDimension = (type: 'width' | 'projection') => {
        const valStr = prompt(`Podaj nową ${type === 'width' ? 'szerokość' : 'wysięg'} (mm):`);
        if (!valStr) return;
        const val = parseInt(valStr);
        if (isNaN(val) || val <= 0) return;

        if (type === 'width' && widths.includes(val)) {
            toast.error('Taka szerokość już istnieje');
            return;
        }
        if (type === 'projection' && projections.includes(val)) {
            toast.error('Taki wysięg już istnieje');
            return;
        }

        // Generate new entries
        const newEntries: MatrixEntry[] = [];

        if (type === 'width') {
            // Add column: Create entry for this width for EVERY existing projection
            projections.forEach(p => {
                newEntries.push({
                    width_mm: val,
                    projection_mm: p,
                    price: 0,
                    structure_price: 0,
                    glass_price: 0,
                    properties: { rafters: Math.ceil(val / 800) + 1, posts: 2 },
                    _changed: true,
                    _isNew: true
                });
            });
            setWidths([...widths, val].sort((a, b) => a - b));
        } else {
            // Add row: Create entry for this projection for EVERY existing width
            widths.forEach(w => {
                newEntries.push({
                    width_mm: w,
                    projection_mm: val,
                    price: 0,
                    structure_price: 0,
                    glass_price: 0,
                    properties: { rafters: Math.ceil(w / 800) + 1, posts: 2 },
                    _changed: true,
                    _isNew: true
                });
            });
            setProjections([...projections, val].sort((a, b) => a - b));
        }

        setEntries([...entries, ...newEntries]);
        toast.success(`Dodano ${newEntries.length} nowych pól do uzupełnienia`);
    };

    const saveChanges = async () => {
        setSaving(true);
        const changed = entries.filter(e => e._changed);
        if (changed.length === 0) {
            setSaving(false);
            return;
        }

        const payload = changed.map(e => ({
            id: e.id, // If undefined, supabase handles insert if we strip it? No, need to handle insert/update logic. 
            // Actually upsert works if we provide conflict key. But generic ID is UUID.
            // If it's new, we should NOT send 'id'.
            price_table_id: tableId,
            width_mm: e.width_mm,
            projection_mm: e.projection_mm,
            price: e.price,
            structure_price: e.structure_price,
            glass_price: e.glass_price,
            properties: e.properties
        }));

        // Split into inserts (no ID) and updates (ID)
        const toInsert = payload.filter(p => !p.id);
        const toUpdate = payload.filter(p => p.id);

        let error = null;

        if (toInsert.length > 0) {
            const { error: insertErr } = await supabase.from('price_matrix_entries').insert(toInsert);
            if (insertErr) error = insertErr;
        }

        if (toUpdate.length > 0 && !error) {
            const { error: updateErr } = await supabase.from('price_matrix_entries').upsert(toUpdate);
            if (updateErr) error = updateErr;
        }

        if (error) {
            toast.error('Błąd zapisu');
            console.error(error);
        } else {
            toast.success('Zapisano zmiany');
            loadMatrix(); // Reload to get IDs and clean state
        }
        setSaving(false);
    };

    // Helper to get entry
    const getEntry = (w: number, p: number) => entries.find(e => e.width_mm === w && e.projection_mm === p);

    const [editedTableName, setEditedTableName] = useState(tableName);

    // Update local state if prop changes
    useEffect(() => {
        setEditedTableName(tableName);
    }, [tableName]);

    const handleNameChange = async () => {
        if (editedTableName === tableName) return;
        try {
            const { error } = await supabase.from('price_tables').update({ name: editedTableName }).eq('id', tableId);
            if (error) throw error;
            toast.success('Zmieniono nazwę cennika');
            // Optimistically update parent? Ideally parent fetches, but we can't easily trigger it. 
            // Name update is usually minor.
        } catch (error) {
            console.error(error);
            toast.error('Błąd zmiany nazwy');
        }
    };

    const handleUploadImage = async (groupName: string, file: File) => {
        const toastId = toast.loading('Wysyłanie zdjęcia...');
        try {
            const ext = file.name.split('.').pop();
            const fileName = `component_${tableId}_${groupName.replace(/\s+/g, '_')}_${Date.now()}.${ext}`;
            const { error } = await supabase.storage.from('product-images').upload(fileName, file);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);

            // Save to table attributes
            const newImages = { ...componentImages, [groupName]: publicUrl };
            setComponentImages(newImages);

            // Fetch current attributes first to merge
            const { data: currentTable } = await supabase.from('price_tables').select('attributes').eq('id', tableId).single();
            const currentAttrs = currentTable?.attributes || {};

            await supabase.from('price_tables').update({
                attributes: { ...currentAttrs, component_images: newImages }
            }).eq('id', tableId);

            toast.success('Zdjęcie dodane!', { id: toastId });
        } catch (e: any) {
            console.error(e);
            toast.error('Błąd wysyłania: ' + e.message, { id: toastId });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={editedTableName}
                                onChange={(e) => setEditedTableName(e.target.value)}
                                onBlur={handleNameChange}
                                className="text-xl font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-accent focus:outline-none transition-colors"
                            />
                            <span className="text-xs text-slate-400">(kliknij by edytować)</span>
                        </div>
                        <div className="flex gap-2 text-sm mt-1">
                            {viewMode !== 'groups' && (
                                <>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`px-2 py-0.5 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-500 hover:bg-slate-200'}`}
                                    >
                                        Macierz (Lista)
                                    </button>
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`px-2 py-0.5 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-500 hover:bg-slate-200'}`}
                                    >
                                        Macierz (Siatka)
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => setViewMode(viewMode === 'groups' ? 'list' : 'groups')}
                                className={`px-2 py-0.5 rounded ${viewMode === 'groups' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-500 hover:bg-slate-200'}`}
                            >
                                {viewMode === 'groups' ? 'Tryb Komponentów (Aktywny)' : 'Przełącz na Tryb Prosty (Lista)'}
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {viewMode !== 'groups' && (
                            <>
                                <button onClick={() => handleAddDimension('width')} className="px-3 py-2 bg-white border border-slate-300 rounded text-sm hover:bg-slate-50 font-medium">
                                    + Dodaj Szerokość
                                </button>
                                <button onClick={() => handleAddDimension('projection')} className="px-3 py-2 bg-white border border-slate-300 rounded text-sm hover:bg-slate-50 font-medium">
                                    + Dodaj Wysięg
                                </button>
                                <div className="w-px bg-slate-300 mx-2"></div>
                            </>
                        )}
                        <button onClick={onClose} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Anuluj</button>
                        <button
                            onClick={saveChanges}
                            disabled={saving}
                            className="px-6 py-2 bg-accent text-white font-bold rounded-lg hover:bg-accent/90 disabled:opacity-50"
                        >
                            {saving ? 'Zapisywanie...' : 'Zapisz Zmiany'}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-0 bg-white">
                    {loading ? (
                        <div className="flex justify-center items-center h-full text-slate-400">Ładowanie cennika...</div>
                    ) : (
                        <>
                            {viewMode === 'groups' ? (
                                <div className="p-6 space-y-8">
                                    {componentGroups.map(group => (
                                        <div key={group.name} className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                            <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        className="font-bold text-lg text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-accent focus:outline-none"
                                                        value={group.name}
                                                        onChange={() => {
                                                            // Bulk update not implemented explicitly here
                                                        }}
                                                        disabled
                                                    />
                                                    {componentImages[group.name] ? (
                                                        <img src={componentImages[group.name]} alt={group.name} className="h-10 w-10 object-cover rounded border border-slate-300" />
                                                    ) : (
                                                        <div className="h-10 w-10 bg-slate-200 rounded flex items-center justify-center text-slate-400 text-xs">Brak foto</div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <label className="cursor-pointer px-3 py-1 bg-white border border-slate-300 rounded text-xs hover:bg-slate-50 shadow-sm flex items-center gap-1">
                                                        <span>📷 Zmień zdjęcie</span>
                                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                                            if (e.target.files?.[0]) handleUploadImage(group.name, e.target.files[0]);
                                                        }} />
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="p-0">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                                                        <tr>
                                                            <th className="p-3 w-1/3">Nazwa / Wariant</th>
                                                            <th className="p-3 w-1/4">Opis (Admin)</th>
                                                            <th className="p-3 w-24 text-center">Jednostka</th>
                                                            <th className="p-3 w-32 text-right">Cena</th>
                                                            <th className="p-3 w-10"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {group.entries.map(entry => (
                                                            <tr key={entry.id || Math.random()} className="hover:bg-slate-50 group-row">
                                                                <td className="p-3">
                                                                    <input
                                                                        type="text"
                                                                        className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-accent focus:outline-none"
                                                                        value={entry.properties?.name || ''}
                                                                        onChange={(e) => handleEntryChange(entry.id, 'prop_name', e.target.value)}
                                                                        placeholder="Nazwa elementu"
                                                                    />
                                                                </td>
                                                                <td className="p-3">
                                                                    <input
                                                                        type="text"
                                                                        className="w-full text-xs text-slate-500 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-accent focus:outline-none"
                                                                        value={entry.properties?.description || ''}
                                                                        onChange={(e) => handleEntryChange(entry.id, 'prop_description', e.target.value)}
                                                                        placeholder="Opis techniczny"
                                                                    />
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    <input
                                                                        type="text"
                                                                        className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-200 focus:border-accent focus:outline-none"
                                                                        value={entry.properties?.unit || 'szt.'}
                                                                        onChange={(e) => handleEntryChange(entry.id, 'prop_unit', e.target.value)}
                                                                    />
                                                                </td>
                                                                <td className="p-3 text-right">
                                                                    <div className="relative inline-block w-32">
                                                                        <span className="absolute left-2 top-1.5 text-slate-400 text-xs">€</span>
                                                                        <input
                                                                            type="number"
                                                                            value={entry.price}
                                                                            onChange={(e) => handleEntryChange(entry.id, 'price', e.target.value)}
                                                                            className="w-full pl-6 pr-2 py-1 text-right border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                                                        />
                                                                    </div>
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    <button
                                                                        title="Usuń wiersz"
                                                                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        onClick={() => {
                                                                            if (confirm('Usunąć ten wiersz?')) {
                                                                                if (entry.id) {
                                                                                    // Logic to mark as deleted or delete directly?
                                                                                    // For now just remove from state, verify save handles deletion?
                                                                                    // Save currently only UPSERTS. Deletion requires explicit call.
                                                                                    // TODO: Add delete logic. For now local remove:
                                                                                    // Actually we need to delete from DB if it has ID.
                                                                                    // Let's implement delete later or just confirm.
                                                                                    // A simpler way: set _deleted flag and handle in save.
                                                                                }
                                                                                setEntries(prev => prev.filter(e => e !== entry));
                                                                            }
                                                                        }}
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {/* Add Row Button */}
                                                        <tr>
                                                            <td colSpan={5} className="p-2 bg-slate-50">
                                                                <button
                                                                    onClick={() => {
                                                                        const newEntry: MatrixEntry = {
                                                                            width_mm: 0,
                                                                            projection_mm: 0,
                                                                            price: 0,
                                                                            structure_price: 0,
                                                                            glass_price: 0,
                                                                            properties: {
                                                                                name: group.name, // Keep in same group
                                                                                description: '',
                                                                                unit: 'szt.'
                                                                            },
                                                                            _changed: true,
                                                                            _isNew: true
                                                                        };
                                                                        setEntries([...entries, newEntry]);
                                                                    }}
                                                                    className="w-full py-2 border-2 border-dashed border-slate-300 rounded text-slate-400 hover:border-accent hover:text-accent font-bold text-sm transition-all"
                                                                >
                                                                    + Dodaj wiersz do grupy "{group.name}"
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add New Group Button */}
                                    <div className="mt-8 border-t pt-8 text-center">
                                        <button
                                            onClick={() => {
                                                const groupName = prompt("Podaj nazwę nowej grupy (np. 'Opcje Dodatkowe'):");
                                                if (groupName) {
                                                    const newEntry: MatrixEntry = {
                                                        width_mm: 0,
                                                        projection_mm: 0,
                                                        price: 0,
                                                        structure_price: 0,
                                                        glass_price: 0,
                                                        properties: {
                                                            name: groupName, // New name creates new group
                                                            description: '',
                                                            unit: 'szt.'
                                                        },
                                                        _changed: true,
                                                        _isNew: true
                                                    };
                                                    setEntries([...entries, newEntry]);
                                                }
                                            }}
                                            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-300"
                                        >
                                            + Utwórz nową grupę
                                        </button>
                                    </div>
                                </div>
                            ) : viewMode === 'grid' ? (
                                <div className="p-4">
                                    <div className="inline-block min-w-full">
                                        <div className="grid gap-px bg-slate-200 border border-slate-300 shadow-sm rounded-lg overflow-hidden"
                                            style={{
                                                gridTemplateColumns: `100px repeat(${widths.length}, minmax(120px, 1fr))`
                                            }}>
                                            {/* Header Row */}
                                            <div className="bg-slate-100 p-3 font-bold text-xs text-slate-500 sticky top-0 z-10 flex items-center justify-center">
                                                Wysięg \ Szer.
                                            </div>
                                            {widths.map(w => (
                                                <div key={w} className="bg-slate-100 p-3 font-bold text-xs text-slate-700 text-center sticky top-0 z-10">
                                                    {w} mm
                                                </div>
                                            ))}

                                            {/* Rows */}
                                            {projections.map(p => (
                                                <React.Fragment key={p}>
                                                    <div className="bg-slate-100 p-3 font-bold text-xs text-slate-700 flex items-center justify-center sticky left-0 z-10">
                                                        {p} mm
                                                    </div>
                                                    {widths.map(w => {
                                                        const entry = getEntry(w, p);
                                                        const changed = entry?._changed;
                                                        return (
                                                            <div key={`${w}-${p}`} className={`bg-white p-1 relative group ${changed ? 'bg-yellow-50' : ''}`}>
                                                                <div className="flex flex-col h-full justify-center">
                                                                    <label className="text-[10px] text-slate-400 text-center">Całość</label>
                                                                    <input
                                                                        type="number"
                                                                        value={entry?.price || 0}
                                                                        onChange={(e) => handleEntryChange(entry?.id, 'price', e.target.value, w, p)}
                                                                        className={`w-full text-center text-sm font-bold focus:outline-none bg-transparent ${changed ? 'text-amber-700' : 'text-slate-800'}`}
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[800px]">
                                        <thead className="bg-slate-100 text-slate-600 text-xs uppercase font-bold sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="p-3 border-b text-center bg-orange-100 border-orange-200">Wymiar (mm)</th>
                                                <th className="p-3 border-b text-center w-32 bg-yellow-50">Cena Konstr.</th>
                                                <th className="p-3 border-b text-center w-32 bg-blue-50">Cena Szkła</th>
                                                <th className="p-3 border-b text-center w-32 bg-green-50">Suma (Auto)</th>
                                                <th className="p-3 border-b text-center w-20">Pola</th>
                                                <th className="p-3 border-b text-center w-20">Słupy</th>
                                                <th className="p-3 border-b text-center w-24">Pow. (m²)</th>
                                                <th className="p-3 border-b text-center w-32 bg-purple-50">Dodatki</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {/* Group by Projection for readability like in the image */}
                                            {projections.map(p => (
                                                <React.Fragment key={p}>
                                                    {widths.map(w => {
                                                        const entry = getEntry(w, p);
                                                        if (!entry) return null;
                                                        return (
                                                            <tr key={`${w}-${p}`} className={`hover:bg-slate-50 ${entry._changed ? 'bg-yellow-50/50' : ''}`}>
                                                                <td className="p-2 border-r border-slate-100 font-bold text-slate-700 text-center">
                                                                    {w} x {p}
                                                                </td>
                                                                <td className="p-2 border-r border-slate-100 bg-yellow-50/30">
                                                                    <div className="relative">
                                                                        <span className="absolute left-2 top-1.5 text-slate-400 text-xs">€</span>
                                                                        <input
                                                                            type="number"
                                                                            className="w-full pl-6 pr-2 py-1 text-right bg-white border border-slate-200 rounded text-sm focus:ring-2 focus:ring-accent"
                                                                            value={entry.structure_price || 0}
                                                                            onChange={(e) => handleEntryChange(entry.id, 'structure_price', e.target.value, w, p)}
                                                                        />
                                                                    </div>
                                                                </td>
                                                                <td className="p-2 border-r border-slate-100 bg-blue-50/30">
                                                                    <div className="relative">
                                                                        <span className="absolute left-2 top-1.5 text-slate-400 text-xs">€</span>
                                                                        <input
                                                                            type="number"
                                                                            className="w-full pl-6 pr-2 py-1 text-right bg-white border border-slate-200 rounded text-sm focus:ring-2 focus:ring-accent"
                                                                            value={entry.glass_price || 0}
                                                                            onChange={(e) => handleEntryChange(entry.id, 'glass_price', e.target.value, w, p)}
                                                                        />
                                                                    </div>
                                                                </td>
                                                                <td className="p-2 border-r border-slate-100 font-bold text-right text-green-700 bg-green-50/30">
                                                                    € {((entry.structure_price || 0) + (entry.glass_price || 0)).toFixed(2)}
                                                                </td>
                                                                <td className="p-2 text-center border-r border-slate-100">
                                                                    <input
                                                                        type="number"
                                                                        className="w-16 text-center bg-white border border-slate-200 rounded text-sm"
                                                                        // Prefer 'fields' property, fallback to 'rafters-1'
                                                                        value={entry.properties?.fields ?? (entry.properties?.rafters ? entry.properties.rafters - 1 : 0)}
                                                                        title="Liczba pól"
                                                                        onChange={(e) => handleEntryChange(entry.id, 'prop_fields', parseInt(e.target.value), w, p)}
                                                                    />
                                                                </td>
                                                                <td className="p-2 text-center border-r border-slate-100">
                                                                    <input
                                                                        type="number"
                                                                        className="w-16 text-center bg-white border border-slate-200 rounded text-sm"
                                                                        value={entry.properties?.posts || 2}
                                                                        onChange={(e) => handleEntryChange(entry.id, 'prop_posts', parseInt(e.target.value), w, p)}
                                                                    />
                                                                </td>
                                                                <td className="p-2 text-center">
                                                                    <div className="relative">
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            className="w-20 text-center bg-white border border-slate-200 rounded text-sm"
                                                                            value={entry.properties?.area || 0}
                                                                            onChange={(e) => handleEntryChange(entry.id, 'prop_area', parseFloat(e.target.value), w, p)}
                                                                        />
                                                                        <span className="absolute right-1 top-1.5 text-slate-400 text-[10px]">m²</span>
                                                                    </div>
                                                                </td>
                                                                <td className="p-2 border-r border-slate-100 text-xs text-slate-500">
                                                                    {/* Render Rafter Type / Reinforcement */}
                                                                    <div className="flex flex-col gap-1 items-start">
                                                                        {entry.properties?.rafter_type && entry.properties.rafter_type !== 'std' && (
                                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-white
                                                                                ${entry.properties.rafter_type === 'M' ? 'bg-slate-400' :
                                                                                    entry.properties.rafter_type === 'L' ? 'bg-blue-400' :
                                                                                        entry.properties.rafter_type === 'XL' ? 'bg-purple-500' : 'bg-red-500'}`}>
                                                                                {entry.properties.rafter_type.replace('_Steel', '+Steel')}
                                                                            </span>
                                                                        )}
                                                                        {entry.properties?.reinforcement && (
                                                                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-700 font-bold border border-red-200">
                                                                                + STAL
                                                                            </span>
                                                                        )}
                                                                        {(!entry.properties?.rafter_type || entry.properties.rafter_type === 'std') && !entry.properties?.reinforcement && (
                                                                            <span className="text-slate-300 font-mono text-xs">-</span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {/* Separator row */}
                                                    <tr className="bg-slate-100 h-2"><td colSpan={6}></td></tr>
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
