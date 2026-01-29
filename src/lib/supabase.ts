import { createClient } from '@supabase/supabase-js';

// Validate environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables:', {
        url: !!supabaseUrl,
        key: !!supabaseAnonKey
    });
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);

// Helper for JSONB columns
export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

// Database types
export type Database = {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    full_name: string | null;
                    role: 'admin' | 'user' | 'sales_rep' | 'manager' | 'partner' | 'installer';
                    status: 'pending' | 'active' | 'blocked';
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    full_name?: string | null;
                    role?: 'admin' | 'user' | 'sales_rep' | 'manager' | 'partner' | 'installer';
                    status?: 'pending' | 'active' | 'blocked';
                };
                Update: {
                    full_name?: string | null;
                    role?: 'admin' | 'user' | 'sales_rep' | 'manager' | 'partner' | 'installer';
                    status?: 'pending' | 'active' | 'blocked';
                };
            };
            offers: {
                Row: {
                    id: string;
                    user_id: string;
                    offer_number: string;
                    customer_data: Json;
                    product_config: Json;
                    pricing: Json;
                    status: string;
                    margin_percentage: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    offer_number: string;
                    customer_data: Json;
                    product_config: Json;
                    pricing: Json;
                    status?: string;
                    margin_percentage: number;
                };
                Update: {
                    customer_data?: Json;
                    product_config?: Json;
                    pricing?: Json;
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
                    address: Json;
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
                    address?: Json;
                    notes?: string | null;
                };
                Update: {
                    first_name?: string;
                    last_name?: string;
                    email?: string | null;
                    phone?: string | null;
                    address?: Json;
                    notes?: string | null;
                };
            };
            contracts: {
                Row: {
                    id: string;
                    offer_id: string;
                    user_id: string;
                    contract_data: Json;
                    signed_at: string | null;
                    status: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    offer_id: string;
                    user_id: string;
                    contract_data: Json;
                    signed_at?: string | null;
                    status?: string;
                };
                Update: {
                    contract_data?: Json;
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
                    installation_data: Json;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    offer_id: string;
                    user_id: string;
                    scheduled_date: string;
                    installer_name?: string | null;
                    status?: string;
                    installation_data?: Json;
                };
                Update: {
                    scheduled_date?: string;
                    installer_name?: string | null;
                    status?: string;
                    installation_data?: Json;
                };
            };
            reports: {
                Row: {
                    id: string;
                    user_id: string;
                    month: string;
                    year: number;
                    data: Json;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    month: string;
                    year: number;
                    data: Json;
                };
                Update: {
                    data?: Json;
                };
            };
            call_actions: {
                Row: {
                    id: string;
                    call_id: string;
                    user_id: string;
                    action_type: string;
                    note: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    call_id: string;
                    user_id: string;
                    action_type: string;
                    note?: string | null;
                };
                Update: {
                    note?: string | null;
                };
            };
        };
    };
};
