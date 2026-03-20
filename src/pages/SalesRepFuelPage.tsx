import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { DatabaseService } from '../services/database';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import type { FuelLog, FuelingType } from '../types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export const SalesRepFuelPage: React.FC = () => {
    const { currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';

    // Tabs
    const [activeTab, setActiveTab] = useState<'form' | 'stats'>('form');

    // Form state
    const [fuelingType, setFuelingType] = useState<FuelingType>('internal');
    const [liters, setLiters] = useState<number | ''>('');
    const [netCost, setNetCost] = useState<number | ''>('');
    const [currency, setCurrency] = useState<'EUR' | 'PLN'>('PLN');
    const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
    const [odometer, setOdometer] = useState<number | ''>('');
    const [stationName, setStationName] = useState('');
    const [receiptPhoto, setReceiptPhoto] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // List state
    const [logs, setLogs] = useState<FuelLog[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(true);

    // Stats state
    const [statsMonth, setStatsMonth] = useState(new Date().getMonth() + 1);
    const [statsYear, setStatsYear] = useState(new Date().getFullYear());
    const [stats, setStats] = useState<{ byUser: any[]; totals: { totalLiters: number; totalCost: number; totalEntries: number } } | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);

    const monthNames = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];

    // Load my logs
    const loadLogs = useCallback(async () => {
        if (!currentUser) return;
        setLoadingLogs(true);
        try {
            const data = await DatabaseService.getFuelLogs(currentUser.id);
            setLogs(data);
        } catch (err) {
            console.error('Error loading logs:', err);
        } finally {
            setLoadingLogs(false);
        }
    }, [currentUser]);

    useEffect(() => { loadLogs(); }, [loadLogs]);

    // Load stats
    const loadStats = useCallback(async () => {
        setLoadingStats(true);
        try {
            const data = await DatabaseService.getFuelStats(statsMonth, statsYear);
            setStats(data);
        } catch (err) {
            console.error('Stats error:', err);
        } finally {
            setLoadingStats(false);
        }
    }, [statsMonth, statsYear]);

    useEffect(() => { if (activeTab === 'stats') loadStats(); }, [activeTab, loadStats]);

    // Upload
    const uploadPhoto = async (file: File): Promise<string> => {
        const ext = file.name.split('.').pop();
        const path = `receipts/${uuidv4()}.${ext}`;
        const { error } = await supabase.storage.from('fuel-logs').upload(path, file);
        if (error) throw error;
        return supabase.storage.from('fuel-logs').getPublicUrl(path).data.publicUrl;
    };

    // Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        if (!liters || !logDate) { toast.error('Wpisz litry i datę'); return; }
        if (fuelingType === 'external' && !netCost) { toast.error('Podaj kwotę netto'); return; }
        if (fuelingType === 'external' && !receiptPhoto) { toast.error('Dodaj zdjęcie paragonu'); return; }

        setLoading(true);
        try {
            let receiptUrl: string | undefined;
            if (receiptPhoto) receiptUrl = await uploadPhoto(receiptPhoto);

            const { error } = await DatabaseService.createFuelLog({
                userId: currentUser.id,
                type: 'sales_rep',
                fuelingType,
                liters: Number(liters),
                cost: fuelingType === 'external' ? Number(netCost) : undefined,
                netCost: fuelingType === 'external' ? Number(netCost) : undefined,
                currency: fuelingType === 'external' ? currency : 'PLN',
                logDate,
                odometerReading: odometer ? Number(odometer) : undefined,
                receiptPhotoUrl: receiptUrl,
                stationName: stationName || undefined,
            });
            if (error) throw error;

            toast.success('⛽ Tankowanie zapisane!');
            setLiters(''); setNetCost(''); setOdometer(''); setStationName(''); setCurrency('PLN');
            setReceiptPhoto(null); setLogDate(new Date().toISOString().split('T')[0]);
            if (fileInputRef.current) fileInputRef.current.value = '';
            loadLogs();
        } catch (err) {
            console.error(err);
            toast.error('Błąd zapisu');
        } finally {
            setLoading(false);
        }
    };

    const isExt = fuelingType === 'external';

    // Monthly summary from my logs
    const now = new Date();
    const thisMonth = logs.filter(l => { const d = new Date(l.logDate); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    const mLiters = thisMonth.reduce((s, l) => s + l.liters, 0);
    const mCostPLN = thisMonth.filter(l => (l.currency || 'PLN') === 'PLN').reduce((s, l) => s + (l.cost || l.netCost || 0), 0);
    const mCostEUR = thisMonth.filter(l => (l.currency || 'PLN') === 'EUR').reduce((s, l) => s + (l.cost || l.netCost || 0), 0);

    return (
        <div style={{ padding: 'clamp(16px, 3vw, 24px)', maxWidth: 1200, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
                    ⛽ Moje tankowanie
                </h1>
                <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
                    Rejestruj pobrane paliwo — wpisy przypisane do Twojego konta
                </p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f1f5f9', borderRadius: 12, padding: 4, width: 'fit-content' }}>
                {[
                    { key: 'form' as const, label: '⛽ Nowy wpis' },
                    ...(isAdmin ? [{ key: 'stats' as const, label: '📊 Statystyki zespołu' }] : []),
                ].map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        style={{
                            padding: '10px 20px', borderRadius: 10, border: 'none',
                            background: activeTab === tab.key ? '#fff' : 'transparent',
                            color: activeTab === tab.key ? '#1e293b' : '#64748b',
                            fontWeight: activeTab === tab.key ? 700 : 500,
                            fontSize: 14, cursor: 'pointer',
                            boxShadow: activeTab === tab.key ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                            transition: 'all 0.2s',
                        }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'form' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 380px) 1fr', gap: 20, alignItems: 'flex-start' }}>
                    {/* === FORM === */}
                    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                        <div style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', padding: '20px 24px' }}>
                            <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>⛽ Nowe tankowanie</h2>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: '4px 0 0' }}>Wybierz rodzaj i uzupełnij dane</p>
                        </div>
                        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Toggle */}
                            <div>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>Rodzaj</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    <button type="button" onClick={() => setFuelingType('internal')}
                                        style={{ padding: '14px 16px', borderRadius: 12, border: '2px solid', borderColor: !isExt ? '#3b82f6' : '#e2e8f0', background: !isExt ? '#eff6ff' : '#fff', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}>
                                        <div style={{ fontSize: 24, marginBottom: 4 }}>💳</div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: !isExt ? '#1d4ed8' : '#64748b' }}>Karta firmowa</div>
                                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Wewnętrzne</div>
                                    </button>
                                    <button type="button" onClick={() => setFuelingType('external')}
                                        style={{ padding: '14px 16px', borderRadius: 12, border: '2px solid', borderColor: isExt ? '#f97316' : '#e2e8f0', background: isExt ? '#fff7ed' : '#fff', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}>
                                        <div style={{ fontSize: 24, marginBottom: 4 }}>🧾</div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: isExt ? '#c2410c' : '#64748b' }}>Własne środki</div>
                                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Zewnętrzne</div>
                                    </button>
                                </div>
                            </div>
                            {/* Date */}
                            <div>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>📅 Data</label>
                                <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                            {/* Liters */}
                            <div>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>🛢️ Litry *</label>
                                <input type="number" value={liters} onChange={e => setLiters(e.target.value ? Number(e.target.value) : '')}
                                    placeholder="np. 45.20" step="0.01" min="0"
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                            {/* External-only */}
                            {isExt && (<>
                                {/* Currency Toggle */}
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>💱 Waluta</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                        <button type="button" onClick={() => setCurrency('EUR')}
                                            style={{ padding: '10px 14px', borderRadius: 10, border: '2px solid', borderColor: currency === 'EUR' ? '#16a34a' : '#e2e8f0', background: currency === 'EUR' ? '#f0fdf4' : '#fff', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                            <span style={{ fontSize: 18 }}>💶</span>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: currency === 'EUR' ? '#15803d' : '#64748b' }}>EUR (€)</span>
                                        </button>
                                        <button type="button" onClick={() => setCurrency('PLN')}
                                            style={{ padding: '10px 14px', borderRadius: 10, border: '2px solid', borderColor: currency === 'PLN' ? '#dc2626' : '#e2e8f0', background: currency === 'PLN' ? '#fef2f2' : '#fff', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                            <span style={{ fontSize: 18 }}>🇵🇱</span>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: currency === 'PLN' ? '#b91c1c' : '#64748b' }}>PLN (zł)</span>
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>{currency === 'EUR' ? '💶' : '💰'} Kwota netto ({currency}) *</label>
                                    <input type="number" value={netCost} onChange={e => setNetCost(e.target.value ? Number(e.target.value) : '')}
                                        placeholder={currency === 'EUR' ? 'np. 78.50' : 'np. 350.00'} step="0.01" min="0"
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>📸 Zdjęcie paragonu/faktury *</label>
                                    <div style={{ border: '2px dashed #d1d5db', borderRadius: 12, padding: 16, textAlign: 'center', background: receiptPhoto ? '#f0fdf4' : '#f8fafc', cursor: 'pointer', transition: 'all 0.2s' }}
                                        onClick={() => fileInputRef.current?.click()}>
                                        {receiptPhoto ? (
                                            <div><span style={{ fontSize: 24 }}>✅</span><p style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, marginTop: 4 }}>{receiptPhoto.name}</p><p style={{ fontSize: 11, color: '#94a3b8' }}>Kliknij aby zmienić</p></div>
                                        ) : (
                                            <div><span style={{ fontSize: 24 }}>📷</span><p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Kliknij aby dodać zdjęcie</p></div>
                                        )}
                                        <input type="file" accept="image/*" ref={fileInputRef} onChange={e => { if (e.target.files?.[0]) setReceiptPhoto(e.target.files[0]); }} style={{ display: 'none' }} />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>🏪 Stacja (opcj.)</label>
                                    <input type="text" value={stationName} onChange={e => setStationName(e.target.value)} placeholder="np. Shell, Aral..."
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                            </>)}
                            {/* Odometer */}
                            <div>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>📊 Licznik km (opcj.)</label>
                                <input type="number" value={odometer} onChange={e => setOdometer(e.target.value ? Number(e.target.value) : '')} placeholder="np. 125000" min="0"
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                            {/* Submit */}
                            <button type="submit" disabled={loading}
                                style={{
                                    width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
                                    background: loading ? '#94a3b8' : isExt ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                    color: '#fff', fontWeight: 700, fontSize: 15, cursor: loading ? 'default' : 'pointer',
                                    boxShadow: loading ? 'none' : '0 4px 16px rgba(0,0,0,0.15)', transition: 'all 0.3s',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                }}>
                                {loading ? (<><div style={{ width: 18, height: 18, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />Zapisywanie...</>) : (<>⛽ Zapisz tankowanie</>)}
                            </button>
                            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                        </form>
                    </div>

                    {/* === MY LOGS === */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Mini stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                            <div style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', borderRadius: 14, padding: '16px 20px', border: '1px solid #bfdbfe' }}>
                                <p style={{ color: '#3b82f6', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Ten miesiąc</p>
                                <p style={{ fontSize: 24, fontWeight: 800, color: '#1e3a5f', marginTop: 4 }}>{mLiters.toFixed(1)} L</p>
                            </div>
                            <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderRadius: 14, padding: '16px 20px', border: '1px solid #bbf7d0' }}>
                                <p style={{ color: '#16a34a', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Koszt</p>
                                <p style={{ fontSize: 22, fontWeight: 800, color: '#14532d', marginTop: 4 }}>
                                    {mCostPLN > 0 && <span>{mCostPLN.toFixed(2)} zł</span>}
                                    {mCostPLN > 0 && mCostEUR > 0 && <span style={{ color: '#94a3b8', margin: '0 4px' }}>|</span>}
                                    {mCostEUR > 0 && <span>{mCostEUR.toFixed(2)} €</span>}
                                    {mCostPLN === 0 && mCostEUR === 0 && <span>0,00 zł</span>}
                                </p>
                            </div>
                            <div style={{ background: 'linear-gradient(135deg, #faf5ff, #f3e8ff)', borderRadius: 14, padding: '16px 20px', border: '1px solid #e9d5ff' }}>
                                <p style={{ color: '#7c3aed', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Wpisy</p>
                                <p style={{ fontSize: 24, fontWeight: 800, color: '#3b0764', marginTop: 4 }}>{thisMonth.length}</p>
                            </div>
                        </div>

                        {/* Log entries */}
                        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0 }}>📋 Moje wpisy ({logs.length})</h3>
                            </div>
                            {loadingLogs ? (
                                <div style={{ padding: 40, textAlign: 'center' }}>
                                    <div style={{ width: 32, height: 32, border: '3px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                                </div>
                            ) : logs.length === 0 ? (
                                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                                    <div style={{ fontSize: 48, marginBottom: 12 }}>⛽</div>
                                    <p style={{ color: '#64748b', fontSize: 15 }}>Brak wpisów</p>
                                    <p style={{ color: '#94a3b8', fontSize: 13 }}>Dodaj pierwsze tankowanie formularzem obok</p>
                                </div>
                            ) : (
                                <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                                    {logs.map(log => (
                                        <div key={log.id} style={{ padding: '14px 20px', borderBottom: '1px solid #f8fafc', display: 'flex', alignItems: 'center', gap: 14 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: log.fuelingType === 'internal' ? '#eff6ff' : '#fff7ed', fontSize: 20, flexShrink: 0 }}>
                                                {log.fuelingType === 'internal' ? '💳' : '🧾'}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                    <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>{log.liters} L</span>
                                                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, fontWeight: 700, background: log.fuelingType === 'internal' ? '#dbeafe' : '#fed7aa', color: log.fuelingType === 'internal' ? '#1d4ed8' : '#c2410c' }}>
                                                        {log.fuelingType === 'internal' ? 'FIRMOWA' : 'ZEWNĘTRZNE'}
                                                    </span>
                                                    {log.stationName && <span style={{ fontSize: 12, color: '#94a3b8' }}>🏪 {log.stationName}</span>}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: 12, color: '#64748b' }}>📅 {format(new Date(log.logDate), 'dd MMM yyyy', { locale: de })}</span>
                                                    {log.odometerReading ? <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>🔢 {log.odometerReading.toLocaleString()} km</span> : null}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                {(log.cost || log.netCost) ? <span style={{ fontWeight: 700, color: '#16a34a', fontSize: 15 }}>{(log.cost || log.netCost || 0).toFixed(2)} {log.currency === 'PLN' ? 'zł' : '€'}</span> : <span style={{ fontSize: 12, color: '#94a3b8' }}>—</span>}
                                                {log.receiptPhotoUrl && <div style={{ marginTop: 2 }}><a href={log.receiptPhotoUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#3b82f6', textDecoration: 'none' }}>📎 Paragon</a></div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                /* === STATS TAB === */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Month Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button onClick={() => { if (statsMonth === 1) { setStatsMonth(12); setStatsYear(y => y - 1); } else setStatsMonth(m => m - 1); }}
                            style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', minWidth: 160, textAlign: 'center' }}>{monthNames[statsMonth - 1]} {statsYear}</span>
                        <button onClick={() => { if (statsMonth === 12) { setStatsMonth(1); setStatsYear(y => y + 1); } else setStatsMonth(m => m + 1); }}
                            style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>→</button>
                    </div>

                    {loadingStats ? (
                        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 40, textAlign: 'center' }}>
                            <div style={{ width: 36, height: 36, border: '3px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                        </div>
                    ) : stats ? (<>
                        {/* Totals */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                            <div style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', borderRadius: 16, padding: '20px 24px', color: '#fff' }}>
                                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.7 }}>Łącznie litry</p>
                                <p style={{ fontSize: 32, fontWeight: 800, marginTop: 6 }}>{stats.totals.totalLiters.toFixed(1)}</p>
                                <p style={{ fontSize: 12, opacity: 0.5, marginTop: 2 }}>litrów paliwa</p>
                            </div>
                            <div style={{ background: 'linear-gradient(135deg, #16a34a, #059669)', borderRadius: 16, padding: '20px 24px', color: '#fff' }}>
                                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.7 }}>Łączny koszt</p>
                                <div style={{ marginTop: 6 }}>
                                    {stats.totals.totalCostPLN > 0 && <p style={{ fontSize: 28, fontWeight: 800 }}>{stats.totals.totalCostPLN.toFixed(2)} zł</p>}
                                    {stats.totals.totalCostEUR > 0 && <p style={{ fontSize: stats.totals.totalCostPLN > 0 ? 20 : 28, fontWeight: 800, opacity: stats.totals.totalCostPLN > 0 ? 0.8 : 1 }}>{stats.totals.totalCostEUR.toFixed(2)} €</p>}
                                    {stats.totals.totalCostPLN === 0 && stats.totals.totalCostEUR === 0 && <p style={{ fontSize: 28, fontWeight: 800 }}>0,00 zł</p>}
                                </div>
                                <p style={{ fontSize: 12, opacity: 0.5, marginTop: 2 }}>netto</p>
                            </div>
                            <div style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', borderRadius: 16, padding: '20px 24px', color: '#fff' }}>
                                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.7 }}>Wpisy</p>
                                <p style={{ fontSize: 32, fontWeight: 800, marginTop: 6 }}>{stats.totals.totalEntries}</p>
                                <p style={{ fontSize: 12, opacity: 0.5, marginTop: 2 }}>tankowań</p>
                            </div>
                        </div>
                        {/* Per-person */}
                        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>👥 Statystyki na osoby — {monthNames[statsMonth - 1]} {statsYear}</h3>
                            </div>
                            {stats.byUser.length === 0 ? (
                                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>Brak danych za ten miesiąc</div>
                            ) : stats.byUser.map((user: any, i: number) => {
                                const pct = stats!.totals.totalLiters > 0 ? (user.totalLiters / stats!.totals.totalLiters) * 100 : 0;
                                return (
                                    <div key={user.userId} style={{ padding: '18px 20px', borderBottom: i < stats!.byUser.length - 1 ? '1px solid #f1f5f9' : undefined, display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{ width: 36, height: 36, borderRadius: 10, background: i === 0 ? '#fef3c7' : i === 1 ? '#f1f5f9' : '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: i === 0 ? '#92400e' : '#64748b', flexShrink: 0 }}>
                                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>{user.userName}</span>
                                                <span style={{ fontSize: 12, color: '#94a3b8' }}>{user.entries} wpisów</span>
                                            </div>
                                            <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, #3b82f6, #2563eb)', width: `${Math.min(pct, 100)}%`, transition: 'width 0.5s ease' }} />
                                            </div>
                                            <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                                                <span style={{ fontSize: 11, color: '#64748b' }}>💳 {user.internalCount} wewn.</span>
                                                <span style={{ fontSize: 11, color: '#64748b' }}>🧾 {user.externalCount} zewn.</span>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <p style={{ fontWeight: 800, color: '#1e293b', fontSize: 16 }}>{user.totalLiters.toFixed(1)} L</p>
                                            {user.totalCostPLN > 0 && <p style={{ fontWeight: 600, color: '#16a34a', fontSize: 13 }}>{user.totalCostPLN.toFixed(2)} zł</p>}
                                            {user.totalCostEUR > 0 && <p style={{ fontWeight: 600, color: '#0284c7', fontSize: 13 }}>{user.totalCostEUR.toFixed(2)} €</p>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>) : null}
                </div>
            )}
        </div>
    );
};
