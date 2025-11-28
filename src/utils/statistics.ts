import type { Offer, CommissionStats, User } from '../types';

export interface SalesRepStats {
    user: User;
    offersCount: number;
    soldCount: number;
    sentCount: number;
    draftCount: number;
    revenue: number;
    commission: number;
    reportsCount: number;
}

export function calculateCommissionStats(offers: Offer[]): CommissionStats {
    const totalOffers = offers.length;
    const draftOffers = offers.filter(o => o.status === 'draft').length;
    const sentOffers = offers.filter(o => o.status === 'sent').length;
    const soldOffers = offers.filter(o => o.status === 'sold').length;
    const rejectedOffers = offers.filter(o => o.status === 'rejected').length;

    const totalRevenue = offers
        .filter(o => o.status === 'sold')
        .reduce((sum, o) => sum + (o.pricing.finalPriceNet || o.pricing.sellingPriceNet), 0);

    const totalCommission = offers
        .filter(o => o.status === 'sold')
        .reduce((sum, o) => sum + o.commission, 0);

    // Projected (all active offers)
    const projectedRevenue = offers
        .filter(o => o.status !== 'rejected' && o.status !== 'sold')
        .reduce((sum, o) => sum + o.pricing.sellingPriceNet, 0);

    const projectedCommission = offers
        .filter(o => o.status !== 'rejected' && o.status !== 'sold')
        .reduce((sum, o) => sum + o.commission, 0);

    return {
        totalOffers,
        draftOffers,
        sentOffers,
        soldOffers,
        rejectedOffers,
        totalRevenue,
        totalCommission,
        projectedRevenue,
        projectedCommission
    };
}

export function calculateSalesRepStats(offers: Offer[], salesReps: User[]): SalesRepStats[] {
    return salesReps.map(rep => {
        const repOffers = offers.filter(o => o.createdBy === rep.id);
        const stats = calculateCommissionStats(repOffers);

        return {
            user: rep,
            offersCount: stats.totalOffers,
            soldCount: stats.soldOffers,
            sentCount: stats.sentOffers,
            draftCount: stats.draftOffers,
            revenue: stats.totalRevenue,
            commission: stats.totalCommission,
            reportsCount: 0 // We need to fetch reports to count them, or pass them in. For now 0.
        };
    });
}
