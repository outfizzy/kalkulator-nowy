import { supabase } from '../../lib/supabase';
import type { WalletTransaction, WalletStats } from '../../types';

export const FinanceService = {
    // --- Order Costs Calculation ---
    async calculateOrderCosts(offerId: string, manualOrderCosts?: number): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // 1. Get all reports that include this offer
        const { data: reports, error: reportsError } = await supabase
            .from('reports') // Or 'measurement_reports'? Code said 'reports'.
            .select('*');

        if (reportsError) throw reportsError;

        // Filter reports that contain the offerId
        const linkedReports = reports.filter((r: any) => {
            const ids = r.data?.offerIds || []; // Code said r.data.offerIds
            return Array.isArray(ids) && ids.includes(offerId);
        });

        // 2. Calculate Measurement Cost (Mileage)
        const MILEAGE_RATE = 0.50; // EUR per km
        let totalMeasurementCost = 0;

        linkedReports.forEach((r: any) => {
            const totalKm = r.data?.totalKm || 0;
            const visitsCount = (r.data?.visits || []).length || 1;

            // Split transport cost equally among all visits in that report
            const costPerVisit = (totalKm * MILEAGE_RATE) / visitsCount;
            totalMeasurementCost += costPerVisit;
        });

        // 3. Update Offer Pricing
        const { data: offerData, error: fetchError } = await supabase
            .from('offers')
            .select('pricing')
            .eq('id', offerId)
            .single();

        if (fetchError) throw fetchError;

        const currentPricing = offerData.pricing || {};
        const newPricing = {
            ...currentPricing,
            measurementCost: totalMeasurementCost,
            orderCosts: manualOrderCosts !== undefined ? manualOrderCosts : currentPricing.orderCosts
        };

        const { error: updateError } = await supabase
            .from('offers')
            .update({ pricing: newPricing })
            .eq('id', offerId);

        if (updateError) throw updateError;
    },

    // --- Virtual Wallet ---

    async getWalletTransactions(filters?: { type?: 'income' | 'expense'; startDate?: Date; endDate?: Date }): Promise<WalletTransaction[]> {
        let query = supabase
            .from('wallet_transactions')
            .select('*')
            .order('date', { ascending: false });

        if (filters?.type) {
            query = query.eq('type', filters.type);
        }

        if (filters?.startDate) {
            query = query.gte('date', filters.startDate.toISOString());
        }

        if (filters?.endDate) {
            query = query.lte('date', filters.endDate.toISOString());
        }

        const { data, error } = await query;

        if (error) throw error;

        // Batch fetch profile names for all processed_by IDs
        const profileIds = [...new Set(data.map(r => r.processed_by).filter(Boolean))];
        let profileMap: Record<string, string> = {};
        if (profileIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', profileIds);
            if (profiles) {
                profileMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name]));
            }
        }

        return data.map(row => ({
            id: row.id,
            type: row.type,
            amount: Number(row.amount),
            currency: row.currency || 'EUR',
            category: row.category,
            description: row.description,
            date: row.date,
            customerId: row.customer_id,
            customerName: row.customer_name,
            contractNumber: row.contract_number,
            processedBy: row.processed_by,
            processedByName: profileMap[row.processed_by] || undefined,
            createdAt: new Date(row.created_at)
        }));
    },

    async createWalletTransaction(transaction: Omit<WalletTransaction, 'id' | 'createdAt' | 'processedBy'>): Promise<WalletTransaction> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('wallet_transactions')
            .insert({
                type: transaction.type,
                amount: transaction.amount,
                currency: transaction.currency,
                category: transaction.category,
                description: transaction.description,
                date: transaction.date,
                customer_id: transaction.customerId,
                customer_name: transaction.customerName,
                contract_number: transaction.contractNumber,
                processed_by: user.id
            })
            .select()
            .single();

        if (error) throw error;

        // Get the current user's profile name
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

        return {
            id: data.id,
            type: data.type,
            amount: Number(data.amount),
            currency: data.currency || 'EUR',
            category: data.category,
            description: data.description,
            date: data.date,
            customerId: data.customer_id,
            customerName: data.customer_name,
            contractNumber: data.contract_number,
            processedBy: data.processed_by,
            processedByName: profile?.full_name || undefined,
            createdAt: new Date(data.created_at)
        };
    },

    async getWalletStats(): Promise<WalletStats> {
        const { data: transactions, error } = await supabase
            .from('wallet_transactions')
            .select('*');

        if (error) throw error;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const initialStats = {
            currentBalance: 0,
            totalIncome: 0,
            totalExpense: 0,
            monthlyIncome: 0,
            monthlyExpense: 0
        };

        const stats = {
            pln: { ...initialStats },
            eur: { ...initialStats }
        };

        transactions?.forEach(tx => {
            const amount = Number(tx.amount);
            const date = new Date(tx.date);
            const isCurrentMonth = date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            const currency = tx.currency as 'PLN' | 'EUR' || 'EUR'; // Default to EUR if missing

            const targetStats = currency === 'PLN' ? stats.pln : stats.eur;

            if (tx.type === 'income') {
                targetStats.totalIncome += amount;
                if (isCurrentMonth) {
                    targetStats.monthlyIncome += amount;
                }
            } else {
                targetStats.totalExpense += amount;
                if (isCurrentMonth) {
                    targetStats.monthlyExpense += amount;
                }
            }
        });

        stats.pln.currentBalance = stats.pln.totalIncome - stats.pln.totalExpense;
        stats.eur.currentBalance = stats.eur.totalIncome - stats.eur.totalExpense;

        return stats;
    },

    async exchangeWalletTransaction(transactionId: string, exchangeRate: number): Promise<WalletTransaction> {
        // First get the current transaction
        const { data: currentTx, error: fetchError } = await supabase
            .from('wallet_transactions')
            .select('*')
            .eq('id', transactionId)
            .single();

        if (fetchError) throw fetchError;
        if (!currentTx) throw new Error('Transaction not found');
        if (currentTx.currency !== 'EUR') throw new Error('Can only exchange EUR transactions');

        const originalAmount = Number(currentTx.amount);
        const convertedAmount = originalAmount * exchangeRate;

        // Update the transaction with new currency and exchange info
        const { data, error } = await supabase
            .from('wallet_transactions')
            .update({
                currency: 'PLN',
                amount: convertedAmount,
                exchange_rate: exchangeRate,
                original_currency: 'EUR',
                original_amount: originalAmount
            })
            .eq('id', transactionId)
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            type: data.type,
            amount: Number(data.amount),
            currency: data.currency,
            category: data.category,
            description: data.description,
            date: data.date,
            customerId: data.customer_id,
            customerName: data.customer_name,
            contractNumber: data.contract_number,
            processedBy: data.processed_by,
            createdAt: new Date(data.created_at),
            exchangeRate: data.exchange_rate,
            originalCurrency: data.original_currency,
            originalAmount: data.original_amount ? Number(data.original_amount) : undefined
        };
    },

    async deleteWalletTransaction(transactionId: string, reason: string): Promise<void> {
        // First, get the transaction to delete
        const { data: transaction, error: fetchError } = await supabase
            .from('wallet_transactions')
            .select('*')
            .eq('id', transactionId)
            .single();

        if (fetchError) throw fetchError;
        if (!transaction) throw new Error('Transaction not found');

        // Get current user ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Insert into deleted_wallet_transactions
        const { error: insertError } = await supabase
            .from('deleted_wallet_transactions')
            .insert({
                original_transaction_id: transaction.id,
                type: transaction.type,
                amount: transaction.amount,
                currency: transaction.currency,
                category: transaction.category,
                description: transaction.description,
                date: transaction.date,
                customer_id: transaction.customer_id,
                customer_name: transaction.customer_name,
                contract_number: transaction.contract_number,
                exchange_rate: transaction.exchange_rate,
                original_currency: transaction.original_currency,
                original_amount: transaction.original_amount,
                deletion_reason: reason,
                deleted_by: user.id,
                processed_by: transaction.processed_by,
                created_at: transaction.created_at
            });

        if (insertError) throw insertError;

        // Delete from wallet_transactions
        const { error: deleteError } = await supabase
            .from('wallet_transactions')
            .delete()
            .eq('id', transactionId);

        if (deleteError) throw deleteError;
    },

    async getDeletedWalletTransactions(): Promise<any[]> {
        const { data, error } = await supabase
            .from('deleted_wallet_transactions')
            .select(`
                *,
                deleted_by_profile: profiles!deleted_by(full_name),
                    processed_by_profile: profiles!processed_by(full_name)
                `)
            .order('deleted_at', { ascending: false });

        if (error) throw error;

        return data?.map(tx => ({
            id: tx.id,
            originalTransactionId: tx.original_transaction_id,
            type: tx.type,
            amount: Number(tx.amount),
            currency: tx.currency,
            category: tx.category,
            description: tx.description,
            date: tx.date,
            customerId: tx.customer_id,
            customerName: tx.customer_name,
            contractNumber: tx.contract_number,
            exchangeRate: tx.exchange_rate,
            originalCurrency: tx.original_currency,
            originalAmount: tx.original_amount ? Number(tx.original_amount) : undefined,
            processedBy: tx.processed_by,
            createdAt: new Date(tx.created_at),
            deletionReason: tx.deletion_reason,
            deletedBy: tx.deleted_by,
            deletedAt: new Date(tx.deleted_at),
            deletedByName: tx.deleted_by_profile?.full_name,
            processedByName: tx.processed_by_profile?.full_name
        })) || [];
    },
};
