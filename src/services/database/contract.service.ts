import { supabase } from '../../lib/supabase';
import type { Contract } from '../../types';

export const ContractService = {
    async getContracts(): Promise<Contract[]> {
        // 1. Fetch contracts (raw)
        const { data: contracts, error } = await supabase
            .from('contracts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        if (!contracts?.length) return [];

        // 2. Extract User IDs to fetch profiles
        const userIds = new Set<string>();
        contracts.forEach(c => {
            if (c.signed_by) userIds.add(c.signed_by);
            if (c.sales_rep_id) userIds.add(c.sales_rep_id);
            // We could also fetch creator (user_id) if needed, but not mapping it currently in return type except implicitly?
        });

        // 3. Fetch Profiles manually to avoid Ambiguous Foreign Key issues
        const profileMap = new Map<string, { full_name: string }>();
        if (userIds.size > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', Array.from(userIds));

            profiles?.forEach(p => profileMap.set(p.id, p));
        }

        // 4. Map & Return
        return contracts.map(row => {
            const signedProfile = row.signed_by ? profileMap.get(row.signed_by) : undefined;
            const salesRepProfile = row.sales_rep_id ? profileMap.get(row.sales_rep_id) : undefined;

            return {
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
                signedByUser: signedProfile ? {
                    firstName: (signedProfile.full_name || '').split(' ')[0] || '',
                    lastName: (signedProfile.full_name || '').split(' ').slice(1).join(' ') || ''
                } : undefined,
                salesRepId: row.sales_rep_id,
                salesRep: salesRepProfile ? {
                    firstName: (salesRepProfile.full_name || '').split(' ')[0] || '',
                    lastName: (salesRepProfile.full_name || '').split(' ').slice(1).join(' ') || ''
                } : undefined
            };
        });
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

        // Automation: Sync Offer and Lead Status
        try {
            // Mark Offer as 'sold'
            await supabase.from('offers').update({ status: 'sold' }).eq('id', contract.offerId);

            // Fetch the lead ID and customer ID if not in the contract object but in the Offer
            const { data: offerData } = await supabase.from('offers').select('id, lead_id, customer_id').eq('id', contract.offerId).single();
            if (offerData?.lead_id) {
                // Mark Lead as 'won'
                await supabase.from('leads').update({ status: 'won' }).eq('id', offerData.lead_id);
            }

            // Automation: Create Pending Installation
            // We only create if one doesn't exist for this offer
            const { count } = await supabase
                .from('installations')
                .select('*', { count: 'exact', head: true })
                .eq('offer_id', contract.offerId);

            if (count === 0 && offerData) {
                const productSummary = contract.product ?
                    (typeof contract.product === 'string' ? contract.product : `${contract.product.modelId.toUpperCase()} ${contract.product.width}x${contract.product.projection}`)
                    : 'Produkt z Umowy';

                console.log('Auto-creating pending installation for contract', newContractNumber);

                await supabase.from('installations').insert({
                    offer_id: contract.offerId,
                    customer_id: offerData.customer_id, // Link directly to customer!
                    user_id: user.id,
                    status: 'pending',
                    installation_data: {
                        productSummary,
                        client: contract.client, // Use client data from contract
                        notes: 'Automatycznie utworzono po podpisaniu umowy.'
                    }
                });
            }
        } catch (syncError) {
            console.error('Workflow Automation: Failed to sync Offer/Lead status:', syncError);
        }

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

        // Automation: Task for Manager when contract is signed
        if (updates.status === 'signed') {
            try {
                // Find a manager to assign the task to
                const { data: managers } = await supabase.from('profiles').select('id').eq('role', 'admin').limit(1);
                const managerId = managers?.[0]?.id;

                if (managerId) {
                    const { TaskService } = await import('./task.service');
                    await TaskService.createTask({
                        userId: managerId,
                        title: `Planowanie montażu: ${current.contractNumber} `,
                        description: `Umowa ${current.contractNumber} (${current.client.lastName}) została podpisana. Zaplanuj montaż w kalendarzu.`,
                        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
                        status: 'pending',
                        priority: 'high',
                        type: 'task',
                        customerId: current.client.id
                    });
                }
            } catch (taskError) {
                console.error('Workflow Automation: Failed to create manager task:', taskError);
            }
        }
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

        if (offerIds.length === 0) {
            // Fallback: Fetch by customer_id directly if no offers found (orphaned contracts)
            const { data, error } = await supabase
                .from('contracts')
                .select('*, signed_profile:signed_by(full_name), sales_rep_profile:sales_rep_id(full_name)')
                .eq('customer_id', customerId) // Assuming customer_id exists on contracts as verified
                .order('created_at', { ascending: false });

            if (error) throw error;
            // Map the data (same as below)
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
                    firstName: (row.signed_profile.full_name || '').split(' ')[0] || '',
                    lastName: (row.signed_profile.full_name || '').split(' ').slice(1).join(' ') || ''
                } : undefined,
                salesRepId: row.sales_rep_id,
                salesRep: row.sales_rep_profile ? {
                    firstName: (row.sales_rep_profile.full_name || '').split(' ')[0] || '',
                    lastName: (row.sales_rep_profile.full_name || '').split(' ').slice(1).join(' ') || ''
                } : undefined
            }));
        }

        // 2. Get Contracts for these offers OR directly for customer
        let query = supabase
            .from('contracts')
            .select('*, signed_profile:signed_by(full_name), sales_rep_profile:sales_rep_id(full_name)')
            .order('created_at', { ascending: false });

        // Use OR filter to get contracts by offer_id OR customer_id
        // Syntax: offer_id.in.(...ids),customer_id.eq.id
        const orFilter = `offer_id.in.(${offerIds.join(',')}),customer_id.eq.${customerId}`;
        query = query.or(orFilter);

        const { data, error } = await query;

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
                firstName: (row.signed_profile.full_name || '').split(' ')[0] || '',
                lastName: (row.signed_profile.full_name || '').split(' ').slice(1).join(' ') || ''
            } : undefined,
            salesRepId: row.sales_rep_id,
            salesRep: row.sales_rep_profile ? {
                firstName: (row.sales_rep_profile.full_name || '').split(' ')[0] || '',
                lastName: (row.sales_rep_profile.full_name || '').split(' ').slice(1).join(' ') || ''
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
                firstName: (row.signed_profile.full_name || '').split(' ')[0] || '',
                lastName: (row.signed_profile.full_name || '').split(' ').slice(1).join(' ') || ''
            } : undefined,
            salesRepId: row.sales_rep_id,
            salesRep: row.sales_rep_profile ? {
                firstName: (row.sales_rep_profile.full_name || '').split(' ')[0] || '',
                lastName: (row.sales_rep_profile.full_name || '').split(' ').slice(1).join(' ') || ''
            } : undefined
        }));
    },

    async deleteContract(id: string) {
        const { error } = await supabase.from('contracts').delete().eq('id', id);
        if (error) throw error;
    }
};
