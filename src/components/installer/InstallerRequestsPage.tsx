import React, { useState } from 'react';
import { useTranslation } from '../../contexts/TranslationContext';
import { OrderRequestForm } from './OrderRequestForm';
import { OrderRequestList } from './OrderRequestList';

export const InstallerRequestsPage: React.FC = () => {
    const { t } = useTranslation();
    const [refreshKey, setRefreshKey] = useState(0);

    const handleSuccess = () => {
        setRefreshKey(prev => prev + 1);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{t('requests.title')}</h1>
                    <p className="text-slate-500 text-sm">
                        {t('requests.subtitle')}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <OrderRequestForm onSuccess={handleSuccess} />
                </div>
                <div className="lg:col-span-2">
                    <OrderRequestList key={refreshKey} />
                </div>
            </div>
        </div>
    );
};
