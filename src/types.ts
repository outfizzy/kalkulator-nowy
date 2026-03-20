export type SnowZone = '1' | '2' | '3' | 'I' | 'II' | 'III' | 'IV' | 'V';

export interface SnowZoneInfo {
    id: SnowZone;
    value: number;
    description: string;
}

export interface EmailConfig {
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPassword?: string; // In real app should be encrypted/handled securely
    imapHost?: string;
    imapPort?: number; // 993 usually
    imapUser?: string;
    imapPassword?: string;
    signature?: string; // HTML or text signature
    openaiKey?: string; // For AI features
}

export interface MailboxConfig extends EmailConfig {
    name: string;        // Display name, e.g. "Firmowa", "Prywatna"
    color?: string;      // Badge color, e.g. "#6366f1"
}

export interface AppSettings {
    key: string;
    value: unknown;
    updatedAt: Date;
    updatedBy?: string;
}

// User Roles
export type UserRole = 'admin' | 'sales_rep' | 'manager' | 'partner' | 'installer' | 'b2b_partner' | 'b2b_manager';

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
    commissionRate?: number; // 0-1 (0% - 100%)
    substituteUserId?: string | null;
    substituteUntil?: Date | null;
    preferredLanguage?: 'pl' | 'mo' | 'uk';
    emailConfig?: EmailConfig;
    mailboxes?: MailboxConfig[];
    hourlyRate?: number;
    hourlyRateCurrency?: 'PLN' | 'EUR';
    baseSalary?: number;
    baseSalaryCurrency?: 'PLN' | 'EUR';
    commissionConfig?: CommissionConfig;
    // Client-facing contact fields (shown on offers/interactive pages)
    clientPhone?: string;
    clientEmail?: string;
}

export interface CommissionConfig {
    enableMarginBonus: boolean;
    enableVolumeBonus: boolean;
}

export interface DimensionOptions {
    showHeights: boolean;
    showDepths: boolean;
    showRafters: boolean;
    showWindows: boolean;
    showWedges: boolean;
    showAngles: boolean;
    showPostDimensions: boolean;
}


export interface Customer {
    id?: string; // Optional for backward compatibility with offers that embed customer data without ID
    salutation: 'Herr' | 'Frau' | 'Firma';
    companyName?: string; // Added for PDF generation
    firstName: string;
    lastName: string;
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    phone: string;
    email: string;
    nip?: string; // VAT ID
    country: string; // Default 'Deutschland'
    lat?: number;
    lng?: number;
    representative_id?: string;
    contract_signer_id?: string;
    // Joined data
    representative?: {
        firstName: string;
        lastName: string;
    };
    contractSigner?: {
        firstName: string;
        lastName: string;
    };
    contract_number?: string; // Optional contract number for pre-filling
}

export interface CustomerCost {
    id: string;
    customer_id: string;
    type: 'measurement' | 'commission' | 'material' | 'installation' | 'delivery' | 'other';
    amount: number;
    currency: 'PLN' | 'EUR';
    description?: string;
    date: string; // ISO Date
    source_ref?: string;
    created_at: Date;
    created_by?: string;
}

export interface Communication {
    id: string;
    userId: string;
    customerId?: string;
    leadId?: string;
    type: 'email' | 'call' | 'sms' | 'note';
    direction: 'inbound' | 'outbound';
    subject?: string;
    content?: string;
    date: string; // ISO Date
    externalId?: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    // Joined User data
    user?: {
        firstName: string;
        lastName: string;
    };
}

export type InstallationType = 'wall-mounted' | 'freestanding' | 'corner-left' | 'corner-right';
export type RoofType = 'polycarbonate' | 'glass' | 'tin';
export type OfferStatus = 'draft' | 'sent' | 'sold' | 'rejected' | 'accepted';

// --- Leads Types ---
export type LeadStatus = 'new' | 'contacted' | 'measurement_scheduled' | 'measurement_completed' | 'offer_sent' | 'negotiation' | 'won' | 'lost' | 'fair' | 'formularz';
export type LeadSource = 'email' | 'phone' | 'manual' | 'website' | 'targi' | 'other';

