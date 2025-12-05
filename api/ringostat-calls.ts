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
        const ringostatUrl = `https://api.ringostat.net/calls/list?date_from=${dateFrom}&date_to=${dateTo}`;

        const response = await fetch(ringostatUrl, {
            method: 'GET',
            headers: {
                'Auth-key': authKey,
                'Project-ID': projectId,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Ringostat API error: ${response.status}`);
        }

        const calls = await response.json();

        // Process calls data
        interface CallData {
            id?: string;
            uniqueid?: string;
            status?: string;
            billsec?: number;
            disposition?: string;
            caller_id?: string;
            dst?: string;
            src?: string;
            calldate?: string;
            start_time?: string;
            duration?: number;
            direction?: string;
            recording_url?: string;
            recordingfile?: string;
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
            const isAnswered = call.status === 'answered' || (call.billsec && call.billsec > 0) || call.disposition === 'ANSWER';

            if (isAnswered) {
                stats.answered++;
            } else {
                stats.missed++;
            }

            // Group by phone number
            const phoneNumber = call.caller_id || call.dst || call.src || 'Unknown';
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
                    id: call.id || call.uniqueid || String(Date.now()),
                    date: call.calldate || call.start_time || '',
                    duration: call.billsec || call.duration || 0,
                    caller: call.caller_id || call.src || '',
                    callee: call.dst || '',
                    status: isAnswered ? 'answered' : 'missed',
                    direction: call.direction as 'incoming' | 'outgoing' || (call.src?.startsWith('+') ? 'incoming' : 'outgoing'),
                    recording: call.recording_url || call.recordingfile
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
