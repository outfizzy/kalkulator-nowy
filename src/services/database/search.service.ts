import { supabase } from '../../lib/supabase';


export interface SearchResult {
    id: string;
    type: 'customer' | 'offer' | 'lead' | 'contract';
    title: string;
    subtitle: string;
    url: string;
    metadata?: any;
    date?: Date;
}

export const SearchService = {
    async searchAll(query: string): Promise<SearchResult[]> {
        if (!query || query.length < 2) return [];

        const term = `%${query}%`;
        const results: SearchResult[] = [];

        try {
            // 1. Search Customers
            const { data: customers } = await supabase
                .from('customers')
                .select('id, first_name, last_name, company_name, city, email')
                .or(`first_name.ilike.${term},last_name.ilike.${term},company_name.ilike.${term},email.ilike.${term},city.ilike.${term}`)
                .limit(5);

            if (customers) {
                results.push(...customers.map((c: any) => ({
                    id: c.id,
                    type: 'customer' as const,
                    title: `${c.first_name} ${c.last_name} ${c.company_name ? `(${c.company_name})` : ''}`,
                    subtitle: `${c.city || ''} ${c.email || ''}`.trim(),
                    url: `/customers/${c.id}`,
                })));
            }

            // 2. Search Offers
            const { data: offers } = await supabase
                .from('offers')
                .select('id, offer_number, status, customer:customers!inner(last_name)')
                .or(`offer_number.ilike.${term}`)
                .limit(5);

            if (offers) {
                results.push(...offers.map((o: any) => ({
                    id: o.id,
                    type: 'offer' as const,
                    title: `Oferta ${o.offer_number}`,
                    subtitle: `Klient: ${o.customer?.last_name || 'Nieznany'} | Status: ${o.status}`,
                    url: `/offers?id=${o.id}`, // Or dedicated detail page
                })));
            }

            // 3. Search Contracts
            const { data: contracts } = await supabase
                .from('contracts')
                .select('id, contract_number, status,  offer:offers!inner(customer:customers!inner(last_name))')
                .or(`contract_number.ilike.${term}`)
                .limit(5);

            if (contracts) {
                results.push(...contracts.map((c: any) => ({
                    id: c.id,
                    type: 'contract' as const,
                    title: `Umowa ${c.contract_number}`,
                    subtitle: `Klient: ${c.offer?.customer?.last_name || 'Nieznany'}`,
                    url: `/contracts/${c.id}`,
                })));
            }

            // 4. Search Leads
            const { data: leads } = await supabase
                .from('leads')
                .select('id, status, source, customer_data')
                .limit(10); // We have to filter leads in JS mostly due to JSONB customer_data if unrelated to customers table

            if (leads) {
                // simple JS filter for leads relying on JSONB often
                // Or better: use database search if we indexed jsonb, but simple filter is fine for MVP
                const matchingLeads = leads.filter((l: any) => {
                    const data = l.customer_data || {};
                    const searchStr = `${data.firstName || ''} ${data.lastName || ''} ${data.companyName || ''} ${data.phone || ''}`.toLowerCase();
                    return searchStr.includes(query.toLowerCase());
                }).slice(0, 5);

                results.push(...matchingLeads.map((l: any) => ({
                    id: l.id,
                    type: 'lead' as const,
                    title: `Lead: ${l.customer_data?.firstName || ''} ${l.customer_data?.lastName || 'Nowy'}`,
                    subtitle: `Status: ${l.status}`,
                    url: `/leads/${l.id}`,
                })));
            }

        } catch (error) {
            console.error('Search error:', error);
        }

        return results;
    }
};