export interface Lead {
    id: string;
    status: LeadStatus;
    source: LeadSource;
    customerData?: {
        firstName: string;
        lastName: string;
        phone: string;
        email?: string;
        city?: string;
        postalCode?: string;
        address?: string; // Street + House Number
        companyName?: string;
    };
    customerId?: string; // Link to Customers
    assignedTo?: string; // User ID
    assignee?: {
        firstName: string;
        lastName: string;
    };
    emailMessageId?: string; // If from email
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
    lastContactDate?: Date;
    clientWillContactAt?: Date; // When they said they'd get back
    // [Pattern 130] Fair Module - Full Integration
    fairId?: string; // Reference to fairs table
    fairPrize?: {
        id: string;
        label: string;
        type: string;
        value: number;
    };
    fairPhotos?: Array<{
        url: string;
        name: string;
    }>;
    fairProducts?: FairProductConfig[];
    fairMessage?: string; // Optional contextual message (e.g. "Targi: BAU 2026")
    aiScore?: number;
    aiSummary?: string;
    lostReason?: string;
    lostBy?: string;        // User ID who marked the lead as lost
    lostByName?: string;    // Display name (joined from profiles)
    lostAt?: Date;          // When the lead was marked as lost
    wonReason?: string;
    wonValue?: number;       // Contract value in EUR
    wonAt?: Date;
    attachments?: { name: string; url: string; type: string; size: number }[];
}

// --- Fair Module Types ---
export interface FairProductConfig {
    id: string;
    type: 'roof' | 'pergola' | 'carport' | 'zip_screen' | 'sliding_glass' | 'accessory' | 'other';
    model: string; // "trendstyle", "aluxe_fixed", etc.
    label: string; // Display name
    width: string; // String to allow 'Auto' or raw input
    projection: string; // String to allow 'Auto' or raw input

    // V7 Logic - Side Counts
    wallSidesCount?: number; // 0, 1, 2, 3
    zipSidesCount?: number; // 0, 1, 2, 3

    // Config Details
    colors?: string; // e.g. "RAL 7016"
    notes?: string;

    // Standalone logic
    quantity?: number; // For standalone accessories
}

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
    type: 'lighting' | 'slidingWall' | 'fixedWall' | 'awning' | 'zipScreen' | 'heater' | 'panorama' | 'wpc-floor' | 'gres-floor' | 'other';
    name: string;
    variant?: string; // e.g., "AL23" or "Spots"
    quantity?: number; // for heaters, spots
    length?: number; // for LED strips
    width?: number; // for screens, walls
    height?: number; // for screens, walls
    projection?: number; // for awnings
    depth?: number; // for awnings (alternative to projection)
    location?: 'front' | 'left' | 'right'; // For sliding walls/screens
    price: number;
    description?: string;
    // WPC Flooring specific
    flooringColor?: string;
    flooringType?: string;
    installationOption?: 'with-foundation' | 'without-foundation';
    attributes?: Record<string, unknown>; // For multilingual names (name_pl, name_de)
    pricing_basis?: 'FIXED' | 'MATRIX';
    properties?: Record<string, any>; // For matrix calculation metadata
}

export interface ProductConfig {
    modelId: string; // e.g., "trendstyle"
    width: number;
    projection: number;
    postsHeight?: number;
    snowZone?: SnowZone; // Added for exact price matching
    color: string;
    customColor: boolean; // true if custom RAL color selected
    customColorRAL?: string; // RAL number when custom color is selected
    roofType: RoofType;
    imageUrl?: string;
    polycarbonateType?: 'standard' | 'ir-gold' | 'iq-relax' | 'clear' | 'poly_clear' | 'poly_opal' | 'poly_iq_relax' | 'custom';
    glassType?: 'standard' | 'mat' | 'sunscreen' | 'heat-protection' | 'glass_clear' | 'glass_opal' | 'glass_tinted' | 'custom';
    installationType: InstallationType;
    installationDays?: number;
    sideWedges?: boolean;
    postOverlayLeft?: number; // Inset in mm
    postOverlayRight?: number; // Inset in mm
    customPostCount?: number; // Manual override

