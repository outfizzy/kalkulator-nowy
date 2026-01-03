import type { Offer, SalesProfile, CommissionStats, MeasurementReport, User, UserRole, Installation, InstallationTeam, Contract } from '../types';
import { calculateCommissionDetailed } from './commission';
import { extractOrderedItemsFromOffer } from './contractHelpers';

const STORAGE_KEY = 'aluxe_offers';
const PROFILE_KEY = 'aluxe_profile';
const USERS_KEY = 'aluxe_users';
const CURRENT_USER_KEY = 'aluxe_current_user';

/**
 * Zapisuje ofertę do localStorage
 */
export function saveOffer(offer: Offer): void {
    const offers = getAllOffers();
    const existingIndex = offers.findIndex(o => o.id === offer.id);

    if (existingIndex >= 0) {
        offers[existingIndex] = offer;
    } else {
        offers.push(offer);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(offers));
}

/**
 * Pobiera wszystkie oferty z localStorage
 */
export function getAllOffers(): Offer[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    try {
        const offers = JSON.parse(data);
        // Konwersja stringów dat na Date objects
        return offers.map((offer: any) => ({
            ...offer,
            createdAt: new Date(offer.createdAt),
            updatedAt: new Date(offer.updatedAt),
        }));
    } catch (error) {
        console.error('Error parsing offers from localStorage:', error);
        return [];
    }
}

/**
 * Aktualizuje status oferty
 */
export function updateOfferStatus(id: string, status: Offer['status']): void {
    const offers = getAllOffers();
    const index = offers.findIndex(o => o.id === id);
    if (index !== -1) {
        offers[index].status = status;
        offers[index].updatedAt = new Date();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(offers));
    }
}

export function updateOfferFinalPrice(id: string, finalPriceNet: number): void {
    const offers = getAllOffers();
    const index = offers.findIndex(o => o.id === id);
    if (index !== -1) {
        const offer = offers[index];
        offer.pricing.finalPriceNet = finalPriceNet;

        // Recalculate commission based on new Net Price
        // We need to know the cost to calculate margin
        const cost = offer.pricing.totalCost;
        const marginValue = finalPriceNet - cost;
        const marginPercentage = (marginValue / finalPriceNet) * 100; // Margin % based on revenue

        // Recalculate commission
        const commissionStats = calculateCommissionDetailed(finalPriceNet, marginPercentage, 0); // Volume bonus will be applied globally or we need to fetch it? 
        // Ideally we should re-run the full commission logic.
        // Simplified:
        offer.commission = commissionStats.commission;

        offer.updatedAt = new Date();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(offers));
    }
}

/**
 * Usuwa ofertę
 */
export function deleteOffer(id: string): void {
    const offers = getAllOffers().filter(o => o.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(offers));
}

/**
 * Oblicza statystyki prowizji
 */
export function getCommissionStats(): CommissionStats {
    const offers = getAllOffers();
    const soldOffers = offers.filter(o => o.status === 'sold');

    const stats: CommissionStats = {
        totalOffers: offers.length,
        draftOffers: 0,
        sentOffers: 0,
        soldOffers: soldOffers.length,
        rejectedOffers: 0,
        totalRevenue: 0,
        totalCommission: 0,
        projectedRevenue: 0,
        projectedCommission: 0,
    };

    offers.forEach(offer => {
        // Liczenie statusów
        if (offer.status === 'draft') stats.draftOffers++;
        else if (offer.status === 'sent') stats.sentOffers++;
        else if (offer.status === 'rejected') stats.rejectedOffers++;

        // Przychody i prowizje
        if (offer.status === 'sold') {
            const revenue = offer.pricing.finalPriceNet || offer.pricing.sellingPriceNet; // Use final net price if available
            stats.totalRevenue += revenue;

            // Recalculate commission based on final price if needed
            // If finalPriceNet exists, we should probably recalculate commission dynamically here or store it in the offer
            // For now, let's assume offer.commission is updated when price is updated.
            stats.totalCommission += offer.commission;
        }

        // Prognozy (draft + sent)
        if (offer.status === 'draft' || offer.status === 'sent') {
            stats.projectedRevenue += offer.pricing.sellingPriceNet; // Use Net for consistency or Gross? User asked for Net calculation for commission.
            stats.projectedCommission += offer.commission;
        }
    });

    return stats;
}

