import { supabase } from '../../lib/supabase';

export interface LeadConfiguration {
    id: string;
    leadId: string | null;
    token: string;
    customerData: {
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
        street?: string;
        postalCode?: string;
        city?: string;
        companyName?: string;
    };
    model: string | null;
    modelDisplayName: string | null;
    width: number | null;
    projection: number | null;
    mountingType: 'fundament' | 'pflaster' | 'erde' | null;
    installType: string | null;
    glazingSides: {
        left?: string;
        right?: string;
        front?: string;
    };
    zipScreen: {
        enabled?: boolean;
        sides?: string[];
        type?: 'aufdach' | 'unterdach';
    };
    senkrechtmarkise: {
        sides?: string[];
    };
    markise: {
        sides?: string[];
        type?: string;
    };
    roofCovering: string | null;
    roofVariant: string | null;
    color: string | null;
    heater: boolean;
    led: boolean;
    flooring: string | null;
    notes: string | null;
    photos: string[];
    status: 'pending' | 'completed' | 'viewed';
    completedAt: string | null;
    createdAt: string;
}

function mapFromDb(row: any): LeadConfiguration {
    return {
        id: row.id,
        leadId: row.lead_id,
        token: row.token,
        customerData: row.customer_data || {},
        model: row.model,
        modelDisplayName: row.model_display_name,
        width: row.width,
        projection: row.projection,
        mountingType: row.mounting_type,
        installType: row.install_type || null,
        glazingSides: row.glazing_sides || {},
        zipScreen: row.zip_screen || {},
        senkrechtmarkise: row.senkrechtmarkise || {},
        markise: row.markise || {},
        roofCovering: row.roof_covering || null,
        roofVariant: row.roof_variant || null,
        color: row.color || null,
        heater: row.heater || false,
        led: row.led || false,
        flooring: row.flooring || null,
        notes: row.notes || null,
        photos: row.photos || [],
        status: row.status || 'pending',
        completedAt: row.completed_at,
        createdAt: row.created_at,
    };
}

export class ConfiguratorService {
    /**
     * Create a configurator link for a lead.
     * Pre-fills customer data from the lead if available.
     */
    static async createLink(leadId: string): Promise<{ token: string; url: string }> {
        // Get lead data for pre-fill
        const { data: lead } = await supabase
            .from('leads')
            .select('customer_data')
            .eq('id', leadId)
            .single();

        const customerData = lead?.customer_data || {};

        const { data, error } = await supabase
            .from('lead_configurations')
            .insert({
                lead_id: leadId,
                customer_data: {
                    firstName: customerData.firstName || '',
                    lastName: customerData.lastName || '',
                    email: customerData.email || '',
                    phone: customerData.phone || '',
                    street: customerData.street || customerData.address || '',
                    postalCode: customerData.postalCode || '',
                    city: customerData.city || '',
                    companyName: customerData.companyName || '',
                    // Transfer snow zone data if available
                    snowZone: customerData.snowZone || '',
                    snowLoad: customerData.snowLoad || '',
                    snowZonePostalCode: customerData.snowZonePostalCode || '',
                },
            })
            .select('token')
            .single();

        if (error) throw error;

        const url = `${window.location.origin}/p/konfigurator/${data.token}`;
        return { token: data.token, url };
    }

    /**
     * Get configuration by token (public, no auth required).
     */
    static async getByToken(token: string): Promise<LeadConfiguration | null> {
        const { data, error } = await supabase
            .from('lead_configurations')
            .select('*')
            .eq('token', token)
            .single();

        if (error || !data) return null;

        // Mark as viewed if pending
        if (data.status === 'pending') {
            await supabase
                .from('lead_configurations')
                .update({ status: 'viewed' })
                .eq('token', token);
        }

        return mapFromDb(data);
    }

    /**
     * Get configuration(s) for a lead.
     */
    static async getByLeadId(leadId: string): Promise<LeadConfiguration[]> {
        const { data, error } = await supabase
            .from('lead_configurations')
            .select('*')
            .eq('lead_id', leadId)
            .order('created_at', { ascending: false });

        if (error) return [];
        return (data || []).map(mapFromDb);
    }