    customRafterCount?: number; // Manual override
    roofOpen?: number; // 0-1 for Retractable Pergola (Deluxe)

    // Structural Heights (Advanced)
    rearHeight?: number; // Wall mounting height (mm). If missing, calculated from angle.
    frontHeight?: number; // Passage height / Post height (mm). Can replace postsHeight.

    // Flooring
    floorType?: 'wpc' | 'gres'; // wpc = 14cm planks, gres = 60x60 tiles

    // Corner-Mount Configuration (Zadaszenie Narożne)
    cornerConfig?: {
        secondaryWidth: number;      // mm — width of the second wing
        secondaryProjection: number; // mm — depth of the second wing
    };

    // Combined Construction Split Point
    splitPoint?: number; // Position (mm) where the split post goes. E.g., 5000 means segment1=5000mm, segment2=width-5000mm

    // Post Positioning
    postOffsets?: number[]; // Manual offset (mm) for each post from its default equidistant position.

    ledCount?: number; // Spots per rafter
    addons: SelectedAddon[];
    selectedAccessories?: {
        name: string;
        price: number;
        quantity: number;
        attributes?: Record<string, unknown>; // For multilingual names
        pricing_basis?: string;
    }[];
    customItems?: {
        id: string;
        name: string;
        price: number;
        quantity: number;
        description?: string;
        attributes?: Record<string, unknown>; // For multilingual names
    }[];


    // Visualizer 3.0 Context
    contextConfig?: {
        hasWall: boolean;
        wallHeight: number; // mm, default 3000
        wallColor: string; // Hex
        wallMaterial: 'plaster' | 'brick' | 'wood';
        floorMaterial: 'concrete' | 'grass' | 'tiles' | 'wood';
        doorPosition: number; // mm offset from center (0 = center)
        windowPosition?: number; // mm offset
        showDecor: boolean;
    };

    // Dynamic Profile Specs (Linked to Pricing)
    productSpecs?: {
        postSize: number;      // meters, e.g. 0.11
        beamHeight: number;    // meters, e.g. 0.15
        rafterHeight?: number; // meters, e.g. 0.10
        gutterProfile?: 'trend' | 'orange' | 'flat';
    };
    // Pergola Specific
    lamellaAngle?: number; // 0-135 degrees
    numberOfPosts?: number; // Calculated number of posts
    numberOfFields?: number; // Calculated number of fields (sections)
    moduleCount?: number; // Number of modules (sections)

    // Manual Offer Mode
    isManual?: boolean;
    manualDescription?: string;
    manualPrice?: number;

    // Calculator V2 Surcharges
    selectedSurcharges?: string[];

    // Discount System
    discount?: number; // Value (e.g. 5 for 5% or 500 for 500 EUR)
    discountMode?: 'percentage' | 'fixed'; // Mode
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
    surchargesBreakdown?: { name: string; price: number }[];
    addonsPrice: number;
    customItemsPrice?: number;
    totalCost: number;
    marginPercentage: number;
    marginValue: number;
    discountPercentage?: number;
    discountValue?: number;
    sellingPriceNet: number;
    sellingPriceGross: number;
    installationCosts?: InstallationCostResult;
    numberOfFields?: number;
    numberOfPosts?: number;
    // New fields for CRM Financials
    paymentMethod?: 'cash' | 'transfer';
    advancePayment?: number;
    advancePaymentDate?: Date;
    finalPriceNet?: number; // For signed contracts override
    // Cost Tracking
    orderCosts?: number; // Manual input for additional costs
    measurementCost?: number; // Calculated/Cached measurement cost

    // Context from Pricing Engine
    structuralNote?: string; // e.g. "inkl. XL-Sparren"
    matchedWidth?: number;
    matchedProjection?: number;
    constructionType?: string;

    // Debug Info (transient)
    _debuginfo?: unknown;
    transportConfig?: TransportSettings; // Snapshot of settings used
}

export interface TransportSettings {
    ratePerKm: number;
    baseLocation: {
        name: string;
        postalCode: string;
        lat: number;
        lng: number;
    };
}

