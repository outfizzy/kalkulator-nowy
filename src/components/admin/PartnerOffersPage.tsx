import React from 'react';
import { PartnerOffersList } from './PartnerOffersList';

export const PartnerOffersPage: React.FC = () => {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Oferty Partnerów B2B</h1>
                <p className="text-slate-600">Śledzenie i zarządzanie ofertami utworzonymi przez partnerów hurtowych</p>
            </div>
            <PartnerOffersList />
        </div>
    );
};
