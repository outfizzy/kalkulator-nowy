import { supabase } from '../../lib/supabase';
import type { Installation, User, InstallationTeam, TeamUnavailability, OrderItem, OrderItemStatus, ProductConfig, SelectedAddon, InstallationWorkLog, Contract, ServiceTicket } from '../../types';
import { UserService } from './user.service';
import { InstallationTeamService } from './installation-team.service';
import { GoogleCalendarService } from '../google-calendar.service';

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
    /**
     * Fire-and-forget Google Calendar sync helper.
     * Never blocks the main operation — errors are logged and swallowed.
     */
    async _syncToGoogleCalendar(installationId: string, installation?: Partial<Installation>): Promise<void> {
        try {
            // Fetch full installation if not provided
            let fullInstallation = installation;
            if (!fullInstallation?.scheduledDate || !fullInstallation?.client) {
                const allInstallations = await this.getInstallations();
                fullInstallation = allInstallations.find(i => i.id === installationId);
            }
            if (!fullInstallation?.scheduledDate) return; // No date = no calendar event

            // Get existing google_event_id
            const { data: row } = await supabase
                .from('installations')
                .select('google_event_id')
                .eq('id', installationId)
                .single();

            const googleEventId = row?.google_event_id || null;

            // Sync to Google Calendar
            const newEventId = await GoogleCalendarService.syncInstallation(
                fullInstallation as Installation,
                googleEventId
            );

            // Store google_event_id if new
            if (newEventId && newEventId !== googleEventId) {
                await supabase
                    .from('installations')
                    .update({ google_event_id: newEventId })
                    .eq('id', installationId);
            }
        } catch (err) {
            console.warn('[GCal] Auto-sync failed (non-blocking):', err);
        }
    },

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
            email: clientData.email || '',
            coordinates: clientData.coordinates
        };

        const scheduledRaw = (data as { scheduled_date: string | null }).scheduled_date;
        const scheduledDate = scheduledRaw ? scheduledRaw.toString().slice(0, 10) : undefined;

        return {
            id: data.id,
            offerId: data.offer_id,
            client,
            contractNumber: installationData.contractNumber,
            productSummary: installationData.productSummary || '',
            status: data.status as Installation['status'],
            scheduledDate,
            teamId: installationData.teamId || (data as { team_id?: string }).team_id,
            notes: installationData.notes,
            acceptance: installationData.acceptance,
            completionReport: (installationData as any).completionReport,
            createdAt: new Date(data.created_at),
            partsReady: (data as { parts_ready?: boolean }).parts_ready,
            expectedDuration: (data as { expected_duration?: number }).expected_duration || 1,
            deliveryDate: (data as { delivery_date?: string }).delivery_date,
            measurementTasks: (installationData as any).measurementTasks || []
        };
    },

    async bulkCreateInstallations(contractIds: string[]): Promise<Installation[]> {
        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Fetch contracts with associated offers (LEFT JOIN to include manual contracts)
        const { data: contracts, error: contractsError } = await supabase
            .from('contracts')
            .select('*, contract_data, offers(*)')
            .in('id', contractIds);

        if (contractsError) {
            console.error('Error fetching contracts:', contractsError);
            throw contractsError;
        }
        if (!contracts || contracts.length === 0) return [];

        const createdInstallations: Installation[] = [];

        for (const contractRow of contracts) {
            // Check if installation already exists (skip if offer_id exists and has installation)
            if (contractRow.offer_id) {
                const exists = await this.checkInstallationForContract(contractRow.offer_id);
                if (exists) {
                    console.warn(`Installation already exists for offer ${contractRow.offer_id}, skipping`);
                    continue;
                }
            }

            const contractData = contractRow.contract_data;
            if (!contractData) {
                console.error(`Contract ${contractRow.id} has no contract_data, skipping`);
                continue;
            }

            const client = contractData.client || contractData.customer;
            if (!client) {
                console.error(`Contract ${contractRow.id} has no client data, skipping`);
                continue;
            }

            // Build product summary - handle both regular and manual contracts
            let productSummary = '';
            if (contractData.product) {
                const product = contractData.product;
                if (product.modelId && product.width && product.projection) {
                    productSummary = `${product.modelId} ${product.width}x${product.projection} mm`;
                } else if (product.modelId) {
                    productSummary = product.modelId;
                } else if (product.customItems && product.customItems.length > 0) {
                    // Manual contract with custom items
                    productSummary = product.customItems.map((item: any) => item.name).join(', ');
                } else {
                    productSummary = 'Umowa manualna';
                }
            } else {
                productSummary = contractRow.contract_number || 'Montaż';
            }

            const installationData = {
                client: {
                    firstName: client.firstName || client.name?.split(' ')[0] || '',
                    lastName: client.lastName || client.name?.split(' ').slice(1).join(' ') || '',
                    city: client.city || '',
                    postalCode: client.postalCode || client.zip || '',
                    address: `${client.street || ''} ${client.houseNumber || ''} `.trim(),
                    phone: client.phone || '',
                    email: client.email || '',
                    coordinates: undefined
                },
                productSummary
            };

            const { data: newInstallation, error: insertError } = await supabase
                .from('installations')
                .insert({
                    offer_id: contractRow.offer_id || null,
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

            // Automation: Sync order items from offer configuration (only if offer exists)
            const offerData = contractRow.offers as unknown as { product: ProductConfig } | null;
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
                offerId: contractRow.offer_id || undefined,
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
            photos?: string[];
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
                        // Auto-email disabled per user request — feedback is sent manually via FeedbackRequestWidget
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

    async addManualWorkLog(installationId: string, startTime: string, endTime: string, userIds: string[]): Promise<void> {
        const { error } = await supabase
            .from('installation_work_logs')
            .insert({
                installation_id: installationId,
                start_time: startTime, // ISO string
                end_time: endTime,     // ISO string
                user_ids: userIds
            });

        if (error) throw error;
    },

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

    async updateFinancials(installationId: string, costs: { hotelCost?: number; consumablesCost?: number; additionalCosts?: number; status?: Installation['status'] }): Promise<void> {
        const updates: Record<string, unknown> = {};
        if (costs.hotelCost !== undefined) updates.hotel_cost = costs.hotelCost;
        if (costs.consumablesCost !== undefined) updates.consumables_cost = costs.consumablesCost;
        if (costs.additionalCosts !== undefined) updates.additional_costs = costs.additionalCosts;
        if (costs.status !== undefined) updates.status = costs.status;

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
                    email: clientData?.email || '',
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
                email: clientData?.email || '',
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
                customerFeedback: rowTyped.customer_feedback,
                completionReport: (installationData as any).completionReport,
                measurementTasks: (installationData as any).measurementTasks || []
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
            notes: installation.notes,
            acceptance: installation.acceptance
        };

        const insertPayload: Record<string, unknown> = {
            offer_id: installation.offerId || null,
            customer_id: installation.customerId || null,
            user_id: user.id,
            scheduled_date: installation.scheduledDate || null,
            status: installation.status,
            installation_data: installationData,
            // Map flat columns
            source_type: installation.sourceType || 'contract', // Default per existing logic
            source_id: installation.sourceId || null,
            team_id: installation.teamId || null,
            parts_ready: installation.partsReady || false,
            expected_duration: installation.expectedDuration || 1,
            delivery_date: installation.deliveryDate || null,
            title: installation.title || null
        };

        const { data, error } = await supabase
            .from('installations')
            .insert(insertPayload)
            .select()
            .single();

        if (error) throw error;

        const created = {
            ...installation,
            id: data.id,
            createdAt: new Date(data.created_at)
        } as Installation;

        // Fire-and-forget Google Calendar sync
        this._syncToGoogleCalendar(data.id, created);

        return created;
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
                expected_duration: data.expectedDuration || 1,
                team_id: data.teamId || null
            })
            .select() // Add select to return the new row for processing
            .single();

        if (error) throw error;

        const created = {
            id: newInst.id,
            client: data.client,
            productSummary: data.description,
            status: newInst.status as Installation['status'],
            scheduledDate: newInst.scheduled_date,
            teamId: data.teamId,
            notes: data.description,
            createdAt: new Date(newInst.created_at),
            sourceType: data.sourceType || 'manual',
            title: data.title,
            expectedDuration: newInst.expected_duration
        } as Installation;

        // Fire-and-forget Google Calendar sync
        this._syncToGoogleCalendar(newInst.id, created);

        return created;
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
        if (updates.deliveryDate !== undefined) dbUpdates.delivery_date = updates.deliveryDate;

        // Ensure team_id column is updated if teamId provided
        if (updates.teamId !== undefined) {
            dbUpdates.team_id = updates.teamId || null;
        }

        // Merge installation_data
        if (updates.client || updates.productSummary || updates.teamId || updates.notes || updates.acceptance || updates.measurementTasks || (updates as any).completionReport) {
            const installationData = {
                ...currentData,
                ...(updates.client && { client: updates.client }),
                ...(updates.productSummary && { productSummary: updates.productSummary }),
                ...(updates.teamId !== undefined && { teamId: updates.teamId }),
                ...(updates.notes && { notes: updates.notes }),
                ...(updates.acceptance && { acceptance: updates.acceptance }),
                ...(updates.measurementTasks !== undefined && { measurementTasks: updates.measurementTasks }),
                ...((updates as any).completionReport && { completionReport: (updates as any).completionReport })
            };

            // Redundant assignment for clarity: updates.teamId handles logic above
            // if (updates.teamId) installationData.teamId = updates.teamId;

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

        // Fire-and-forget Google Calendar sync (for date/status changes)
        if (updates.scheduledDate || updates.status || updates.client || updates.teamId) {
            this._syncToGoogleCalendar(id);
        }
    },
    async getInstallationTeams(): Promise<InstallationTeam[]> {
        return InstallationTeamService.getTeams();
    },
    async getTeams(): Promise<InstallationTeam[]> {
        return InstallationTeamService.getTeams();
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
        followUps: Installation[];
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

        // 3. Contracts (Draft or Signed, not in active installations)
        // Manual fetch approach - JOIN was breaking the query
        const { data: contracts, error: contractsError } = await supabase
            .from('contracts')
            .select('*, contract_data')
            .in('status', ['draft', 'sent', 'viewed', 'signed', 'accepted']);

        if (contractsError) {
            console.error('Error fetching contracts:', contractsError);
        }

        // 3b. Fetch Offers separately for supply info and fallback data
        const offerIds = (contracts || [])
            .map((c: any) => c.offer_id)
            .filter((id: string) => !!id);

        const offerMap = new Map();

        if (offerIds.length > 0) {
            const { data: offers, error: offersError } = await supabase
                .from('offers')
                .select('id, offer_number, customer_id, client_id, customer_data, product_config, orders(status, delivery_date, planned_delivery_date)')
                .in('id', offerIds);

            if (offersError) {
                console.error('Error fetching offers:', offersError);
            }

            offers?.forEach((o: any) => {
                offerMap.set(o.id, o);
            });
        }

        // 3c. Fetch Customer Data Separately (Robustness for legacy data/live updates)
        const clientIds = new Set<string>();
        (contracts || []).forEach((c: any) => {
            // Try all possible fields for client ID
            if (c.client_id) clientIds.add(c.client_id);
            if (c.customer_id) clientIds.add(c.customer_id);
            if (c.contract_data?.client?.id) clientIds.add(c.contract_data.client.id);
            if (c.contract_data?.customer?.id) clientIds.add(c.contract_data.customer.id);

            // Check linked Offer
            const offer = offerMap.get(c.offer_id);
            if (offer) {
                if (offer.customer_id) clientIds.add(offer.customer_id);
                if (offer.client_id) clientIds.add(offer.client_id);
                if (offer.customer_data?.id) clientIds.add(offer.customer_data.id);
            }
        });



        const clientMap = new Map();
        if (clientIds.size > 0) {
            const { data: clients } = await supabase
                .from('customers')
                .select('*')
                .in('id', Array.from(clientIds));

            clients?.forEach(c => clientMap.set(c.id, c));
        }


        const backlogContracts = (contracts || []).filter((c: any) =>
            !activeOfferIds.has(c.offer_id) && !activeSourceIds.has(c.id)
        ).map((c: any) => {
            const offer = offerMap.get(c.offer_id); // Use manual map
            const orders = offer?.orders || [];

            // Supply Status Logic
            const isDelivered = orders.length > 0 && orders.every((o: any) => o.status === 'delivered');
            const isOrdered = orders.length > 0 && orders.some((o: any) => o.status === 'ordered' || o.status === 'confirmed');
            const deliveryDate = orders.find((o: any) => o.delivery_date)?.delivery_date || orders.find((o: any) => o.planned_delivery_date)?.planned_delivery_date;

            // Resolve Client Data
            const snapshotClient = c.contract_data?.client || c.contract_data?.customer || offer?.customer_data || {};
            // Try to find the live record
            const clientId = c.client_id || c.customer_id || snapshotClient.id || offer?.customer_id || offer?.client_id;
            const liveClient = clientMap.get(clientId) || {};

            // Construct address from live client if available (handling both 'address' col and 'street'+'house_number')
            const liveAddress = liveClient.address || (liveClient.street ? `${liveClient.street} ${liveClient.house_number || ''}`.trim() : '');

            const resolvedClient = {
                // Base on snapshot (camelCase)
                ...snapshotClient,
                // Overwrite with live data (these take precedence)
                ...liveClient,
                // Final explicit mappings to ensure correct values
                address: liveAddress || snapshotClient.address || '',
                city: liveClient.city || snapshotClient.city || '',
                postalCode: liveClient.postal_code || snapshotClient.postalCode || snapshotClient.postal_code || '',
                firstName: liveClient.first_name || snapshotClient.firstName || '',
                lastName: liveClient.last_name || snapshotClient.lastName || '',
                name: liveClient.name || snapshotClient.name || ''
            };




            return {
                ...c,
                contractNumber: c.contract_number || c.contract_data?.contractNumber || offer?.offer_number || 'Brak numeru',
                contractData: {
                    ...c.contract_data,
                    client: resolvedClient
                },
                client: resolvedClient, // Direct access
                product: c.contract_data?.product || c.product || offer?.product_config,
                orderedItems: c.contract_data?.orderedItems || [],
                installationDaysEstimate: c.contract_data?.installation_days_estimate || c.installation_days_estimate,
                supplyInfo: {
                    status: isDelivered ? 'delivered' : isOrdered ? 'ordered' : 'none',
                    deliveryDate: deliveryDate
                }
            };
        });


        // 4. Service Tickets (Active, not in active installations)
        // Tickets that need scheduling: 'new', 'open'
        const { data: tickets } = await supabase
            .from('service_tickets')
            .select('*, client:customers(*)')
            .in('status', ['new', 'open']);

        const backlogTickets = (tickets || []).filter((t: any) =>
            !activeSourceIds.has(t.id)
        );

        // 5. Follow-Up Installations: completed/verified with pending order items + manual follow-ups
        let followUps: Installation[] = [];
        try {
            const completedInstallations = pendingInst.filter(i =>
                i.status === 'completed' || i.status === 'verification'
            );

            if (completedInstallations.length > 0) {
                const completedIds = completedInstallations.map(i => i.id);
                const { data: orderItems } = await supabase
                    .from('installation_order_items')
                    .select('installation_id, name, status')
                    .in('installation_id', completedIds)
                    .neq('status', 'delivered');

                if (orderItems && orderItems.length > 0) {
                    // Group by installation ID
                    const pendingByInstallation = new Map<string, string[]>();
                    orderItems.forEach((item: any) => {
                        const list = pendingByInstallation.get(item.installation_id) || [];
                        list.push(item.name);
                        pendingByInstallation.set(item.installation_id, list);
                    });

                    // Mark installations that have pending items as follow-ups
                    followUps = completedInstallations
                        .filter(i => pendingByInstallation.has(i.id))
                        .map(i => ({
                            ...i,
                            followUpItems: pendingByInstallation.get(i.id) || [],
                            sourceType: 'followup' as any,
                            sourceId: i.id
                        }));
                }
            }

            // 5b. Also include manually-created follow-up installations (from "Dokończenie" completion action)
            const manualFollowUps = pendingInst.filter(i =>
                i.sourceType === 'followup' && (i.status === 'pending' || i.status === 'scheduled')
            );
            // Avoid duplicates (an installation already in followUps from order items)
            const existingFollowUpIds = new Set(followUps.map(f => f.id));
            manualFollowUps.forEach(fu => {
                if (!existingFollowUpIds.has(fu.id)) {
                    followUps.push(fu);
                }
            });
        } catch (e) {
            console.error('Error fetching follow-ups:', e);
        }

        return {
            contracts: backlogContracts as Contract[],
            serviceTickets: backlogTickets as ServiceTicket[],
            pendingInstallations,
            followUps
        };
    },

    async getAllInstallations(): Promise<Installation[]> {
        return this.getInstallations();
    },

    /**
     * Complete an installation and create a new Service Ticket so it appears in the Serwis backlog tab.
     */
    async completeAndCreateServiceTicket(
        installationId: string,
        description: string
    ): Promise<void> {
        // 1. Fetch installation data
        const allInst = await this.getInstallations();
        const installation = allInst.find(i => i.id === installationId);
        if (!installation) throw new Error('Installation not found');

        // 2. Mark installation as completed
        const { data: { user } } = await supabase.auth.getUser();
        await supabase
            .from('installations')
            .update({
                status: 'completed',
                acceptance: {
                    acceptedAt: new Date().toISOString(),
                    clientName: `${installation.client?.firstName} ${installation.client?.lastName}`,
                    notes: `Zakończono z przekierowaniem do Serwisu: ${user?.email || 'Admin'}`
                }
            })
            .eq('id', installationId);

        // 3. Resolve client ID from contract
        let clientId: string | null = null;
        let contractId: string | null = null;
        if (installation.offerId) {
            const { data: contract } = await supabase
                .from('contracts')
                .select('id, client_id, customer_id')
                .eq('offer_id', installation.offerId)
                .single();
            if (contract) {
                contractId = contract.id;
                clientId = contract.client_id || contract.customer_id || null;
            }
        }
        // Fallback: try installation's customerId
        if (!clientId && installation.customerId) {
            clientId = installation.customerId;
        }

        // 4. Create a service ticket
        const ticketNumber = `SRV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        await supabase
            .from('service_tickets')
            .insert({
                ticket_number: ticketNumber,
                client_id: clientId,
                contract_id: contractId,
                installation_id: installationId,
                type: 'repair',
                status: 'new',
                priority: 'medium',
                description: description || 'Serwis po montażu',
                photos: []
            });
    },

    /**
     * Complete an installation and create a new follow-up Installation so it appears in the Dokończ. backlog tab.
     */
    async completeAndCreateFollowUp(
        installationId: string,
        description: string
    ): Promise<void> {
        // 1. Fetch installation data
        const allInst = await this.getInstallations();
        const installation = allInst.find(i => i.id === installationId);
        if (!installation) throw new Error('Installation not found');

        // 2. Mark installation as completed
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        await supabase
            .from('installations')
            .update({
                status: 'completed',
                acceptance: {
                    acceptedAt: new Date().toISOString(),
                    clientName: `${installation.client?.firstName} ${installation.client?.lastName}`,
                    notes: `Zakończono z przekierowaniem do Dokończenia: ${user.email || 'Admin'}`
                }
            })
            .eq('id', installationId);

        // 3. Create a new follow-up installation
        const installationData = {
            client: installation.client,
            productSummary: installation.productSummary,
            notes: description || 'Dokończenie montażu',
            contractNumber: installation.contractNumber
        };

        await supabase
            .from('installations')
            .insert({
                offer_id: installation.offerId || null,
                customer_id: installation.customerId || null,
                user_id: user.id,
                status: 'pending',
                installation_data: installationData,
                source_type: 'followup',
                source_id: installationId,
                title: description || 'Dokończenie montażu',
                expected_duration: 1
            });
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
        // Get installer details for members
        const validMemberIds = memberIds.filter(mid => mid && typeof mid === 'string' && mid.trim() !== '');

        let membersJson: any[] = [];
        if (validMemberIds.length > 0) {
            const { data: installers } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, hourly_rate')
                .in('id', validMemberIds);

            membersJson = (installers || []).map(inst => ({
                id: inst.id,
                firstName: inst.first_name || '',
                lastName: inst.last_name || '',
                hourlyRate: inst.hourly_rate || 0,
                type: 'user'
            }));
        }

        // Create in installation_teams table (same table that getTeams reads from)
        const { error: teamError } = await supabase
            .from('installation_teams')
            .insert({
                name,
                color,
                members: membersJson,
                is_active,
                working_days: workingDays,
                fuel_consumption: fuelConsumption,
                vehicle_maintenance_rate: vehicleMaintenanceRate
            });

        if (teamError) throw teamError;
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
        // Get installer details for members
        const validMemberIds = memberIds.filter(mid => mid && typeof mid === 'string' && mid.trim() !== '');

        let membersJson: any[] = [];
        if (validMemberIds.length > 0) {
            const { data: installers } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, hourly_rate')
                .in('id', validMemberIds);

            membersJson = (installers || []).map(inst => ({
                id: inst.id,
                firstName: inst.first_name || '',
                lastName: inst.last_name || '',
                hourlyRate: inst.hourly_rate || 0,
                type: 'user'
            }));
        }

        // Update installation_teams table (same table that getTeams reads from)
        const { error: teamError } = await supabase
            .from('installation_teams')
            .update({
                name,
                color,
                members: membersJson,
                is_active,
                working_days: workingDays,
                fuel_consumption: fuelConsumption,
                vehicle_maintenance_rate: vehicleMaintenanceRate
            })
            .eq('id', id);

        if (teamError) throw teamError;
    },

    async deleteTeam(id: string): Promise<void> {
        // Soft delete from installation_teams table
        const { error } = await supabase
            .from('installation_teams')
            .update({ is_active: false })
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

    async createInstallationFromContract(contractId: string, scheduledDate: string, teamId: string): Promise<Installation> {
        let installation: Installation | null = null;

        // 1. Try creating (this handles 'if not exists')
        // Using bulkCreate logic to reuse object mapping and creation logic
        const created = await this.bulkCreateInstallations([contractId]);

        if (created.length > 0) {
            installation = created[0];
        } else {
            // Already exists? Find it.
            const { data: contract } = await supabase
                .from('contracts')
                .select('offer_id, id')
                .eq('id', contractId)
                .single();

            if (contract?.offer_id) {
                installation = await this.getInstallationByOfferId(contract.offer_id);
            }
            // If manual contract without offer
            if (!installation) {
                const { data: inst } = await supabase
                    .from('installations')
                    .select('*')
                    .eq('source_id', contractId)
                    .eq('source_type', 'contract')
                    .single();

                if (inst) {
                    // Need to map raw DB row to Installation object. 
                    // Simplest way is to fetch via getInstallations (but that fetches all). 
                    // Or just use ID to fetch via getInstallationByOfferId logic (if refactored)
                    // For now, let's assume getInstallationByOfferId handles offer_id.
                    // If manual contract, we might need a direct fetch helper.
                    // Let's use getInstallations filtered by ID in-memory or improve getInstallationByOfferId.
                    // Optimization: Use getInstallationByOfferId if offer_id exists, else direct map.
                    // But getInstallationByOfferId takes offerId.
                    // Let's rely on bulkCreate returning empty ONLY if checkInstallationForContract returned true OR error.
                    // bulkCreate uses checkInstallationForContract which uses offer_id.

                    // If we are here, bulkCreate didn't create it.
                    // Let's assume it exists.
                    // We need the ID to update.
                    installation = { id: inst.id } as Installation; // Minimal needed for update
                }
            }
        }

        if (!installation) throw new Error('Could not create or find installation for contract ' + contractId);

        // 2. Update with schedule details
        await this.updateInstallation(installation.id, {
            scheduledDate,
            teamId,
            status: 'scheduled'
        });

        return installation;
    },

    async createInstallationFromServiceTicket(ticketId: string, scheduledDate: string, teamId: string): Promise<Installation> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // 1. Fetch Ticket
        const { data: ticket, error: ticketError } = await supabase
            .from('service_tickets')
            .select('*, client:customers(*)')
            .eq('id', ticketId)
            .single();

        if (ticketError || !ticket) throw new Error('Service ticket not found');

        // Check if installation already exists for this ticket
        if (ticket.installation_id) {
            await this.updateInstallation(ticket.installation_id, {
                scheduledDate,
                teamId,
                status: 'scheduled'
            });
            return { id: ticket.installation_id } as Installation;
        }

        // 2. Create Installation
        const client = ticket.client || {};

        // Determine client name - customers table uses first_name/last_name columns
        let clientFirstName = client.first_name || '';
        let clientLastName = client.last_name || '';
        let clientCity = client.city || '';
        let clientAddress = `${client.street || ''} ${client.house_number || ''}`.trim();
        let clientPhone = client.phone || '';

        // Fallback: parse from description if no client_id (manual-mode tickets)
        if (!ticket.client_id && ticket.description) {
            const desc = ticket.description;
            const nameMatch = desc.match(/Klient:\s*(.+)/i);
            const addrMatch = desc.match(/Adres:\s*(.+)/i);
            const phoneMatch = desc.match(/Telefon:\s*(.+)/i);
            if (nameMatch) {
                const parts = nameMatch[1].trim().split(' ');
                clientFirstName = parts[0] || '';
                clientLastName = parts.slice(1).join(' ') || '';
            }
            if (addrMatch) {
                clientAddress = addrMatch[1].trim();
                // Try to extract city from address (last word or after comma)
                const addrParts = clientAddress.split(',');
                if (addrParts.length > 1) clientCity = addrParts[addrParts.length - 1].trim();
            }
            if (phoneMatch) clientPhone = phoneMatch[1].trim();
        }

        const installationData = {
            client: {
                firstName: clientFirstName,
                lastName: clientLastName,
                city: clientCity,
                address: clientAddress,
                phone: clientPhone,
                coordinates: undefined
            },
            contractNumber: ticket.contract_number || undefined,
            productSummary: `Zgłoszenie: ${ticket.ticket_number || 'Serwis'}`,
            teamId: teamId,
            notes: ticket.description
        };

        const { data: newInst, error: insertError } = await supabase
            .from('installations')
            .insert({
                user_id: user.id,
                status: 'scheduled',
                scheduled_date: scheduledDate,
                team_id: teamId,
                installation_data: installationData,
                source_type: 'service',
                source_id: ticket.id,
                parts_ready: true // Service usually ready
            })
            .select()
            .single();

        if (insertError) throw insertError;

        // 3. Link back to Ticket
        await supabase
            .from('service_tickets')
            .update({
                installation_id: newInst.id,
                status: 'assigned'
            })
            .eq('id', ticket.id);

        const created = {
            id: newInst.id,
            client: installationData.client,
            productSummary: installationData.productSummary,
            scheduledDate: scheduledDate,
            sourceType: 'service' as const,
            createdAt: new Date(newInst.created_at)
        } as Installation;

        // Fire-and-forget Google Calendar sync
        this._syncToGoogleCalendar(newInst.id, created);

        return created;
    },

    async createFollowUpInstallation(originalInstallationId: string, scheduledDate: string, teamId: string): Promise<Installation> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // 1. Fetch original installation
        const { data: original, error: fetchError } = await supabase
            .from('installations')
            .select('*')
            .eq('id', originalInstallationId)
            .single();

        if (fetchError || !original) throw new Error('Original installation not found');

        // 2. Get pending order items for description
        const { data: pendingItems } = await supabase
            .from('installation_order_items')
            .select('name, status')
            .eq('installation_id', originalInstallationId)
            .neq('status', 'delivered');

        const itemNames = (pendingItems || []).map((i: any) => i.name);
        const pendingDescription = itemNames.length > 0
            ? `Do zamontowania: ${itemNames.join(', ')}`
            : 'Dokończenie montażu';

        // 3. Create follow-up installation
        const originalData = original.installation_data || {};
        const installationData = {
            ...originalData,
            notes: pendingDescription,
            productSummary: `🔄 Dokończenie: ${itemNames.slice(0, 2).join(', ')}${itemNames.length > 2 ? ` +${itemNames.length - 2}` : ''}`,
            teamId: teamId
        };

        const { data: newInst, error: insertError } = await supabase
            .from('installations')
            .insert({
                user_id: user.id,
                status: 'scheduled',
                scheduled_date: scheduledDate,
                team_id: teamId,
                installation_data: installationData,
                source_type: 'followup',
                source_id: originalInstallationId,
                offer_id: original.offer_id,
                parts_ready: false // Parts may not be ready yet
            })
            .select()
            .single();

        if (insertError) throw insertError;

        const createdFollowUp = {
            id: newInst.id,
            scheduledDate: scheduledDate,
            sourceType: 'followup' as const,
            createdAt: new Date(newInst.created_at)
        } as Installation;

        // Fire-and-forget Google Calendar sync
        this._syncToGoogleCalendar(newInst.id);

        return createdFollowUp;
    },

    async createManualFollowUp(originalInstallationId: string, description: string): Promise<Installation> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // 1. Fetch original installation data
        const { data: original, error: fetchError } = await supabase
            .from('installations')
            .select('*')
            .eq('id', originalInstallationId)
            .single();

        if (fetchError || !original) throw new Error('Original installation not found');

        // 2. Create pending follow-up (not scheduled yet — user will drag to calendar)
        const originalData = original.installation_data || {};
        const installationData = {
            ...originalData,
            notes: description,
            productSummary: `🔄 Dokończenie: ${description.slice(0, 60)}${description.length > 60 ? '...' : ''}`
        };

        const { data: newInst, error: insertError } = await supabase
            .from('installations')
            .insert({
                user_id: user.id,
                status: 'pending',
                installation_data: installationData,
                source_type: 'followup',
                source_id: originalInstallationId,
                offer_id: original.offer_id,
                parts_ready: false
            })
            .select()
            .single();

        if (insertError) throw insertError;
        return { id: newInst.id, createdAt: new Date(newInst.created_at) } as Installation;
    },

    async createStandaloneFollowUp(data: {
        clientName: string;
        clientCity: string;
        clientAddress: string;
        clientPhone: string;
        contractNumber: string;
        description: string;
    }): Promise<Installation> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const nameParts = data.clientName.split(' ');
        const installationData = {
            client: {
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                city: data.clientCity,
                address: data.clientAddress,
                phone: data.clientPhone,
                coordinates: undefined
            },
            contractNumber: data.contractNumber || undefined,
            notes: data.description,
            productSummary: `🔄 Dokończenie: ${data.description.slice(0, 60)}${data.description.length > 60 ? '...' : ''}`
        };

        const { data: newInst, error: insertError } = await supabase
            .from('installations')
            .insert({
                user_id: user.id,
                status: 'pending',
                installation_data: installationData,
                source_type: 'followup',
                parts_ready: false
            })
            .select()
            .single();

        if (insertError) throw insertError;
        return { id: newInst.id, createdAt: new Date(newInst.created_at) } as Installation;
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
    async deleteInstallation(id: string): Promise<void> {
        const { error } = await supabase
            .from('installations')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Save completion report for a finished installation.
     * Automatically creates follow-up installations for items that need finishing.
     */
    async saveCompletionReport(
        installationId: string,
        report: {
            notes: string;
            followUpItems: Array<{ name: string; description: string }>;
        }
    ): Promise<{ followUpsCreated: number }> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // 1. Fetch current installation data
        const { data: installation, error: fetchError } = await supabase
            .from('installations')
            .select('*')
            .eq('id', installationId)
            .single();

        if (fetchError || !installation) throw new Error('Installation not found');

        const currentData = (installation.installation_data as Record<string, unknown>) || {};

        // 2. Build completion report object
        const completionReport = {
            completedAt: new Date().toISOString(),
            completedBy: user.id,
            notes: report.notes,
            followUpItems: report.followUpItems
        };

        // 3. Save report into installation_data JSONB
        const updatedData = {
            ...currentData,
            completionReport
        };

        const { error: updateError } = await supabase
            .from('installations')
            .update({ installation_data: updatedData })
            .eq('id', installationId);

        if (updateError) throw updateError;

        // 4. Auto-create follow-up installations for each item
        let followUpsCreated = 0;

        if (report.followUpItems.length > 0) {
            const clientData = (currentData as { client?: Record<string, unknown> }).client || {};
            const contractNumber = (currentData as { contractNumber?: string }).contractNumber || '';

            for (const item of report.followUpItems) {
                try {
                    const followUpData = {
                        client: clientData,
                        contractNumber,
                        notes: item.description || item.name,
                        productSummary: `🔄 Dokończenie: ${item.name}`,
                        completionReport: {
                            sourceInstallationId: installationId,
                            itemName: item.name
                        }
                    };

                    const { error: insertError } = await supabase
                        .from('installations')
                        .insert({
                            user_id: user.id,
                            offer_id: installation.offer_id,
                            status: 'pending',
                            installation_data: followUpData,
                            source_type: 'followup',
                            source_id: installationId,
                            parts_ready: false
                        });

                    if (!insertError) followUpsCreated++;
                } catch (e) {
                    console.error('Error creating follow-up for item:', item.name, e);
                }
            }
        }

        return { followUpsCreated };
    },

    /**
     * Check if an installation needs a completion report.
     */
    needsCompletionReport(installation: Installation): boolean {
        const status = installation.status;
        if (status !== 'completed' && status !== 'verification') return false;
        // Check if completionReport exists in the raw data
        // This relies on the mapper passing through the completionReport field
        return !(installation as any).completionReport;
    },
};
