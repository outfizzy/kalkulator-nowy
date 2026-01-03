
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || 'AC53ab8381399a0d31001ee8db37794ef7';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const VAPI_PHONE_NUMBER = '+4915888649130';

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const payload = await req.json();
        const { message } = payload;

        console.log('Webhook received:', message.type);

        // Handle Tool Calls (Real-time updates)
        if (message.type === 'tool-calls') {
            const { toolCalls, call } = message;
            const metadata = call?.metadata || {};
            const { installationId, customerId } = metadata;

            const results = [];

            // Initialize Supabase
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
            const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
            const supabase = createClient(supabaseUrl, supabaseKey);

            for (const toolCall of toolCalls) {
                const { id, function: fn } = toolCall;
                const args = JSON.parse(fn.arguments);
                let result = { success: true };

                console.log('Processing tool:', fn.name, args);

                if (fn.name === 'confirmDate') {
                    if (installationId) {
                        try {
                            const dateStr = metadata.installationDate;
                            if (!dateStr) {
                                throw new Error('No installationDate in metadata');
                            }

                            // 1. Check Availability (New Logic: Working Days + Vacations + Busy Slots)
                            const targetDateStr = dateStr;
                            const targetDate = new Date(targetDateStr);
                            const targetDayOfWeek = targetDate.getDay() || 7; // 1=Mon, 7=Sun
                            const targetDateISO = targetDate.toISOString().split('T')[0];

                            // Fetch current installation
                            const { data: currentInstallation, error: instError } = await supabase
                                .from('installations')
                                .select('team_id')
                                .eq('id', installationId)
                                .single();

                            if (instError) throw instError;

                            // Fetch all active teams with working days
                            const { data: allTeams, error: teamsError } = await supabase
                                .from('teams')
                                .select('id, working_days')
                                .eq('is_active', true);

                            if (teamsError) throw teamsError;

                            // Fetch unavailability (vacations) for this date
                            const { data: vacations, error: vacError } = await supabase
                                .from('team_unavailability')
                                .select('team_id, reason')
                                .lte('start_date', targetDateISO)
                                .gte('end_date', targetDateISO);

                            if (vacError) throw vacError;

                            // Fetch scheduled installations (busy slots) for this date
                            const { data: busySlots, error: busyError } = await supabase
                                .from('installations')
                                .select('id, team_id')
                                .eq('status', 'scheduled')
                                .gte('scheduled_date', `${targetDateISO}T00:00:00`)
                                .lt('scheduled_date', `${targetDateISO}T23:59:59`);

                            if (busyError) throw busyError;

                            // Set of busy/unavailable team IDs
                            const teamsOnVacation = new Set(vacations?.map(v => v.team_id) || []);
                            const teamsBusy = new Set(busySlots?.map(s => s.team_id).filter(tid => tid && s.id !== installationId) || []);

                            // Calculate available teams
                            let availableTeams = (allTeams || []).filter(team => {
                                const workingDays = team.working_days || [1, 2, 3, 4, 5];
                                // Check working Day
                                if (!workingDays.includes(targetDayOfWeek)) return false;
                                // Check vacation
                                if (teamsOnVacation.has(team.id)) return false;
                                // Check busy
                                if (teamsBusy.has(team.id)) return false;

                                return true;
                            });

                            let isAvailable = false;
                            let rejectionReason = '';

                            if (currentInstallation.team_id) {
                                // Specific team assigned
                                const team = allTeams?.find(t => t.id === currentInstallation.team_id);
                                const isOnVacation = teamsOnVacation.has(currentInstallation.team_id);
                                const isBusy = teamsBusy.has(currentInstallation.team_id);
                                const isWorkingDay = team?.working_days ? team.working_days.includes(targetDayOfWeek) : [1, 2, 3, 4, 5].includes(targetDayOfWeek);

                                if (!isWorkingDay) {
                                    isAvailable = false;
                                    isAvailable = false;
                                    rejectionReason = `Das Team arbeitet nicht am ${targetDateISO} (Wochentag: ${targetDayOfWeek}).`;
                                } else if (isOnVacation) {
                                    const reason = vacations?.find(v => v.team_id === currentInstallation.team_id)?.reason || 'Urlaub';
                                    isAvailable = false;
                                    rejectionReason = `Das Team ist nicht verfügbar: ${reason}.`;
                                } else if (isBusy) {
                                    isAvailable = false;
                                    rejectionReason = `Das Team ist bereits beschäftigt.`;
                                } else {
                                    isAvailable = true;
                                }
                            } else {
                                // No team assigned - check if ANY team is available
                                if (availableTeams.length > 0) {
                                    isAvailable = true;
                                } else {
                                    isAvailable = false;
                                    rejectionReason = `Keine Teams verfügbar am ${targetDateISO} (Feiertag/Urlaub/Belegt).`;
                                }
                            }

                            if (!isAvailable) {
                                console.log(`Date ${targetDate} unavailable: ${rejectionReason}`);

                                // Mark as issue / verification needed
                                await supabase.from('installations')
                                    .update({ status: 'issue' })
                                    .eq('id', installationId);

                                await supabase.from('notes').insert({
                                    user_id: 'vapi-bot',
                                    entity_type: 'installation',
                                    entity_id: installationId,
                                    content: `AI próbowało potwierdzić termin ${targetDate}, ale: ${rejectionReason} Oznaczono jako PROBLEM.`,
                                    type: 'system'
                                });

                                result = { success: false, message: rejectionReason };

                            } else {
                                // 2. Update DB to scheduled if free
                                await supabase.from('installations')
                                    .update({
                                        status: 'scheduled',
                                        scheduled_date: targetDateISO // Ensure date is actually saved
                                    })
                                    .eq('id', installationId);

                                console.log('Installation confirmed:', installationId);

                                // Fetch Owner Details for SMS
                                let salesRepName = 'Polendach24';
                                let salesRepPhone = '';

                                const { data: installation } = await supabase
                                    .from('installations')
                                    .select('user_id')
                                    .eq('id', installationId)
                                    .single();

                                if (installation?.user_id) {
                                    // Try to get profile name
                                    const { data: profile } = await supabase
                                        .from('profiles')
                                        .select('full_name')
                                        .eq('id', installation.user_id)
                                        .single();

                                    if (profile?.full_name) salesRepName = profile.full_name;
                                }

                                // Log note
                                await supabase.from('customer_communications').insert({
                                    customer_id: customerId || undefined,
                                    user_id: installation?.user_id,
                                    type: 'call',
                                    direction: 'outbound',
                                    subject: 'Potwierdzenie montażu (AI)',
                                    content: `Klient potwierdził termin montażu telefonicznie.\nWysłano SMS z danymi opiekuna: ${salesRepName} (${salesRepPhone})`,
                                    date: new Date().toISOString(),
                                    metadata: { isSystemNote: true, installationId }
                                });

                                // Send SMS
                                await sendSms(metadata.customerName, call.customer?.number, metadata.installationDate, salesRepName, salesRepPhone);

                                // TODO: Send Email (Requires SMTP/Resend setup)
                                // Trigger 'send-confirmation-email' function if exists

                                // Success response (German)
                                result = {
                                    success: true,
                                    available: true,
                                    date: targetDateISO,
                                    content: `Der Termin ${targetDateISO} ist verfügbar. Sie können ihn bestätigen.`
                                };
                            }

                        } catch (err: any) {
                            console.error('Error in confirmDate:', err);
                            result = { success: false, error: err.message };
                        }
                    }
                } else if (fn.name === 'changeDate') {
                    if (installationId) {
                        const newDate = args.newDate;
                        await supabase.from('installations')
                            .update({
                                status: 'verification', // Requires manual check
                                scheduled_date: newDate ? new Date(newDate).toISOString() : undefined
                            })
                            .eq('id', installationId);

                        await supabase.from('notes').insert({
                            user_id: 'vapi-bot',
                            entity_type: 'installation',
                            entity_id: installationId,
                            content: `Klient zmienił termin na: ${newDate} (AI). Wymagana weryfikacja w kalendarzu.`,
                            type: 'system'
                        });

                        // Send SMS with NEW date
                        await sendSms(metadata.customerName, call.customer?.number, newDate);
                    }
                } else if (fn.name === 'rejectDate') {
                    if (installationId) {
                        await supabase.from('installations')
                            .update({ status: 'issue' }) // Flag as issue
                            .eq('id', installationId);

                        await supabase.from('notes').insert({
                            user_id: 'vapi-bot',
                            entity_type: 'installation',
                            entity_id: installationId,
                            content: `Klient odrzucił/wymaga kontaktu. Powód: ${args.reason}. Status zmieniony na PROBLEM.`,
                            type: 'system'
                        });

                        // Note: Vapi doesn't need detailed reasons in result, but we can give a German confirmation
                        result = { success: true, message: "Absage/Kontaktanfrage notiert." };
                    }
                } else if (fn.name === 'endCall') {
                    // This is a client-side instruction for Vapi to hang up.
                    // Ideally, Vapi handles the hangup logic if configured in the tool response?
                    // Or Vapi listens to this tool call and hangs up.
                    // For now, we just acknowledge it.
                    console.log('AI requested endCall');
                }

                results.push({
                    toolCallId: id,
                    result: JSON.stringify(result) // Vapi expects a string result
                });
            }

            return new Response(JSON.stringify({
                results,
                clientState: {} // Optional state update
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Handle End of Call Report
        if (message.type === 'end-of-call-report') {
            const { analysis, artifact, endedReason, cost } = message;
            const metadata = message.call?.metadata || {}; // metadata is top-level in report sometimes, or under call
            const { installationId, customerId } = metadata;

            console.log('Call ended reason:', endedReason);

            if (installationId) {
                // Initialize Supabase
                const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
                const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
                const supabase = createClient(supabaseUrl, supabaseKey);

                // 1. Fetch Installation to get Owner ID (for valid UUID FK)
                const { data: installation } = await supabase
                    .from('installations')
                    .select('user_id')
                    .eq('id', installationId)
                    .single();

                // Default to a fallback UUID if installation not found (unlikely) or something else?
                // Actually, if we use Service Role key, we might be able to insert random UUID if FK is not enforced? 
                // But we saw explicit REFERENCES auth.users. 
                // We MUST use a valid user_id. 'installation.user_id' is the safest.
                const userId = installation?.user_id;

                if (userId) {
                    // Determine user-friendly status
                    let statusPl = 'Nieokreślony';
                    switch (endedReason) {
                        case 'customer-ended-call':
                        case 'assistant-ended-call':
                            statusPl = '✅ Odebrane (Rozmowa odbyta)';
                            break;
                        case 'voicemail':
                            statusPl = '📼 Poczta głosowa';
                            break;
                        case 'ring-timeout':
                        case 'no-answer':
                            statusPl = '❌ Nie odebrano (Brak odpowiedzi)';
                            break;
                        case 'pipeline-error-vapi':
                        case 'silence-timed-out':
                            statusPl = '⚠️ Przerwano/Błąd/Cisza';
                            break;
                        default:
                            statusPl = `Inny status: ${endedReason}`;
                    }

                    const summary = analysis?.summary || 'Brak podsumowania.';
                    const recording = artifact?.recordingUrl || '';
                    const transcript = artifact?.transcript || message.transcript || 'Brak transkrypcji.';

                    // Extract structured data if available
                    const structured = analysis?.structuredData || {};
                    const isConfirmed = structured.installationConfirmed === true;
                    const isContactRequested = structured.contactRequested === true;

                    // Build Status Header
                    let statusHeader = '';
                    if (isConfirmed) statusHeader += `✅ POTWIERDZONO MONTAŻ\n`;
                    if (isContactRequested) statusHeader += `⚠️ KLIENT PROSI O KONTAKT!\n`;

                    // Default header if nothing special
                    if (!statusHeader) statusHeader = `Status rozmowy: ${statusPl}\n`;

                    // Content with "AI" header to identify it easily in UI (and title)
                    const noteContent = `
${statusHeader}
**Podsumowanie:** ${summary}
**Powód:** ${endedReason}
${recording ? `[Nagranie rozmowy](${recording})` : ''}

**Transkrypcja:**
${transcript}
`.trim();

                    // Save as 'customer_communication' - standard place for calls
                    const communicationId = metadata.communicationId;

                    if (communicationId) {
                        // Update existing record
                        await supabase.from('customer_communications').update({
                            subject: `Raport z rozmowy AI (Leo) - ${statusPl}`,
                            content: noteContent,
                            metadata: {
                                isSystemNote: true,
                                installationId: installationId,
                                aiStatus: endedReason,
                                recordingUrl: recording
                            }
                        }).eq('id', communicationId);
                    } else {
                        // Insert new if no ID passed (fallback)
                        await supabase.from('customer_communications').insert({
                            customer_id: customerId || undefined, // Must have customer ID
                            lead_id: undefined, // Could link lead if available
                            user_id: userId, // The sales rep owner (required by FK)
                            type: 'call',
                            direction: 'outbound',
                            subject: `Raport z rozmowy AI (Leo) - ${statusPl}`,
                            content: noteContent,
                            date: new Date().toISOString(),
                            metadata: {
                                isSystemNote: true,
                                installationId: installationId,
                                aiStatus: endedReason,
                                recordingUrl: recording
                            }
                        });
                    }

                    // Also save a fallback note in 'notes' just in case? No, let's stick to one source of truth.
                } else {
                    console.error('Could not find installation owner to attribute call report');
                }
            }

            return new Response(JSON.stringify({ received: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Webhook Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }
});

async function sendSms(name: string, to: string, dateStr: string, salesRepName?: string, salesRepPhone?: string) {
    if (!to || !Deno.env.get('TWILIO_AUTH_TOKEN')) {
        console.log('Skipping SMS (no config or number)');
        return;
    }

    try {
        let dateDisplay = dateStr;
        console.log(`Preparing SMS for ${to} on date: ${dateStr}`);

        try {
            const d = new Date(dateStr);
            // ... existing logic ...
            if (!isNaN(d.getTime())) {
                dateDisplay = d.toLocaleString('pl-PL', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    hour: 'numeric',
                    minute: 'numeric'
                });
            }
        } catch (e) { }

        // Construct message with Sales Rep info
        let contactInfo = 'Polendach24';
        if (salesRepName && salesRepName !== 'Polendach24') {
            contactInfo = salesRepName;
        }

        let messageBody = `Dziękujemy. Potwierdzamy termin montażu: ${dateDisplay}. Ekipa przyjedzie między 8:00 a 10:00.\n`;
        messageBody += `W razie pytań prosimy o kontakt z opiekunem zamówienia: ${contactInfo}`;

        if (salesRepPhone) {
            messageBody += `, tel. ${salesRepPhone}`;
        }
        messageBody += `.\nPozdrawiamy Polendach24`;

        console.log('Sending SMS to:', to, 'Body:', messageBody);

        const resp = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
            {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    'To': to,
                    'From': 'Polendach24', // Requires Twilio Alphanumeric Sender ID Registration
                    'Body': messageBody
                })
            }
        );

        const data = await resp.json();
        if (!resp.ok) {
            console.error('Twilio Error:', JSON.stringify(data));
        } else {
            console.log('SMS sent successfully:', data.sid);
        }

    } catch (err) {
        console.error('SMS Exception:', err);
    }
}