export interface Offer {
    id: string;
    offerNumber: string;
    createdAt: Date;
    updatedAt: Date;
    status: OfferStatus;
    customer: Customer;
    snowZone: SnowZoneInfo; // Using full info object for display
    product: ProductConfig;
    pricing: PricingResult;
    commission: number;
    distance?: number;
    createdBy: string; // User ID of creator
    leadId?: string; // Link to Lead source
    clientWillContactAt?: Date;
    settings?: {
        aiDescription?: string;
        [key: string]: unknown;
    };
    viewCount?: number;
    lastViewedAt?: Date;
    notes?: string;
    publicToken?: string;
    publicTokenCreatedAt?: Date;
    // Joined creator data
    creator?: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
    };
}

export interface LeadMessage {
    id: string;
    leadId: string;
    offerId?: string;
    senderType: 'client' | 'user';
    content: string;
    isRead: boolean;
    createdAt: Date;
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

export type FailureReportStatus = 'pending' | 'in_progress' | 'resolved';

export interface FailureReport {
    id: string;
    userId: string;
    equipmentName: string;
    description: string;
    photoUrl?: string;
    status: FailureReportStatus;
    createdAt: Date;
    updatedAt: Date;
    userName?: string;
    user?: {
        firstName: string;
        lastName: string;
    };
}

export interface Visit {
    id: string;
    offerId?: string; // Optional link to an offer
    leadId?: string; // Link to Lead for sync
    customerName: string;
    address: string;
    customerPhone?: string;
    productSummary: string;
    price: number;
    outcome: 'signed' | 'measured' | 'rejected' | 'pending' | 'postponed';
    // Sales potential rating (1-5) when outcome is not 'signed'
    // 1 = Very unlikely, 5 = Very likely to sign
    salesPotential?: 1 | 2 | 3 | 4 | 5;
    salesPotentialNote?: string; // Reason for the rating
    visitNotes?: string; // Notes specific to this visit
    notes: string; // Legacy field, kept for backward compat
}

export interface MeasurementReport {
    id: string;
    date: string; // ISO Date string
    salesRepId: string; // User ID of sales rep who created the report
    salesRepName?: string; // Joined from profiles

    // Car & Trip Details
    carPlate: string;
    odometerStart?: number; // Legacy — no longer used in UI
    odometerEnd?: number;   // Legacy — no longer used in UI
    totalKm: number;
    is_active: boolean;
    currency: string;
    variant_config?: {
        roofType: 'glass' | 'polycarbonate' | 'other';
        snowZone?: string;
        subtype?: string;
    };
    // Report Description
    reportDescription?: string; // Optional report-level description
    withDriver?: boolean;
    carIssues?: string;

    // Visits
    visits: Visit[];

    // Summary
    signedContractsCount: number;
    offerIds: string[]; // Linked offers for this measurement day
    createdAt: Date;

