import { supabase } from '../../lib/supabase';
import type { Installation, User, InstallationTeam, TeamUnavailability, OrderItem, OrderItemStatus, ProductConfig, SelectedAddon, InstallationWorkLog, Contract, ServiceTicket } from '../../types';
import { UserService } from './user.service';

interface InstallationData {
    client?: Installation['client'];
    productSummary?: string;
    teamId?: string;
    notes?: string;
    acceptance?: Installation['acceptance'];
    // Legacy flat fields that might exist in old data
    firstName?: string;
    lastName?: string;
    city?: string;
    address?: string;
    postalCode?: string;
    phone?: string;
    coordinates?: { lat: number; lng: number };
}

export const InstallationService = {
    async checkAndAutoCompleteInstallations(): Promise<number> {
        const today = new Date().toISOString().split('T')[0];

        // Find scheduled installations with date < today
        const { data: overdue, error: fetchError } = await supabase
            .from('installations')
            .select('id, scheduled_date, status')
            .eq('status', 'scheduled')
            .lt('scheduled_date', today);

        if (fetchError) throw fetchError;

        if (!overdue || overdue.length === 0) return 0;

        const ids = overdue.map(i => i.id);
        // Bulk update to verification
        const { error: updateError } = await supabase
            .from('installations')
            .update({ status: 'verification' })
            .in('id', ids);

        if (updateError) throw updateError;

        return ids.length;
    },

    async checkInstallationForContract(offerId: string): Promise<boolean> {
        const { data, error } = await supabase
            .from('installations')
            .select('id')
            .eq('offer_id', offerId)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
        return !!data;
    },

    async getInstallationByOfferId(offerId: string): Promise<Installation | null> {
        const { data, error } = await supabase
            .from('installations')
            .select('*')
            .eq('offer_id', offerId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        const installationData = (data as { installation_data: Partial<InstallationData> }).installation_data || {};
        const clientData: Partial<Installation['client']> = installationData.client || {};

        const client = {
            firstName: clientData.firstName || '',
            lastName: clientData.lastName || '',
            city: clientData.city || '',
            address: clientData.address || '',
            phone: clientData.phone || '',
            coordinates: clientData.coordinates
        };

        const scheduledRaw = (data as { scheduled_date: string | null }).scheduled_date;
        const scheduledDate = scheduledRaw ? scheduledRaw.toString().slice(0, 10) : undefined;

        return {
            id: data.id,
            offerId: data.offer_id,
            client,
            productSummary: installationData.productSummary || '',
            status: data.status as Installation['status'],
            scheduledDate,
            teamId: installationData.teamId || (data as { team_id?: string }).team_id,
            notes: installationData.notes,
            acceptance: installationData.acceptance,
            createdAt: new Date(data.created_at),
            partsReady: (data as { parts_ready?: boolean }).parts_ready,
            expectedDuration: (data as { expected_duration?: number }).expected_duration || 1,
            deliveryDate: (data as { delivery_date?: string }).delivery_date
        };
    },

    async bulkCreateInstallations(contractIds: string[]): Promise<Installation[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Fetch contracts with associated offers
        const { data: contracts, error: contractsError } = await supabase
            .from('contracts')
            .select('*, offers!inner(product)')
            .in('id', contractIds);

        if (contractsError) throw contractsError;
        if (!contracts || contracts.length === 0) return [];

        const createdInstallations: Installation[] = [];

        for (const contractRow of contracts) {
            // Check if installation already exists
            const exists = await this.checkInstallationForContract(contractRow.offer_id);
            if (exists) {
                console.warn(`Installation already exists for offer ${contractRow.offer_id}, skipping`);
                continue;
            }

            const contractData = contractRow.contract_data;
            const client = contractData.client;

            const installationData = {
                client: {
                    firstName: client.firstName || '',
                    lastName: client.lastName || '',
                    city: client.city || '',
                    address: `${client.street || ''} ${client.houseNumber || ''} `.trim(),
                    phone: client.phone || '',
                    coordinates: undefined
                },
                productSummary: `${contractData.product.modelId} ${contractData.product.width}x${contractData.product.projection} mm`
            };

            const { data: newInstallation, error: insertError } = await supabase
                .from('installations')
                .insert({
                    offer_id: contractRow.offer_id,
                    user_id: user.id,
                    status: 'pending',
                    installation_data: installationData,
                    source_type: 'contract',
                    source_id: contractRow.id,
                    parts_status: 'none' // Default
                })
                .select()
                .single();

            if (insertError) {
                console.error(`Error creating installation for contract ${contractRow.id}: `, insertError);
                continue;
            }

            // Automation: Sync order items from offer configuration
            const offerData = contractRow.offers as unknown as { product: ProductConfig };
            const offerConfig = offerData?.product;
            if (offerConfig) {
                try {
                    await this.syncOrderItemsFromConfig(newInstallation.id, offerConfig);
                } catch (syncError) {
                    console.error(`Error syncing order items for installation ${newInstallation.id}: `, syncError);
                }
            }

            createdInstallations.push({
                id: newInstallation.id,
                offerId: contractRow.offer_id,
                client: installationData.client,
                productSummary: installationData.productSummary,
                status: 'pending' as Installation['status'],
                scheduledDate: undefined,
                teamId: undefined,
                notes: '',
                createdAt: new Date(newInstallation.created_at)
            });
        }

        return createdInstallations;
    },

    async updateInstallationAcceptance(
        installationId: string,
        acceptance: {
            acceptedAt: string;
            clientName: string;
            signature?: string;
            notes?: string;
        }
    ): Promise<{ error: Error | null }> {
        // 1. Update status and acceptance
        const { error } = await supabase
            .from('installations')
            .update({
                acceptance: acceptance,
                status: 'completed'
            })
            .eq('id', installationId);

        if (!error) {
            try {
                // 2. Fetch installation details + client email from Contract/Offer
                // We need to fetch the Installation object first, then the Contract
                const installation = await this.getInstallationByOfferId(
                    // We need offerId, which we can get by fetching the installation again
                    // Or we can assume we need to fetch it since we only have ID here.
                    // Let's use getInstallations() filter or simple select.
                    (await supabase.from('installations').select('offer_id').eq('id', installationId).single()).data?.offer_id || ''
                );

                if (installation && installation.offerId) {
                    const { data: contractData } = await supabase
                        .from('contracts')
                        .select('contract_data')
                        .eq('offer_id', installation.offerId)
                        .single();

                    const email = (contractData?.contract_data as unknown as Partial<Contract>)?.client?.email;

                    if (email) {
                        const { EmailService } = await import('../email.service');
                        await EmailService.sendCompletionEmail(installation, email);
                    }
                }
            } catch (notifyError) {
                console.error('Failed to send completion notification:', notifyError);
                // Non-blocking error
            }

            // 3. Auto-create Task for Manager (Existing logic)
            // Fetch installation details for the task description (re-using fetched above if optimized, but keeping safe)
            const { data: installationFetch } = await supabase
                .from('installations')
                .select('installation_data')
                .eq('id', installationId)
                .single();

            const clientName = (installationFetch?.installation_data as { client?: { lastName?: string } })?.client?.lastName || 'Unknown';

            try {
                const { TaskService } = await import('./task.service');
                const { data: { user } } = await supabase.auth.getUser();

                await TaskService.createTask({
                    title: `✅ MONTAŻ ZAKOŃCZONY: ${clientName}`,
                    description: `Montaż został odebrany przez klienta: ${acceptance.clientName}.\nNotatki: ${acceptance.notes || 'Brak'}\nSprawdź protokół odbioru.`,
                    priority: 'high',
                    status: 'pending',
                    type: 'other',
                    dueDate: new Date().toISOString(),
                    userId: user?.id || ''
                });
            } catch (err) {
                console.error('Failed to auto-create task for installation acceptance:', err);
            }
        }

        return { error };
    },

    async saveInstallationAcceptance(
        installationId: string,
        acceptance: {
            acceptedAt: string;
            clientName: string;
            signature?: string;
            notes?: string;
        }
    ): Promise<{ error: Error | null }> {
        const { error } = await supabase
            .from('installations')
            .update({
                acceptance: acceptance,
                status: 'completed'
            })
            .eq('id', installationId);

        return { error };
    },

    // --- Profitability & Work Logs ---

    async startWorkDay(installationId: string, userIds: string[]): Promise<void> {
        const { error } = await supabase
            .from('installation_work_logs')
            .insert({
                installation_id: installationId,
                start_time: new Date().toISOString(),
                user_ids: userIds
            });

        if (error) throw error;
    },

    async endWorkDay(installationId: string): Promise<void> {
        // Find the open log for this installation
        const { data: logs, error: findError } = await supabase
            .from('installation_work_logs')
            .select('id')
            .eq('installation_id', installationId)
            .is('end_time', null)
            .order('start_time', { ascending: false })
            .limit(1);

        if (findError) throw findError;
        if (!logs || logs.length === 0) throw new Error('No open work log found');

        const { error: updateError } = await supabase
            .from('installation_work_logs')
            .update({ end_time: new Date().toISOString() })
            .eq('id', logs[0].id);

        if (updateError) throw updateError;
    },

    async getWorkLogs(installationId: string): Promise<InstallationWorkLog[]> {
        const { data, error } = await supabase
            .from('installation_work_logs')
            .select('*')
            .eq('installation_id', installationId)
            .order('start_time', { ascending: true });

        if (error) throw error;

        return data.map((log: {
            id: string;
            installation_id: string;
            start_time: string;
            end_time: string | null;
            user_ids: string[];
            created_at: string;
            updated_at: string;
        }) => ({
            id: log.id,
            installationId: log.installation_id,
            startTime: log.start_time,
            endTime: log.end_time || undefined,
            userIds: log.user_ids,
            createdAt: new Date(log.created_at),
            updatedAt: new Date(log.updated_at)
        }));
    },

    async updateFinancials(installationId: string, costs: { hotelCost?: number; consumablesCost?: number; additionalCosts?: number }): Promise<void> {
        const updates: Record<string, unknown> = {};
        if (costs.hotelCost !== undefined) updates.hotel_cost = costs.hotelCost;
        if (costs.consumablesCost !== undefined) updates.consumables_cost = costs.consumablesCost;
        if (costs.additionalCosts !== undefined) updates.additional_costs = costs.additionalCosts;

        if (Object.keys(updates).length === 0) return;

        const { error } = await supabase
            .from('installations')
            .update(updates)
            .eq('id', installationId);

        if (error) throw error;
    },

    // --- End Profitability ---

    async getInstallationsForInstaller(userId: string): Promise<Installation[]> {
        // Implement logic to filter by installer assignment
        // This likely requires a join table 'installation_assignments' or similar
        // For now, returning empty or based on existing logic if any
        // Based on getInstallerManagementStats, assignments exist.

        const { data, error } = await supabase
            .from('installation_assignments')
            .select('installation_id')
            .eq('user_id', userId);

        if (error) throw error;

        const installationIds = data.map(d => d.installation_id);

        if (installationIds.length === 0) return [];

        const { data: installations, error: instError } = await supabase
            .from('installations')
            .select('*')
            .in('id', installationIds);

        if (instError) throw instError;

        return (installations || []).map(row => {
            const rowTyped = row as {
                id: string;
                offer_id: string;
                installation_data: Partial<InstallationData>;
                status: string;
                scheduled_date: string | null;
                team_id?: string;
                created_at: string;
            };
            const installationData = rowTyped.installation_data || {};
            const clientData = installationData.client;

            return {
                id: rowTyped.id,
                offerId: rowTyped.offer_id,
                client: {
                    firstName: clientData?.firstName || '',
                    lastName: clientData?.lastName || '',
                    city: clientData?.city || '',
                    address: clientData?.address || '',
                    phone: clientData?.phone || '',
                    postalCode: clientData?.postalCode || undefined,
                    coordinates: clientData?.coordinates || undefined
                },
                productSummary: installationData.productSummary || '',
                status: rowTyped.status as Installation['status'],
                scheduledDate: rowTyped.scheduled_date || undefined,
                teamId: installationData.teamId || rowTyped.team_id,
                notes: installationData.notes,
                createdAt: new Date(rowTyped.created_at)
            };
        });
    },

    async assignInstaller(installationId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('installation_assignments')
            .insert({ installation_id: installationId, user_id: userId });
        if (error) throw error;
    },

    async unassignInstaller(installationId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('installation_assignments')
            .delete()
            .match({ installation_id: installationId, user_id: userId });
        if (error) throw error;
    },


    async getInstallations(): Promise<Installation[]> {
        // 1. Fetch installations
        const { data: installations, error } = await supabase
            .from('installations')
            .select('*')
            .order('scheduled_date', { ascending: true });

        if (error) throw error;
        if (!installations || installations.length === 0) return [];

        // 2. Fetch related contracts to extract Installation details (address etc.)
        const offerIds = installations
            .map(i => i.offer_id)
            .filter(Boolean); // Remove nulls if any

        const contractMap = new Map<string, {
            contractNumber?: string;
            client?: { postalCode?: string };
            orderedItems?: OrderItem[];
        }>();

        if (offerIds.length > 0) {
            const { data: contracts } = await supabase
                .from('contracts')
                .select('offer_id, contract_data')
                .in('offer_id', offerIds);

            contracts?.forEach(c => contractMap.set(c.offer_id, c.contract_data as {
                contractNumber?: string;
                client?: { postalCode?: string };
                orderedItems?: OrderItem[];
            }));
        }

        // 3. Map & Return
        return installations.map(row => {
            const rowTyped = row as {
                id: string;
                offer_id: string;
                customer_id?: string;
                installation_data: Partial<InstallationData>;
                status: string;
                scheduled_date: string | null;
                team_id?: string;
                created_at: string;
                parts_ready?: boolean;
                expected_duration?: number;
                delivery_date?: string;
                acceptance?: Installation['acceptance'];
                source_type?: 'contract' | 'service' | 'manual';
                source_id?: string;
                title?: string;
                customer_feedback?: Installation['customerFeedback'];
            };
            const installationData = rowTyped.installation_data || {};
            const clientData = installationData.client;

            // Get contract data relevant for this installation
            const contractData = contractMap.get(row.offer_id) as {
                contractNumber?: string;
                client?: { postalCode?: string };
            } | undefined;
            const contractNumber = contractData?.contractNumber;
            const contractPostalCode = contractData?.client?.postalCode;

            const client = {
                firstName: clientData?.firstName || '',
                lastName: clientData?.lastName || '',
                city: clientData?.city || '',
                address: clientData?.address || '',
                postalCode: clientData?.postalCode || contractPostalCode, // Fallback to contract postal code
                phone: clientData?.phone || '',
                coordinates: clientData?.coordinates
            };

            const scheduledRaw = rowTyped.scheduled_date;
            const scheduledDate = scheduledRaw ? scheduledRaw.toString().slice(0, 10) : undefined;

            // Calculate parts status logic
            let partsStatus: Installation['partsStatus'] = 'none';
            const contractOriginalData = contractMap.get(row.offer_id);
            const orderedItems = contractOriginalData?.orderedItems;

            if (orderedItems && orderedItems.length > 0) {
                const total = orderedItems.length;
                const delivered = orderedItems.filter(i => i.status === 'delivered').length;

                if (delivered === total) {
                    partsStatus = 'all_delivered';
                } else if (delivered > 0) {
                    partsStatus = 'partial';
                } else {
                    partsStatus = 'pending';
                }
            }

            return {
                id: rowTyped.id,
                offerId: rowTyped.offer_id,
                customerId: rowTyped.customer_id,
                contractNumber, // Add contract number
                client,
                productSummary: installationData.productSummary || '',
                status: rowTyped.status as Installation['status'],
                scheduledDate,
                teamId: installationData.teamId || rowTyped.team_id,
                notes: installationData.notes,
                acceptance: rowTyped.acceptance || installationData.acceptance,
                createdAt: new Date(rowTyped.created_at),
                partsReady: rowTyped.parts_ready,
                partsStatus, // Calculated above
                expectedDuration: rowTyped.expected_duration || 1,
                deliveryDate: rowTyped.delivery_date, // Map from DB
                sourceType: rowTyped.source_type,
                sourceId: rowTyped.source_id,
                title: rowTyped.title,
                customerFeedback: rowTyped.customer_feedback
            };
        });
    },

    async createInstallation(installation: Omit<Installation, 'id' | 'createdAt'>): Promise<Installation> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const installationData = {
            client: installation.client,
            productSummary: installation.productSummary,
            teamId: installation.teamId,
            notes: installation.notes
        };

        const { data, error } = await supabase
            .from('installations')
            .insert({
                offer_id: installation.offerId || null,
                customer_id: installation.customerId || null,
                user_id: user.id,
                scheduled_date: installation.scheduledDate || null,
                status: installation.status,
                installation_data: installationData
            })
            .select()
            .single();

        if (error) throw error;

        return {
            ...installation,
            id: data.id,
            createdAt: new Date(data.created_at)
        } as Installation;
    },

    async createManualInstallation(data: {
        title: string;
        client: Installation['client'];
        description: string;
        teamId?: string;
        scheduledDate?: string;
        expectedDuration?: number;
        sourceType?: Installation['sourceType'];
        sourceId?: string;
    }): Promise<Installation> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const installationData = {
            client: data.client,
            productSummary: data.description, // Use description as summary
            teamId: data.teamId,
            notes: data.description
        };

        const { data: newInst, error } = await supabase
            .from('installations')
            .insert({
                user_id: user.id,
                status: data.scheduledDate ? 'scheduled' : 'pending',
                scheduled_date: data.scheduledDate || null,
                installation_data: installationData,
                source_type: data.sourceType || 'manual',
                source_id: data.sourceId || null,
                title: data.title,
                expected_duration: data.expectedDuration || 1
            })
            .select() // Add select to return the new row for processing
            .single();

        if (error) throw error;

        return {
            id: newInst.id,
            client: data.client,
            productSummary: data.description,
            status: newInst.status as Installation['status'],
            scheduledDate: newInst.scheduled_date,
            teamId: data.teamId,
            notes: data.description,
            createdAt: new Date(newInst.created_at),
            sourceType: 'manual',
            title: data.title,
            expectedDuration: newInst.expected_duration
        } as Installation;
    },

    async updateInstallation(id: string, updates: Partial<Installation>): Promise<void> {
        // First fetch current data to ensure we don't lose fields in JSONB
        const { data: current, error: fetchError } = await supabase
            .from('installations')
            .select('installation_data')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        const currentData = (current?.installation_data as Partial<InstallationData>) || {};

        const dbUpdates: Record<string, unknown> = {};
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.scheduledDate) dbUpdates.scheduled_date = updates.scheduledDate;
        if (updates.partsReady !== undefined) dbUpdates.parts_ready = updates.partsReady;
        if (updates.expectedDuration !== undefined) dbUpdates.expected_duration = updates.expectedDuration;

        // Merge installation_data
        if (updates.client || updates.productSummary || updates.teamId || updates.notes || updates.acceptance) {
            const installationData = {
                ...currentData,
                ...(updates.client && { client: updates.client }),
                ...(updates.productSummary && { productSummary: updates.productSummary }),
                ...(updates.teamId !== undefined && { teamId: updates.teamId }),
                ...(updates.notes && { notes: updates.notes }),
                ...(updates.acceptance && { acceptance: updates.acceptance })
            };

            if (updates.teamId) installationData.teamId = updates.teamId;

            dbUpdates.installation_data = installationData;
        }

        // New fields
        if (updates.sourceType) dbUpdates.source_type = updates.sourceType;
        if (updates.sourceId) dbUpdates.source_id = updates.sourceId;
        if (updates.title) dbUpdates.title = updates.title;
        if (updates.customerFeedback) dbUpdates.customer_feedback = updates.customerFeedback;

        const { error } = await supabase
            .from('installations')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;
        if (error) throw error;
    },

    async getInstallationTeams(): Promise<InstallationTeam[]> {
        const { data, error } = await supabase
            .from('installation_teams')
            .select('*')
            .eq('is_active', true);

        if (error) throw error;

        return data.map((t: any) => {
            // Handle members being JSONB array of strings or objects
            let membersList: { id: string; firstName: string; lastName: string }[] = [];

            if (Array.isArray(t.members)) {
                membersList = t.members.map((m: any, idx: number) => {
                    if (typeof m === 'string') {
                        return {
                            id: `mem-${t.id}-${idx}`,
                            firstName: m,
                            lastName: ''
                        };
                    } else if (typeof m === 'object') {
                        return {
                            id: m.id || `mem-${t.id}-${idx}`,
                            firstName: m.firstName || m.name || '',
                            lastName: m.lastName || ''
                        };
                    }
                    return { id: `unknown-${idx}`, firstName: 'Nieznany', lastName: '' };
                });
            }

            return {
                id: t.id,
                name: t.name,
                color: t.color,
                isActive: t.is_active,
                members: membersList,
                vehicle: t.vehicle,
                workingDays: t.working_days || [1, 2, 3, 4, 5] // Default Mon-Fri if missing
            };
        });
    },

    async autoReschedule(installationId: string): Promise<string | null> {
        // 1. Get Installation
        const installation = await this.getInstallationByOfferId(installationId) || (await this.getInstallations()).find(i => i.id === installationId);
        if (!installation) throw new Error('Installation not found');

        // 2. Identify Team
        if (!installation.teamId) throw new Error('No team assigned to reschedule');

        // 3. Get Team Unavailability & Existing Scheduled Installations
        const { data: unavailability } = await supabase.from('team_unavailability').select('*').eq('team_id', installation.teamId);
        const { data: teamInstallations } = await supabase
            .from('installations')
            .select('scheduled_date')
            .eq('team_id', installation.teamId)
            .neq('id', installationId); // Exclude self

        const blockedDates = new Set<string>();

        // Block leave days
        unavailability?.forEach((u: any) => {
            let d = new Date(u.start_date);
            const end = new Date(u.end_date);
            while (d <= end) {
                blockedDates.add(d.toISOString().split('T')[0]);
                d.setDate(d.getDate() + 1);
            }
        });

        // Block existing installations
        teamInstallations?.forEach((i: any) => {
            if (i.scheduled_date) blockedDates.add(i.scheduled_date.split('T')[0]);
        });

        // 4. Find Next Available Date
        // Start from tomorrow or current scheduled + 1
        let searchDate = new Date();
        if (installation.scheduledDate) {
            const current = new Date(installation.scheduledDate);
            if (current > searchDate) searchDate = current; // Start from current scheduled if in future
        }
        searchDate.setDate(searchDate.getDate() + 1); // Start checking from next day

        // Limit search to 30 days
        for (let i = 0; i < 30; i++) {
            // Skip Weekends
            const day = searchDate.getDay();
            if (day === 0 || day === 6) { // 0=Sun, 6=Sat
                searchDate.setDate(searchDate.getDate() + 1);
                continue;
            }

            const dateStr = searchDate.toISOString().split('T')[0];
            if (!blockedDates.has(dateStr)) {
                // Found it!
                await this.updateInstallation(installationId, {
                    scheduledDate: dateStr,
                    // Log feedback
                    customerFeedback: {
                        ...installation.customerFeedback,
                        rejectedDates: [
                            ...(installation.customerFeedback?.rejectedDates || []),
                            ...(installation.scheduledDate ? [installation.scheduledDate] : [])
                        ],
                        notes: `${installation.customerFeedback?.notes || ''}\nLEO: Auto-rescheduled to ${dateStr}`.trim()
                    }
                });
                return dateStr;
            }

            searchDate.setDate(searchDate.getDate() + 1);
        }

        throw new Error('No available slot found in next 30 days');
    },

    async getBacklogItems(): Promise<{
        contracts: Contract[];
        serviceTickets: ServiceTicket[];
        pendingInstallations: Installation[];
    }> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // 1. Fetch Pending Installations (created but not scheduled or in verification)
        const pendingInst = await this.getInstallations(); // Fetch all and filter in memory for now to reuse mapping logic
        const pendingInstallations = pendingInst.filter(i => i.status === 'pending' || i.status === 'verification');

        // 2. Scheduled/Active Identifiers Map
        // We need to know which offers/contracts/tickets are ALREADY in installations (any status except cancelled)
        const activeInstallations = pendingInst.filter(i => i.status !== 'cancelled');
        const activeOfferIds = new Set(activeInstallations.map(i => i.offerId).filter(Boolean));
        const activeSourceIds = new Set(activeInstallations.map(i => i.sourceId).filter(Boolean));

        // 3. Contracts (Signed, not in active installations)
        const { data: contracts } = await supabase
            .from('contracts')
            .select('*, offers!inner(product)')
            .eq('status', 'signed');

        const backlogContracts = (contracts || []).filter((c: any) =>
            !activeOfferIds.has(c.offer_id) && !activeSourceIds.has(c.id)
        ).map((c: any) => ({
            ...c,
            client: c.contract_data?.client || {}, // Ensure client data is accessible
            product: c.offers?.product // Lift product for easier access
        }));

        // 4. Service Tickets (Active, not in active installations)
        // Tickets that need scheduling: 'new', 'open'
        const { data: tickets } = await supabase
            .from('service_tickets')
            .select('*, client:customers(*)')
            .in('status', ['new', 'open']);

        const backlogTickets = (tickets || []).filter((t: any) =>
            !activeSourceIds.has(t.id) && !t.installation_id
        );

        return {
            contracts: backlogContracts as Contract[],
            serviceTickets: backlogTickets as ServiceTicket[],
            pendingInstallations
        };
    },

    async getAllInstallations(): Promise<Installation[]> {
        return this.getInstallations(); // Alias for consistency if needed, or if logic diverges later.
    },

    async getCustomerInstallations(customerId: string): Promise<Installation[]> {
        // Similar to contracts, we link via offers
        const { data: offers, error: offersError } = await supabase
            .from('offers')
            .select('id')
            .eq('customer_id', customerId);

        if (offersError) throw offersError;
        const offerIds = offers.map(o => o.id);

        // Build query based on whether we have related offers
        let query = supabase
            .from('installations')
            .select('*')
            .order('scheduled_date', { ascending: true });

        if (offerIds.length > 0) {
            // Include both direct links and offer-based links
            query = query.or(`customer_id.eq.${customerId},offer_id.in.(${offerIds.join(',')})`);
        } else {
            // No offers, check for direct customer link only
            query = query.eq('customer_id', customerId);
        }

        const { data, error } = await query;

        if (error) throw error;

        return (data || []).map(row => {
            const installationData = (row as { installation_data: Partial<InstallationData> }).installation_data || {};
            const clientData: Partial<Installation['client']> = installationData.client || {};

            const client = {
                firstName: clientData.firstName || '',
                lastName: clientData.lastName || '',
                city: clientData.city || '',
                address: clientData.address || '',
                phone: clientData.phone || '',
                coordinates: clientData.coordinates
            };

            const scheduledRaw = (row as { scheduled_date: string | null }).scheduled_date;
            const scheduledDate = scheduledRaw ? scheduledRaw.toString().slice(0, 10) : undefined;

            return {
                id: row.id,
                offerId: row.offer_id,
                client,
                productSummary: installationData.productSummary || '',
                status: row.status as Installation['status'],
                scheduledDate,
                teamId: installationData.teamId || (row as { team_id?: string }).team_id,
                notes: installationData.notes,
                createdAt: new Date(row.created_at),
                deliveryDate: (row as { delivery_date?: string }).delivery_date // Map from DB
            };
        });
    },

    async getInstallerManagementStats(): Promise<{
        installer: User;
        totalAssignments: number;
        completedInstallations: number;
        inProgressInstallations: number;
        nextScheduledInstallation?: Installation;
    }[]> {
        // Get all installers
        const installers = await UserService.getInstallers();

        // Get all installations
        const allInstallations = await this.getInstallations();

        // Get all assignments
        const { data: allAssignments, error: assignError } = await supabase
            .from('installation_assignments')
            .select('*');

        if (assignError) throw assignError;

        // Build stats for each installer
        const stats = await Promise.all(installers.map(async (installer) => {
            // Get assignments for this installer
            const assignments = (allAssignments || []).filter((a: { user_id: string; installation_id: string }) => a.user_id === installer.id);
            const assignedInstallationIds = assignments.map((a: { installation_id: string }) => a.installation_id);

            // Filter installations for this installer
            const installerInstallations = allInstallations.filter(inst =>
                assignedInstallationIds.includes(inst.id)
            );

            const completedCount = installerInstallations.filter(i => i.status === 'completed').length;
            const inProgressCount = installerInstallations.filter(i =>
                i.status === 'scheduled' || i.status === 'pending'
            ).length;

            // Find next scheduled installation
            const upcomingInstallations = installerInstallations
                .filter(i => i.scheduledDate && i.status !== 'completed')
                .sort((a, b) => {
                    const dateA = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
                    const dateB = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
                    return dateA - dateB;
                });

            return {
                installer,
                totalAssignments: installerInstallations.length,
                completedInstallations: completedCount,
                inProgressInstallations: inProgressCount,
                nextScheduledInstallation: upcomingInstallations[0]
            };
        }));

        return stats;
    },
    async getTeams(): Promise<InstallationTeam[]> {
        // Fetch teams
        const { data: teams, error: teamsError } = await supabase
            .from('teams')
            .select('*')
            .order('created_at', { ascending: false });

        if (teamsError) throw teamsError;

        // Fetch members for all teams
        const { data: members, error: membersError } = await supabase
            .from('team_members')
            .select('team_id, user_id');

        if (membersError) throw membersError;

        // Fetch profiles for these members
        const userIds = Array.from(new Set((members || []).map(m => m.user_id)));
        const profileMap = new Map<string, { id: string; full_name?: string }>();

        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', userIds);

            if (profiles) {
                profiles.forEach(p => profileMap.set(p.id, p));
            }
        }

        // Map members to teams
        return teams.map((team: {
            id: string;
            name: string;
            color: string;
            is_active: boolean;
            working_days?: number[];
            tags?: string[];
            notes?: string;
            fuel_consumption?: number;
            vehicle_maintenance_rate?: number;
        }) => {
            const teamMembers = (members || [])
                .filter((m: { team_id: string; user_id: string }) => m.team_id === team.id)
                .map((m: { team_id: string; user_id: string }) => {
                    const profile = profileMap.get(m.user_id);
                    const fullName = profile?.full_name || 'Unknown User';
                    const parts = fullName.split(' ');
                    const firstName = parts[0] || '';
                    const lastName = parts.slice(1).join(' ') || '';

                    return {
                        id: m.user_id,
                        firstName,
                        lastName
                    };
                });

            return {
                id: team.id,
                name: team.name,
                color: team.color,
                isActive: team.is_active,
                workingDays: team.working_days || [1, 2, 3, 4, 5], // Default Mon-Fri
                tags: team.tags || [],
                notes: team.notes || '',
                members: teamMembers,
                fuelConsumption: team.fuel_consumption !== undefined ? team.fuel_consumption : 12,
                vehicleMaintenanceRate: team.vehicle_maintenance_rate !== undefined ? team.vehicle_maintenance_rate : 0
            };
        });
    },

    async getTeamUnavailability(teamId: string): Promise<TeamUnavailability[]> {
        const { data, error } = await supabase
            .from('team_unavailability')
            .select('*')
            .eq('team_id', teamId)
            .order('start_date', { ascending: true });

        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            teamId: row.team_id,
            startDate: row.start_date,
            endDate: row.end_date,
            reason: row.reason,
            createdAt: new Date(row.created_at)
        }));
    },

    async getAllTeamUnavailability(): Promise<TeamUnavailability[]> {
        const { data, error } = await supabase
            .from('team_unavailability')
            .select('*')
            .order('start_date', { ascending: true });

        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            teamId: row.team_id,
            startDate: row.start_date,
            endDate: row.end_date,
            reason: row.reason,
            createdAt: new Date(row.created_at)
        }));
    },

    async addTeamUnavailability(data: Omit<TeamUnavailability, 'id' | 'createdAt'>): Promise<TeamUnavailability> {
        const { data: created, error } = await supabase
            .from('team_unavailability')
            .insert({
                team_id: data.teamId,
                start_date: data.startDate,
                end_date: data.endDate,
                reason: data.reason
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: created.id,
            teamId: created.team_id,
            startDate: created.start_date,
            endDate: created.end_date,
            reason: created.reason,
            createdAt: new Date(created.created_at)
        };
    },

    async deleteTeamUnavailability(id: string): Promise<void> {
        const { error } = await supabase
            .from('team_unavailability')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async checkTeamAvailability(teamId: string, startDate: string, duration: number = 1): Promise<{ available: boolean; warning?: string }> {
        // Fetch team details (working days)
        const [teams, unavailability] = await Promise.all([
            this.getTeams(),
            this.getTeamUnavailability(teamId)
        ]);

        const team = teams.find(t => t.id === teamId);
        if (!team) return { available: false, warning: 'Nie znaleziono ekipy' };

        const workingDays = team.workingDays || [1, 2, 3, 4, 5];
        const start = new Date(startDate);
        const end = new Date(start);
        end.setDate(start.getDate() + duration - 1); // Inclusive end date

        const startStr = startDate;
        const endStr = end.toISOString().split('T')[0];

        // 1. Check existing installations overlap
        const { data: conflicts, error } = await supabase
            .from('installations')
            .select('id, scheduled_date, installation_data')
            .eq('team_id', teamId)
            // Logic: overlapping if (StartA <= EndB) and (EndA >= StartB)
            // Here we check if any existing installation overlaps with our new range
            // existing_start <= new_end AND (existing_start + duration) >= new_start
            // Simplified query: Check direct date matches for now, ensuring deep overlap check might be complex in PostgREST without a custom function
            // Let's use a simpler range check for the primary day
            .gte('scheduled_date', startStr)
            .lte('scheduled_date', endStr)
            .not('status', 'eq', 'cancelled') // Ignore cancelled
            .not('status', 'eq', 'completed'); // Maybe ignore completed too? Usually completed are past, but if rescheduling to past... let's keep it safe.

        if (error) {
            console.error('Error checking installation conflicts:', error);
        }

        if (conflicts && conflicts.length > 0) {
            return { available: true, warning: `W tym terminie ekipa ma już zaplanowany montaż (${conflicts.length}).` };
        }

        // 2. Iterate days for Working Days & Vacation Unavailability
        for (let i = 0; i < duration; i++) {
            const current = new Date(start);
            current.setDate(start.getDate() + i);
            const dateStr = current.toISOString().split('T')[0];
            const dayOfWeek = current.getDay() || 7; // JS 0=Sun -> ISO 7=Sun

            // Check working days
            if (!workingDays.includes(dayOfWeek)) {
                return { available: true, warning: `Dzień ${dateStr} jest oznaczony jako wolny (Dzień tygodnia: ${dayOfWeek}).` };
            }

            // Check unavailability (Vacation)
            const vacation = unavailability.find(u =>
                dateStr >= u.startDate && dateStr <= u.endDate
            );

            if (vacation) {
                return { available: true, warning: `Dzień ${dateStr} jest zajęty: ${vacation.reason || 'Niedostępność'}` };
            }
        }

        return { available: true };
    },

    async getInstallerStats(userId: string): Promise<{ completedCount: number }> {
        // Count completed installations assigned to this installer
        // First get assignments
        const { data: assignments, error: assignError } = await supabase
            .from('installation_assignments')
            .select('installation_id')
            .eq('user_id', userId);

        if (assignError) throw assignError;

        // If no assignments, return 0
        if (!assignments || assignments.length === 0) return { completedCount: 0 };

        const ids = assignments.map((a: { installation_id: string }) => a.installation_id);

        const { count, error } = await supabase
            .from('installations')
            .select('*', { count: 'exact', head: true })
            .in('id', ids)
            .eq('status', 'completed');

        if (error) throw error;

        return { completedCount: count || 0 };
    },

    async getAssignmentsForInstallation(installationId: string): Promise<string[]> {
        const { data, error } = await supabase
            .from('installation_assignments')
            .select('user_id')
            .eq('installation_id', installationId);

        if (error) throw error;

        return (data || []).map(row => (row as { user_id: string }).user_id);
    },

    async createTeam(
        name: string,
        color: string,
        memberIds: string[],
        tags: string[] = [],
        notes: string = '',
        is_active: boolean = true,
        workingDays: number[] = [1, 2, 3, 4, 5],
        fuelConsumption: number = 12,
        vehicleMaintenanceRate: number = 0
    ): Promise<void> {
        // 1. Create team
        const { data: team, error: teamError } = await supabase
            .from('teams')
            .insert({
                name,
                color,
                tags,
                notes,
                is_active,
                working_days: workingDays,
                fuel_consumption: fuelConsumption,
                vehicle_maintenance_rate: vehicleMaintenanceRate
            })
            .select()
            .single();

        if (teamError) throw teamError;

        // 2. Add members
        if (memberIds.length > 0) {
            const membersData = memberIds.map(userId => ({
                team_id: team.id,
                user_id: userId
            }));

            const { error: membersError } = await supabase
                .from('team_members')
                .insert(membersData);

            if (membersError) throw membersError;
        }
    },

    async updateTeam(
        id: string,
        name: string,
        color: string,
        memberIds: string[],
        tags: string[] = [],
        notes: string = '',
        is_active: boolean = true,
        workingDays: number[] = [1, 2, 3, 4, 5],
        fuelConsumption: number = 12,
        vehicleMaintenanceRate: number = 0
    ): Promise<void> {
        // 1. Update team details
        const { error: teamError } = await supabase
            .from('teams')
            .update({
                name,
                color,
                tags,
                notes,
                is_active,
                working_days: workingDays,
                fuel_consumption: fuelConsumption,
                vehicle_maintenance_rate: vehicleMaintenanceRate
            })
            .eq('id', id);

        if (teamError) throw teamError;

        // 2. Update members (delete all and re-insert)
        // Transaction would be better but simple approach for now
        const { error: deleteError } = await supabase
            .from('team_members')
            .delete()
            .eq('team_id', id);

        if (deleteError) throw deleteError;

        if (memberIds.length > 0) {
            const membersData = memberIds.map(userId => ({
                team_id: id,
                user_id: userId
            }));

            const { error: membersError } = await supabase
                .from('team_members')
                .insert(membersData);

            if (membersError) throw membersError;
        }
    },

    async deleteTeam(id: string): Promise<void> {
        const { error } = await supabase
            .from('teams')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- Order Management ---

    async getOrderItems(installationId: string): Promise<OrderItem[]> {
        const { data, error } = await supabase
            .from('installation_order_items')
            .select('*')
            .eq('installation_id', installationId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return data.map((item: {
            id: string;
            installation_id: string;
            name: string;
            type: string;
            quantity: number | string;
            status: string;
            planned_delivery_date?: string;
            ordered_at?: string;
            notes?: string;
            is_manager_responsible: boolean;
            created_at: string;
            updated_at: string;
        }) => ({
            id: item.id,
            installationId: item.installation_id,
            name: item.name,
            type: item.type as OrderItem['type'],
            quantity: Number(item.quantity),
            status: item.status as OrderItemStatus,
            plannedDeliveryDate: item.planned_delivery_date,
            orderedAt: item.ordered_at ? new Date(item.ordered_at) : undefined,
            notes: item.notes || '',
            isManagerResponsible: item.is_manager_responsible,
            createdAt: new Date(item.created_at),
            updatedAt: new Date(item.updated_at)
        }));
    },



    async upsertOrderItem(item: Partial<OrderItem> & { installationId: string }): Promise<OrderItem> {
        const payload: {
            id?: string;
            installation_id: string;
            name?: string;
            type?: string;
            quantity?: number;
            status?: string;
            planned_delivery_date?: string;
            ordered_at?: string;
            notes?: string;
            is_manager_responsible?: boolean;
            updated_at?: string;
        } = {
            installation_id: item.installationId,
            name: item.name,
            type: item.type,
            quantity: item.quantity,
            status: item.status,
            planned_delivery_date: item.plannedDeliveryDate,
            ordered_at: item.orderedAt?.toISOString(),
            notes: item.notes,
            is_manager_responsible: item.isManagerResponsible
        };

        if (item.id) {
            payload.id = item.id;
            payload.updated_at = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from('installation_order_items')
            .upsert(payload)
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            installationId: data.installation_id,
            name: data.name,
            type: data.type,
            quantity: Number(data.quantity),
            status: data.status,
            plannedDeliveryDate: data.planned_delivery_date,
            orderedAt: data.ordered_at ? new Date(data.ordered_at) : undefined,
            notes: data.notes || '',
            isManagerResponsible: data.is_manager_responsible,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at)
        };
    },

    async deleteOrderItem(id: string): Promise<void> {
        const { error } = await supabase
            .from('installation_order_items')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async syncOrderItemsFromConfig(installationId: string, config: ProductConfig): Promise<void> {
        const existingItems = await this.getOrderItems(installationId);
        const existingNames = new Set(existingItems.map(i => i.name));

        const itemsToCreate: {
            installation_id: string;
            name: string;
            type: string;
            quantity: number;
            is_manager_responsible: boolean;
        }[] = [];

        // 1. WPC Flooring
        const flooring = config.addons?.find((a: SelectedAddon) => a.type === 'wpc-floor');
        if (flooring && !existingNames.has('WPC Flooring')) {
            itemsToCreate.push({
                installation_id: installationId,
                name: 'WPC Flooring',
                type: 'flooring',
                quantity: flooring.width && flooring.height ? (flooring.width * flooring.height) / 10000 : 1,
                is_manager_responsible: true
            });
        }

        // 2. Custom Items
        if (config.customItems) {
            config.customItems.forEach((item) => {
                const name = `Custom: ${item.name}`;
                if (!existingNames.has(name)) {
                    itemsToCreate.push({
                        installation_id: installationId,
                        name: name,
                        type: 'custom',
                        quantity: item.quantity,
                        is_manager_responsible: true
                    });
                }
            });
        }

        // 3. Addons
        if (config.addons) {
            config.addons.forEach((addon: SelectedAddon) => {
                if (addon.type === 'wpc-floor') return;
                const name = `${addon.name} (${addon.type})`;
                if (!existingNames.has(name)) {
                    itemsToCreate.push({
                        installation_id: installationId,
                        name: name,
                        type: 'addon',
                        quantity: addon.quantity || 1,
                        is_manager_responsible: false
                    });
                }
            });
        }

        // 4. Accessories
        if (config.selectedAccessories) {
            config.selectedAccessories.forEach((acc: { name: string; quantity: number }) => {
                const name = `Accessory: ${acc.name}`;
                if (!existingNames.has(name)) {
                    itemsToCreate.push({
                        installation_id: installationId,
                        name: name,
                        type: 'accessory',
                        quantity: acc.quantity,
                        is_manager_responsible: true
                    });
                }
            });
        }

        if (itemsToCreate.length > 0) {
            const { error } = await supabase
                .from('installation_order_items')
                .insert(itemsToCreate);

            if (error) console.error('Error syncing order items:', error);
        }
    },
};
