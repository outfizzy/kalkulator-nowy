import { supabase } from '../../lib/supabase';
import type { TransportSettings } from '../../types';

const SETTINGS_KEY = 'transport_settings';

const DEFAULT_TRANSPORT_SETTINGS: TransportSettings = {
    ratePerKm: 0.50, // Default 0.50 EUR
    baseLocation: {
        name: 'Gubin',
        postalCode: '66-620',
        lat: 51.9494,
        lng: 14.7242
    }
};

export const SettingsService = {
    async getTransportSettings(): Promise<TransportSettings> {
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', SETTINGS_KEY)
                .single();

            if (error || !data) {
                // If not found or error, return defaults (safe fallback)
                return DEFAULT_TRANSPORT_SETTINGS;
            }

            return data.value as TransportSettings;
        } catch (e) {
            console.error('Error fetching transport settings:', e);
            return DEFAULT_TRANSPORT_SETTINGS;
        }
    },

    async updateTransportSettings(settings: TransportSettings): Promise<void> {
        const { error } = await supabase
            .from('app_settings')
            .upsert({
                key: SETTINGS_KEY,
                value: settings,
                updated_at: new Date().toISOString()
            });

        if (error) throw error;
    }
};
