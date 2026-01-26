/**
 * B2B Partner Portal Service
 * Handles all B2B operations: partners, offers, orders, invoices
 */

import { supabase } from '../../lib/supabase';

// =====================================================
// Types
// =====================================================

export interface B2BPartner {
    id: string;
    company_name: string;
    contact_email: string | null;
    contact_phone: string | null;
    tax_id: string | null;
    address: {
        street?: string;
        city?: string;
        zip?: string;
        country?: string;
    };
    account_manager_id: string | null;
    margin_percent: number;
    payment_terms_days: number;
    credit_limit: number;
    credit_used: number;
    prepayment_required: boolean;
    prepayment_percent: number;
    status: 'active' | 'suspended' | 'inactive';
    created_at: string;
    updated_at: string;
    // Joined fields
    account_manager?: {
        id: string;
        full_name: string;
        email: string;
    };
}

export interface B2BPartnerUser {
    id: string;
    partner_id: string;
    user_id: string;
    role: 'admin' | 'sales' | 'viewer';
    can_place_orders: boolean;
    can_view_invoices: boolean;
    can_manage_users: boolean;
    created_at: string;
    // Joined fields
    user?: {
        id: string;
        full_name: string;
        email: string;
    };
}

export interface B2BOffer {
    id: string;
    partner_id: string;
    created_by: string | null;
    reference_number: string | null;
    customer_name: string | null;
    customer_contact: {
        email?: string;
        phone?: string;
        address?: string;
    };
    items: B2BOfferItem[];
    notes: string | null;
    base_total: number;
    partner_total: number;
    currency: string;
    status: 'draft' | 'saved' | 'accepted' | 'expired' | 'cancelled';
    valid_until: string | null;
    created_at: string;
    updated_at: string;
}

export interface B2BOfferItem {
    product_name: string;
    variant?: string;
    dimensions?: { width: number; projection: number };
    quantity: number;
    base_price: number;
    partner_price: number;
    options?: Record<string, any>;
}

export interface B2BOrder {
    id: string;
    offer_id: string | null;
    partner_id: string;
    order_number: string;
    status: B2BOrderStatus;
    approved_by: string | null;
    approved_at: string | null;
    rejection_reason: string | null;
    total_amount: number;
    prepayment_amount: number;
    prepayment_status: 'not_required' | 'pending' | 'paid';
    currency: string;
    estimated_delivery: string | null;
    tracking_number: string | null;
    shipping_address: Record<string, any> | null;
    partner_notes: string | null;
    internal_notes: string | null;
    created_at: string;
    updated_at: string;
    // Joined fields
    offer?: B2BOffer;
    partner?: B2BPartner;
    timeline?: B2BOrderTimelineEntry[];
}

export type B2BOrderStatus =
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'awaiting_payment'
    | 'in_production'
    | 'shipped'
    | 'delivered'
    | 'cancelled';

export interface B2BInvoice {
    id: string;
    order_id: string;
    partner_id: string;
    invoice_number: string | null;
    type: 'prepayment' | 'final' | 'correction';
    amount: number;
    currency: string;
    due_date: string | null;
    paid_at: string | null;
    payment_reference: string | null;
    pdf_url: string | null;
    created_at: string;
}

export interface B2BOrderTimelineEntry {
    id: string;
    order_id: string;
    status: string;
    changed_by: string | null;
    notes: string | null;
    created_at: string;
}

export interface B2BDashboardStats {
    activeOffers: number;
    pendingOrders: number;
    inProductionOrders: number;
    unpaidInvoicesAmount: number;
    unpaidInvoicesCount: number;
    nearestDelivery: string | null;
    monthlyRevenue: number;
}

// Promotions (Akcje promocyjne)
export interface B2BPromotion {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
    discount_type: 'percent' | 'fixed' | 'bundle' | 'free_shipping';
    discount_value: number;
    min_order_value: number;
    product_categories: string[];
    applies_to_products: string[];
    promo_code: string | null;
    start_date: string;
    end_date: string | null;
    is_featured: boolean;
    status: 'draft' | 'active' | 'expired' | 'cancelled';
    terms_conditions: string | null;
    max_uses: number | null;
    current_uses: number;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

// Credit Applications (Wnioski o kredyt kupiecki)
export interface B2BCreditApplication {
    id: string;
    partner_id: string;
    requested_by: string | null;

