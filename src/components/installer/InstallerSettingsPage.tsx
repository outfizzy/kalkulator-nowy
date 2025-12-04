import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { DatabaseService } from '../../services/database';
import toast from 'react-hot-toast';

export const InstallerSettingsPage: React.FC = () => {
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    const [language, setLanguage] = useState<'pl' | 'mo' | 'uk'>('pl');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (currentUser?.preferredLanguage) {
            setLanguage(currentUser.preferredLanguage);
        }
    }, [currentUser]);

    const handleSaveLanguage = async () => {
        if (!currentUser) return;

        setLoading(true);
        try {
            await DatabaseService.updateUserLanguage(currentUser.id, language);
            toast.success(t('settings.savedSuccess'));
            // Reload to apply language changes
            window.location.reload();
        } catch (error) {
            console.error('Error saving language:', error);
            toast.error(t('settings.saveError'));
        } finally {
            setLoading(false);
        }
    };

    const languages = [
        { value: 'pl', label: t('languages.pl'), flag: '🇵🇱' },
        { value: 'mo', label: t('languages.mo'), flag: '🇲🇩' },
        { value: 'uk', label: t('languages.uk'), flag: '🇺🇦' }
    ];

    return (
        <div className="max-w-2xl">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">{t('settings.title')}</h1>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-700 mb-4">{t('settings.language')}</h2>
                <p className="text-sm text-slate-500 mb-6">{t('settings.languageDesc')}</p>

                <div className="space-y-3">
                    {languages.map((lang) => (
                        <button
                            key={lang.value}
                            onClick={() => setLanguage(lang.value as 'pl' | 'mo' | 'uk')}
                            className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${language === lang.value
                                ? 'border-accent bg-accent/5'
                                : 'border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            <span className="text-3xl">{lang.flag}</span>
                            <div className="flex-1 text-left">
                                <p className="font-semibold text-slate-800">{lang.label}</p>
                            </div>
                            {language === lang.value && (
                                <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleSaveLanguage}
                        disabled={loading}
                        className="bg-accent text-white px-6 py-2 rounded-lg hover:bg-accent-dark font-bold shadow-lg shadow-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? t('settings.saving') : t('settings.saveLanguage')}
                    </button>
                </div>
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                    <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm">
                        <p className="font-semibold text-blue-800 mb-1">{t('settings.info')}</p>
                        <p className="text-blue-700">{t('settings.infoMessage')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
