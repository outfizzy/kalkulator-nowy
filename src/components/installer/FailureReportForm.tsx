import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { DatabaseService } from '../../services/database';
import { toast } from 'react-hot-toast';

export const FailureReportForm: React.FC = () => {
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [equipmentName, setEquipmentName] = useState('');
    const [description, setDescription] = useState('');
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhoto(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentUser) {
            toast.error(t('failure.mustBeLoggedIn'));
            return;
        }

        if (!equipmentName.trim() || !description.trim()) {
            toast.error(t('failure.fillRequired'));
            return;
        }

        setLoading(true);

        try {
            const { error } = await DatabaseService.createFailureReport(
                {
                    userId: currentUser.id,
                    equipmentName: equipmentName.trim(),
                    description: description.trim(),
                    status: 'pending'
                },
                photo || undefined
            );

            if (error) throw error;

            toast.success(t('failure.successMessage'));
            navigate('/installer');
        } catch (error) {
            console.error('Error creating failure report:', error);
            toast.error(t('failure.errorMessage'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 pb-20">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => navigate('/installer')}
                        className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        {t('failure.back')}
                    </button>
                    <h1 className="text-2xl font-bold text-slate-800">{t('failure.title')}</h1>
                    <p className="text-slate-500 text-sm">{t('failure.subtitle')}</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
                    {/* Equipment Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            {t('failure.equipmentName')} *
                        </label>
                        <input
                            type="text"
                            value={equipmentName}
                            onChange={(e) => setEquipmentName(e.target.value)}
                            placeholder={t('failure.equipmentPlaceholder')}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            {t('failure.description')} *
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('failure.descriptionPlaceholder')}
                            rows={4}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent resize-none"
                            required
                        />
                    </div>

                    {/* Photo Upload */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            {t('failure.photo')}
                        </label>
                        <div className="space-y-3">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoChange}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                            />
                            {photoPreview && (
                                <div className="relative">
                                    <img
                                        src={photoPreview}
                                        alt="Preview"
                                        className="w-full h-64 object-cover rounded-lg border border-slate-200"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPhoto(null);
                                            setPhotoPreview(null);
                                        }}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                                {t('failure.submitting')}
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                {t('failure.submit')}
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
