import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const dateFrom = (req.query.date_from as string) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const dateTo = (req.query.date_to as string) || new Date().toISOString().split('T')[0];

        // Ringostat API credentials
        const projectId = '103713';
        const authKey = '9rHWrjnNdwnHHC1Nz9dwd7x4B9vjfNjX';

        // Fetch calls from Ringostat
        // API expects 'from' and 'to' with timestamps, and 'export_type=json'
        // Verified fields: calldate, caller, dst, disposition, billsec, recording
        const fields = 'calldate,caller,dst,disposition,billsec,recording';
        const ringostatUrl = `https://api.ringostat.net/calls/list?from=${dateFrom} 00:00:00&to=${dateTo} 23:59:59&export_type=json&fields=${fields}`;

        const response = await fetch(ringostatUrl, {
            method: 'GET',
            headers: {
                'Auth-key': authKey,
                'Project-Id': projectId,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Ringostat API error: ${response.status}`);
        }

        const calls = await response.json();

        // Process calls data
        interface CallData {
            calldate: string;
            caller: string;
            dst: string;
            disposition: string;
            billsec: number;
            recording: string;
        }

        interface StatsType {
            total: number;
            answered: number;
            missed: number;
            byNumber: Record<string, { total: number; answered: number; missed: number }>;
            calls: Array<{
                id: string;
                date: string;
                duration: number;
                caller: string;
                callee: string;
                status: 'answered' | 'missed';
                direction: 'incoming' | 'outgoing';
                recording?: string;
            }>;
        }

        const stats: StatsType = {
            total: calls.length,
            answered: 0,
            missed: 0,
            byNumber: {},
            calls: []
        };

        for (const call of calls as CallData[]) {
            // Determine if call was answered
            // disposition: ANSWERED, NO ANSWER, BUSY, FAILED, VOICEMAIL
            const isAnswered = call.disposition === 'ANSWERED';

            if (isAnswered) {
                stats.answered++;
            } else {
                stats.missed++;
            }

            // Group by phone number
            // Clean caller ID (remove "Name" <Number> formatting if present)
            const cleanCallerId = (id: string) => {
                if (!id) return '';
                // Try to extract number from <number> format
                const match = id.match(/<([^>]+)>/);
                if (match) return match[1];
                // Otherwise just use the string as is (maybe remove quotes)
                return id.replace(/['"]/g, '').trim();
            };

            const cleanCaller = cleanCallerId(call.caller);
            const cleanDst = cleanCallerId(call.dst);
            const phoneNumber = cleanCaller;

            if (!stats.byNumber[phoneNumber]) {
                stats.byNumber[phoneNumber] = { total: 0, answered: 0, missed: 0 };
            }
            stats.byNumber[phoneNumber].total++;
            if (isAnswered) {
                stats.byNumber[phoneNumber].answered++;
            } else {
                stats.byNumber[phoneNumber].missed++;
            }

            // Add to calls list (limit to 100 most recent)
            if (stats.calls.length < 100) {
                stats.calls.push({
                    id: String(Date.now() + Math.random()), // Generate ID as it's not in response
                    date: call.calldate,
                    duration: call.billsec,
                    caller: cleanCaller,
                    callee: cleanDst,
                    status: isAnswered ? 'answered' : 'missed',
                    direction: 'incoming', // Default to incoming for now as we can't reliably determine
                    recording: call.recording
                });
            }
        }

        return res.status(200).json(stats);

    } catch (error: unknown) {
        console.error('Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return res.status(500).json({
            error: errorMessage,
            total: 0,
            answered: 0,
            missed: 0,
            byNumber: {},
            calls: []
        });
    }
}