    // Requested
    requested_amount: number;
    requested_payment_days: number;

    // Company info
    company_name: string;
    tax_id: string;
    registration_number: string | null;
    company_address: {
        street?: string;
        city?: string;
        zip?: string;
        country?: string;
    };

    // Financial info
    annual_revenue: number | null;
    years_in_business: number | null;
    number_of_employees: number | null;
    industry: string | null;

    // Bank info
    bank_name: string | null;
    bank_account_iban: string | null;

    // Contact
    credit_contact_name: string | null;
    credit_contact_email: string | null;
    credit_contact_phone: string | null;

    // References
    trade_references: {
        company: string;
        contact: string;
        phone: string;
        email: string;
    }[];

    // Documents
    documents: {
        name: string;
        url: string;
        type: 'financial_statement' | 'tax_return' | 'other';
    }[];

    // Status
    status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'cancelled';

    // Decision
    approved_amount: number | null;
    approved_payment_days: number | null;
    decision_notes: string | null;
    decision_by: string | null;
    decision_at: string | null;

    // Validity
    valid_from: string | null;
    valid_until: string | null;

    created_at: string;
    updated_at: string;

    // Joined
    partner?: B2BPartner;
    decision_made_by?: { full_name: string; email: string };
}

// Partner Activity (Analityka)
export type B2BActivityType =
    | 'login' | 'logout'
    | 'view_page' | 'create_offer' | 'edit_offer' | 'delete_offer' | 'accept_offer'
    | 'view_order' | 'download_material' | 'view_promotion'
    | 'submit_credit_application' | 'view_training' | 'complete_training'
    | 'search' | 'other';

export interface B2BPartnerActivity {
    id: string;
    partner_id: string;
    user_id: string | null;
    activity_type: B2BActivityType;
    page_path: string | null;
    resource_id: string | null;
    resource_type: string | null;
    details: Record<string, any>;
    session_id: string | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
    // Joined
    user?: { full_name: string; email: string };
}

export interface B2BPartnerStats {
    id: string;
    partner_id: string;
    stats_date: string;
    login_count: number;
    unique_users_count: number;
    total_session_minutes: number;
    offers_created: number;
    offers_value_total: number;
    orders_placed: number;
    orders_value_total: number;
    materials_downloaded: number;
    trainings_viewed: number;
    promotions_used: number;
    top_products: { product_name: string; count: number; value: number }[];
    top_categories: { category: string; count: number }[];
    most_visited_pages: { page: string; views: number }[];
}

// =====================================================
// Service
// =====================================================

export const B2BService = {
    // =========================================
    // Partner Management (Admin)
    // =========================================

    async getPartners(): Promise<B2BPartner[]> {
        const { data, error } = await supabase
            .from('b2b_partners')
            .select(`
                *,
                account_manager:profiles!account_manager_id(id, full_name, email)
            `)
            .order('company_name');

        if (error) throw error;
        return data || [];
    },

    async getPartnerById(id: string): Promise<B2BPartner | null> {
        const { data, error } = await supabase
            .from('b2b_partners')
            .select(`
                *,
                account_manager:profiles!account_manager_id(id, full_name, email)
            `)
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data;
    },

    async createPartner(partner: Omit<B2BPartner, 'id' | 'created_at' | 'updated_at' | 'credit_used'>): Promise<B2BPartner> {
        const { data, error } = await supabase
            .from('b2b_partners')
            .insert(partner)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updatePartner(id: string, updates: Partial<B2BPartner>): Promise<B2BPartner> {
        const { data, error } = await supabase
            .from('b2b_partners')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deletePartner(id: string): Promise<void> {
        const { error } = await supabase
            .from('b2b_partners')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Partner Users
    async getPartnerUsers(partnerId: string): Promise<B2BPartnerUser[]> {
        const { data, error } = await supabase
            .from('b2b_partner_users')
            .select(`
                *,
                user:profiles!user_id(id, full_name, email)
            `)
            .eq('partner_id', partnerId);

        if (error) throw error;
        return data || [];
    },

    async addPartnerUser(partnerUser: Omit<B2BPartnerUser, 'id' | 'created_at'>): Promise<B2BPartnerUser> {
        const { data, error } = await supabase
            .from('b2b_partner_users')
            .insert(partnerUser)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async removePartnerUser(id: string): Promise<void> {
        const { error } = await supabase
            .from('b2b_partner_users')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // =========================================
    // Partner Portal
    // =========================================

    async getCurrentPartner(): Promise<B2BPartner | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        // First try: lookup via b2b_partner_users table
        const { data: partnerUser } = await supabase
            .from('b2b_partner_users')
            .select('partner_id')
            .eq('user_id', user.id)
            .single();

        if (partnerUser) {
            return this.getPartnerById(partnerUser.partner_id);
        }

        // Fallback: lookup partner by user email in primary_contact
        if (user.email) {
            const { data: partners } = await supabase
                .from('b2b_partners')
                .select('*')
                .eq('primary_contact->>email', user.email)
                .limit(1);

            if (partners && partners.length > 0) {
                const partner = partners[0] as B2BPartner;

                // Auto-create link in b2b_partner_users for future lookups
                try {
                    await supabase
                        .from('b2b_partner_users')
                        .insert({
                            partner_id: partner.id,
                            user_id: user.id,
                            role: 'admin' // Primary contact gets admin role
                        });
                    console.log('[B2B] Auto-linked user to partner:', partner.company_name);
                } catch (linkError) {
                    // Ignore if link already exists or RLS blocks it
                    console.warn('[B2B] Could not auto-link user to partner:', linkError);
                }

                return partner;
            }
        }

        return null;
    },

    /**
     * Get current partner or auto-create one for the logged-in user
     * Creates a new B2B partner record if the user doesn't have one
     */
    async getOrCreateCurrentPartner(): Promise<B2BPartner | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !user.email) return null;

        // First try to get existing partner
        let partner = await this.getCurrentPartner();
        if (partner) return partner;

        // No partner found - create one automatically
        console.log('[B2B] Creating new partner for user:', user.email);

        // Get user profile for name
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

        const companyName = profile?.full_name || user.email.split('@')[0] || 'Partner B2B';

        try {
            // Create new partner
            const { data: newPartner, error: partnerError } = await supabase
                .from('b2b_partners')
                .insert({
                    company_name: companyName,
                    contact_email: user.email,
                    primary_contact: {
                        email: user.email,
                        name: profile?.full_name || ''
                    },
                    address: {},
                    margin_percent: 0,
                    payment_terms_days: 14,
                    credit_limit: 0,
                    credit_used: 0,
                    prepayment_required: true,
                    prepayment_percent: 100,
                    status: 'active'
                })
                .select()
                .single();

            if (partnerError) {
                console.error('[B2B] Error creating partner:', partnerError);
                return null;
            }

            // Link user to partner
            await supabase
                .from('b2b_partner_users')
                .insert({
                    partner_id: newPartner.id,
                    user_id: user.id,
                    role: 'admin'
                });

            console.log('[B2B] Partner created and linked:', newPartner.company_name);
            return newPartner as B2BPartner;
        } catch (error) {
            console.error('[B2B] Failed to create partner:', error);
            return null;
        }
    },

    async getPartnerPricing(partnerId: string): Promise<{ marginPercent: number }> {
        const partner = await this.getPartnerById(partnerId);
        return {
            marginPercent: partner?.margin_percent || 0
        };
    },

    // =========================================
    // Offers
    // =========================================

    async getOffers(partnerId: string): Promise<B2BOffer[]> {
        const { data, error } = await supabase
            .from('b2b_offers')
            .select('*')
            .eq('partner_id', partnerId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    /**
     * Get ALL offers (Admin/Manager view)
     * No partner filter - returns all B2B offers for analysis
     */
    async getAllOffers(): Promise<B2BOffer[]> {
        const { data, error } = await supabase
            .from('b2b_offers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async getOfferById(id: string): Promise<B2BOffer | null> {
        const { data, error } = await supabase
            .from('b2b_offers')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data;
    },

    async createOffer(offer: Omit<B2BOffer, 'id' | 'created_at' | 'updated_at'>): Promise<B2BOffer> {
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('b2b_offers')
            .insert({
                ...offer,
                created_by: user?.id
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateOffer(id: string, updates: Partial<B2BOffer>): Promise<B2BOffer> {
        const { data, error } = await supabase
            .from('b2b_offers')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteOffer(id: string): Promise<void> {
        const { error } = await supabase
            .from('b2b_offers')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async acceptOffer(offerId: string): Promise<B2BOrder> {
        // Get the offer
        const offer = await this.getOfferById(offerId);
        if (!offer) throw new Error('Offer not found');
        if (offer.status !== 'saved') throw new Error('Offer must be saved before accepting');

        // Get partner to check prepayment settings and credit
        const partner = await this.getPartnerById(offer.partner_id);
        if (!partner) throw new Error('Partner not found');

        // Update offer status
        await supabase
            .from('b2b_offers')
            .update({ status: 'accepted' })
            .eq('id', offerId);

        // Check if partner has trade credit (kredyt kupiecki)
        const orderAmount = offer.partner_total;
        const hasTradeCredit = partner.credit_limit && partner.credit_limit > 0;
        const availableCredit = hasTradeCredit
            ? (partner.credit_limit - (partner.credit_used || 0))
            : 0;
        const canUseCredit = hasTradeCredit && availableCredit >= orderAmount;

        // Determine prepayment requirements
        let prepaymentAmount = 0;
        let prepaymentStatus: 'pending' | 'not_required' | 'paid' = 'not_required';
        let orderStatus: 'pending' | 'approved' = 'pending';

        if (canUseCredit) {
            // Partner has sufficient credit - no prepayment needed
            prepaymentStatus = 'not_required';
            orderStatus = 'pending'; // Still needs admin approval

            // Update partner's used credit
            await supabase
                .from('b2b_partners')
                .update({ credit_used: (partner.credit_used || 0) + orderAmount })
                .eq('id', partner.id);
        } else if (partner.prepayment_required) {
            // Partner requires prepayment
            prepaymentAmount = orderAmount * (partner.prepayment_percent / 100);
            prepaymentStatus = 'pending';
        }

        // Create order
        const { data: order, error } = await supabase
            .from('b2b_orders')
            .insert({
                offer_id: offerId,
                partner_id: offer.partner_id,
                status: orderStatus,
                total_amount: orderAmount,
                prepayment_amount: prepaymentAmount,
                prepayment_status: prepaymentStatus,
                currency: offer.currency,
                shipping_address: offer.customer_contact,
                payment_method: canUseCredit ? 'trade_credit' : 'prepayment'
            })
            .select()
            .single();

        if (error) throw error;
        return order;
    },

    // =========================================
    // Orders
    // =========================================

    async getOrders(partnerId?: string): Promise<B2BOrder[]> {
        let query = supabase
            .from('b2b_orders')
            .select(`
                *,
                offer:b2b_offers(*),
                partner:b2b_partners(id, company_name)
            `)
            .order('created_at', { ascending: false });

        if (partnerId) {
            query = query.eq('partner_id', partnerId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async getPendingOrders(): Promise<B2BOrder[]> {
        const { data, error } = await supabase
            .from('b2b_orders')
            .select(`
                *,
                offer:b2b_offers(*),
                partner:b2b_partners(id, company_name, account_manager_id)
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    async getOrderById(id: string): Promise<B2BOrder | null> {
        const { data, error } = await supabase
            .from('b2b_orders')
            .select(`
                *,
                offer:b2b_offers(*),
                partner:b2b_partners(*),
                timeline:b2b_order_timeline(*)
            `)
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data;
    },

    async approveOrder(orderId: string): Promise<B2BOrder> {
        const { data: { user } } = await supabase.auth.getUser();

        const order = await this.getOrderById(orderId);
        if (!order) throw new Error('Order not found');
        if (order.status !== 'pending') throw new Error('Order is not pending approval');

        const nextStatus = order.prepayment_status === 'pending' ? 'awaiting_payment' : 'in_production';

        const { data, error } = await supabase
            .from('b2b_orders')
            .update({
                status: nextStatus,
                approved_by: user?.id,
                approved_at: new Date().toISOString()
            })
            .eq('id', orderId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async rejectOrder(orderId: string, reason: string): Promise<B2BOrder> {
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('b2b_orders')
            .update({
                status: 'rejected',
                approved_by: user?.id,
                approved_at: new Date().toISOString(),
                rejection_reason: reason
            })
            .eq('id', orderId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateOrderStatus(orderId: string, status: B2BOrderStatus, notes?: string): Promise<B2BOrder> {
        const { data, error } = await supabase
            .from('b2b_orders')
            .update({ status })
            .eq('id', orderId)
            .select()
            .single();

        if (error) throw error;

        // Add timeline note if provided
        if (notes) {
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('b2b_order_timeline').insert({
                order_id: orderId,
                status,
                changed_by: user?.id,
                notes
            });
        }

        return data;
    },

    async setTrackingNumber(orderId: string, trackingNumber: string): Promise<B2BOrder> {
        const { data, error } = await supabase
            .from('b2b_orders')
            .update({
                tracking_number: trackingNumber,
                status: 'shipped'
            })
            .eq('id', orderId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // =========================================
    // Invoices
    // =========================================

    async getInvoices(partnerId?: string): Promise<B2BInvoice[]> {
        let query = supabase
            .from('b2b_invoices')
            .select('*')
            .order('created_at', { ascending: false });

        if (partnerId) {
            query = query.eq('partner_id', partnerId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async createInvoice(invoice: Omit<B2BInvoice, 'id' | 'created_at'>): Promise<B2BInvoice> {
        const { data, error } = await supabase
            .from('b2b_invoices')
            .insert(invoice)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async markInvoicePaid(invoiceId: string, paymentReference?: string): Promise<B2BInvoice> {
        const { data: invoice, error: fetchError } = await supabase
            .from('b2b_invoices')
            .select('*')
            .eq('id', invoiceId)
            .single();

        if (fetchError) throw fetchError;

        // Update invoice
        const { data, error } = await supabase
            .from('b2b_invoices')
            .update({
                paid_at: new Date().toISOString(),
                payment_reference: paymentReference
            })
            .eq('id', invoiceId)
            .select()
            .single();

        if (error) throw error;

        // If prepayment invoice, update order status
        if (invoice.type === 'prepayment') {
            await supabase
                .from('b2b_orders')
                .update({
                    prepayment_status: 'paid',
                    status: 'in_production'
                })
                .eq('id', invoice.order_id);
        }

        return data;
    },

    // =========================================
    // Dashboard Stats
    // =========================================

    async getDashboardStats(partnerId: string): Promise<B2BDashboardStats> {
        // Get active offers count
        const { count: activeOffers } = await supabase
            .from('b2b_offers')
            .select('*', { count: 'exact', head: true })
            .eq('partner_id', partnerId)
            .in('status', ['draft', 'saved']);

        // Get pending orders
        const { count: pendingOrders } = await supabase
            .from('b2b_orders')
            .select('*', { count: 'exact', head: true })
            .eq('partner_id', partnerId)
            .eq('status', 'pending');

        // Get in-production orders
        const { count: inProductionOrders } = await supabase
            .from('b2b_orders')
            .select('*', { count: 'exact', head: true })
            .eq('partner_id', partnerId)
            .eq('status', 'in_production');

        // Get unpaid invoices
        const { data: unpaidInvoices } = await supabase
            .from('b2b_invoices')
            .select('amount')
            .eq('partner_id', partnerId)
            .is('paid_at', null);

        const unpaidAmount = unpaidInvoices?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

        // Get nearest delivery
        const { data: nearestOrder } = await supabase
            .from('b2b_orders')
            .select('estimated_delivery')
            .eq('partner_id', partnerId)
            .in('status', ['in_production', 'shipped'])
            .not('estimated_delivery', 'is', null)
            .order('estimated_delivery', { ascending: true })
            .limit(1)
            .single();

        // Get monthly revenue
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: monthlyOrders } = await supabase
            .from('b2b_orders')
            .select('total_amount')
            .eq('partner_id', partnerId)
            .gte('created_at', startOfMonth.toISOString())
            .not('status', 'in', '("rejected","cancelled")');

        const monthlyRevenue = monthlyOrders?.reduce((sum, ord) => sum + Number(ord.total_amount), 0) || 0;

        return {
            activeOffers: activeOffers || 0,
            pendingOrders: pendingOrders || 0,
            inProductionOrders: inProductionOrders || 0,
            unpaidInvoicesAmount: unpaidAmount,
            unpaidInvoicesCount: unpaidInvoices?.length || 0,
            nearestDelivery: nearestOrder?.estimated_delivery || null,
            monthlyRevenue
        };
    },

    // =========================================
    // Utilities
    // =========================================

    async generateReferenceNumber(partnerId: string): Promise<string> {
        const partner = await this.getPartnerById(partnerId);
        const prefix = partner?.company_name?.substring(0, 3).toUpperCase() || 'REF';
        const year = new Date().getFullYear();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `${prefix}-${year}-${random}`;
    },

    /**
     * Calculate prices with partner margin
     */
    applyPartnerMargin(basePrice: number, marginPercent: number): number {
        return basePrice * (1 + marginPercent / 100);
    },

    // =========================================
    // Promotions (Akcje promocyjne)
    // =========================================

    async getActivePromotions(): Promise<B2BPromotion[]> {
        const { data, error } = await supabase
            .from('b2b_promotions')
            .select('*')
            .eq('status', 'active')
            .or(`end_date.is.null,end_date.gt.${new Date().toISOString()}`)
            .order('is_featured', { ascending: false })
            .order('start_date', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async getFeaturedPromotions(): Promise<B2BPromotion[]> {
        const { data, error } = await supabase
            .from('b2b_promotions')
            .select('*')
            .eq('status', 'active')
            .eq('is_featured', true)
            .or(`end_date.is.null,end_date.gt.${new Date().toISOString()}`)
            .limit(5);

        if (error) throw error;
        return data || [];
    },

    async getAllPromotions(): Promise<B2BPromotion[]> {
        const { data, error } = await supabase
            .from('b2b_promotions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async getPromotionById(id: string): Promise<B2BPromotion | null> {
        const { data, error } = await supabase
            .from('b2b_promotions')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data;
    },

    async createPromotion(promo: Omit<B2BPromotion, 'id' | 'created_at' | 'updated_at' | 'current_uses'>): Promise<B2BPromotion> {
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('b2b_promotions')
            .insert({
                ...promo,
                created_by: user?.id
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updatePromotion(id: string, updates: Partial<B2BPromotion>): Promise<B2BPromotion> {
        const { data, error } = await supabase
            .from('b2b_promotions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deletePromotion(id: string): Promise<void> {
        const { error } = await supabase
            .from('b2b_promotions')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // =========================================
    // Credit Applications (Wnioski o kredyt)
    // =========================================

    async getCreditApplications(partnerId?: string): Promise<B2BCreditApplication[]> {
        let query = supabase
            .from('b2b_credit_applications')
            .select(`
                *,
                partner:b2b_partners(id, company_name),
                decision_made_by:profiles!decision_by(full_name, email)
            `)
            .order('created_at', { ascending: false });

        if (partnerId) {
            query = query.eq('partner_id', partnerId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async getPendingCreditApplications(): Promise<B2BCreditApplication[]> {
        const { data, error } = await supabase
            .from('b2b_credit_applications')
            .select(`
                *,
                partner:b2b_partners(id, company_name, contact_email, contact_phone)
            `)
            .in('status', ['submitted', 'under_review'])
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    async getCreditApplicationById(id: string): Promise<B2BCreditApplication | null> {
        const { data, error } = await supabase
            .from('b2b_credit_applications')
            .select(`
                *,
                partner:b2b_partners(*),
                decision_made_by:profiles!decision_by(full_name, email)
            `)
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data;
    },

    async createCreditApplication(
        application: Omit<B2BCreditApplication, 'id' | 'created_at' | 'updated_at' | 'approved_amount' | 'approved_payment_days' | 'decision_notes' | 'decision_by' | 'decision_at' | 'valid_from' | 'valid_until'>
    ): Promise<B2BCreditApplication> {
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('b2b_credit_applications')
            .insert({
                ...application,
                requested_by: user?.id
            })
            .select()
            .single();

        if (error) throw error;

        // Track activity
        if (application.partner_id) {
            await this.trackActivity(application.partner_id, 'submit_credit_application', {
                resource_id: data.id,
                resource_type: 'credit_application',
                details: { requested_amount: application.requested_amount }
            });
        }

        return data;
    },

    async updateCreditApplication(id: string, updates: Partial<B2BCreditApplication>): Promise<B2BCreditApplication> {
        const { data, error } = await supabase
            .from('b2b_credit_applications')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async approveCreditApplication(
        id: string,
        approvedAmount: number,
        approvedDays: number,
        notes?: string,
        validMonths: number = 12
    ): Promise<B2BCreditApplication> {
        const { data: { user } } = await supabase.auth.getUser();

        const validFrom = new Date();
        const validUntil = new Date();
        validUntil.setMonth(validUntil.getMonth() + validMonths);

        const { data, error } = await supabase
            .from('b2b_credit_applications')
            .update({
                status: 'approved',
                approved_amount: approvedAmount,
                approved_payment_days: approvedDays,
                decision_notes: notes,
                decision_by: user?.id,
                decision_at: new Date().toISOString(),
                valid_from: validFrom.toISOString(),
                valid_until: validUntil.toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Update partner credit limit
        if (data.partner_id) {
            await supabase
                .from('b2b_partners')
                .update({
                    credit_limit: approvedAmount,
                    payment_terms_days: approvedDays
                })
                .eq('id', data.partner_id);
        }

        return data;
    },

    async rejectCreditApplication(id: string, reason: string): Promise<B2BCreditApplication> {
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('b2b_credit_applications')
            .update({
                status: 'rejected',
                decision_notes: reason,
                decision_by: user?.id,
                decision_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // =========================================
    // Activity Tracking (Analityka)
    // =========================================

    async trackActivity(
        partnerId: string,
        activityType: B2BActivityType,
        options?: {
            page_path?: string;
            resource_id?: string;
            resource_type?: string;
            details?: Record<string, any>;
            session_id?: string;
        }
    ): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();

        await supabase.from('b2b_partner_activity').insert({
            partner_id: partnerId,
            user_id: user?.id,
            activity_type: activityType,
            page_path: options?.page_path,
            resource_id: options?.resource_id,
            resource_type: options?.resource_type,
            details: options?.details || {},
            session_id: options?.session_id
        });
    },

    async trackLogin(partnerId: string, sessionId?: string): Promise<void> {
        await this.trackActivity(partnerId, 'login', { session_id: sessionId });
    },

    async trackPageView(partnerId: string, pagePath: string): Promise<void> {
        await this.trackActivity(partnerId, 'view_page', { page_path: pagePath });
    },

    async getPartnerActivity(
        partnerId: string,
        options?: {
            limit?: number;
            activityTypes?: B2BActivityType[];
            startDate?: Date;
            endDate?: Date;
        }
    ): Promise<B2BPartnerActivity[]> {
        let query = supabase
            .from('b2b_partner_activity')
            .select(`
                *,
                user:profiles!user_id(full_name, email)
            `)
            .eq('partner_id', partnerId)
            .order('created_at', { ascending: false });

        if (options?.limit) {
            query = query.limit(options.limit);
        }

        if (options?.activityTypes?.length) {
            query = query.in('activity_type', options.activityTypes);
        }

        if (options?.startDate) {
            query = query.gte('created_at', options.startDate.toISOString());
        }

        if (options?.endDate) {
            query = query.lte('created_at', options.endDate.toISOString());
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async getPartnerLoginHistory(partnerId: string, limit: number = 50): Promise<B2BPartnerActivity[]> {
        return this.getPartnerActivity(partnerId, {
            limit,
            activityTypes: ['login']
        });
    },

    async getPartnerAnalytics(partnerId: string, days: number = 30): Promise<{
        totalLogins: number;
        uniqueLoginDays: number;
        lastLogin: string | null;
        offersCreated: number;
        ordersPlaced: number;
        topProducts: { product_name: string; count: number }[];
        topPages: { page: string; views: number }[];
        activityByDay: { date: string; logins: number; offers: number; orders: number }[];
    }> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data: activities } = await supabase
            .from('b2b_partner_activity')
            .select('*')
            .eq('partner_id', partnerId)
            .gte('created_at', startDate.toISOString());

        const allActivities = activities || [];

        // Calculate stats
        const logins = allActivities.filter(a => a.activity_type === 'login');
        const uniqueLoginDays = new Set(logins.map(l => l.created_at.split('T')[0])).size;
        const lastLogin = logins.length > 0 ? logins[0].created_at : null;

        const offersCreated = allActivities.filter(a => a.activity_type === 'create_offer').length;
        const ordersPlaced = allActivities.filter(a => a.activity_type === 'accept_offer').length;

        // Top products from offer details
        const productCounts: Record<string, number> = {};
        allActivities
            .filter(a => a.activity_type === 'create_offer' && a.details?.products)
            .forEach(a => {
                (a.details.products as string[])?.forEach(p => {
                    productCounts[p] = (productCounts[p] || 0) + 1;
                });
            });
        const topProducts = Object.entries(productCounts)
            .map(([product_name, count]) => ({ product_name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Top pages
        const pageCounts: Record<string, number> = {};
        allActivities
            .filter(a => a.activity_type === 'view_page' && a.page_path)
            .forEach(a => {
                pageCounts[a.page_path!] = (pageCounts[a.page_path!] || 0) + 1;
            });
        const topPages = Object.entries(pageCounts)
            .map(([page, views]) => ({ page, views }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 10);

        // Activity by day
        const dailyCounts: Record<string, { logins: number; offers: number; orders: number }> = {};
        allActivities.forEach(a => {
            const date = a.created_at.split('T')[0];
            if (!dailyCounts[date]) {
                dailyCounts[date] = { logins: 0, offers: 0, orders: 0 };
            }
            if (a.activity_type === 'login') dailyCounts[date].logins++;
            if (a.activity_type === 'create_offer') dailyCounts[date].offers++;
            if (a.activity_type === 'accept_offer') dailyCounts[date].orders++;
        });
        const activityByDay = Object.entries(dailyCounts)
            .map(([date, counts]) => ({ date, ...counts }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return {
            totalLogins: logins.length,
            uniqueLoginDays,
            lastLogin,
            offersCreated,
            ordersPlaced,
            topProducts,
            topPages,
            activityByDay
        };
    },

    // All partners analytics for admin
    async getAllPartnersAnalytics(days: number = 30): Promise<{
        partner_id: string;
        company_name: string;
        total_logins: number;
        last_login: string | null;
        offers_created: number;
        orders_placed: number;
        total_revenue: number;
    }[]> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Get all partners with their activity
        const { data: partners } = await supabase
            .from('b2b_partners')
            .select('id, company_name');

        const { data: activities } = await supabase
            .from('b2b_partner_activity')
            .select('partner_id, activity_type, created_at')
            .gte('created_at', startDate.toISOString());

        const { data: orders } = await supabase
            .from('b2b_orders')
            .select('partner_id, total_amount, created_at')
            .gte('created_at', startDate.toISOString())
            .not('status', 'in', '("rejected","cancelled")');

        const allPartners = partners || [];
        const allActivities = activities || [];
        const allOrders = orders || [];

        return allPartners.map(partner => {
            const partnerActivities = allActivities.filter(a => a.partner_id === partner.id);
            const partnerOrders = allOrders.filter(o => o.partner_id === partner.id);

            const logins = partnerActivities.filter(a => a.activity_type === 'login');
            const lastLogin = logins.length > 0
                ? logins.sort((a, b) => b.created_at.localeCompare(a.created_at))[0].created_at
                : null;

            return {
                partner_id: partner.id,
                company_name: partner.company_name,
                total_logins: logins.length,
                last_login: lastLogin,
                offers_created: partnerActivities.filter(a => a.activity_type === 'create_offer').length,
                orders_placed: partnerActivities.filter(a => a.activity_type === 'accept_offer').length,
                total_revenue: partnerOrders.reduce((sum, o) => sum + Number(o.total_amount), 0)
            };
        }).sort((a, b) => b.total_revenue - a.total_revenue);
    }
};

export default B2BService;
