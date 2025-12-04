import React, { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { DatabaseService } from '../../services/database';
import { supabase } from '../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from '../../contexts/TranslationContext';

interface FuelLogFormProps {
    onSuccess?: () => void;
}

export const FuelLogForm: React.FC<FuelLogFormProps> = ({ onSuccess }) => {
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    // Form State
    const [vehiclePlate, setVehiclePlate] = useState('');
    const [odometer, setOdometer] = useState<number | ''>('');
    const [liters, setLiters] = useState<number | ''>('');
    const [cost, setCost] = useState<number | ''>('');
    const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);

    // File State
    const [odometerPhoto, setOdometerPhoto] = useState<File | null>(null);
    const [receiptPhoto, setReceiptPhoto] = useState<File | null>(null);

    const fileInputOdometerRef = useRef<HTMLInputElement>(null);
    const fileInputReceiptRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: (file: File | null) => void) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const uploadPhoto = async (file: File, path: string) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${path}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('fuel-logs')
            .upload(filePath, file);

        if (uploadError) {
            throw uploadError;
        }

        const { data } = supabase.storage
            .from('fuel-logs')
            .getPublicUrl(filePath);

        return data.publicUrl;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        if (!odometer || !liters || !cost || !logDate) {
            toast.error(t('fuel.fillRequired'));
            return;
        }

        if (currentUser.role === 'installer' && !vehiclePlate) {
            toast.error(t('fuel.plateRequired'));
            return;
        }

        if (!odometerPhoto || !receiptPhoto) {
            toast.error(t('fuel.photosRequired'));
            return;
        }

        setLoading(true);
        try {
            // Upload photos
            const odometerUrl = await uploadPhoto(odometerPhoto, 'odometer');
            const receiptUrl = await uploadPhoto(receiptPhoto, 'receipts');

            const { error } = await DatabaseService.createFuelLog({
                userId: currentUser.id,
                type: currentUser.role === 'installer' ? 'installer' : 'sales_rep',
                vehiclePlate: currentUser.role === 'installer' ? vehiclePlate : undefined,
                odometerReading: Number(odometer),
                liters: Number(liters),
                cost: Number(cost),
                currency: 'PLN',
                odometerPhotoUrl: odometerUrl,
                receiptPhotoUrl: receiptUrl,
                logDate: logDate // Already a string in YYYY-MM-DD format
            });

            if (error) throw error;

            toast.success(t('fuel.successMessage'));

            // Reset form
            setVehiclePlate('');
            setOdometer('');
            setLiters('');
            setCost('');
            setLogDate(new Date().toISOString().split('T')[0]);
            setOdometerPhoto(null);
            setReceiptPhoto(null);
            if (fileInputOdometerRef.current) fileInputOdometerRef.current.value = '';
            if (fileInputReceiptRef.current) fileInputReceiptRef.current.value = '';

            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Error creating fuel log:', error);
            toast.error(t('fuel.errorMessage'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">{t('fuel.formTitle')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">

                {currentUser?.role === 'installer' && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t('fuel.vehiclePlate')}
                        </label>
                        <input
                            type="text"
                            value={vehiclePlate}
                            onChange={(e) => setVehiclePlate(e.target.value)}
                            className="w-full rounded-lg border-slate-300 focus:ring-accent focus:border-accent"
                            placeholder={t('fuel.platePlaceholder')}
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t('fuel.date')}
                        </label>
                        <input
                            type="date"
                            value={logDate}
                            onChange={(e) => setLogDate(e.target.value)}
                            className="w-full rounded-lg border-slate-300 focus:ring-accent focus:border-accent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t('fuel.odometer')}
                        </label>
                        <input
                            type="number"
                            value={odometer}
                            onChange={(e) => setOdometer(Number(e.target.value))}
                            className="w-full rounded-lg border-slate-300 focus:ring-accent focus:border-accent"
                            min="0"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t('fuel.liters')}
                        </label>
                        <input
                            type="number"
                            value={liters}
                            onChange={(e) => setLiters(Number(e.target.value))}
                            className="w-full rounded-lg border-slate-300 focus:ring-accent focus:border-accent"
                            step="0.01"
                            min="0"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t('fuel.cost')}
                        </label>
                        <input
                            type="number"
                            value={cost}
                            onChange={(e) => setCost(Number(e.target.value))}
                            className="w-full rounded-lg border-slate-300 focus:ring-accent focus:border-accent"
                            step="0.01"
                            min="0"
                        />
                    </div>
                </div>

                <div className="space-y-4 pt-2">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t('fuel.odometerPhoto')}
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputOdometerRef}
                            onChange={(e) => handleFileChange(e, setOdometerPhoto)}
                            className="block w-full text-sm text-slate-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t('fuel.receiptPhoto')}
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputReceiptRef}
                            onChange={(e) => handleFileChange(e, setReceiptPhoto)}
                            className="block w-full text-sm text-slate-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-emerald-50 file:text-emerald-700
                                hover:file:bg-emerald-100"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-accent hover:bg-accent-dark text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            {t('fuel.submitting')}
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            {t('fuel.submit')}
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};
