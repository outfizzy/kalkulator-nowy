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

export class FairService {
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
}