    // Trip Cost Tracking (Admin/Manager editable)
    tripCost?: number;        // Koszt wyjazdu w PLN
    costPerKm?: number;       // Stawka za km (PLN)
    tripCostUpdatedBy?: string;
    tripCostUpdatedAt?: Date;
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

export type InstallationStatus = 'pending' | 'scheduled' | 'confirmed' | 'completed' | 'issue' | 'cancelled' | 'verification';

export interface InstallationTeam {
    id: string;
    name: string;
    members: {
        id: string;
        firstName: string;
        lastName: string;
        role?: string;
        hourlyRate?: number;
        type?: 'user' | 'virtual';
    }[];
    vehicle?: string;
    color: string;
    isActive: boolean;
    workingDays?: number[]; // 1=Monday, 7=Sunday
    tags?: string[];
    notes?: string;
    fuelConsumption?: number; // L/100km
    vehicleMaintenanceRate?: number; // Cost per km
}

export interface TeamUnavailability {
    id: string;
    teamId: string;
    startDate: string; // ISO Date YYYY-MM-DD
    endDate: string; // ISO Date YYYY-MM-DD
    reason?: string;
    createdAt: Date;
}

export interface Installation {
    id: string;
    offerId?: string; // Link to the original offer (optional for custom installations)
    contractNumber?: string; // e.g. "UM/2025/12/001"
    customerId?: string; // Link to Customers table
    sourceType?: 'contract' | 'service' | 'manual' | 'followup';
    followUpItems?: string[]; // Names of pending order items for follow-up visits
    sourceId?: string; // ID of the source contract/ticket
    title?: string; // For manual tasks
    customerFeedback?: {
        rejectedDates?: string[];
        requestedDates?: string[];
        notes?: string;
    };
    client: {
        firstName: string;
        lastName: string;
        city: string;
        address: string;
        postalCode?: string;
        phone: string;
        email?: string;
        coordinates?: {
            lat: number;
            lng: number;
        };
    };
    productSummary: string; // e.g., "Trendstyle 4000x3000"
    status: InstallationStatus;
    partsStatus?: 'pending' | 'partial' | 'all_delivered' | 'none';
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
        photos?: string[];
    };
    photoUrls?: string[]; // Array of photo URLs from installation
    partsReady?: boolean; // Whether parts are ready for installation
    deliveryDate?: string; // Estimated or confirmed delivery date (ISO String)
    expectedDuration?: number; // Duration in days (default 1)
    // Profitability
    hotelCost?: number;
    consumablesCost?: number;
    additionalCosts?: number;
    // Measurement tasks assigned by manager for installers
    measurementTasks?: Array<{
        id: string;
        description: string;
        completed: boolean;
        completedAt?: string;
        completedBy?: string;
    }>;
    // Completion Report (filled by manager after installation)
    completionReport?: {
        completedAt: string;
        completedBy: string;
        notes: string;
        followUpItems: Array<{ name: string; description: string }>;
    };
}

export interface InstallationWorkLog {
    id: string;
    installationId: string;
    startTime: string; // ISO Date
    endTime?: string; // ISO Date
    userIds: string[];
    createdAt: Date;
    updatedAt: Date;
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

export interface OrderedItem {
    id: string;
    category: 'Roofing' | 'Awning' | 'ZIP Screen' | 'Sliding Glass' | 'Side Wall' | 'Accessories' | 'Profiles' | 'Flooring' | 'Other';
    name: string;
    details?: string;
    quantity?: number; // default 1
    technicalSpec?: string; // e.g. "3500x2100mm, RAL 7016"
    supplier?: string; // e.g. "Aluxe", "Deponti", "Selt"
    notes?: string; // internal notes
    orderReference?: string; // supplier order number
    status: 'pending' | 'ordered' | 'in_production' | 'shipped' | 'delivered';
    plannedDeliveryDate?: string; // ISO date string
    confirmedDeliveryDate?: string; // ISO date string — confirmed by supplier
    deliveryWeek?: string; // e.g. "2026-W15"
    orderedAt?: string; // ISO date string
    purchaseCost?: number; // Cost in EUR, visible only to admin
    // Grouped ordering
    orderGroupId?: string; // Links items ordered together
    orderGroupTotal?: number; // Total price for the group
    // Order documents (PDF, images)
    orderDocuments?: { name: string; url: string; uploadedAt: string }[];
}

export interface InstallationSettings {
    baseRatePerDay: number;
    minInstallationCost: number;
    additionalDayRate?: number; // Optional override
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
    orderedItems: OrderedItem[]; // New field for ordered items tracking
    comments: ContractComment[];
    attachments: ContractAttachment[];

    createdAt: Date;
    signedAt?: Date;
    signedBy?: string; // User ID
    signedByUser?: {
        firstName: string;
        lastName: string;
    };
    salesRepId?: string;
    salesRep?: {
        firstName: string;
        lastName: string;
    };
    clientWillContactAt?: Date;
    completedAt?: Date;
    installation_days_estimate?: number; // Estimated number of days for installation, set by Sales Rep
    installationNotes?: string; // Team-specific notes for installation crew
    plannedInstallationWeeks?: number; // How many weeks until planned installation

    // Dachrechner data (saved from interactive calculator in contract)
    dachrechnerData?: {
        modelId: string;
        inputs: {
            h3?: number;
            depth: number;
            h1?: number;
            overhang?: number;
            width?: number;
            postCount?: number;
        };
        results: Record<string, number | null>;
        savedAt: string; // ISO date
        savedBy?: string; // User name
    };

