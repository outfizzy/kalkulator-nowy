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
                installationNotes: row.contract_data.installationNotes || '',
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

    async getNextContractNumber(): Promise<string> {
        const { data, error } = await supabase.rpc('get_next_contract_number');
        if (error) throw error;
        return data as string;
    },

    async createContract(contract: Omit<Contract, 'id' | 'createdAt' | 'contractNumber'>): Promise<Contract> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Generate or use provided contract number
        let newContractNumber = contract.contractNumber;

        if (!newContractNumber) {
            const { data: contractNumberData, error: rpcError } = await supabase
                .rpc('get_next_contract_number');

            if (rpcError) throw rpcError;
            newContractNumber = contractNumberData as string;
        }

        // [AUTOMATION] Auto-calculate commission from sales rep's rate
        let calculatedCommission = (contract.commission && contract.commission > 0) ? contract.commission : 0;
        const repUserId = contract.salesRepId || user.id;

        if (calculatedCommission <= 0) {
            try {
                const netPrice = contract.pricing?.sellingPriceNet || contract.pricing?.finalPriceNet || 0;
                if (netPrice > 0) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('commission_rate')
                        .eq('id', repUserId)
                        .single();

                    if (profile?.commission_rate) {
                        const rate = Number(profile.commission_rate);
                        if (rate > 0) {
                            calculatedCommission = Math.round(netPrice * rate * 100) / 100;
                            console.log(`[Commission] Auto-calculated for contract: ${calculatedCommission}€ (${rate * 100}% of ${netPrice}€)`);
                        }
                    }
                }
            } catch (err) {
                console.error('[Commission] Failed to auto-calculate:', err);
            }
        }

        const contractData = {
            contractNumber: newContractNumber,
            client: contract.client,
            product: contract.product,
            pricing: contract.pricing,
            commission: calculatedCommission,
            requirements: contract.requirements,
            comments: contract.comments,
            attachments: contract.attachments,
            orderedItems: contract.orderedItems || [],
            installation_days_estimate: contract.installation_days_estimate,
            installationNotes: contract.installationNotes || ''
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
            contract.contractNumber || contract.commission !== undefined ||
            contract.installationNotes !== undefined;

        if (needsDataUpdate) {
            // [AUTOMATION] Always recalculate commission when pricing changes
            let finalCommission = contract.commission ?? current.commission;
            const pricingToUse = contract.pricing ?? current.pricing;
            const repId = contract.salesRepId || current.salesRepId;

            // Recalculate when: pricing changed OR commission is missing/zero
            const pricingChanged = !!contract.pricing;
            const commissionMissing = !finalCommission || finalCommission <= 0;

            if ((pricingChanged || commissionMissing) && repId) {
                try {
                    const netPrice = Math.max(
                        Number(pricingToUse?.sellingPriceNet) || 0,
                        Number(pricingToUse?.finalPriceNet) || 0
                    );

                    if (netPrice > 0) {
                        const { data: repProfile } = await supabase
                            .from('profiles')
                            .select('commission_rate')
                            .eq('id', repId)
                            .single();

                        if (repProfile?.commission_rate) {
                            const rate = Number(repProfile.commission_rate);
                            if (rate > 0) {
                                finalCommission = Math.round(netPrice * rate * 100) / 100;
                                console.log(`[Commission] Recalculated on update: ${finalCommission}€ (${rate * 100}% of ${netPrice}€)`);
                            }
                        }
                    }
                } catch (err) {
                    console.error('[Commission] Recalculation error:', err);
                }
            }

            // Merge with existing data to prevent undefined overwrites
            const updatedData = {
                contractNumber: contract.contractNumber ?? current.contractNumber,
                client: contract.client ?? current.client,
                product: contract.product ?? current.product,
                pricing: pricingToUse,
                commission: finalCommission,
                requirements: contract.requirements ?? current.requirements,
                orderedItems: contract.orderedItems ?? current.orderedItems ?? [],
                comments: contract.comments ?? current.comments,
                attachments: contract.attachments ?? current.attachments,
                installationNotes: contract.installationNotes ?? current.installationNotes ?? ''
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
                installationNotes: row.contract_data.installationNotes || '',
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
            installationNotes: data.contract_data.installationNotes || '',
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
            installationNotes: row.contract_data.installationNotes || '',
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

    async deleteContract(id: string): Promise<void> {
        // 1. Fetch Contract to check type (Manual vs Regular) and linked items
        const { data: contract, error: fetchError } = await supabase
            .from('contracts')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;
        if (!contract) return; // Already gone

        // 2. Nullify FK references that block deletion
        // project_measurements → set contract_id to null
        await supabase
            .from('project_measurements')
            .update({ contract_id: null })
            .eq('contract_id', id);

        // service_tickets → set contract_id to null (keep tickets but unlink)
        await supabase
            .from('service_tickets')
            .update({ contract_id: null })
            .eq('contract_id', id);

        // 3. Delete Installations linked to the SAME Offer
        const { data: installations } = await supabase
            .from('installations')
            .select('id')
            .eq('offer_id', contract.offer_id);

        if (installations && installations.length > 0) {
            const installIds = installations.map(i => i.id);
            await supabase.from('installations').delete().in('id', installIds);
        }

        // 4. Delete Contract
        const { error: deleteError } = await supabase
            .from('contracts')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        // 5. Clean up offer-linked data
        // customer_costs linked to this offer
        await supabase
            .from('customer_costs')
            .delete()
            .eq('source_ref', `offer:${contract.offer_id}`);

        // offer_interactions
        await supabase
            .from('offer_interactions')
            .delete()
            .eq('offer_id', contract.offer_id);

        // lead_messages linked to offer
        await supabase
            .from('lead_messages')
            .update({ offer_id: null })
            .eq('offer_id', contract.offer_id);

        // measurements linked to offer
        await supabase
            .from('measurements')
            .update({ offer_id: null })
            .eq('offer_id', contract.offer_id);

        // 6. Handle the Offer itself
        const { data: offer } = await supabase.from('offers').select('id, product_config').eq('id', contract.offer_id).single();
        if (offer) {
            const product = offer.product_config as any;
            const isManual = product?.isManual || product?.modelId === 'MANUAL';
            if (isManual) {
                // Delete the dummy offer
                await supabase.from('offers').delete().eq('id', offer.id);
            } else {
                // If regular offer, revert status
                await supabase.from('offers').update({ status: 'new' }).eq('id', offer.id);
            }
        }
    },

    async getContractCostBreakdown(contractId: string): Promise<{
        logistics: { total: number; items: { name: string; cost: number }[] };
        measurement: { total: number; items: { description: string; amount: number; date: string }[] };
        measurementTrip: { total: number; items: { description: string; amount: number; amountPLN: number; date: string }[] };
        commission: number;
        installation: {
            laborHours: number;
            laborCost: number;
            fuelCost: number;
            hotelCost: number;
            consumablesCost: number;
            additionalCosts: number;
            total: number;
        };
        grandTotal: number;
    }> {
        // 1. Load contract
        const { data: contractRow, error: cErr } = await supabase
            .from('contracts')
            .select('*, offer:offers!offer_id(id, customer_id, pricing)')
            .eq('id', contractId)
            .single();

        if (cErr || !contractRow) throw cErr || new Error('Contract not found');

        const contractData = contractRow.contract_data as any;
        const offerId = contractRow.offer_id;
        const customerId = (contractRow.offer as any)?.customer_id;
        const commission = Number(contractData?.commission) || 0;

        // 2. Logistics — orderedItems purchaseCost
        const orderedItems: any[] = contractData?.orderedItems || [];
        const logisticsItems = orderedItems
            .filter((item: any) => item.purchaseCost && item.purchaseCost > 0)
            .map((item: any) => ({ name: item.name || 'Towar', cost: Number(item.purchaseCost) }));
        const logisticsTotal = logisticsItems.reduce((sum: number, item: any) => sum + item.cost, 0);

        // 3. Measurement costs — customer_costs
        let measurementItems: { description: string; amount: number; date: string }[] = [];
        let measurementTotal = 0;
        if (customerId) {
            const { data: costs } = await supabase
                .from('customer_costs')
                .select('*')
                .eq('customer_id', customerId);

            if (costs) {
                const typeLabels: Record<string, string> = {
                    measurement: 'Pomiar',
                    commission: 'Prowizja',
                    material: 'Materiał',
                    installation: 'Montaż',
                    delivery: 'Dostawa',
                    other: 'Inny'
                };
                measurementItems = costs.map((c: any) => ({
                    description: c.description || typeLabels[c.type] || c.type || 'Koszt',
                    amount: Number(c.amount),
                    date: c.date
                }));
                measurementTotal = measurementItems.reduce((sum, c) => sum + c.amount, 0);
            }
        }

        // 3b. Measurement trip costs — from measurement_reports (km cost in PLN → EUR)
        let measurementTripItems: { description: string; amount: number; amountPLN: number; date: string }[] = [];
        let measurementTripTotal = 0;
        const PLN_TO_EUR = 4.30; // Average exchange rate

        if (contractData?.client) {
            const clientName = `${contractData.client.firstName || ''} ${contractData.client.lastName || ''}`.trim().toLowerCase();

            if (clientName) {
                // Get all measurement reports
                const { data: reports } = await supabase
                    .from('measurement_reports')
                    .select('id, date, total_km, trip_cost, cost_per_km, measurements_snapshot');

                if (reports) {
                    for (const report of reports) {
                        const tripCost = report.trip_cost ? Number(report.trip_cost) : 0;
                        const totalKm = report.total_km || 0;
                        const costPerKm = report.cost_per_km ? Number(report.cost_per_km) : 0;
                        const visits: any[] = report.measurements_snapshot || [];

                        if (visits.length === 0) continue;

                        // Check if any visit matches this customer
                        const matchingVisits = visits.filter((v: any) => {
                            const visitName = (v.customerName || v.customer_name || '').toLowerCase();
                            return visitName === clientName;
                        });

                        if (matchingVisits.length === 0) continue;

                        // Calculate cost for this customer's visit(s)
                        // If tripCost is set, split proportionally among visits
                        // Otherwise use totalKm * costPerKm
                        let reportTotalCost = tripCost;
                        if (!reportTotalCost && totalKm > 0 && costPerKm > 0) {
                            reportTotalCost = totalKm * costPerKm;
                        }
                        if (!reportTotalCost) continue;

                        const costPerVisit = reportTotalCost / visits.length;
                        const customerCostPLN = costPerVisit * matchingVisits.length;
                        const customerCostEUR = Math.round((customerCostPLN / PLN_TO_EUR) * 100) / 100;

                        measurementTripItems.push({
                            description: `Pomiar ${report.date} (${totalKm} km, ${matchingVisits.length}/${visits.length} wizyt)`,
                            amount: customerCostEUR,
                            amountPLN: Math.round(customerCostPLN * 100) / 100,
                            date: report.date
                        });
                    }
                }
            }
        }
        measurementTripTotal = measurementTripItems.reduce((sum, c) => sum + c.amount, 0);

        // 4. Installation costs
        let laborHours = 0;
        let laborCost = 0;
        let fuelCost = 0;
        let hotelCost = 0;
        let consumablesCost = 0;
        let additionalCosts = 0;

        if (offerId) {
            // Get installation
            const { data: instRows } = await supabase
                .from('installations')
                .select('*')
                .eq('offer_id', offerId);

            const inst = instRows?.[0];
            if (inst) {
                hotelCost = Number(inst.hotel_cost) || 0;
                consumablesCost = Number(inst.consumables_cost) || 0;
                additionalCosts = Number(inst.additional_costs) || 0;

                // Work logs — hours
                const { data: workLogs } = await supabase
                    .from('installation_work_logs')
                    .select('*')
                    .eq('installation_id', inst.id);

                if (workLogs) {
                    const HOURLY_RATE = 25; // EUR per worker-hour
                    workLogs.forEach((log: any) => {
                        if (log.start_time && log.end_time) {
                            const start = new Date(log.start_time);
                            const end = new Date(log.end_time);
                            const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                            const workers = (log.user_ids || []).length || 1;
                            laborHours += hours * workers;
                        }
                    });
                    laborCost = Math.round(laborHours * HOURLY_RATE * 100) / 100;
                }

                // Fuel cost — if team exists, use travel distance
                if (inst.team_id) {
                    const { data: team } = await supabase
                        .from('installation_teams')
                        .select('fuel_consumption')
                        .eq('id', inst.team_id)
                        .single();

                    // Estimate distance from pricing if available
                    const instCosts = contractData?.pricing?.installationCosts;
                    const travelDistance = instCosts?.travelDistance || 0;
                    const fuelConsumption = team?.fuel_consumption || 12; // L/100km
                    const FUEL_PRICE = 1.70; // EUR per liter (DE average)

                    if (travelDistance > 0) {
                        fuelCost = Math.round(((travelDistance * 2) * fuelConsumption / 100) * FUEL_PRICE * 100) / 100;
                    }
                }
            }
        }

        const installationTotal = laborCost + fuelCost + hotelCost + consumablesCost + additionalCosts;
        const grandTotal = logisticsTotal + measurementTotal + measurementTripTotal + commission + installationTotal;

        return {
            logistics: { total: logisticsTotal, items: logisticsItems },
            measurement: { total: measurementTotal, items: measurementItems },
            measurementTrip: { total: measurementTripTotal, items: measurementTripItems },
            commission,
            installation: {
                laborHours: Math.round(laborHours * 100) / 100,
                laborCost,
                fuelCost,
                hotelCost,
                consumablesCost,
                additionalCosts,
                total: installationTotal
            },
            grandTotal
        };
    },

    async createManualContract(params: {
        customer: Customer;
        items: Array<{
            id: string;
            modelId: string;
            description: string;
            quantity: number;
            price: number;
        }>;
        totalPrice: number;
        contractDetails: {
            contractNumber?: string;
            createdAt?: Date;
            signedAt?: Date;
            advance?: number;
            comments?: string;
            installationPriceNet?: number;
            installationDays?: number;
            paymentMethod?: 'cash' | 'transfer';
            installationNotes?: string;
        };
        productConfig?: {
            modelId?: string;
            color?: string;
            width?: number;
            projection?: number;
            addons?: string[];
            measurements?: {
                unterkRinne?: number;
                unterkWand?: number;
                slopeLeft?: number;
                slopeRight?: number;
                slopeFront?: number;
                wallType?: string;
                mountType?: string;
                hasElectrical?: boolean;
                hasDrainage?: boolean;
                technicalNotes?: string;
            };
        };
    }): Promise<void> {
        const { customer, items, totalPrice, contractDetails, productConfig } = params;

        const { data: userData } = await supabase.auth.getUser();

        // [AUTOMATION] Auto-calculate commission for manual contracts
        let calculatedCommission = 0;
        if (userData.user && totalPrice > 0) {
            try {
                const { data: creatorProfile } = await supabase
                    .from('profiles')
                    .select('commission_rate')
                    .eq('id', userData.user.id)
                    .single();

                const rate = creatorProfile?.commission_rate ? Number(creatorProfile.commission_rate) : 0;
                if (rate > 0) {
                    calculatedCommission = Math.round(totalPrice * rate * 100) / 100;
                    console.log(`[Commission] Manual contract auto-calculated: ${calculatedCommission}€ (${rate * 100}% of ${totalPrice}€)`);
                }
            } catch (err) {
                console.error('[Commission] Failed to calculate for manual contract:', err);
            }
        }

        // 1. Create Placeholder Offer
        const { data: existingLead } = await supabase
            .from('leads')
            .select('id')
            .eq('customer_id', customer.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        const resolvedModelId = productConfig?.modelId && productConfig.modelId !== 'other'
            ? productConfig.modelId : 'MANUAL';
        const formattedAddons = (productConfig?.addons || []).map((name, i) => ({
            id: `addon-${i}`, name, quantity: 1, price: 0
        }));
        const productSummary = items.map(i => `${i.quantity}x ${i.description}`).join(', ');

        const { data: offerData, error: offerError } = await supabase
            .from('offers')
            .insert({
                customer_id: customer.id!,
                lead_id: existingLead?.id || null,
                user_id: userData.user?.id,
                status: 'sold',
                offer_number: `MANUAL/${contractDetails.contractNumber || Date.now()}`,
                margin_percentage: 0,
                customer_data: customer,
                product_config: {
                    modelId: resolvedModelId,
                    width: productConfig?.width || 0,
                    projection: productConfig?.projection || 0,
                    color: productConfig?.color || 'N/A',
                    roofType: 'other',
                    installationType: productConfig?.measurements?.mountType || 'wall',
                    addons: formattedAddons,
                    isManual: true,
                    manualDescription: productSummary,
                    measurements: productConfig?.measurements || {},
                    customItems: items.map(i => ({
                        id: i.id,
                        name: i.description,
                        price: i.price,
                        quantity: i.quantity,
                        description: i.modelId,
                        attributes: { modelId: i.modelId }
                    }))
                },
                pricing: {
                    finalPriceNet: totalPrice,
                    sellingPriceNet: totalPrice,
                    totalCost: 0,
                    marginPercentage: 0,
                    marginValue: 0,
                    basePrice: totalPrice,
                    addonsPrice: 0
                },
                commission: calculatedCommission,
                snow_zone: { id: '1', value: 0, description: 'Default' }
            })
            .select()
            .single();

        if (offerError) throw offerError;

        const installDays = contractDetails.installationDays || 1;

        // 2. Create Contract
        await this.createContract({
            offerId: offerData.id,
            status: 'signed',
            signedAt: contractDetails.signedAt || new Date(),
            client: customer,
            product: {
                modelId: resolvedModelId,
                width: productConfig?.width || 0,
                projection: productConfig?.projection || 0,
                color: productConfig?.color || 'N/A',
                roofType: 'other',
                installationType: 'wall',
                addons: formattedAddons,
                customItems: items.map(i => ({
                    id: i.id,
                    name: i.description,
                    price: i.price,
                    quantity: i.quantity,
                    attributes: { modelId: i.modelId }
                }))
            } as any,
            pricing: {
                basePrice: totalPrice,
                finalPriceNet: totalPrice,
                sellingPriceNet: totalPrice,
                vatRate: 0.19,
                advancePayment: contractDetails.advance || 0,
                paymentMethod: contractDetails.paymentMethod || 'transfer',
                installationCosts: contractDetails.installationPriceNet ? {
                    totalInstallation: contractDetails.installationPriceNet,
                    days: installDays,
                    dailyBreakdown: [],
                    dailyTotal: contractDetails.installationPriceNet / installDays,
                    travelDistance: 0,
                    travelCost: 0
                } : undefined
            },
            commission: calculatedCommission,
            requirements: {
                constructionProject: false,
                powerSupply: false,
                foundation: false
            },
            comments: contractDetails.comments ? [{
                id: crypto.randomUUID(),
                text: contractDetails.comments,
                author: 'System',
                createdAt: new Date()
            }] : [],
            attachments: [],
            contractNumber: contractDetails.contractNumber?.trim() || undefined,
            installationNotes: contractDetails.installationNotes || undefined,
            orderedItems: items.map(i => ({
                id: i.id,
                category: 'Other' as const,
                name: i.description,
                details: i.modelId !== 'other' && i.modelId !== 'addon' ? `Model: ${i.modelId}` : undefined,
                status: 'pending' as const,
                plannedDeliveryDate: undefined,
                orderedAt: undefined,
                purchaseCost: undefined
            })),
            installation_days_estimate: installDays
        });
    }
};
