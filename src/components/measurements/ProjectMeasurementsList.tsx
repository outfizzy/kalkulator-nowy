import React, { useState, useEffect } from 'react';
import { ProjectMeasurementService } from '../../services/database/project-measurement.service';
import { ProjectMeasurement } from '../../types';
import { DachrechnerInputs, DachrechnerResults } from '../../services/dachrechner.service';
import { MeasurementCalculator } from './MeasurementCalculator';
import toast from 'react-hot-toast';

interface ProjectMeasurementsListProps {
    customerId?: string;
    contractId?: string;
}

export const ProjectMeasurementsList: React.FC<ProjectMeasurementsListProps> = ({ customerId, contractId }) => {
    const [measurements, setMeasurements] = useState<ProjectMeasurement[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [viewingMeasurement, setViewingMeasurement] = useState<ProjectMeasurement | null>(null);

    useEffect(() => {
        loadMeasurements();
    }, [customerId, contractId]);

    const loadMeasurements = async () => {
        try {
            setLoading(true);
            const data = await ProjectMeasurementService.getMeasurements(customerId, contractId);
            setMeasurements(data);
        } catch (error) {
            console.error('Error loading measurements:', error);
            toast.error('Błąd ładowania pomiarów');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNew = async (data: any) => {
        try {
            await ProjectMeasurementService.createMeasurement({
                ...data,
                customerId,
                contractId,
                status: 'draft'
            });
            toast.success('Pomiar zapisany');
            setIsCreating(false);
            loadMeasurements();
        } catch (error) {
            console.error('Error saving measurement:', error);
            toast.error('Błąd zapisu pomiaru');
        }
    };

    const handleUpdate = async (data: any) => {
        if (!viewingMeasurement) return;
        try {
            await ProjectMeasurementService.updateMeasurement(viewingMeasurement.id, data);
            toast.success('Pomiar zaktualizowany');
            setViewingMeasurement(null); // Close or reload?
            loadMeasurements();
        } catch (error) {
            console.error('Error updating measurement:', error);
            toast.error('Błąd aktualizacji pomiaru');
        }
    };

    const handleToggleStatus = async (measurement: ProjectMeasurement, e: React.MouseEvent) => {
        e.stopPropagation();
        const newStatus = measurement.status === 'final' ? 'draft' : 'final';
        try {
            await ProjectMeasurementService.updateMeasurement(measurement.id, { status: newStatus });
            toast.success(newStatus === 'final' ? 'Pomiar zatwierdzony' : 'Pomiar cofnięty do szkicu');
            loadMeasurements();
        } catch (error) {
            console.error('Error toggling status:', error);
            toast.error('Błąd zmiany statusu');
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Czy na pewno chcesz usunąć ten pomiar?')) return;
        try {
            await ProjectMeasurementService.deleteMeasurement(id);
            toast.success('Pomiar usunięty');
            loadMeasurements();
        } catch (error) {
            console.error('Error deleting measurement:', error);
            toast.error('Błąd usuwania');
        }
    };

    if (loading) return <div className="p-4 text-center text-slate-500">Ładowanie pomiarów...</div>;

    if (isCreating) {
        return (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-slate-800">Nowy Pomiar</h2>
                    <button
                        onClick={() => setIsCreating(false)}
                        className="text-slate-500 hover:text-slate-700"
                    >
                        Anuluj
                    </button>
                </div>
                <MeasurementCalculator onSave={handleSaveNew} />
            </div>
        );
    }

    if (viewingMeasurement) {
        return (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-slate-800">Edycja Pomiaru</h2>
                    <button
                        onClick={() => setViewingMeasurement(null)}
                        className="text-slate-500 hover:text-slate-700"
                    >
                        Wróć do listy
                    </button>
                </div>
                <MeasurementCalculator
                    initialData={viewingMeasurement}
                    onSave={handleUpdate}
                />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">Pomiary Techniczne ({measurements.length})</h3>
                <button
                    onClick={() => setIsCreating(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nowy Pomiar
                </button>
            </div>

            {measurements.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <svg className="w-12 h-12 mx-auto text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="text-slate-500">Brak zapisanych pomiarów</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {measurements.map(m => (
                        <div
                            key={m.id}
                            onClick={() => setViewingMeasurement(m)}
                            className={`bg-white p-4 rounded-xl border shadow-sm hover:shadow-md transition-shadow cursor-pointer relative group ${m.status === 'final' ? 'border-green-300 ring-1 ring-green-100' : 'border-slate-200'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-slate-800">{m.name}</h4>
                                <button
                                    onClick={(e) => handleToggleStatus(m, e)}
                                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${m.status === 'final'
                                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                            : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                        }`}
                                    title={m.status === 'final' ? 'Kliknij aby cofnąć do szkicu' : 'Kliknij aby zatwierdzić'}
                                >
                                    {m.status === 'final' ? '✓ Zatwierdzony' : 'Szkic'}
                                </button>
                            </div>

                            <div className="text-sm text-slate-600 space-y-1 mb-3">
                                <div className="flex justify-between">
                                    <span>Model:</span>
                                    <span className="font-medium text-blue-600 capitalize">{m.modelId}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Głębokość:</span>
                                    <span className="font-mono">{m.inputs.depth} mm</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>D4 (Słup):</span>
                                    <span className="font-mono font-bold">{m.results?.depthD4post || '-'} mm</span>
                                </div>
                            </div>

                            <div className="text-xs text-slate-400 pt-3 border-t border-slate-100 flex justify-between items-center">
                                <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                                <span className="text-slate-300">{m.creator?.firstName} {m.creator?.lastName}</span>
                            </div>

                            {/* Action buttons - visible on hover */}
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => handleToggleStatus(m, e)}
                                    className={`p-1.5 rounded-lg shadow-sm transition-colors ${m.status === 'final' ? 'bg-white text-yellow-500 hover:text-yellow-600' : 'bg-white text-green-500 hover:text-green-600'}`}
                                    title={m.status === 'final' ? 'Cofnij do szkicu' : 'Zatwierdź pomiar'}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        {m.status === 'final'
                                            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        }
                                    </svg>
                                </button>
                                <button
                                    onClick={(e) => handleDelete(m.id, e)}
                                    className="p-1.5 bg-white rounded-lg shadow-sm text-slate-300 hover:text-red-500 transition-colors"
                                    title="Usuń pomiar"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
