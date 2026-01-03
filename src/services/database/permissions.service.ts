import { supabase } from '../../lib/supabase';
import type { UserRole } from '../../types';

export interface ModulePermission {
    id: string;
    moduleKey: string;
    role: UserRole;
    isEnabled: boolean;
}

export const AVAILABLE_MODULES = [
    // DASHBOARD & CRM
    { key: 'dashboard', label: 'Pulpit (Dashboard)', category: 'Sprzedaż', description: 'Główny widok ze statystykami sprzedaży' },
    { key: 'crm_clients', label: 'Klienci', category: 'Sprzedaż', description: 'Baza klientów i edycja danych' },
    { key: 'crm_leads', label: 'Leady', category: 'Sprzedaż', description: 'Zarządzanie szansami sprzedaży' },
    { key: 'crm_tasks', label: 'Zadania', category: 'Sprzedaż', description: 'Lista zadań i kalendarz' },
    { key: 'crm_mail', label: 'Poczta', category: 'Sprzedaż', description: 'Klient poczty e-mail' },
    { key: 'offers_create', label: 'Tworzenie Ofert', category: 'Sprzedaż', description: 'Konfigurator i generowanie PDF' },
    { key: 'offers_list', label: 'Lista Ofert', category: 'Sprzedaż', description: 'Przeglądanie historii ofert' },
    { key: 'ai_assistant', label: 'Asystent AI', category: 'Sprzedaż', description: 'Czat z AI i pomoc w pisaniu' },
    { key: 'visualizer', label: 'Wizualizator 3D', category: 'Sprzedaż', description: 'Dostęp do konfiguratora 3D' },

    // REALIZACJA
    { key: 'installations_calendar', label: 'Kalendarz Montaży', category: 'Realizacja', description: 'Planowanie terminów montaży' },
    { key: 'measurement_reports', label: 'Raporty Pomiarowe', category: 'Realizacja', description: 'Formularze pomiarowe' },
    { key: 'contracts_list', label: 'Umowy', category: 'Realizacja', description: 'Rejestr podpisanych umów' },
    { key: 'logistics', label: 'Logistyka', category: 'Realizacja', description: 'Zarządzanie zamówieniami do dostawców' },
    { key: 'deliveries', label: 'Dostawy', category: 'Realizacja', description: 'Harmonogram dostaw materiałów' },
    { key: 'service_module', label: 'Serwis & Reklamacje', category: 'Realizacja', description: 'Obsługa zgłoszeń serwisowych' },
    { key: 'portfolio_map', label: 'Mapa Realizacji', category: 'Realizacja', description: 'Mapa wykonanych inwestycji' },

    // ADMINISTRACJA
    { key: 'stats_dashboard', label: 'Statystyki', category: 'Administracja', description: 'Zaawansowane raporty finansowe' },
    { key: 'team_management', label: 'Zespół (Users)', category: 'Administracja', description: 'Zarządzanie użytkownikami i rolami' },
    { key: 'partner_management', label: 'Partnerzy B2B', category: 'Administracja', description: 'Baza partnerów handlowych' },
    { key: 'pricing_management', label: 'Cenniki', category: 'Administracja', description: 'Edycja cen i produktów' },
    { key: 'inventory_lite', label: 'Magazyn (Lite)', category: 'Administracja', description: 'Prosty stan magazynowy' },
    { key: 'system_logs', label: 'Logi Systemowe', category: 'Administracja', description: 'Podgląd aktywności użytkowników' },
    { key: 'system_notifications', label: 'Uprawnienia (RBAC)', category: 'Administracja', description: 'Konfiguracja tego panelu' },
    { key: 'settings_general', label: 'Ustawienia', category: 'Administracja', description: 'Ogólne ustawienia konta' },
] as const;

export const PermissionsService = {
    async getAllPermissions(): Promise<ModulePermission[]> {
        const { data, error } = await supabase
            .from('module_permissions')
            .select('*')
            .order('module_key');

        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            moduleKey: row.module_key,
            role: row.role as UserRole,
            isEnabled: row.is_enabled
        }));
    },

    async getUserPermissions(role: string): Promise<string[]> {
        // Optimization: Fetch only enabled modules for this role
        const { data, error } = await supabase
            .from('module_permissions')
            .select('module_key')
            .eq('role', role)
            .eq('is_enabled', true);

        if (error) {
            console.error('Error fetching permissions', error);
            return [];
        }

        return data.map(row => row.module_key);
    },

    async updatePermission(id: string, isEnabled: boolean): Promise<void> {
        const { error } = await supabase
            .from('module_permissions')
            .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;
    }
};