export const saveSalesProfile = (profile: SalesProfile): void => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};

// --- Reports Storage ---
const REPORTS_KEY = 'aluxe_reports';

export const getReports = (): MeasurementReport[] => {
    const reportsJson = localStorage.getItem(REPORTS_KEY);
    if (!reportsJson) return [];
    try {
        const reports = JSON.parse(reportsJson);
        return reports.map((r: any) => ({
            ...r,
            createdAt: new Date(r.createdAt)
        }));
    } catch (e) {
        console.error('Error parsing reports', e);
        return [];
    }
};

export const saveReport = (report: MeasurementReport): void => {
    const reports = getReports();
    const existingIndex = reports.findIndex(r => r.id === report.id);

    if (existingIndex >= 0) {
        reports[existingIndex] = report;
    } else {
        reports.push(report);
    }

    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
};

export const deleteReport = (id: string): void => {
    const reports = getReports().filter(r => r.id !== id);
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
};

export function getSalesProfile(): SalesProfile | null {
    const data = localStorage.getItem(PROFILE_KEY);
    return data ? JSON.parse(data) : null;
}

// --- User Management ---

export function initializeDefaultUsers(): User[] {
    const existingUsers = localStorage.getItem(USERS_KEY);
    if (existingUsers) {
        return JSON.parse(existingUsers);
    }

    // Create default users
    const defaultUsers: User[] = [
        {
            id: 'admin-001',
            username: 'admin',
            firstName: 'Administrator',
            lastName: 'Systemu',
            email: 'admin@polendach24.de',
            role: 'admin',
            createdAt: new Date()
        },
        {
            id: 'user-001',
            username: 'jan.kowalski',
            firstName: 'Jan',
            lastName: 'Kowalski',
            email: 'jan.kowalski@polendach24.de',
            role: 'sales_rep',
            createdAt: new Date()
        },
        {
            id: 'user-002',
            username: 'anna.nowak',
            firstName: 'Anna',
            lastName: 'Nowak',
            email: 'anna.nowak@polendach24.de',
            role: 'sales_rep',
            createdAt: new Date()
        }
    ];

    localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
    return defaultUsers;
}

export function getCurrentUser(): User | null {
    const data = localStorage.getItem(CURRENT_USER_KEY);
    if (!data) return null;

    try {
        const user = JSON.parse(data);
        return {
            ...user,
            createdAt: new Date(user.createdAt)
        };
    } catch (e) {
        console.error('Error parsing current user', e);
        return null;
    }
}