    // Payment tracking
    advanceAmount?: number; // How much advance is required
    advancePaid?: boolean; // Has the client paid the advance?
    advancePaidAt?: string; // ISO date string — when was it paid
    advancePaidBy?: string; // User ID who confirmed payment
    advancePaidByUser?: { firstName: string; lastName: string };
    advanceNotes?: string; // Notes about the advance payment
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
    leadId?: string; // Link to Lead
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
    // Outcome tracking
    outcome?: 'signed' | 'considering' | 'rejected' | 'no_show';
    outcomeNotes?: string;
    completedAt?: Date;
    reminderSent?: boolean;
    routeId?: string; // Link to measurement_routes
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
    processedByName?: string; // Full name from profiles join
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

// --- Project Measurements (Dachrechner) ---

export interface SiteDetails {
    // 1. Ground & Foundation
    groundType?: 'concrete' | 'paving_stones' | 'grass' | 'terrace' | 'other';
    groundTypeOther?: string;
    hasFoundation?: 'yes' | 'no' | 'to_do';
    slopeLeftRight?: number; // mm
    slopeFrontBack?: number; // mm

    // 2. Wall
    wallType?: 'concrete' | 'brick' | 'porotherm' | 'ytong' | 'wood' | 'other';
    wallTypeOther?: string;
    insulationThickness?: number; // mm
    insulationType?: 'styrofoam' | 'wool' | 'none';
    wallObstacles?: string; // Text description

    // 3. Logistics
    accessType?: 'free' | 'house' | 'narrow' | 'stairs' | 'elevator';
    installationFloor?: 'ground' | 'balcony' | 'roof';
    hasPower?: boolean;
    cablesLengthIfNeeded?: number; // meters
}

export interface ProjectMeasurement {
    id: string;
    name: string;
    customerId?: string;
    contractId?: string;
    status: 'draft' | 'final';

    // Calculator State
    modelId: string;
    inputs: Record<string, number>;
    results?: Record<string, number | null>; // Partial results
    dimensionOptions?: Record<string, boolean>;

    // Site Survey
    siteDetails?: SiteDetails;
    images?: { url: string; caption?: string }[];
    notes?: string;

    createdBy: string;
    createdAt: Date;
    updatedAt: Date;

    // Joined data
    creator?: {
        firstName: string;
        lastName: string;
    };
}


// --- Order Requests Types ---

export type OrderRequestStatus = 'pending' | 'ordered' | 'rejected' | 'completed';

export interface OrderRequest {
    id: string;
    userId: string;
    itemName: string;
    quantity: number;
    description?: string;
    inventoryItemId?: string; // Link to inventory
    status: OrderRequestStatus;
    createdAt: Date;
    updatedAt: Date;
    // Joined user data
    user?: {
        firstName: string;
        lastName: string;
    };
}

// --- Fuel Logs Types ---

export type FuelLogType = 'sales_rep' | 'installer';
export type FuelingType = 'internal' | 'external';

export interface FuelLog {
    id: string;
    userId: string;
    vehiclePlate?: string;
    odometerReading?: number;
    odometerPhotoUrl?: string;
    receiptPhotoUrl?: string;
    liters: number;
    cost?: number;
    netCost?: number;
    currency: 'PLN' | 'EUR';
    logDate: string; // ISO Date
    type: FuelLogType;
    fuelingType: FuelingType;
    stationName?: string;
    createdAt: Date;
    userName?: string; // Joined user data
    // Joined user data
    user?: {
        firstName: string;
        lastName: string;
    };
}

// --- Procurement / Logistics Types ---

export interface ProcurementItem {
    id: string; // Unified view ID (e.g. "contract_xyz")
    sourceType: 'contract' | 'installation' | 'inventory';
    sourceId: string;
    itemId: string;

    referenceNumber: string;
    clientName: string;
    clientCity?: string;

