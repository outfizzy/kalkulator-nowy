import { useLocation, matchPath } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { DatabaseService } from '../services/database';

export interface PageContext {
    type: 'lead' | 'offer' | 'contract' | 'customer' | 'general';
    id?: string;
    data?: any;
    summary?: string;
}

export const usePageContext = () => {
    const location = useLocation();
    const [context, setContext] = useState<PageContext>({ type: 'general' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchContext = async () => {
            setLoading(true);
            try {
                // Match Routes
                const leadMatch = matchPath('/leads/:id', location.pathname);
                // const offerMatch = matchPath('/offers/:id', location.pathname); 

                const customerMatch = matchPath('/customers/:id', location.pathname);

                if (leadMatch?.params.id) {
                    const id = leadMatch.params.id;
                    if (id === 'new') return;
                    const lead = await DatabaseService.getLead(id);
                    if (lead) {
                        setContext({
                            type: 'lead',
                            id,
                            data: lead,
                            summary: `Lead: ${lead.customerData.firstName || ''} ${lead.customerData.lastName || ''}, Status: ${lead.status}`
                        });
                        return;
                    }
                }

                if (customerMatch?.params.id) {
                    const id = customerMatch.params.id;
                    if (id === 'new') return;
                    const customer = await DatabaseService.getCustomer(id);
                    if (customer) {
                        setContext({
                            type: 'customer',
                            id,
                            data: customer,
                            summary: `Klient: ${customer.firstName} ${customer.lastName}, Miasto: ${customer.city}`
                        });
                        return;
                    }
                }

                // If no specific match
                setContext({ type: 'general' });

            } catch (error) {
                console.error("Error fetching context:", error);
                setContext({ type: 'general' });
            } finally {
                setLoading(false);
            }
        };

        fetchContext();
    }, [location.pathname]);

    return { context, loading };
};
