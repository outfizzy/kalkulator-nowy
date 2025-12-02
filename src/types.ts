export type SnowZone = '1' | '2' | '3' | 'I' | 'II' | 'III' | 'IV' | 'V';

export interface SnowZoneInfo {
    id: SnowZone;
    value: number;
    description: string;
}

// User Roles
export type UserRole = 'admin' | 'sales_rep' | 'manager' | 'partner' | 'installer';

export interface User {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    createdAt: Date;
    phone?: string;
    monthlyTarget?: number;
    status?: 'pending' | 'active' | 'blocked';
    // Partner specific fields
    companyName?: string;
    nip?: string;
    partnerMargin?: number; // e.g. 0.25 = 25%
    // Commission rate for sales reps (e.g. 0.05 = 5%)
    commissionRate?: number;
}

export interface Customer {
    salutation: 'Herr' | 'Frau' | 'Firma';
    firstName: string;
    lastName: string;
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    phone: string;
    email: string;
    country: string; // Default 'Deutschland'
}

export type InstallationType = 'wall-mounted' | 'freestanding';
export type RoofType = 'polycarbonate' | 'glass';
export type OfferStatus = 'draft' | 'sent' | 'sold' | 'rejected';

// --- New Catalog Types ---

export interface ProductModel {
    id: string;
    name: string;
    description: string;
    image?: string;
    roofTypes: RoofType[];
    maxSnowLoad: number;
    // Pricing: width -> projection -> price
    pricing: Record<string, Record<string, number>>;
}

export interface SlidingWallModel {
    id: string;
    name: string;
    description: string;
    image?: string;
    pricing: Array<{ width: number; height: number; price: number }>;
}

// --- Configuration Types ---

export interface SelectedAddon {
    id: string;
    type: 'lighting' | 'slidingWall' | 'fixedWall' | 'awning' | 'zipScreen' | 'heater' | 'panorama' | 'other';
    name: string;
    variant?: string; // e.g., "AL23" or "Spots"
    quantity?: number; // for heaters, spots
    length?: number; // for LED strips
    width?: number; // for screens, walls
    height?: number; // for screens, walls
    projection?: number; // for awnings
    depth?: number; // for awnings (alternative to projection)
    price: number;
    description?: string;
}

export interface ProductConfig {
    modelId: string; // e.g., "trendstyle"
    width: number;
    projection: number;
    postsHeight?: number;
    color: string;
    customColor: boolean; // true if custom RAL color selected
    customColorRAL?: string; // RAL number when custom color is selected
    roofType: RoofType;
    polycarbonateType?: 'standard' | 'ir-gold';
    glassType?: 'standard' | 'mat' | 'sunscreen';
    installationType: InstallationType;
    addons: SelectedAddon[];
    selectedAccessories?: {
        name: string;
        price: number;
        quantity: number;
    }[];
    activeTab?: 'dimensions' | 'accessories' | 'installation';
    installationDays?: number; // 0-3 days
}

export interface InstallationCostResult {
    days: number;
    dailyBreakdown: { day: number; cost: number }[];
    dailyTotal: number;
    travelDistance: number;
    travelCost: number;
    totalInstallation: number;
}

export interface PricingResult {
    basePrice: number;
    addonsPrice: number;
    totalCost: number;
    marginPercentage: number;
    marginValue: number;
    sellingPriceNet: number;
    sellingPriceGross: number;
    installationCosts?: InstallationCostResult;
    numberOfFields?: number;
    numberOfPosts?: number;
    finalPriceNet?: number; // For signed contracts override
}

export interface Offer {
    id: string;
    offerNumber: string;
    createdAt: Date;
    updatedAt: Date;
    status: OfferStatus;
    customer: Customer;
    snowZone: SnowZoneInfo;
    product: ProductConfig;
    pricing: PricingResult;
    commission: number;
    distance?: number;
    createdBy: string; // User ID of creator
}

export interface CommissionStats {
    totalOffers: number;
    draftOffers: number;
    sentOffers: number;
    soldOffers: number;
    rejectedOffers: number;
    totalRevenue: number;
    totalCommission: number;
    projectedRevenue: number;
    projectedCommission: number;
}

export interface SalesProfile {
    userId: string; // Reference to User
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    monthlyTarget: number; // e.g., 50000 EUR revenue
}

export interface Visit {
    id: string;
    offerId?: string; // Optional link to an offer
    customerName: string;
    address: string;
    productSummary: string;
    price: number;
    outcome: 'signed' | 'measured' | 'rejected' | 'pending';
    notes: string;
}

export interface MeasurementReport {
    id: string;
    date: string; // ISO Date string
    salesRepId: string; // User ID of sales rep who created the report

