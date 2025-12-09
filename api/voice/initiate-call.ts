
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Init Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { phoneNumber, installationDate, customerName, leadId } = req.body;
    const apiKey = process.env.VAPI_PRIVATE_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Server misconfiguration: Missing VAPI_PRIVATE_KEY' });
    }

    if (!phoneNumber || !installationDate || !customerName) {
        return res.status(400).json({ error: 'Missing required fields: phoneNumber, installationDate, customerName' });
    }

    // Determine the base URL for the webhook
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${protocol}://${host}`;
    const webhookUrl = `${baseUrl}/api/voice/webhook`;

    try {
        const response = await fetch('https://api.vapi.ai/call', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID, // Optional: if you have multiple numbers
                customer: {
                    number: phoneNumber,
                    name: customerName
                },
                assistant: {
                    transcriber: {
                        provider: "deepgram",
                        model: "nova-2",
                        language: "pl"
                    },
                    model: {
                        provider: "openai",
                        model: "gpt-4",
                        timeoutSeconds: 20,
                        messages: [
                            {
                                role: "system",
                                content: `Jesteś asystentem technicznym firmy montażowej. Dzwonisz do klienta ${customerName}, aby potwierdzić termin montażu zadaszenia.
                                Data montażu to: ${new Date(installationDate).toLocaleString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: 'numeric' })}.
                                
                                Twoje cele:
                                1. Przywitaj się i powiedz, że dzwonisz z działu technicznego w sprawie montażu.
                                2. Podaj proponowany termin.
                                3. Zapytaj, czy ten termin pasuje.
                                
                                Jeśli klient powie TAK (potwierdzi):
                                - Podziękuj, powiedz że wysyłasz potwierdzenie mailem i zakończ rozmowę.
                                - Użyj narzędzia "confirmInstallation" aby zapisać potwierdzenie.
                                
                                Jeśli klient powie NIE (odmówi):
                                - Zapytaj o inny dogodny termin (np. "Wolisz rano czy po południu?", "Jaki dzień Panu pasuje?").
                                - Zanotuj to i powiedz, że przekażesz prośbę do koordynatora.
                                - Użyj narzędzia "rejectInstallation" z powodem.
                                
                                Bądź uprzejmy, konkretny i profesjonalny. Mów po polsku.`
                            }
                        ],
                        tools: [
                            {
                                type: "function",
                                function: {
                                    name: "confirmInstallation",
                                    description: "Call this when customer confirms the installation date.",
                                    parameters: {
                                        type: "object",
                                        properties: {
                                            confirmed: { type: "boolean", const: true }
                                        }
                                    }
                                }
                            },
                            {
                                type: "function",
                                function: {
                                    name: "rejectInstallation",
                                    description: "Call this when customer rejects the date and proposes another one.",
                                    parameters: {
                                        type: "object",
                                        properties: {
                                            reason: { type: "string", description: "Reason for rejection or proposed new date" }
                                        },
                                        required: ["reason"]
                                    }
                                }
                            }
                        ]
                    },
                    voice: {
                        provider: "11labs",
                        voiceId: "cjVigY5qzO86Huf0OWal" // Example ID, replace with preferred voice
                    },
                    serverUrl: webhookUrl,
                    serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET // Optional security
                },
                // Pass metadata so we know who we called when the webhook comes back
                metadata: {
                    leadId: leadId,
                    customerName: customerName,
                    installationDate: installationDate
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Vapi API Error: ${response.status} ${errorText}`);
        }

        const data = await response.json();

        // Log to DB
        if (leadId) {
            await supabase.from('customer_communications').insert({
                lead_id: leadId,
                type: 'call',
                direction: 'outbound',
                subject: 'Inicjacja połączenia AI',
                content: `Zlecono połączenie AI do klienta ${customerName} na numer ${phoneNumber}. Termin: ${new Date(installationDate).toLocaleDateString()}.`,
                metadata: {
                    vapiCallId: data.id,
                    status: 'queued'
                }
            });
        }

        return res.status(200).json({ success: true, callId: data.id, status: 'queued' });

    } catch (error: any) {
        console.error('Error initiating call:', error);
        return res.status(500).json({ error: error.message });
    }
}
