import { useLocation } from 'react-router-dom';

export interface PageContext {
    type: 'general' | 'lead' | 'customer' | 'offer' | 'calculator' | 'service';
    name?: string;
    id?: string;
    summary?: string;
    currentPage?: string;
}

export const usePageContext = (): { context: PageContext } => {
    const location = useLocation();

    // Parse URL and state to determine context
    const getContext = (): PageContext => {
        const path = location.pathname;
        const state = location.state as any;

        // Lead context
        if (path.includes('/leads/') || path.includes('/lead/')) {
            return {
                type: 'lead',
                name: state?.leadName || 'Lead',
                id: state?.leadId,
                summary: `Przeglądasz lead: ${state?.leadName || 'nieznany'}`
            };
        }

        // Customer context
        if (path.includes('/customers/') || path.includes('/customer/')) {
            return {
                type: 'customer',
                name: state?.customerName || 'Klient',
                id: state?.customerId,
                summary: `Przeglądasz profil klienta: ${state?.customerName || 'nieznany'}`
            };
        }

        // Offer context
        if (path.includes('/offers/') || path.includes('/offer/') || path.includes('/konfigurator')) {
            return {
                type: 'offer',
                name: state?.offerName || 'Oferta',
                id: state?.offerId,
                summary: `Pracujesz nad ofertą: ${state?.offerName || 'nowa oferta'}`
            };
        }

        // Calculator context
        if (path.includes('/calculator') || path.includes('/kalkulator')) {
            return {
                type: 'calculator',
                summary: 'Używasz kalkulatora - mogę pomóc w wycenach i porównaniach'
            };
        }

        // Service context
        if (path.includes('/service') || path.includes('/serwis')) {
            return {
                type: 'service',
                summary: 'Przeglądasz moduł serwisu'
            };
        }

        // General context
        return {
            type: 'general',
            summary: 'Jestem gotowy aby pomóc!',
            currentPage: path
        };
    };

    return { context: getContext() };
};