    /**
     * Submit configuration from the public wizard.
     * Updates the configuration AND syncs data to the lead.
     */
    static async submitConfiguration(token: string, config: {
        customerData: LeadConfiguration['customerData'];
        model: string;
        modelDisplayName: string;
        width: number;
        projection: number;
        mountingType: string;
        installType: string;
        glazingSides: Record<string, string>;
        zipScreen: Record<string, any>;
        heater: boolean;
        led: boolean;
        roofCovering: string;
        roofVariant: string;
        color: string;
        senkrechtmarkise: { sides: string[] };
        markise: { sides: string[]; type: string };
        notes: string;
        flooring?: string;
        photos?: string[];
        selectedModels?: string[];
        standaloneProducts?: string[];
    }): Promise<boolean> {
        // 1. Update the configuration
        const { error } = await supabase
            .from('lead_configurations')
            .update({
                customer_data: {
                    ...config.customerData,
                    selectedModels: config.selectedModels || [],
                    standaloneProducts: config.standaloneProducts || [],
                },
                model: config.model,
                model_display_name: config.modelDisplayName,
                width: config.width,
                projection: config.projection,
                mounting_type: config.mountingType,
                install_type: config.installType,
                glazing_sides: config.glazingSides,
                zip_screen: config.zipScreen,
                heater: config.heater,
                led: config.led,
                roof_covering: config.roofCovering,
                roof_variant: config.roofVariant,
                color: config.color,
                senkrechtmarkise: config.senkrechtmarkise,
                markise: config.markise,
                notes: config.notes,
                flooring: config.flooring || '',
                photos: config.photos || [],
                status: 'completed',
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('token', token);

        if (error) {
            console.error('Failed to submit configuration:', error);
            return false;
        }

        // 2. Sync to lead
        const { data: configRow } = await supabase
            .from('lead_configurations')
            .select('lead_id')
            .eq('token', token)
            .single();

        if (configRow?.lead_id) {
            // Update lead customer_data with the submitted info
            const { data: existingLead } = await supabase
                .from('leads')
                .select('customer_data')
                .eq('id', configRow.lead_id)
                .single();

            // Fix: Map 'street' → 'address' so Kanban cards display it correctly
            const customerDataWithAddress = {
                ...config.customerData,
                address: config.customerData.street || (config.customerData as any).address || '',
            };

            const updatedCustomerData = {
                ...(existingLead?.customer_data || {}),
                ...customerDataWithAddress,
                // Configuration summary
                configuredModel: config.modelDisplayName,
                configuredWidth: config.width,
                configuredProjection: config.projection,
                configuredMounting: config.mountingType,
                configuredInstallType: config.installType,
                configuredGlazing: config.glazingSides,
                configuredZipScreen: config.zipScreen,
                configuredHeater: config.heater,
                configuredLed: config.led,
                configuredRoofCovering: config.roofCovering,
                configuredRoofVariant: config.roofVariant,
                configuredColor: config.color,
                configuredSenkrechtmarkise: config.senkrechtmarkise,
                configuredMarkise: config.markise,
                configuredNotes: config.notes,
                configuredFlooring: config.flooring || '',
                selectedModels: config.selectedModels || [],
                standaloneProducts: config.standaloneProducts || [],
                configurationCompletedAt: new Date().toISOString(),
            };

            await supabase
                .from('leads')
                .update({
                    customer_data: updatedCustomerData,
                    // Sync photos to lead attachments so they appear in Lead Details
                    ...(config.photos && config.photos.length > 0 ? {
                        attachments: config.photos.map((url, i) => ({
                            name: `Foto ${i + 1} (Konfigurator)`,
                            url,
                            type: 'image',
                            size: 0,
                        })),
                    } : {}),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', configRow.lead_id);

            // 2b. Also sync to the Customer record if linked
            const { data: leadForCustomer } = await supabase
                .from('leads')
                .select('customer_id')
                .eq('id', configRow.lead_id)
                .single();

            if (leadForCustomer?.customer_id) {
                const cd = config.customerData;
                const fullAddr = cd.street || (cd as any).address || '';
                let custStreet = fullAddr;
                let custHouseNum = '';
                const addrMatch = fullAddr.match(/^(.+)\s+(\d+[a-zA-Z-\/]*)$/);
                if (addrMatch) {
                    custStreet = addrMatch[1];
                    custHouseNum = addrMatch[2];
                }

                const custUpdates: Record<string, unknown> = {};
                if (cd.firstName) custUpdates.first_name = cd.firstName;
                if (cd.lastName) custUpdates.last_name = cd.lastName;
                if (cd.email) custUpdates.email = cd.email;
                if (cd.phone) custUpdates.phone = cd.phone;
                if (custStreet) custUpdates.street = custStreet;
                if (custHouseNum) custUpdates.house_number = custHouseNum;
                if (cd.postalCode) custUpdates.postal_code = cd.postalCode;
                if (cd.city) custUpdates.city = cd.city;
                if (cd.companyName) custUpdates.company_name = cd.companyName;

                if (Object.keys(custUpdates).length > 0) {
                    await supabase
                        .from('customers')
                        .update(custUpdates)
                        .eq('id', leadForCustomer.customer_id);
                    console.log(`[Configurator] Customer ${leadForCustomer.customer_id} synced from form`);
                }
            }

            // 3. Notify sales reps — urgent message with call-to-action
            const { data: lead } = await supabase
                .from('leads')
                .select('assigned_to, customer_data')
                .eq('id', configRow.lead_id)
                .single();

            const customerName = [config.customerData.firstName, config.customerData.lastName].filter(Boolean).join(' ');
            const notificationPayload = {
                type: 'configuration_received',
                title: '📋 Uzupełniony formularz! Skontaktuj się!',
                message: `${customerName || 'Klient'} wypełnił formularz konfiguracyjny: ${config.modelDisplayName} (${config.width}×${config.projection}mm). Skontaktuj się z gotową ofertą i umów na pomiar na miejscu!!!`,
                link: `/leads/${configRow.lead_id}`,
                data: { leadId: configRow.lead_id, model: config.model },
            };

            if (lead?.assigned_to) {
                // Notify assigned rep
                await supabase.from('notifications').insert({
                    user_id: lead.assigned_to,
                    ...notificationPayload,
                });
            }

            // Also notify all admins and managers (or ALL sales reps if no one assigned)
            const { data: salesUsers } = await supabase
                .from('profiles')
                .select('id, role')
                .in('role', lead?.assigned_to ? ['admin', 'manager'] : ['admin', 'manager', 'sales_rep'])
                .eq('status', 'active');

            if (salesUsers && salesUsers.length > 0) {
                const notifications = salesUsers
                    .filter(u => u.id !== lead?.assigned_to) // Don't double-notify assigned rep
                    .map(u => ({
                        user_id: u.id,
                        ...notificationPayload,
                    }));
                if (notifications.length > 0) {
                    await supabase.from('notifications').insert(notifications);
                }
            }

            // 4. Send professional HTML email notification to the team
            try {
                const cd = config.customerData;
                const addr = [cd.street, [cd.postalCode, cd.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
                const windZone = (cd as any).windZone;
                const snowZone = (cd as any).snowZone;
                const snowLoad = (cd as any).snowLoad;
                const structRec = (cd as any).structuralRecommendation;

                const zoneHtml = (windZone || snowZone) ? `
                    <tr><td colspan="2" style="padding:14px 16px 6px;font-weight:700;font-size:14px;color:#dc2626;border-top:2px solid #fecaca;">
                        ⚠️ Statische Zonen (DIN EN 1991)
                    </td></tr>
                    ${windZone ? `<tr><td style="padding:6px 16px;color:#64748b;font-size:13px;">🌬️ Windzone</td><td style="padding:6px 16px;font-weight:600;color:#1e293b;font-size:13px;">Zone ${windZone}</td></tr>` : ''}
                    ${snowZone ? `<tr><td style="padding:6px 16px;color:#64748b;font-size:13px;">❄️ Schneelastzone</td><td style="padding:6px 16px;font-weight:600;color:#1e293b;font-size:13px;">${snowZone}${snowLoad ? ` (${snowLoad})` : ''}</td></tr>` : ''}
                    ${structRec ? `<tr><td colspan="2" style="padding:8px 16px;"><div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 14px;color:#991b1b;font-weight:600;font-size:12px;">🔴 ${structRec}</div></td></tr>` : ''}
                ` : '';

                const emailHtml = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif;">
<div style="max-width:640px;margin:0 auto;padding:20px;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#f97316,#ea580c);border-radius:16px 16px 0 0;padding:28px 24px;text-align:center;">
        <img src="https://polendach24.app/PolenDach24-Logo-white.png" alt="Polendach24" style="height:36px;margin-bottom:12px;" />
        <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0;">📋 Neue Konfiguration eingegangen!</h1>
        <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:8px 0 0;">Ein Kunde hat den Konfigurator ausgefüllt</p>
    </div>

    <!-- Customer Info -->
    <div style="background:#fff;padding:0;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
        <div style="padding:20px 24px;border-bottom:1px solid #f1f5f9;">
            <h2 style="font-size:16px;font-weight:700;color:#1e293b;margin:0 0 12px;">👤 Kundendaten</h2>
            <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:6px 16px;color:#64748b;font-size:13px;width:140px;">Name</td><td style="padding:6px 16px;font-weight:600;color:#1e293b;font-size:13px;">${[cd.firstName, cd.lastName].filter(Boolean).join(' ')}</td></tr>
                <tr><td style="padding:6px 16px;color:#64748b;font-size:13px;">E-Mail</td><td style="padding:6px 16px;font-weight:600;font-size:13px;"><a href="mailto:${cd.email}" style="color:#2563eb;text-decoration:none;">${cd.email || '-'}</a></td></tr>
                ${cd.phone ? `<tr><td style="padding:6px 16px;color:#64748b;font-size:13px;">Telefon</td><td style="padding:6px 16px;font-weight:600;font-size:13px;"><a href="tel:${cd.phone}" style="color:#2563eb;text-decoration:none;">${cd.phone}</a></td></tr>` : ''}
                ${addr ? `<tr><td style="padding:6px 16px;color:#64748b;font-size:13px;">Adresse</td><td style="padding:6px 16px;font-weight:600;color:#1e293b;font-size:13px;">${addr}</td></tr>` : ''}
                ${(cd as any).companyName ? `<tr><td style="padding:6px 16px;color:#64748b;font-size:13px;">Firma</td><td style="padding:6px 16px;font-weight:600;color:#1e293b;font-size:13px;">${(cd as any).companyName}</td></tr>` : ''}
            </table>
        </div>

        <!-- Configuration Details -->
        <div style="padding:20px 24px;border-bottom:1px solid #f1f5f9;">
            <h2 style="font-size:16px;font-weight:700;color:#1e293b;margin:0 0 12px;">🏗️ Konfiguration</h2>
            <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:6px 16px;color:#64748b;font-size:13px;width:140px;">Modell</td><td style="padding:6px 16px;font-weight:700;color:#f97316;font-size:15px;">${config.modelDisplayName}</td></tr>
                <tr><td style="padding:6px 16px;color:#64748b;font-size:13px;">Maße</td><td style="padding:6px 16px;font-weight:600;color:#1e293b;font-size:13px;">${config.width} × ${config.projection} mm (${((config.width * config.projection) / 1000000).toFixed(1)} m²)</td></tr>
                <tr><td style="padding:6px 16px;color:#64748b;font-size:13px;">Farbe</td><td style="padding:6px 16px;font-weight:600;color:#1e293b;font-size:13px;">${config.color}</td></tr>
                <tr><td style="padding:6px 16px;color:#64748b;font-size:13px;">Dacheindeckung</td><td style="padding:6px 16px;font-weight:600;color:#1e293b;font-size:13px;">${config.roofCovering === 'glass' ? 'Glas' : 'Polycarbonat'}${config.roofVariant ? ` — ${config.roofVariant}` : ''}</td></tr>
                <tr><td style="padding:6px 16px;color:#64748b;font-size:13px;">Montage</td><td style="padding:6px 16px;font-weight:600;color:#1e293b;font-size:13px;">${config.mountingType === 'fundament' ? 'Betonfundament' : config.mountingType === 'pflaster' ? 'Pflastersteine' : 'Erdreich'} / ${config.installType === 'frei' ? 'Freistehend' : 'Wandmontage'}</td></tr>
                ${config.heater ? '<tr><td style="padding:6px 16px;color:#64748b;font-size:13px;">Heizstrahler</td><td style="padding:6px 16px;font-weight:600;color:#16a34a;font-size:13px;">✓ Ja</td></tr>' : ''}
                ${config.led ? '<tr><td style="padding:6px 16px;color:#64748b;font-size:13px;">LED</td><td style="padding:6px 16px;font-weight:600;color:#16a34a;font-size:13px;">✓ Ja</td></tr>' : ''}
                ${config.flooring ? `<tr><td style="padding:6px 16px;color:#64748b;font-size:13px;">Bodenbelag</td><td style="padding:6px 16px;font-weight:600;color:#1e293b;font-size:13px;">${config.flooring}</td></tr>` : ''}
                ${zoneHtml}
            </table>
        </div>

        ${config.notes ? `
        <div style="padding:20px 24px;border-bottom:1px solid #f1f5f9;">
            <h2 style="font-size:16px;font-weight:700;color:#1e293b;margin:0 0 8px;">📝 Anmerkungen des Kunden</h2>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;color:#475569;font-size:13px;line-height:1.6;white-space:pre-wrap;">${config.notes}</div>
        </div>` : ''}

        <!-- CTA -->
        <div style="padding:24px;text-align:center;">
            <a href="https://polendach24.app/leads/${configRow.lead_id}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;font-weight:800;font-size:16px;border-radius:12px;text-decoration:none;box-shadow:0 4px 16px rgba(249,115,22,0.3);">
                📞 Jetzt Kontakt aufnehmen →
            </a>
            <p style="color:#94a3b8;font-size:12px;margin-top:12px;">Kontaktieren Sie den Kunden schnellstmöglich mit einem Angebot!</p>
        </div>
    </div>

    <!-- Footer -->
    <div style="background:#1e293b;border-radius:0 0 16px 16px;padding:20px 24px;text-align:center;">
        <p style="color:#94a3b8;font-size:11px;margin:0;">Polendach24 CRM • Automatische Benachrichtigung • ${new Date().toLocaleDateString('de-DE')}</p>
    </div>
</div>
</body></html>`;

                // Fetch shared mailbox config for sending
                const { data: appSettings } = await supabase
                    .from('app_settings')
                    .select('value')
                    .eq('key', 'shared_email_config')
                    .maybeSingle();

                if (appSettings?.value) {
                    const sharedConfig = typeof appSettings.value === 'string' ? JSON.parse(appSettings.value) : appSettings.value;

                    // Send to all admins/managers
                    const recipientEmails = salesUsers
                        ?.map(u => u.id)
                        .filter(Boolean) || [];

                    // Fetch actual email addresses
                    const { data: recipientProfiles } = await supabase
                        .from('profiles')
                        .select('email')
                        .in('id', recipientEmails);

                    const emails = recipientProfiles?.map(p => p.email).filter(Boolean) || [];

                    // Also send to shared mailbox
                    const sharedEmail = sharedConfig.user || sharedConfig.email;
                    if (sharedEmail && !emails.includes(sharedEmail)) {
                        emails.push(sharedEmail);
                    }

                    if (emails.length > 0) {
                        await supabase.functions.invoke('send-email', {
                            body: {
                                to: emails[0],
                                bcc: emails.slice(1).join(','),
                                subject: `📋 Neue Konfiguration: ${config.modelDisplayName} — ${customerName} (${cd.postalCode || ''} ${cd.city || ''})`,
                                html: emailHtml,
                                config: sharedConfig,
                            }
                        });
                        console.log(`[Configurator] Email notification sent to ${emails.length} recipients`);
                    }
                }
            } catch (emailErr) {
                console.error('[Configurator] Email notification failed (non-blocking):', emailErr);
            }
        }

        return true;
    }
}