export function setCurrentUser(user: User): void {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

export function clearCurrentUser(): void {
    localStorage.removeItem(CURRENT_USER_KEY);
}

// --- Data Filtering Functions ---

export function getOffersForUser(userId: string, role: UserRole): Offer[] {
    const allOffers = getAllOffers();

    if (role === 'admin') {
        return allOffers; // Admin sees everything
    }

    // Sales rep sees only their own offers
    return allOffers.filter(offer => offer.createdBy === userId);
}

export function getReportsForUser(userId: string, role: UserRole): MeasurementReport[] {
    const allReports = getReports();

    if (role === 'admin') {
        return allReports; // Admin sees everything
    }

    // Sales rep sees only their own reports
    return allReports.filter(report => report.salesRepId === userId);
}

export function getReportsForOffer(offerId: string): MeasurementReport[] {
    const reports = getReports(); // Changed from getAllReports() to getReports() to match existing function
    return reports.filter(r => r.offerIds && r.offerIds.includes(offerId));
}

/**
 * Get unique customers from all offers for customer selection
 */
export interface CustomerWithMetadata {
    customer: import('../types').Customer;
    lastOfferDate: Date;
    offerCount: number;
}

export function getUniqueCustomers(): CustomerWithMetadata[] {
    const offers = getAllOffers();
    const customerMap = new Map<string, CustomerWithMetadata>();

    offers.forEach(offer => {
        // Create unique key based on email or name+city combination
        const key = offer.customer.email ||
            `${offer.customer.firstName}_${offer.customer.lastName}_${offer.customer.city}`.toLowerCase();

        const existing = customerMap.get(key);

        if (!existing) {
            customerMap.set(key, {
                customer: offer.customer,
                lastOfferDate: offer.createdAt,
                offerCount: 1
            });
        } else {
            // Update if this offer is more recent
            if (offer.createdAt > existing.lastOfferDate) {
                existing.customer = offer.customer; // Use most recent customer data
                existing.lastOfferDate = offer.createdAt;
            }
            existing.offerCount++;
        }
    });

    // Convert to array and sort by most recent first
    return Array.from(customerMap.values())
        .sort((a, b) => b.lastOfferDate.getTime() - a.lastOfferDate.getTime());
}

export function getSalesReps(): User[] {
    const users = initializeDefaultUsers();
    return users.filter(u => u.role === 'sales_rep');
}

export interface SalesRepStats {
    user: User;
    offersCount: number;
    draftCount: number;
    sentCount: number;
    soldCount: number;
    rejectedCount: number;
    revenue: number;
    commission: number;
    reportsCount: number;
}

export function getStatsPerSalesRep(): SalesRepStats[] {
    const salesReps = getSalesReps();
    const allOffers = getAllOffers();
    const allReports = getReports();

    return salesReps.map(rep => {
        const repOffers = allOffers.filter(o => o.createdBy === rep.id);
        const soldOffers = repOffers.filter(o => o.status === 'sold');
        const repReports = allReports.filter(r => r.salesRepId === rep.id);

        return {
            user: rep,
            offersCount: repOffers.length,
            draftCount: repOffers.filter(o => o.status === 'draft').length,
            sentCount: repOffers.filter(o => o.status === 'sent').length,
            soldCount: soldOffers.length,
            rejectedCount: repOffers.filter(o => o.status === 'rejected').length,
            revenue: soldOffers.reduce((sum, o) => sum + (o.pricing.finalPriceNet || o.pricing.sellingPriceNet), 0),
            commission: soldOffers.reduce((sum, o) => sum + o.commission, 0),
            reportsCount: repReports.length
        };
    });
}

export function getUserById(userId: string): User | undefined {
    const users = initializeDefaultUsers();
    return users.find(u => u.id === userId);
}

// --- Installation Storage ---

const INSTALLATIONS_KEY = 'aluxe_installations';
const TEAMS_KEY = 'aluxe_teams';

export function getInstallations(): Installation[] {
    const data = localStorage.getItem(INSTALLATIONS_KEY);
    if (!data) return [];
    const installations = JSON.parse(data);
    // Restore Date objects
    return installations.map((i: any) => ({
        ...i,
        createdAt: new Date(i.createdAt)
    }));
}

export function saveInstallation(installation: Installation): void {
    const installations = getInstallations();
    installations.push(installation);
    localStorage.setItem(INSTALLATIONS_KEY, JSON.stringify(installations));
}

export function updateInstallation(updatedInstallation: Installation): void {
    const installations = getInstallations();
    const index = installations.findIndex(i => i.id === updatedInstallation.id);
    if (index !== -1) {
        installations[index] = updatedInstallation;
        localStorage.setItem(INSTALLATIONS_KEY, JSON.stringify(installations));
    }
}

export function getTeams(): InstallationTeam[] {
    const data = localStorage.getItem(TEAMS_KEY);
    if (data) return JSON.parse(data);

    // Default teams if none exist
    const defaultTeams: InstallationTeam[] = [
        {
            id: 'team1',
            name: 'Ekipa 2 (Piotr)',
            color: '#10b981',
            isActive: true,
            members: [
                { id: 'installer-1', firstName: 'Marek', lastName: '' },
                { id: 'installer-2', firstName: 'Tomek', lastName: '' }
            ]
        },
        {
            id: 'team2',
            name: 'Ekipa 1 (Janusz)',
            color: '#3b82f6',
            isActive: true,
            members: [
                { id: 'installer-3', firstName: 'Jacek', lastName: '' },
                { id: 'installer-4', firstName: 'Piotr', lastName: '' }
            ]
        },
        {
            id: 'team3',
            name: 'Ekipa 3 (Michał)',
            color: '#f59e0b',
            isActive: true,
            members: [
                { id: 'installer-5', firstName: 'Adam', lastName: '' },
                { id: 'installer-6', firstName: 'Krzysztof', lastName: '' }
            ]
        }
    ];
    localStorage.setItem(TEAMS_KEY, JSON.stringify(defaultTeams));
    return defaultTeams;
}

export const getInstallationByOfferId = (offerId: string): Installation | undefined => {
    const installations = getInstallations();
    return installations.find(i => i.offerId === offerId);
};

export function createInstallationFromOffer(offer: Offer): Installation {
    // Check if installation already exists
    const existing = getInstallations().find(i => i.offerId === offer.id);
    if (existing) return existing;

    const installation: Installation = {
        id: crypto.randomUUID(),
        offerId: offer.id,
        client: {
            firstName: offer.customer.firstName,
            lastName: offer.customer.lastName,
            city: offer.customer.city,
            address: `${offer.customer.street} ${offer.customer.houseNumber}`,
            phone: offer.customer.phone
        },
        productSummary: `${offer.product.modelId} ${offer.product.width}x${offer.product.projection}mm`,
        status: 'pending',
        createdAt: new Date()
    };

    saveInstallation(installation);
    return installation;
}

// --- Contracts Storage ---

const CONTRACTS_STORAGE_KEY = 'aluxe_contracts';

export function getContracts(): Contract[] {
    const data = localStorage.getItem(CONTRACTS_STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data, (key, value) => {
        if (key === 'createdAt' || key === 'signedAt' || key === 'completedAt') return new Date(value);
        if (key === 'comments' && Array.isArray(value)) {
            return value.map((c: any) => ({ ...c, createdAt: new Date(c.createdAt) }));
        }
        return value;
    });
}

export function getContractByOfferId(offerId: string): Contract | undefined {
    const contracts = getContracts();
    return contracts.find(c => c.offerId === offerId);
}

export function saveContract(contract: Contract): void {
    const contracts = getContracts();
    contracts.push(contract);
    localStorage.setItem(CONTRACTS_STORAGE_KEY, JSON.stringify(contracts));
}

export function updateContract(contract: Contract): void {
    const contracts = getContracts();
    const index = contracts.findIndex(c => c.id === contract.id);
    if (index !== -1) {
        contracts[index] = contract;
        localStorage.setItem(CONTRACTS_STORAGE_KEY, JSON.stringify(contracts));
    }
}

export function generateContractNumber(): string {
    const contracts = getContracts();
    const now = new Date();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();

    // Filter contracts for current month/year
    const currentMonthContracts = contracts.filter(c => {
        const parts = c.contractNumber.split('/');
        return parts[2] === month && parts[3] === year.toString();
    });

    // Find max number
    let maxNum = 0;
    currentMonthContracts.forEach(c => {
        const num = parseInt(c.contractNumber.split('/')[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
    });

    const nextNum = (maxNum + 1).toString().padStart(3, '0');
    return `PL/${nextNum}/${month}/${year}`;
}

export function createContractFromOffer(offer: Offer): Contract {
    const contract: Contract = {
        id: crypto.randomUUID(),
        contractNumber: generateContractNumber(),
        offerId: offer.id,
        status: 'draft',
        client: { ...offer.customer },
        product: { ...offer.product },
        pricing: { ...offer.pricing },
        commission: (offer.pricing.finalPriceNet || offer.pricing.sellingPriceNet) * 0.05,
        requirements: {
            constructionProject: false,
            powerSupply: false,
            foundation: false
        },
        orderedItems: extractOrderedItemsFromOffer(offer),
        comments: [],
        attachments: [],
        createdAt: new Date()
    };

    saveContract(contract);
    return contract;
}
