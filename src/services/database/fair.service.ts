import { supabase } from '../../lib/supabase';

export interface Prize {
    label: string;
    type: 'discount' | 'addon' | 'item';
    value: string | number;
    probability: number; // 0-100
}

export interface Fair {
    id: string;
    name: string;
    location?: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
    prizes_config: Prize[];
    created_at: string;
}

export interface FairStats {
    totalLeads: number;
    prizesWon: Record<string, number>;
}

export class FairService {
    static async getFairStatistics(fairId: string): Promise<FairStats> {
        // Fetch all leads for this fair to calculate stats
        // Optimisation: We only select 'fair_prize' to minimize data transfer
        const { data: leads, error } = await supabase
            .from('leads')
            .select('fair_prize')
            .eq('fair_id', fairId);

        if (error) throw error;

        const stats: FairStats = {
            totalLeads: leads?.length || 0,
            prizesWon: {}
        };

        leads?.forEach(lead => {
            if (lead.fair_prize && lead.fair_prize.label) {
                const label = lead.fair_prize.label;
                stats.prizesWon[label] = (stats.prizesWon[label] || 0) + 1;
            }
        });

        return stats;
    }
    static async getActiveFairs(): Promise<Fair[]> {
        const { data, error } = await supabase
            .from('fairs')
            .select('*')
            .eq('is_active', true)
            .gte('end_date', new Date().toISOString().split('T')[0]); // Only future or ongoing

        if (error) throw error;
        return data || [];
    }

    static async getAllFairs(): Promise<Fair[]> {
        const { data, error } = await supabase
            .from('fairs')
            .select('*')
            .order('start_date', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    static async createFair(fair: Omit<Fair, 'id' | 'created_at'>): Promise<Fair> {
        const { data, error } = await supabase
            .from('fairs')
            .insert([fair])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async updateFair(id: string, updates: Partial<Fair>): Promise<Fair> {
        const { data, error } = await supabase
            .from('fairs')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async deleteFair(id: string): Promise<void> {
        const { error } = await supabase.from('fairs').delete().eq('id', id);
        if (error) throw error;
    }

    static async updateLeadPrize(leadId: string, prize: { type: string; value: any; label: string }): Promise<void> {
        const { error } = await supabase
            .from('leads')
            .update({ fair_prize: prize })
            .eq('id', leadId);

        if (error) throw error;
    }

    static async uploadPhoto(file: File): Promise<string> {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('fair_uploads')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('fair_uploads')
            .getPublicUrl(filePath);

        return data.publicUrl;
    }
}
