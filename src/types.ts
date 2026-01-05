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

export interface AppSettings {
    key: string;
    value: unknown;
    updatedAt: Date;
    updatedBy?: string;
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
    commissionRate?: number; // 0-1 (0% - 100%)
    substituteUserId?: string | null;
    substituteUntil?: Date | null;
    preferredLanguage?: 'pl' | 'mo' | 'uk';
    emailConfig?: EmailConfig;
    hourlyRate?: number;
    hourlyRateCurrency?: 'PLN' | 'EUR';
    commissionConfig?: CommissionConfig;
}

export interface CommissionConfig {
    enableMarginBonus: boolean;
    enableVolumeBonus: boolean;
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

export type InstallationType = 'wall-mounted' | 'freestanding';
export type RoofType = 'polycarbonate' | 'glass' | 'tin';
export type OfferStatus = 'draft' | 'sent' | 'sold' | 'rejected';

// --- Leads Types ---
export type LeadStatus = 'new' | 'contacted' | 'offer_sent' | 'negotiation' | 'won' | 'lost';
export type LeadSource = 'email' | 'phone' | 'manual' | 'website' | 'other';

export interface Lead {
    id: string;
    customerData: {
        firstName: string;
        lastName: string;
        companyName?: string;
        phone?: string;
        email?: string;
        address?: string;
        postalCode?: string;
        city?: string;
    };
    customerId?: string;
    status: LeadStatus;
    source: LeadSource;
    assignedTo?: string; // User ID
    assignee?: {
        firstName: string;
        lastName: string;
    };
    createdAt: Date;
    updatedAt: Date;
    lastContactDate?: Date;
    clientWillContactAt?: Date;
    notes: string;
    emailMessageId?: string; // If created from email
    aiScore?: number;
    aiSummary?: string;
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
    polycarbonateType?: 'standard' | 'ir-gold' | 'iq-relax' | 'clear';
    glassType?: 'standard' | 'mat' | 'sunscreen' | 'heat-protection';
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

    // Post Positioning
    postOffsets?: number[]; // Manual offset (mm) for each post from its default equidistant position.

    ledCount?: number; // Spots per rafter
    addons: SelectedAddon[];
    selectedAccessories?: {
        name: string;
        price: number;
        quantity: number;
        attributes?: Record<string, unknown>; // For multilingual names
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
    // Pergola Specific
    lamellaAngle?: number; // 0-135 degrees
    numberOfPosts?: number; // Calculated number of posts
    numberOfFields?: number; // Calculated number of fields (sections)
    moduleCount?: number; // Number of modules (sections)
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
    customItemsPrice?: number;
    totalCost: number;
    marginPercentage: number;
    marginValue: number;
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
    sourceType?: 'contract' | 'service' | 'manual';
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
    category: 'Roofing' | 'Awning' | 'ZIP Screen' | 'Sliding Glass' | 'Accessories' | 'Flooring' | 'Other';
    name: string;
    details?: string;
    status: 'pending' | 'ordered' | 'delivered';
    plannedDeliveryDate?: string; // ISO date string
    orderedAt?: string; // ISO date string
    purchaseCost?: number; // Cost in EUR, visible only to admin
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

export interface FuelLog {
    id: string;
    userId: string;
    vehiclePlate?: string;
    odometerReading: number;
    odometerPhotoUrl?: string;
    receiptPhotoUrl?: string;
    liters: number;
    cost: number;
    currency: 'PLN' | 'EUR';
    logDate: string; // ISO Date
    type: FuelLogType;
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
    createdAt: Date;
    updatedAt: Date;
    // Joined data
    client?: Customer;
    contract?: Contract;
    installation?: Installation;
    assignedTeam?: InstallationTeam;
}
