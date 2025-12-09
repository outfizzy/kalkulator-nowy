
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Init Supabase (Service Role for admin updates)
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use Service Role to bypass RLS if needed or perform system updates

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message } = req.body;

    if (!message) {
        // Vapi sometimes sends a ping to verify URL
        return res.status(200).send('OK');
    }

    try {
        // Handle "tool-calls" (When AI decides to confirm/reject)
        if (message.type === 'tool-calls') {
            const toolCall = message.toolCalls[0];
            const functionName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);
            const call = message.call;
            const metadata = call.metadata || {};

            if (functionName === 'confirmInstallation') {
                // Update DB: Log success
                await supabase.from('customer_communications').insert({
                    lead_id: metadata.leadId,
                    type: 'call',
                    direction: 'outbound',
                    subject: 'Potwierdzenie Montażu (AI)',
                    content: `AI potwierdziło termin montażu: ${new Date(metadata.installationDate).toLocaleString()}.`,
                    metadata: {
                        vapiCallId: call.id,
                        result: 'confirmed',
                        recordingUrl: call.recordingUrl
                    }
                });

                // TODO: Send Confirmation Email logic here
                // For now, we assume a database trigger or separate service handles emails based on status change
                // or we could invoke the send-email API directly here.

                return res.status(200).json({
                    results: [
                        {
                            toolCallId: toolCall.id,
                            result: "Status updated to CONFIRMED. Email scheduled."
                        }
                    ]
                });
            }

            if (functionName === 'rejectInstallation') {
                // Update DB: Log rejection/notes
                await supabase.from('customer_communications').insert({
                    lead_id: metadata.leadId,
                    type: 'call',
                    direction: 'outbound',
                    subject: 'Problem z terminem (AI)',
                    content: `Klient odrzucił termin. Powód/Propozycja: ${args.reason}`,
                    metadata: {
                        vapiCallId: call.id,
                        result: 'rejected',
                        reason: args.reason,
                        recordingUrl: call.recordingUrl
                    }
                });

                return res.status(200).json({
                    results: [
                        {
                            toolCallId: toolCall.id,
                            result: "Rejection noted. Coordinator notified."
                        }
                    ]
                });
            }
        }

        // Handle "status-update" (e.g. ended)
        if (message.type === 'status-update' && message.status === 'ended') {
            // Check reason for end (completed, silence, error)
            const call = message.call;
            const metadata = call.metadata || {};

            // Optionally log technical details if not already covered by tool calls
            if (message.endedReason !== 'customer-ended-call' && message.endedReason !== 'assistant-ended-call') {
                console.log('Call ended abnormally:', message.endedReason);
            }
        }

        return res.status(200).send('OK');

    } catch (error: any) {
        console.error('Webhook Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