    itemName: string;
    category: string;
    status: string; // Union of all status types
    plannedDeliveryDate?: string | null;
    delivery_week?: string; // New field for estimated week (e.g. 2026-W01)
    confirmed_delivery_date?: string | null; // New field for exact date
    purchaseCost: number;
    createdAt: string;
    ownerId?: string;
    advancePaid?: boolean; // Whether client paid the advance
    salesRepName?: string; // Sales rep full name
    signedAt?: string; // Contract signing date
    details?: string; // Technical details (H1/H3, slopes, wall type)
    technicalSpec?: string; // Short spec (model, dimensions, color)
}

// --- Tasks Module Types ---

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskType = 'task' | 'call' | 'email' | 'meeting' | 'other';

export interface Task {
    id: string;
    userId: string;
    leadId?: string;
    customerId?: string;
    title: string;
    description?: string;
    dueDate?: string; // ISO Date
    status: TaskStatus;
    priority: TaskPriority;
    type: TaskType;
    createdAt: Date;
    updatedAt: Date;
    // Joined data
    assignee?: {
        firstName: string;
        lastName: string;
    };
}

// --- Notifications Types ---

export type NotificationType = 'info' | 'success' | 'warning' | 'error';


export interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    read: boolean;
    createdAt: Date;
    link?: string;
}

// --- Service Module Types ---





export interface NoteAttachment {
    name: string;
    path: string;
    type: string;
    size: number;
}

export interface Note {
    id: string;
    entityId: string;
    entityType: 'lead' | 'customer';
    content: string;
    userId: string;
    createdAt: Date;
    attachments?: NoteAttachment[];
    user?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        avatarUrl?: string;
    };
}

// --- Order Management Types ---

export type OrderItemStatus = 'pending' | 'ordered' | 'delivered';

export interface OrderItem {
    id: string;
    installationId: string;
    name: string;
    type: 'flooring' | 'addon' | 'custom' | 'accessory';
    quantity: number;
    status: OrderItemStatus;
    plannedDeliveryDate?: string; // ISO Date
    orderedAt?: Date;
    notes?: string;
    isManagerResponsible: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// --- Service & Complaints Types ---

export type ServiceTicketStatus = 'new' | 'open' | 'scheduled' | 'in_progress' | 'resolved' | 'closed' | 'rejected';
export type ServiceTicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type ServiceTicketType = 'leak' | 'electrical' | 'visual' | 'mechanical' | 'other';

export interface ServiceTicketTask {
    id: string;
    label: string;
    completed: boolean;
}

export interface ServiceTicketHistory {
    id: string;
    ticketId: string;
    changedBy?: string;
    changeType: 'status' | 'note' | 'assignment' | 'task' | 'info';
    oldValue?: string;
    newValue?: string;
    createdAt: Date;
    // Joined user
    user?: {
        firstName: string;
        lastName: string;
    };
}

export interface ServiceTicket {
    id: string;
    ticketNumber: string;
    clientId: string;
    contractId?: string;
    contractNumber?: string; // Manual contract number for legacy orders
    installationId?: string;
    status: ServiceTicketStatus;
    priority: ServiceTicketPriority;
    type: ServiceTicketType;
    description: string;
    resolutionNotes?: string;
    scheduledDate?: string;
    assignedTeamId?: string;
    tasks?: ServiceTicketTask[]; // New field
    photos: string[];
    clientNotes?: string; // Notes submitted by client via public form
    customerName?: string; // Customer name for display
    createdAt: Date;
    updatedAt: Date;
    // Joined data
    client?: Customer;
    contract?: Contract;
    installation?: Installation;
    assignedTeam?: InstallationTeam;
}

// --- Pricing Types ---

export interface PriceTable {
    id: string;
    product_definition_id?: string; // Link to Product Definitions
    name: string;
    valid_from?: string; // ISO Date
    valid_to?: string; // ISO Date
    currency: string;
    is_active: boolean;
    type: 'matrix' | 'linear' | 'fixed';

    // Legacy/Flexible Configuration
    attributes?: Record<string, unknown>;
    configuration?: Record<string, unknown>;

    // New Explicit Aluxe Schema (2026-01-19)
    model_family?: string; // "Trendstyle", "Ultrastyle", etc.
    zone?: number; // 1, 2, 3
    cover_type?: string; // 'polycarbonate', 'glass'
    construction_type?: string; // 'wall', 'freestanding'

    created_at: string;
}
