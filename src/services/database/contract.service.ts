import { supabase } from '../../lib/supabase';
import type { Contract } from '../../types';

export const ContractService = {
    async getContracts(): Promise<Contract[]> {
        const { data, error } = await supabase
            .from('contracts')
            .select('*, signed_profile:signed_by(full_name), sales_rep_profile:sales_rep_id(full_name)')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            offerId: row.offer_id,
            contractNumber: row.contract_data.contractNumber,
            status: row.status as Contract['status'],
            client: row.contract_data.client,
            product: row.contract_data.product,
            pricing: {
                ...row.contract_data.pricing,
                paymentMethod: row.contract_data.pricing?.paymentMethod,
                advancePayment: row.contract_data.pricing?.advancePayment,
                advancePaymentDate: row.contract_data.pricing?.advancePaymentDate ? new Date(row.contract_data.pricing.advancePaymentDate) : undefined,
            },
            commission: row.contract_data.commission,
            requirements: row.contract_data.requirements,
            orderedItems: row.contract_data.orderedItems || [],
            comments: row.contract_data.comments?.map((c: { id: string; text: string; author: string; createdAt: string | Date }) => ({ ...c, createdAt: new Date(c.createdAt) })) || [],
            attachments: row.contract_data.attachments || [],
            createdAt: new Date(row.created_at),
            signedAt: row.signed_at ? new Date(row.signed_at) : undefined,
            signedBy: row.signed_by,
            signedByUser: row.signed_profile ? {
                firstName: row.signed_profile.full_name?.split(' ')[0] || '',
                lastName: row.signed_profile.full_name?.split(' ').slice(1).join(' ') || ''
            } : undefined,
            salesRepId: row.sales_rep_id,
            salesRep: row.sales_rep_profile ? {
                firstName: row.sales_rep_profile.full_name?.split(' ')[0] || '',
                lastName: row.sales_rep_profile.full_name?.split(' ').slice(1).join(' ') || ''
            } : undefined
        }));
    },

    async createContract(contract: Omit<Contract, 'id' | 'createdAt' | 'contractNumber'>): Promise<Contract> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Generate sequential contract number using database function
        const { data: contractNumberData, error: rpcError } = await supabase
            .rpc('get_next_contract_number');

        if (rpcError) throw rpcError;
        const newContractNumber = contractNumberData as string;

        const contractData = {
            contractNumber: newContractNumber,
            client: contract.client,
            product: contract.product,
            pricing: contract.pricing,
            commission: contract.commission,
            requirements: contract.requirements,
            comments: contract.comments,
            attachments: contract.attachments,
            orderedItems: contract.orderedItems || []
        };

        const { data, error } = await supabase
            .from('contracts')
            .insert({
                offer_id: contract.offerId,
                user_id: user.id,
                contract_data: contractData,
                status: contract.status,
                signed_at: contract.signedAt ? contract.signedAt.toISOString() : null,
                sales_rep_id: user.id // Default to creator
            })
            .select()
            .single();

        if (error) throw error;

        return {
            ...contract,
            contractNumber: newContractNumber,
            id: data.id,
            createdAt: new Date(data.created_at)
        } as Contract;
    },

    async updateContract(id: string, contract: Partial<Contract>): Promise<void> {
        // 1. Fetch existing contract to enable safe merging
        const existing = await this.getContracts();
        const current = existing.find(c => c.id === id);
        if (!current) throw new Error('Contract not found');

        const updates: Record<string, unknown> = {};

        // 2. Handle status updates with auto-sign logic
        if (contract.status && contract.status !== current.status) {
            updates.status = contract.status;

            // Auto-set signed_at when status changes to 'signed'
            if (contract.status === 'signed' && !current.signedAt) {
                updates.signed_at = new Date().toISOString();
                // Also set signed_by if provided (and not already set?) - passed from UI
                if (contract.signedBy) {
                    updates.signed_by = contract.signedBy;
                }
            }
        }

        // 3. Handle explicit signed_at / signed_by override
        if (contract.signedAt) {
            updates.signed_at = contract.signedAt.toISOString();
        }
        if (contract.signedBy) {
            updates.signed_by = contract.signedBy;
        }

        // Handle sales_rep_id update
        if (contract.salesRepId) {
            updates.sales_rep_id = contract.salesRepId;
        }

        // 4. Handle contract_data updates with safe JSONB merge
        const needsDataUpdate = contract.client || contract.product ||
            contract.pricing || contract.comments ||
            contract.requirements || contract.attachments ||
            contract.orderedItems ||
            contract.contractNumber || contract.commission !== undefined;

        if (needsDataUpdate) {
            // Merge with existing data to prevent undefined overwrites
            const updatedData = {
                contractNumber: contract.contractNumber ?? current.contractNumber,
                client: contract.client ?? current.client,
                product: contract.product ?? current.product,
                pricing: contract.pricing ?? current.pricing,
                commission: contract.commission ?? current.commission,
                requirements: contract.requirements ?? current.requirements,
                orderedItems: contract.orderedItems ?? current.orderedItems ?? [],
                comments: contract.comments ?? current.comments,
                attachments: contract.attachments ?? current.attachments
            };
            updates.contract_data = updatedData;
        }

        // 5. Execute update only if there are changes
        if (Object.keys(updates).length === 0) {
            return; // Nothing to update
        }

        const { error } = await supabase
            .from('contracts')
            .update(updates)
            .eq('id', id);
        if (error) throw error;
    },

    async addProtocolToContract(contractId: string, protocolBlob: Blob, installationId: string): Promise<void> {
        // Convert Blob to base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
                const result = reader.result as string;
                resolve(result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(protocolBlob);
        });

        const base64Data = await base64Promise;

        // Fetch current contract
        const { data: currentData, error: fetchError } = await supabase
            .from('contracts')
            .select('contract_data')
            .eq('id', contractId)
            .single();

        if (fetchError) throw fetchError;

        const contractData = currentData?.contract_data || {};
        const existingAttachments = contractData.attachments || [];

        // Add new attachment
        const newAttachment = {
            id: crypto.randomUUID(),
            name: `Protokół odbioru - ${new Date().toLocaleDateString()} `,
            type: 'protocol',
            data: base64Data,
            createdAt: new Date().toISOString(),
            installationId: installationId
        };

        const updatedAttachments = [...existingAttachments, newAttachment];

        // Update contract
        const { error: updateError } = await supabase
            .from('contracts')
            .update({
                contract_data: {
                    ...contractData,
                    attachments: updatedAttachments
                }
            })
            .eq('id', contractId);

        if (updateError) throw updateError;
    },

    async getCustomerContracts(customerId: string): Promise<Contract[]> {
        // 1. Get Offer IDs for customer
        const { data: offers, error: offersError } = await supabase
            .from('offers')
            .select('id')
            .eq('customer_id', customerId);

        if (offersError) throw offersError;
        const offerIds = offers.map(o => o.id);

        if (offerIds.length === 0) return [];

        // 2. Get Contracts for these offers
        const { data, error } = await supabase
            .from('contracts')
            .select('*')
            .in('offer_id', offerIds)
            .in('offer_id', offerIds)
            .select('*, signed_profile:signed_by(full_name), sales_rep_profile:sales_rep_id(full_name)')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            offerId: row.offer_id,
            contractNumber: row.contract_data.contractNumber,
            client: row.contract_data.client,
            product: row.contract_data.product,
            pricing: {
                ...row.contract_data.pricing,
                paymentMethod: row.contract_data.pricing?.paymentMethod,
                advancePayment: row.contract_data.pricing?.advancePayment,
                advancePaymentDate: row.contract_data.pricing?.advancePaymentDate ? new Date(row.contract_data.pricing.advancePaymentDate) : undefined,
            },
            status: row.status as Contract['status'],
            commission: row.contract_data.commission,
            requirements: row.contract_data.requirements,
            orderedItems: row.contract_data.orderedItems || [],
            comments: row.contract_data.comments?.map((c: { id: string; text: string; author: string; createdAt: string | Date }) => ({ ...c, createdAt: new Date(c.createdAt) })) || [],
            attachments: row.contract_data.attachments || [],
            createdAt: new Date(row.created_at),
            signedAt: row.signed_at ? new Date(row.signed_at) : undefined,
            signedBy: row.signed_by,
            signedByUser: row.signed_profile ? {
                firstName: row.signed_profile.full_name?.split(' ')[0] || '',
                lastName: row.signed_profile.full_name?.split(' ').slice(1).join(' ') || ''
            } : undefined,
            salesRepId: row.sales_rep_id,
            salesRep: row.sales_rep_profile ? {
                firstName: row.sales_rep_profile.full_name?.split(' ')[0] || '',
                lastName: row.sales_rep_profile.full_name?.split(' ').slice(1).join(' ') || ''
            } : undefined
        }));
    },

    async findContractByOfferId(offerId: string): Promise<Contract | null> {
        const { data, error } = await supabase
            .from('contracts')
            .select('*, signed_profile:signed_by(full_name), sales_rep_profile:sales_rep_id(full_name)')
            .eq('offer_id', offerId)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        return {
            id: data.id,
            offerId: data.offer_id,
            contractNumber: data.contract_data.contractNumber,
            client: data.contract_data.client,
            product: data.contract_data.product,
            pricing: {
                ...data.contract_data.pricing,
                paymentMethod: data.contract_data.pricing?.paymentMethod,
                advancePayment: data.contract_data.pricing?.advancePayment,
                advancePaymentDate: data.contract_data.pricing?.advancePaymentDate ? new Date(data.contract_data.pricing.advancePaymentDate) : undefined,
            },
            status: data.status as Contract['status'],
            commission: data.contract_data.commission,
            requirements: data.contract_data.requirements,
            orderedItems: data.contract_data.orderedItems || [],
            comments: data.contract_data.comments?.map((c: { id: string; text: string; author: string; createdAt: string | Date }) => ({ ...c, createdAt: new Date(c.createdAt) })) || [],
            attachments: data.contract_data.attachments || [],
            createdAt: new Date(data.created_at),
            signedAt: data.signed_at ? new Date(data.signed_at) : undefined,
            signedBy: data.signed_by,
            signedByUser: data.signed_profile ? {
                firstName: data.signed_profile.full_name?.split(' ')[0] || '',
                lastName: data.signed_profile.full_name?.split(' ').slice(1).join(' ') || ''
            } : undefined,
            salesRepId: data.sales_rep_id,
            salesRep: data.sales_rep_profile ? {
                firstName: data.sales_rep_profile.full_name?.split(' ')[0] || '',
                lastName: data.sales_rep_profile.full_name?.split(' ').slice(1).join(' ') || ''
            } : undefined
        };
    },

    async getUnassignedContracts(): Promise<Contract[]> {
        // Get all signed contracts
        const { data: contracts, error: contractsError } = await supabase
            .from('contracts')
            .select('*, signed_profile:signed_by(full_name), sales_rep_profile:sales_rep_id(full_name)')
            .eq('status', 'signed')
            .order('created_at', { ascending: false });

        if (contractsError) throw contractsError;

        // Get all installations to check which contracts already have them
        const { data: installations, error: installError } = await supabase
            .from('installations')
            .select('offer_id');

        if (installError) throw installError;

        const installationOfferIds = new Set((installations || []).map(i => i.offer_id));

        // Filter contracts that don't have installations
        const unassignedContracts = (contracts || []).filter(
            row => !installationOfferIds.has(row.offer_id)
        );

        return unassignedContracts.map(row => ({
            id: row.id,
            offerId: row.offer_id,
            contractNumber: row.contract_data.contractNumber,
            status: row.status as Contract['status'],
            client: row.contract_data.client,
            product: row.contract_data.product,
            pricing: {
                ...row.contract_data.pricing,
                paymentMethod: row.contract_data.pricing?.paymentMethod,
                advancePayment: row.contract_data.pricing?.advancePayment,
                advancePaymentDate: row.contract_data.pricing?.advancePaymentDate ? new Date(row.contract_data.pricing.advancePaymentDate) : undefined,
            },
            commission: row.contract_data.commission,
            requirements: row.contract_data.requirements,
            orderedItems: row.contract_data.orderedItems || [],
            comments: row.contract_data.comments?.map((c: { id: string; text: string; author: string; createdAt: string | Date }) => ({ ...c, createdAt: new Date(c.createdAt) })) || [],
            attachments: row.contract_data.attachments || [],
            createdAt: new Date(row.created_at),
            signedAt: row.signed_at ? new Date(row.signed_at) : undefined,
            signedBy: row.signed_by,
            signedByUser: row.signed_profile ? {
                firstName: row.signed_profile.full_name?.split(' ')[0] || '',
                lastName: row.signed_profile.full_name?.split(' ').slice(1).join(' ') || ''
            } : undefined,
            salesRepId: row.sales_rep_id,
            salesRep: row.sales_rep_profile ? {
                firstName: row.sales_rep_profile.full_name?.split(' ')[0] || '',
                lastName: row.sales_rep_profile.full_name?.split(' ').slice(1).join(' ') || ''
            } : undefined
        }));
    },

    async deleteContract(id: string) {
        const { error } = await supabase.from('contracts').delete().eq('id', id);
        if (error) throw error;
    }
};
