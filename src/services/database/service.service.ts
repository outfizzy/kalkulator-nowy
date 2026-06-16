import { supabase } from '../../lib/supabase';
import type { ServiceTicket } from '../../types';
import { PostgrestError } from '@supabase/supabase-js';

/**
 * Kolizyjnoodporny numer zgłoszenia serwisowego.
 * Format: SRV-{ROK}-{base36 czasu}{losowy znak} — np. SRV-2026-7K3PQX.
 * Kolumna service_tickets.ticket_number ma UNIQUE; poprzedni 4-cyfrowy random
 * (1000–9999) kolidował już po ~setce zgłoszeń w roku i wywalał INSERT.
 */
export function generateServiceTicketNumber(): string {
    const year = new Date().getFullYear();
    const timePart = Date.now().toString(36).toUpperCase().slice(-5);
    const randPart = Math.floor(Math.random() * 36).toString(36).toUpperCase();
    return `SRV-${year}-${timePart}${randPart}`;
}

export const ServiceService = {
    // Public method for external form (publiczna strona /reklamation).
    // Weryfikuje, że podany e-mail należy DO TEGO kontraktu — bez tego każdy
    // mógłby założyć zgłoszenie na cudzy kontrakt.
    async verifyContract(contractNumber: string, email: string): Promise<{
        verified: boolean;
        contractId?: string;
        clientId?: string;
        installationId?: string;
        error?: string;
    }> {
        const cn = (contractNumber || '').trim();
        const emailNorm = (email || '').trim().toLowerCase();
        if (!cn || !emailNorm) return { verified: false, error: 'Missing data' };

        // Weryfikacja idzie przez RPC SECURITY DEFINER — tabele contracts/customers/
        // installations mają RLS niedostępne dla anon (publiczny formularz), więc
        // bezpośrednie zapytanie z przeglądarki zawsze zwracało "nie znaleziono".
        // RPC dopasowuje numer (z contract_data JSONB) + e-mail klienta server-side.
        const { data, error } = await supabase.rpc('verify_service_contract', {
            p_contract_number: cn,
            p_email: emailNorm,
        });

        if (error) {
            console.error('verify_service_contract RPC error:', error);
            return { verified: false, error: 'Verification failed' };
        }

        const res = (data || {}) as {
            verified?: boolean; contractId?: string; clientId?: string;
            installationId?: string; error?: string;
        };
        if (!res.verified) {
            return { verified: false, error: res.error || 'Contract not found' };
        }

        return {
            verified: true,
            contractId: res.contractId,
            clientId: res.clientId,
            installationId: res.installationId,
        };
    },

    async createTicket(
        ticket: Omit<ServiceTicket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt' | 'photos'>,
        photos: File[]
    ): Promise<{ data: ServiceTicket | null; error: Error | null }> {
        try {
            const ticketNumber = generateServiceTicketNumber();
            const photoUrls: string[] = [];

            // Upload Photos
            for (const file of photos) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${ticketNumber}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('service-tickets') // Bucket created in migration
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage
                    .from('service-tickets')
                    .getPublicUrl(fileName);

                photoUrls.push(urlData.publicUrl);
            }

            const { data, error } = await supabase
                .from('service_tickets')
                .insert({
                    ticket_number: ticketNumber,
                    client_id: ticket.clientId,
                    contract_id: ticket.contractId,
                    installation_id: ticket.installationId,
                    type: ticket.type,
                    status: ticket.status,
                    priority: ticket.priority,
                    description: ticket.description,
                    photos: photoUrls
                })
                .select()
                .single();

            if (error) throw error;

            return { data: this.mapToType(data), error: null };
        } catch (err) {
            console.error('Error creating ticket:', err);
            return { data: null, error: err as Error };
        }
    },

    async uploadResolutionPhoto(ticketId: string, file: File): Promise<{ url: string | null; error: Error | null }> {
        try {
            // Get current ticket to append photo
            const ticket = await this.getTicketById(ticketId);
            if (!ticket) throw new Error('Ticket not found');

            const fileExt = file.name.split('.').pop();
            const fileName = `res_${ticket.ticketNumber}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('service-tickets')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('service-tickets')
                .getPublicUrl(fileName);

            const newUrl = urlData.publicUrl;
            const newPhotos = [...(ticket.photos || []), newUrl];

            // Update ticket
            const { error: updateError } = await this.updateTicket(ticketId, { photos: newPhotos });
            if (updateError) throw updateError;

            return { url: newUrl, error: null };
        } catch (err) {
            console.error('Error uploading resolution photo:', err);
            return { url: null, error: err as Error };
        }
    },

    async getTicketById(id: string): Promise<ServiceTicket | null> {
        const { data, error } = await supabase
            .from('service_tickets')
            .select(`
                *,
                client:client_id ( firstName:first_name, lastName:last_name, email, phone, city, street, houseNumber:house_number, postalCode:postal_code ),
                team:assigned_team_id ( id, name, color ),
                contract:contract_id ( id, contract_data ),
                installation:installation_id ( id, installation_data )
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching ticket:', error);
            return null;
        }

        return this.mapToType(data);
    },

    async getTicketHistory(ticketId: string): Promise<import('../../types').ServiceTicketHistory[]> {
        const { data, error } = await supabase
            .from('service_ticket_history')
            .select(`
                *,
                user:changed_by ( firstName:first_name, lastName:last_name )
            `)
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching ticket history:', error);
            return [];
        }

        return data.map(row => ({
            id: row.id,
            ticketId: row.ticket_id,
            changedBy: row.changed_by,
            changeType: row.change_type,
            oldValue: row.old_value,
            newValue: row.new_value,
            createdAt: new Date(row.created_at),
            user: row.user
        }));
    },

    async getTickets(): Promise<ServiceTicket[]> {
        const { data, error } = await supabase
            .from('service_tickets')
            .select(`
                *,
                client:client_id ( firstName:first_name, lastName:last_name, email, phone, city, street, houseNumber:house_number, postalCode:postal_code ),
                team:assigned_team_id ( id, name, color ),
                contract:contract_id ( id, contract_data ),
                installation:installation_id ( id, installation_data )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map(row => this.mapToType(row));
    },

    async updateTicket(id: string, updates: Partial<ServiceTicket>): Promise<{ error: Error | null }> {
        // Legacy simple update - wraps the new history-aware one
        return this.updateTicketWithHistory(id, updates);
    },

    async updateTicketWithHistory(id: string, updates: Partial<ServiceTicket>, historyNote?: string): Promise<{ error: Error | null }> {
        try {
            // 1. Get current state for history comparison
            const currentTicket = await this.getTicketById(id);
            if (!currentTicket) throw new Error('Ticket not found');

            const { data: { user } } = await supabase.auth.getUser();

            const dbUpdates: any = { ...updates, updated_at: new Date().toISOString() };
            // Fix mapping for DB matches
            if (updates.clientId) dbUpdates.client_id = updates.clientId;
            if (updates.contractId) dbUpdates.contract_id = updates.contractId;
            if ('contractNumber' in updates) dbUpdates.contract_number = updates.contractNumber;
            if (updates.assignedTeamId) dbUpdates.assigned_team_id = updates.assignedTeamId;
            if (updates.scheduledDate) dbUpdates.scheduled_date = updates.scheduledDate;
            if (updates.resolutionNotes) dbUpdates.resolution_notes = updates.resolutionNotes;
            if ('internalNotes' in updates) dbUpdates.internal_notes = updates.internalNotes;
            if ('photoCaptions' in updates) dbUpdates.photo_captions = updates.photoCaptions;
            if (updates.ticketNumber) dbUpdates.ticket_number = updates.ticketNumber;

            // Remove mapped camelCase keys
            delete dbUpdates.clientId;
            delete dbUpdates.contractId;
            delete dbUpdates.contractNumber;
            delete dbUpdates.assignedTeamId;
            delete dbUpdates.scheduledDate;
            delete dbUpdates.resolutionNotes;
            delete dbUpdates.internalNotes;
            delete dbUpdates.photoCaptions;
            delete dbUpdates.ticketNumber;
            delete dbUpdates.client;
            delete dbUpdates.team;
            delete dbUpdates.contract;
            delete dbUpdates.installation;
            delete dbUpdates.assignedTeam;

            // 2. Perform Update
            const { error } = await supabase
                .from('service_tickets')
                .update(dbUpdates)
                .eq('id', id);

            if (error) throw error;

            // 3. Record History
            if (user) {
                const historyEntries: any[] = [];

                // Status Change
                if (updates.status && updates.status !== currentTicket.status) {
                    historyEntries.push({
                        ticket_id: id,
                        changed_by: user.id,
                        change_type: 'status',
                        old_value: currentTicket.status,
                        new_value: updates.status
                    });
                    // Auto-add "Resolved" note if note provided
                    if (updates.status === 'resolved' && historyNote) {
                        // handled below via explicit note entry or purely implied? 
                        // Let's rely on explicit change types
                    }
                }

                // Team Assignment — pobierz realną nazwę zespołu (było hardcode 'Nowy zespół')
                if (updates.assignedTeamId && updates.assignedTeamId !== currentTicket.assignedTeamId) {
                    const { data: newTeam } = await supabase
                        .from('installation_teams')
                        .select('name')
                        .eq('id', updates.assignedTeamId)
                        .maybeSingle();
                    historyEntries.push({
                        ticket_id: id,
                        changed_by: user.id,
                        change_type: 'assignment',
                        old_value: currentTicket.assignedTeam?.name || 'Brak',
                        new_value: newTeam?.name || 'Nieznany zespół'
                    });
                }

                // Scheduled Date
                if (updates.scheduledDate && updates.scheduledDate !== currentTicket.scheduledDate) {
                    historyEntries.push({
                        ticket_id: id,
                        changed_by: user.id,
                        change_type: 'info',
                        old_value: currentTicket.scheduledDate ? new Date(currentTicket.scheduledDate).toLocaleDateString() : 'Brak',
                        new_value: new Date(updates.scheduledDate).toLocaleDateString()
                    });
                }

                // Explicit Note (resolution notes or custom history note passed)
                if (historyNote) {
                    historyEntries.push({
                        ticket_id: id,
                        changed_by: user.id,
                        change_type: 'note',
                        new_value: historyNote
                    });
                }

                // Resolution Notes field update
                if (updates.resolutionNotes && updates.resolutionNotes !== currentTicket.resolutionNotes) {
                    // Treated as info update if not covered by manual note
                }

                if (historyEntries.length > 0) {
                    await supabase.from('service_ticket_history').insert(historyEntries);
                }
            }

            return { error: null };
        } catch (e: any) {
            console.error("Update ticket error", e);
            return { error: e };
        }
    },

    async updateTasks(ticketId: string, tasks: import('../../types').ServiceTicketTask[]): Promise<{ error: Error | null }> {
        const { error } = await supabase
            .from('service_tickets')
            .update({ tasks: tasks, updated_at: new Date().toISOString() })
            .eq('id', ticketId);

        return { error };
    },

    async deleteTicket(id: string): Promise<{ error: Error | null }> {
        try {
            // History and tasks will cascade delete via FK
            const { error } = await supabase
                .from('service_tickets')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return { error: null };
        } catch (e: any) {
            console.error('Delete ticket error:', e);
            return { error: e };
        }
    },

    // Helper to map DB row to Type
    mapToType(row: any): ServiceTicket {
        return {
            id: row.id,
            ticketNumber: row.ticket_number,
            clientId: row.client_id,
            contractId: row.contract_id,
            contractNumber: row.contract_number || undefined,
            installationId: row.installation_id,
            status: row.status,
            priority: row.priority,
            type: row.type,
            description: row.description,
            resolutionNotes: row.resolution_notes,
            scheduledDate: row.scheduled_date,
            assignedTeamId: row.assigned_team_id,
            photos: row.photos || [],
            photoCaptions: row.photo_captions || {},
            clientNotes: row.client_notes || undefined,
            internalNotes: row.internal_notes || undefined,
            tasks: row.tasks || [], // JSONB
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            client: row.client ? { ...row.client, address: row.client.street } : undefined,
            contract: row.contract ? {
                ...row.contract,
                contractNumber: row.contract.contract_data?.contract_number || row.contract.contract_data?.contractNumber || ''
            } : undefined,
            installation: row.installation,
            assignedTeam: row.team || row.assigned_team // Handle both likely aliases from join
        };
    }
};
