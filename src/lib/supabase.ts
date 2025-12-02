import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

// Database types
export type Database = {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    full_name: string | null;
                    role: 'admin' | 'user';
                    status: 'pending' | 'active' | 'blocked';
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    full_name?: string | null;
                    role?: 'admin' | 'user';
                    status?: 'pending' | 'active' | 'blocked';
                };
                Update: {
                    full_name?: string | null;
                    role?: 'admin' | 'user';
                    status?: 'pending' | 'active' | 'blocked';
                };
            };
            offers: {
                Row: {
                    id: string;
                    user_id: string;
                    offer_number: string;
                    customer_data: any;
                    product_config: any;
                    pricing: any;
                    status: string;
                    margin_percentage: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    offer_number: string;
                    customer_data: any;
                    product_config: any;
                    pricing: any;
                    status?: string;
                    margin_percentage: number;
                };
                Update: {
                    customer_data?: any;
                    product_config?: any;
                    pricing?: any;
                    status?: string;
                    margin_percentage?: number;
                };
            };
            customers: {
                Row: {
                    id: string;
                    user_id: string;
                    first_name: string;
                    last_name: string;
                    email: string | null;
                    phone: string | null;
                    address: any;
                    notes: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    first_name: string;
                    last_name: string;
                    email?: string | null;
                    phone?: string | null;
                    address?: any;
                    notes?: string | null;
                };
                Update: {
                    first_name?: string;
                    last_name?: string;
                    email?: string | null;
                    phone?: string | null;
                    address?: any;
                    notes?: string | null;
                };
            };
            contracts: {
                Row: {
                    id: string;
                    offer_id: string;
                    user_id: string;
                    contract_data: any;
                    signed_at: string | null;
                    status: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    offer_id: string;
                    user_id: string;
                    contract_data: any;
                    signed_at?: string | null;
                    status?: string;
                };
                Update: {
                    contract_data?: any;
                    signed_at?: string | null;
                    status?: string;
                };
            };
            installations: {
                Row: {
                    id: string;
                    offer_id: string;
                    user_id: string;
                    scheduled_date: string;
                    installer_name: string | null;
                    status: string;
                    installation_data: any;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    offer_id: string;
                    user_id: string;
                    scheduled_date: string;
                    installer_name?: string | null;
                    status?: string;
                    installation_data?: any;
                };
                Update: {
                    scheduled_date?: string;
                    installer_name?: string | null;
                    status?: string;
                    installation_data?: any;
                };
            };
            reports: {
                Row: {
                    id: string;
                    user_id: string;
                    month: string;
                    year: number;
                    data: any;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    month: string;
                    year: number;
                    data: any;
                };
                Update: {
                    data?: any;
                };
            };
        };
    };
};
