import React, { useState, useMemo } from 'react';
import type { Communication } from '../../types';
import type { CallLog, SMSLog } from '../../services/database/telephony.service';

// ── Unified Timeline Entry ──
interface TimelineEntry {
    id: string;
    date: string;
    channel: 'whatsapp' | 'sms' | 'call' | 'email' | 'note' | 'ringostat';
    direction: 'inbound' | 'outbound';
    title: string;
    body: string;
    metadata?: Record<string, any>;
    source: 'communication' | 'call_log' | 'sms_log';
}

interface UnifiedTimelineProps {
    communications: Communication[];
    callLogs: CallLog[];
    smsLogs: SMSLog[];
    onRefresh?: () => void;
}

const CHANNEL_CONFIG: Record<string, { label: string; emoji: string; bg: string; text: string; border: string }> = {
    whatsapp: { label: 'WhatsApp', emoji: '💬', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    sms: { label: 'SMS', emoji: '📱', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    call: { label: 'Telefon', emoji: '📞', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    ringostat: { label: 'Ringostat', emoji: '📞', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    email: { label: 'Email', emoji: '📧', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    note: { label: 'Notatka', emoji: '📝', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
};

const formatDate = (d: string) => {
    const dt = new Date(d);
    const now = new Date();
    const diff = now.getTime() - dt.getTime();
    if (diff < 60000) return 'Teraz';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min temu`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h temu`;
    return dt.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export const UnifiedTimeline: React.FC<UnifiedTimelineProps> = ({ communications, callLogs, smsLogs, onRefresh }) => {
    const [filter, setFilter] = useState<string>('all');

    // ── Merge all sources into unified entries ──
    const entries = useMemo(() => {
        const items: TimelineEntry[] = [];

        // 1. Communications (notes, emails, ringostat synced calls)
        for (const comm of communications) {
            const isRingostat = comm.metadata?.source === 'ringostat_sync';
            items.push({
                id: `comm-${comm.id}`,
                date: comm.date,
                channel: isRingostat ? 'ringostat' : comm.type === 'email' ? 'email' : comm.type === 'call' ? 'call' : comm.type === 'sms' ? 'sms' : 'note',
                direction: comm.direction || 'outbound',
                title: comm.subject || (comm.type === 'call' ? 'Rozmowa' : comm.type === 'email' ? 'Email' : 'Notatka'),
                body: comm.content || '',
                metadata: {
                    ...comm.metadata,
                    userId: comm.userId,
                    user: comm.user,
                    attachments: comm.metadata?.attachments,
                },
                source: 'communication',
            });
        }

        // 2. Twilio Call Logs (not from Ringostat)
        for (const call of callLogs) {
            // Skip if likely already synced via communications
            const alreadyExists = items.some(i =>
                i.channel === 'call' && i.source === 'communication' &&
                Math.abs(new Date(i.date).getTime() - new Date(call.started_at).getTime()) < 60000
            );
            if (alreadyExists) continue;

            items.push({
                id: `call-${call.id}`,
                date: call.started_at,
                channel: 'call',
                direction: call.direction,
                title: `${call.direction === 'inbound' ? '📥 Przychodzące' : '📤 Wychodzące'} — ${call.status}`,
                body: call.notes || call.summary || `${call.from_number} → ${call.to_number}`,
                metadata: {
                    duration: call.duration_seconds,
                    status: call.status,
                    recording_url: call.recording_url,
                    transcription: call.transcription,
                    from: call.from_number,
                    to: call.to_number,
                },
                source: 'call_log',
            });
        }

        // 3. SMS/WhatsApp Logs
        for (const msg of smsLogs) {
            items.push({
                id: `msg-${msg.id}`,
                date: msg.created_at,
                channel: msg.channel === 'whatsapp' ? 'whatsapp' : 'sms',
                direction: msg.direction,
                title: msg.channel === 'whatsapp' ? 'WhatsApp' : 'SMS',
                body: msg.body || '',
                metadata: {
                    from: msg.from_number,
                    to: msg.to_number,
                    status: msg.status,
                    media_urls: msg.media_urls,
                },
                source: 'sms_log',
            });
        }

        // Sort by date descending
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return items;
    }, [communications, callLogs, smsLogs]);

    const filtered = filter === 'all' ? entries : entries.filter(e => e.channel === filter);

    // ── Engagement Score ──
    const score = useMemo(() => {
        let pts = 0;
        const now = Date.now();
        for (const e of entries) {
            const age = now - new Date(e.date).getTime();
            const recency = age < 7 * 86400000 ? 2 : age < 30 * 86400000 ? 1.5 : 1;

            if (e.channel === 'whatsapp' && e.direction === 'inbound') pts += 10 * recency;
            else if (e.channel === 'whatsapp' && e.direction === 'outbound') pts += 5 * recency;
            else if (e.channel === 'sms') pts += 3 * recency;
            else if ((e.channel === 'call' || e.channel === 'ringostat') && e.metadata?.status !== 'missed') pts += 8 * recency;
            else if ((e.channel === 'call' || e.channel === 'ringostat') && e.metadata?.status === 'missed') pts += 2 * recency;
            else if (e.channel === 'email') pts += 5 * recency;
        }
        return Math.round(pts);
    }, [entries]);

    const scoreLabel = score >= 80 ? { label: 'Hot', emoji: '🔥', bg: 'bg-red-100', text: 'text-red-700' }
        : score >= 40 ? { label: 'Warm', emoji: '🟢', bg: 'bg-green-100', text: 'text-green-700' }
            : score >= 15 ? { label: 'Cool', emoji: '🟡', bg: 'bg-yellow-100', text: 'text-yellow-700' }
                : { label: 'Cold', emoji: '⚪', bg: 'bg-slate-100', text: 'text-slate-500' };

    // Channel counts
    const counts = useMemo(() => {
        const c: Record<string, number> = {};
        for (const e of entries) c[e.channel] = (c[e.channel] || 0) + 1;
        return c;
    }, [entries]);

    return (
        <div>
            {/* ── Header with Score + Filter ── */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                    <h3 className="font-bold text-slate-800 text-lg">Komunikacja</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${scoreLabel.bg} ${scoreLabel.text}`}>
                        {scoreLabel.emoji} {scoreLabel.label} — {score} pkt
                    </span>
                    <span className="text-xs text-slate-400">{entries.length} interakcji</span>
                </div>
                {onRefresh && (
                    <button onClick={onRefresh} className="text-xs text-slate-400 hover:text-slate-600">🔄 Odśwież</button>
                )}
            </div>

            {/* ── Channel Filter Chips ── */}
            <div className="flex flex-wrap gap-2 mb-4">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                    Wszystko ({entries.length})
                </button>
                {Object.entries(CHANNEL_CONFIG).map(([key, cfg]) => {
                    const count = counts[key] || 0;
                    if (count === 0) return null;
                    return (
                        <button
                            key={key}
                            onClick={() => setFilter(filter === key ? 'all' : key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === key ? `${cfg.bg} ${cfg.text} ring-2 ring-offset-1` : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            style={filter === key ? { '--tw-ring-color': cfg.border.replace('border-', '') } as any : {}}
                        >
                            {cfg.emoji} {cfg.label} ({count})
                        </button>
                    );
                })}
            </div>

            {/* ── Timeline ── */}
            {filtered.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                    <div className="text-4xl mb-2">💬</div>
                    <p className="text-sm">Brak historii komunikacji</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(entry => {
                        const cfg = CHANNEL_CONFIG[entry.channel] || CHANNEL_CONFIG.note;
                        const isWA = entry.channel === 'whatsapp';
                        const isSMS = entry.channel === 'sms';

                        return (
                            <div key={entry.id} className={`rounded-xl border p-4 transition-all hover:shadow-md ${cfg.border} ${cfg.bg}`}>
                                {/* Header */}
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{cfg.emoji}</span>
                                        <span className={`text-xs font-bold ${cfg.text}`}>{cfg.label}</span>
                                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${entry.direction === 'inbound' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                                            {entry.direction === 'inbound' ? '📥 Przych.' : '📤 Wych.'}
                                        </span>
                                        {entry.metadata?.status && (entry.channel === 'call' || entry.channel === 'ringostat') && (
                                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${entry.metadata.status === 'completed' || entry.metadata.status === 'answered' ? 'bg-green-100 text-green-600' : entry.metadata.status === 'missed' || entry.metadata.status === 'no-answer' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                                {entry.metadata.status}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium">{formatDate(entry.date)}</span>
                                </div>

                                {/* Body — WhatsApp style bubbles */}
                                {(isWA || isSMS) ? (
                                    <div className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-sm ${entry.direction === 'inbound' ? 'bg-white border border-slate-200 text-slate-700' : isWA ? 'text-white' : 'bg-purple-600 text-white'}`}
                                        style={entry.direction === 'outbound' && isWA ? { background: '#005C4B' } : {}}>
                                        {entry.body}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap line-clamp-4">{entry.body}</p>
                                )}

                                {/* Media */}
                                {entry.metadata?.media_urls?.length > 0 && (
                                    <div className="flex gap-2 mt-2">
                                        {(entry.metadata.media_urls as string[]).map((url: string, i: number) => (
                                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                                <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border" />
                                            </a>
                                        ))}
                                    </div>
                                )}

                                {/* Call metadata */}
                                {(entry.channel === 'call' || entry.channel === 'ringostat') && (
                                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                        {entry.metadata?.duration != null && Number(entry.metadata.duration) > 0 && (
                                            <span className="flex items-center gap-1 bg-white/80 px-2 py-0.5 rounded-full">
                                                ⏱ {Math.floor(Number(entry.metadata.duration) / 60)}m {Number(entry.metadata.duration) % 60}s
                                            </span>
                                        )}
                                        {entry.metadata?.rep_name && (
                                            <span className="flex items-center gap-1 bg-white/80 px-2 py-0.5 rounded-full">
                                                👤 {String(entry.metadata.rep_name)}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Recording player */}
                                {(entry.metadata?.recording_url || entry.metadata?.recordingUrl) && (
                                    <div className="mt-2 p-2 bg-white/80 rounded-lg">
                                        <div className="text-[9px] font-bold text-slate-500 uppercase mb-1">🔊 Nagranie</div>
                                        <audio controls src={(entry.metadata.recording_url || entry.metadata.recordingUrl) as string} className="w-full h-8" />
                                    </div>
                                )}

                                {/* Attachments */}
                                {entry.metadata?.attachments?.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {(entry.metadata.attachments as string[]).map((url: string, i: number) => (
                                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 bg-white/80 px-2 py-1 rounded-lg text-xs text-slate-600 hover:bg-white border border-slate-200">
                                                📎 Załącznik {i + 1}
                                            </a>
                                        ))}
                                    </div>
                                )}

                                {/* User info */}
                                {entry.metadata?.user && (
                                    <div className="mt-1 text-[10px] text-slate-400">
                                        👤 {entry.metadata.user.firstName} {entry.metadata.user.lastName}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ── Exported Scoring Helper ──
export function calculateEngagementScore(entries: { channel: string; direction: string; date: string; status?: string }[]): number {
    let pts = 0;
    const now = Date.now();
    for (const e of entries) {
        const age = now - new Date(e.date).getTime();
        const recency = age < 7 * 86400000 ? 2 : age < 30 * 86400000 ? 1.5 : 1;
        if (e.channel === 'whatsapp' && e.direction === 'inbound') pts += 10 * recency;
        else if (e.channel === 'whatsapp') pts += 5 * recency;
        else if (e.channel === 'sms') pts += 3 * recency;
        else if ((e.channel === 'call' || e.channel === 'ringostat') && e.status !== 'missed') pts += 8 * recency;
        else if (e.channel === 'call' || e.channel === 'ringostat') pts += 2 * recency;
        else if (e.channel === 'email') pts += 5 * recency;
    }
    return Math.round(pts);
}