    // Car Details
    carPlate: string;
    odometerStart: number;
    odometerEnd: number;
    totalKm: number;
    withDriver: boolean;
    carIssues: string;

    // Report Description
    reportDescription?: string; // Optional report-level description

    // Visits
    visits: Visit[];

    // Summary
    signedContractsCount: number;
    offerIds: string[]; // Linked offers for this measurement day
    createdAt: Date;
}

export interface CommissionHistory {
    commissionRateOverride?: number; // Optional custom base rate
}

export interface CommissionHistoryItem {
    offerId: string;
    date: Date;
    customerName: string;
    revenue: number;
    commission: number;
    status: 'pending' | 'paid';
}

// --- Installation Module Types ---

export type InstallationStatus = 'pending' | 'scheduled' | 'completed' | 'issue';

export interface InstallationTeam {
    id: string;
    name: string;
    color: string; // Hex color for map markers
    members: {
        id: string;
        firstName: string;
        lastName: string;
    }[];
}

export interface Installation {
    id: string;
    offerId: string; // Link to the original offer
    client: {
        firstName: string;
        lastName: string;
        city: string;
        address: string;
        phone: string;
        coordinates?: {
            lat: number;
            lng: number;
        };
    };
    productSummary: string; // e.g., "Trendstyle 4000x3000"
    status: InstallationStatus;
    scheduledDate?: string; // ISO Date string
    teamId?: string; // Assigned team ID
    team?: InstallationTeam; // Assigned team details
    notes?: string;
    createdAt: Date;
    acceptance?: {
        acceptedAt: string;
        clientName: string;
        signature?: string;
        notes?: string;
    };
}

// --- Contracts Module Types ---

export type ContractStatus = 'draft' | 'signed' | 'completed' | 'cancelled';

export interface ContractComment {
    id: string;
    text: string;
    author: string; // User name or ID
    createdAt: Date;
}

export interface ContractAttachment {
    id: string;
    name: string;
    url: string; // In a real app this would be a URL, here maybe a data URI or placeholder
    type: 'image' | 'document';
    createdAt: Date;
}

export interface ContractRequirements {
    constructionProject: boolean; // Projekt budowlany
    powerSupply: boolean; // Doprowadzenie prądu
    foundation: boolean; // Fundamenty
    other?: string;
}

export interface Contract {
    id: string;
    contractNumber: string; // Format: PL/001/11/2025
    offerId: string;
    status: ContractStatus;

    // Snapshot of data at contract creation (editable)
    client: Customer;
    product: ProductConfig;
    pricing: PricingResult;

    // Financials
    commission: number; // 5% of net price

    requirements: ContractRequirements;
    comments: ContractComment[];
    attachments: ContractAttachment[];

    createdAt: Date;
    signedAt?: Date;
    completedAt?: Date;
}

// Centralized photo storage tied to offer
export interface OfferPhotos {
    offerId: string;
    photos: string[];
    updatedAt: Date;
}

export interface SalesRepStat {
    userId: string;
    userName: string;
    role: UserRole;
    totalOffers: number;
    soldOffers: number;
    totalValue: number;
    totalMarginValue: number;
    totalDistance: number;
    avgMarginPercent: number;
    conversionRate: number;
    lastActivityDate?: Date;
    pendingOffersCount?: number;
}

export interface Measurement {
    id: string;
    offerId?: string;
    scheduledDate: Date;
    salesRepId: string;
    salesRepName: string;
    customerName: string;
    customerAddress: string;
    customerPhone?: string;
    status: 'scheduled' | 'completed' | 'cancelled';
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
    // Route planning fields
    estimatedDuration?: number; // in minutes
    orderInRoute?: number; // order in the day's route
    locationLat?: number;
    locationLng?: number;
    distanceFromPrevious?: number; // in kilometers
}

// --- Virtual Wallet Types ---

export interface WalletTransaction {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    currency: 'EUR' | 'PLN';
    category: string;
    description?: string;
    date: string; // ISO Date string

    // Income specific
    customerId?: string; // ID of the offer/customer
    customerName?: string;
    contractNumber?: string;

    processedBy: string; // User ID
    createdAt: Date;
    // Exchange rate tracking
    exchangeRate?: number;
    originalCurrency?: 'EUR' | 'PLN';
    originalAmount?: number;
}

export interface CurrencyStats {
    currentBalance: number;
    totalIncome: number;
    totalExpense: number;
    monthlyIncome: number;
    monthlyExpense: number;
}

export interface WalletStats {
    pln: CurrencyStats;
    eur: CurrencyStats;
}

export interface DeletedWalletTransaction extends WalletTransaction {
    originalTransactionId: string;
    deletionReason: string;
    deletedBy: string;
    deletedAt: Date;
}

