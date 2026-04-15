import React, { useEffect, useState, useCallback, useRef } from 'react';
import { PulseService, type TeamMemberPulse, type PulseOverview } from '../../services/database/pulse.service';
import { supabase } from '../../lib/supabase';

/* ──────── CONSTANTS ──────── */
const ROLES: Record<string, string> = { admin: 'Administrator', manager: 'Manager', sales_rep: 'Handlowiec DE', sales_rep_pl: 'Handlowiec PL' };
const GRADS = ['from-violet-500 to-purple-600','from-blue-500 to-indigo-600','from-emerald-500 to-teal-600','from-amber-500 to-orange-600','from-rose-500 to-pink-600','from-cyan-500 to-blue-600','from-fuchsia-500 to-purple-600','from-lime-500 to-green-600'];
const MOD_C: Record<string, string> = {
    'Leady':'from-purple-500 to-purple-600','Oferty':'from-blue-500 to-blue-600','Poczta e-mail':'from-sky-500 to-sky-600',
    'Połączenia':'from-green-500 to-green-600','Klienci':'from-orange-500 to-orange-600','Umowy':'from-amber-500 to-amber-600',
    'Dashboard':'from-slate-500 to-slate-600','Kalkulator dachowy':'from-indigo-500 to-indigo-600','Zadania':'from-emerald-500 to-emerald-600',
    'Kalendarz montaży':'from-rose-500 to-rose-600','Serwis':'from-red-500 to-red-600','Wizualizator 3D':'from-fuchsia-500 to-fuchsia-600',
    'Asystent AI':'from-violet-500 to-violet-600','Pomiary':'from-teal-500 to-teal-600',
};
const WDH = 8;
const STATUS_PL: Record<string, string> = {
    new:'Nowy', formularz:'Formularz', fair:'Targi', contacted:'Skontaktowany', offer_sent:'Oferta wysłana',
    negotiation:'Negocjacje', measurement_scheduled:'Pomiar um.', measurement_completed:'Pomiar wyk.', won:'Wygrane', lost:'Przegrane',
};

/* ──────── HELPERS ──────── */
const fmt = (m: number) => { if(m<1)return'<1m'; if(m<60)return`${m}m`; const h=Math.floor(m/60),r=m%60; return r>0?`${h}h ${r}m`:`${h}h`; };
const ago = (iso: string|null) => { if(!iso)return'nigdy'; const d=Date.now()-new Date(iso).getTime(),m=Math.round(d/60000); if(m<1)return'teraz'; if(m<60)return`${m}m temu`; const h=Math.floor(m/60); return h<24?`${h}h temu`:new Date(iso).toLocaleDateString('pl-PL',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}); };
const si = (m: TeamMemberPulse) => {
    if (m.isOnline) { const a=m.lastSeenAt?Math.round((Date.now()-new Date(m.lastSeenAt).getTime())/60000):99; return a>5?{d:'bg-amber-400',l:'Nieaktywny',t:'text-amber-600',b:'bg-amber-50'}:{d:'bg-emerald-500',l:'Online',t:'text-emerald-600',b:'bg-emerald-50'}; }
    return {d:'bg-slate-300',l:'Offline',t:'text-slate-400',b:'bg-slate-50'};
};

/* ──────── COMPONENTS ──────── */
const LT: React.FC<{s:string}> = ({s}) => {
    const [t,sT]=useState(''); const r=useRef<ReturnType<typeof setInterval>>();
    useEffect(()=>{ const u=()=>{const d=Date.now()-new Date(s).getTime();sT(`${Math.floor(d/3600000)}:${String(Math.floor((d%3600000)/60000)).padStart(2,'0')}:${String(Math.floor((d%60000)/1000)).padStart(2,'0')}`);};u();r.current=setInterval(u,1000);return()=>clearInterval(r.current);},[s]);
    return <span className="tabular-nums font-mono text-emerald-600 font-bold text-sm">{t}</span>;
};

const MB: React.FC<{m:string;mins:number;mx:number}> = ({m,mins,mx}) => (
    <div className="flex items-center gap-2.5 text-xs">
        <span className="w-32 text-slate-600 truncate text-right font-medium">{m}</span>
        <div className="flex-1 h-6 bg-slate-50 rounded-lg overflow-hidden border border-slate-100">
            <div className={`h-full bg-gradient-to-r ${MOD_C[m]||'from-slate-400 to-slate-500'} rounded-lg transition-all duration-700 flex items-center justify-end pr-2`} style={{width:`${Math.max(6,(mins/mx)*100)}%`,minWidth:'2.5rem'}}>
                <span className="text-[10px] text-white font-bold drop-shadow-sm">{fmt(mins)}</span>
            </div>
        </div>
    </div>
);

const WB: React.FC<{m:number}> = ({m:mins}) => {
    const p=Math.min(100,(mins/(WDH*60))*100);
    return <div className="mt-1.5"><div className="flex justify-between text-[10px] text-slate-400 mb-0.5"><span>{(mins/60).toFixed(1)}h/{WDH}h</span><span>{Math.round(p)}%</span></div>
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-700 ${p>=80?'bg-emerald-500':p>=50?'bg-blue-500':p>=25?'bg-amber-500':'bg-slate-300'}`} style={{width:`${p}%`}}/></div></div>;
};

const MC: React.FC<{l:string;v:number|string;sub?:string;c:string;icon:React.ReactNode}> = ({l,v,sub,c,icon}) => (
    <div className={`${c} rounded-xl p-3 border text-center`}><div className="flex justify-center mb-1 opacity-50">{icon}</div><p className="text-xl font-bold">{v}</p><p className="text-[10px] opacity-60 font-medium">{l}</p>{sub&&<p className="text-[9px] opacity-40 mt-0.5">{sub}</p>}</div>
);

/* ──────── SVG ICONS ──────── */
const I = {
    lead:<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
    eye:<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>,
    arrow:<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/></svg>,
    trophy:<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>,
    offer:<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>,
    pOut:<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 3h5m0 0v5m0-5l-6 6M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>,
    pIn:<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 3l-6 6m0-5v5h5M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>,
    pX:<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>,
    clock:<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
    mail:<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
    sms:<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>,
    whatsapp:<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.29-1.24l-.31-.18-3.12.82.83-3.04-.2-.31A8 8 0 1112 20z"/></svg>,
    taskPlus:<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
    task:<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
    contract:<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
    contact:<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>,
    x:<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/></svg>,
    ruler:<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>,
    install:<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>,
    euro:<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.121 15.536c-1.171 1.952-3.07 1.952-4.242 0-1.172-1.953-1.172-5.119 0-7.072 1.171-1.952 3.07-1.952 4.242 0M8 10.5h4m-4 3h4"/></svg>,
    medal:<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>,
};

/* ──────────────────── MAIN ──────────────────── */
export const PulseDashboard: React.FC = () => {
    const [pulse, setPulse] = useState<PulseOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [exp, setExp] = useState<string | null>(null);
    const [tab, setTab] = useState<'all'|'leads'|'calls'|'comms'|'field'>('all');
    const [now, setNow] = useState(Date.now());

    const isToday = date === new Date().toISOString().split('T')[0];
    const dl = new Date(date+'T12:00:00').toLocaleDateString('pl-PL',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

    const load = useCallback(async () => {
        setLoading(true);
        try { setPulse(await PulseService.getTeamPulse(new Date(date+'T00:00:00'))); } catch(e){ console.error(e); } finally { setLoading(false); }
    }, [date]);

    useEffect(()=>{load();},[load]);
    useEffect(()=>{ if(!isToday)return; const a=setInterval(load,60_000),b=setInterval(()=>setNow(Date.now()),30_000); return()=>{clearInterval(a);clearInterval(b);}; },[isToday,load]);
    useEffect(()=>{ if(!isToday)return; const c=supabase.channel('pulse').on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles'},()=>load()).subscribe(); return()=>{supabase.removeChannel(c);}; },[isToday,load]);

    const qd=[{l:'Dziś',o:0},{l:'Wczoraj',o:-1},{l:'2 dni',o:-2},{l:'Tydzień',o:-7}];

    return (
        <div className="max-w-6xl mx-auto" key={now}>
            {/* HEADER */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                        </div>
                        Puls Firmy
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 capitalize">{dl}</p>
                </div>
                {isToday&&pulse&&<div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/><span className="text-emerald-700 text-xs font-medium">Live • {new Date().toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'})}</span></div>}
            </div>

            {/* DATE */}
            <div className="flex items-center gap-2 mb-5 flex-wrap">
                {qd.map(q=>{const d=new Date();d.setDate(d.getDate()+q.o);const v=d.toISOString().split('T')[0];return<button key={q.o} onClick={()=>setDate(v)} className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${date===v?'bg-slate-800 text-white shadow-sm':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>{q.l}</button>;})}
                <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="px-3 py-2 rounded-lg text-xs border border-slate-200 bg-white text-slate-600 font-medium"/>
            </div>

            {/* SUMMARY */}
            {pulse&&<div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mb-5">
                {[
                    {v:pulse.totalOnline,l:'Online',c:'bg-emerald-50 border-emerald-100 text-emerald-700'},
                    {v:`${pulse.totalHoursToday}h`,l:'Czas pracy',c:'bg-indigo-50 border-indigo-100 text-indigo-700'},
                    {v:pulse.teamTotals.leadsCreated,l:'Leady',c:'bg-purple-50 border-purple-100 text-purple-700'},
                    {v:pulse.teamTotals.offersCreated,l:'Oferty',c:'bg-blue-50 border-blue-100 text-blue-700'},
                    {v:`${pulse.teamTotals.callsTotal} (${pulse.teamTotals.callMinutes}m)`,l:'Połączenia',c:'bg-green-50 border-green-100 text-green-700'},
                    {v:pulse.teamTotals.measurementsScheduled,l:'Pomiary',c:'bg-teal-50 border-teal-100 text-teal-700'},
                    {v:`${pulse.teamTotals.contractsSigned} (${pulse.teamTotals.contractsValue>0?(pulse.teamTotals.contractsValue/1000).toFixed(1)+'k':'0'}€)`,l:'Umowy',c:'bg-amber-50 border-amber-100 text-amber-700'},
                ].map((s,i)=><div key={i} className={`${s.c} border rounded-xl p-3 text-center`}><p className="text-lg font-bold">{s.v}</p><p className="text-[10px] text-slate-500 font-medium">{s.l}</p></div>)}
            </div>}

            {/* RANKINGS */}
            {pulse&&pulse.rankings&&Object.values(pulse.rankings).some(r=>r!==null)&&(
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 mb-5 text-white">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">{I.medal} Rankingi dnia</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {[
                            {r:pulse.rankings.mostLeads, l:'Najwięcej leadów', ic:'🎯'},
                            {r:pulse.rankings.mostCalls, l:'Najwięcej połączeń', ic:'📞'},
                            {r:pulse.rankings.mostOffers, l:'Najwięcej ofert', ic:'📋'},
                            {r:pulse.rankings.longestWork, l:'Najdłużej w pracy', ic:'⏱️'},
                            {r:pulse.rankings.mostContracts, l:'Najwięcej umów', ic:'📄'},
                            {r:pulse.rankings.highestValue, l:'Najwyższa wartość', ic:'💰'},
                        ].map((rk,i)=>rk.r?(
                            <div key={i} className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
                                <p className="text-lg mb-1">{rk.ic}</p>
                                <p className="text-sm font-bold text-white">{String(rk.r.value)}</p>
                                <p className="text-[10px] text-slate-300 truncate">{rk.r.name}</p>
                                <p className="text-[9px] text-slate-500 mt-0.5">{rk.l}</p>
                            </div>
                        ):null)}
                    </div>
                </div>
            )}

            {/* TABS */}
            <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1 w-fit">
                {(['all','leads','calls','comms','field'] as const).map(t2=>(
                    <button key={t2} onClick={()=>setTab(t2)} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab===t2?'bg-white text-slate-800 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
                        {{all:'Przegląd',leads:'Leady',calls:'Połączenia',comms:'Komunikacja',field:'Pomiary & Montaże'}[t2]}
                    </button>
                ))}
            </div>

            {/* TEAM */}
            {loading?(
                <div className="py-20 text-center"><div className="w-10 h-10 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/><p className="text-slate-400 text-sm">Ładowanie...</p></div>
            ):pulse&&pulse.members.length===0?(
                <div className="py-20 text-center"><p className="text-slate-400">Brak danych za ten dzień</p></div>
            ):pulse&&(
                <div className="space-y-3">
                    {pulse.members.map((member,idx)=>{
                        const st=si(member), isE=exp===member.id, mx=Math.max(...member.moduleBreakdown.map(m=>m.minutes),1), gr=GRADS[idx%GRADS.length], me=member.metrics;
                        const ops=me.leadsCreated+me.offersCreated+me.callsOutbound+me.callsAnswered+me.tasksCompleted+me.contractsSigned;

                        return (
                            <div key={member.id} className={`bg-white rounded-xl border transition-all duration-300 ${isE?'border-indigo-200 shadow-lg shadow-indigo-50':'border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}>
                                {/* HEADER */}
                                <button onClick={()=>setExp(isE?null:member.id)} className="w-full p-4 flex items-center gap-4 text-left">
                                    <div className="relative flex-shrink-0">
                                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${gr} flex items-center justify-center text-white font-bold text-sm shadow-sm`}>{member.fullName.split(' ').map(n=>n[0]).join('').substring(0,2)}</div>
                                        <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${st.d} border-2 border-white shadow-sm`}/>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-semibold text-slate-800">{member.fullName}</h3>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.b} ${st.t}`}>{st.l}</span>
                                            <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">{ROLES[member.role]||member.role}</span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                            {member.isOnline&&member.currentSessionStart?<span className="flex items-center gap-1"><svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><LT s={member.currentSessionStart}/></span>:<span className="flex items-center gap-1">{I.clock}{fmt(member.todayMinutes)}</span>}
                                            {!member.isOnline&&member.lastSeenAt&&<span className="text-slate-400">Ost.: {ago(member.lastSeenAt)}</span>}
                                            {ops>0&&<span className="flex items-center gap-1 text-indigo-600 font-medium"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>{ops} oper.</span>}
                                        </div>
                                        <WB m={member.todayMinutes}/>
                                    </div>
                                    <div className="hidden lg:flex items-center gap-1.5 flex-wrap">
                                        {me.leadsCreated>0&&<span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-1 rounded-lg">{me.leadsCreated} lead</span>}
                                        {me.callsOutbound>0&&<span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-1 rounded-lg">{me.callsOutbound} wyb.</span>}
                                        {me.offersCreated>0&&<span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-lg">{me.offersCreated} ofert</span>}
                                        {me.measurementsScheduled>0&&<span className="bg-teal-50 text-teal-700 text-[10px] font-bold px-2 py-1 rounded-lg">{me.measurementsScheduled} pom.</span>}
                                        {me.contractsSigned>0&&<span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-lg">{me.contractsSigned} um.</span>}
                                    </div>
                                    <svg className={`w-5 h-5 text-slate-400 transition-transform duration-200 flex-shrink-0 ${isE?'rotate-180':''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                                </button>

                                {/* EXPANDED */}
                                {isE&&<div className="px-5 pb-5 border-t border-slate-100">
                                    {/* LEADS */}
                                    {(tab==='all'||tab==='leads')&&<div className="mt-4">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">{I.lead} Pipeline leadów</h4>
                                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
                                            <MC l="Nowe" v={me.leadsCreated} c="bg-purple-50 text-purple-700 border-purple-100" icon={I.lead}/>
                                            <MC l="Przeglądane" v={me.leadsViewed} c="bg-indigo-50 text-indigo-700 border-indigo-100" icon={I.eye}/>
                                            <MC l="Zmiana statusu" v={me.leadsStatusChanged} c="bg-sky-50 text-sky-700 border-sky-100" icon={I.arrow}/>
                                            <MC l="Skontaktowani" v={me.leadsContacted} c="bg-cyan-50 text-cyan-700 border-cyan-100" icon={I.contact}/>
                                            <MC l="Wygrane" v={me.leadsWon} c="bg-emerald-50 text-emerald-700 border-emerald-100" icon={I.trophy}/>
                                            <MC l="Przegrane" v={me.leadsLost} c="bg-red-50 text-red-600 border-red-100" icon={I.x}/>
                                        </div>
                                        {member.recentLeads.length>0&&<div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-4">
                                            <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Ostatnie leady</h5>
                                            <div className="space-y-1.5">{member.recentLeads.map(rl=><div key={rl.id} className="flex items-center justify-between text-xs"><span className="text-slate-700 font-medium truncate">{rl.name}</span><div className="flex items-center gap-2"><span className="text-[10px] bg-white px-1.5 py-0.5 rounded text-slate-500 border border-slate-200">{STATUS_PL[rl.status]||rl.status}</span><span className="text-[10px] text-slate-400">{new Date(rl.time).toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'})}</span></div></div>)}</div>
                                        </div>}
                                    </div>}

                                    {/* CALLS */}
                                    {(tab==='all'||tab==='calls')&&<div className={tab!=='all'?'mt-4':''}>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">{I.pOut} Połączenia</h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                                            <MC l="Wychodzące" v={me.callsOutbound} c="bg-blue-50 text-blue-700 border-blue-100" icon={I.pOut}/>
                                            <MC l="Odebrane" v={me.callsAnswered} c="bg-green-50 text-green-700 border-green-100" icon={I.pIn}/>
                                            <MC l="Nieodebrane" v={me.callsMissed} c="bg-red-50 text-red-600 border-red-100" icon={I.pX}/>
                                            <MC l="Czas rozmów" v={`${me.callMinutes}m`} c="bg-slate-50 text-slate-700 border-slate-200" icon={I.clock}/>
                                        </div>
                                    </div>}

                                    {/* COMMS */}
                                    {(tab==='all'||tab==='comms')&&<div className={tab!=='all'?'mt-4':''}>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">{I.mail} Komunikacja & zadania</h4>
                                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
                                            <MC l="Oferty" v={me.offersCreated} c="bg-blue-50 text-blue-700 border-blue-100" icon={I.offer}/>
                                            <MC l="Oferty obejrzane" v={me.offersViewedByClients} sub="przez klientów" c="bg-indigo-50 text-indigo-700 border-indigo-100" icon={I.eye}/>
                                            <MC l="SMS" v={me.smsSent} c="bg-teal-50 text-teal-700 border-teal-100" icon={I.sms}/>
                                            <MC l="WhatsApp" v={me.whatsappSent} c="bg-green-50 text-green-700 border-green-100" icon={I.whatsapp}/>
                                            <MC l="Zadania stworz." v={me.tasksCreated} c="bg-violet-50 text-violet-700 border-violet-100" icon={I.taskPlus}/>
                                            <MC l="Zadania zakoń." v={me.tasksCompleted} c="bg-emerald-50 text-emerald-700 border-emerald-100" icon={I.task}/>
                                        </div>
                                    </div>}

                                    {/* FIELD: Pomiary & Montaże & Umowy */}
                                    {(tab==='all'||tab==='field')&&<div className={tab!=='all'?'mt-4':''}>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">{I.ruler} Pomiary, montaże & umowy</h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                                            <MC l="Pomiary umówione" v={me.measurementsScheduled} c="bg-teal-50 text-teal-700 border-teal-100" icon={I.ruler}/>
                                            <MC l="Pomiary wykonane" v={me.measurementsCompleted} c="bg-cyan-50 text-cyan-700 border-cyan-100" icon={I.task}/>
                                            <MC l="Montaże zaplan." v={me.installationsScheduled} c="bg-rose-50 text-rose-700 border-rose-100" icon={I.install}/>
                                            <MC l="Umowy" v={me.contractsSigned} c="bg-amber-50 text-amber-700 border-amber-100" icon={I.contract}/>
                                            <MC l="Wartość umów" v={me.contractsValue>0?`${(me.contractsValue/1000).toFixed(1)}k €`:'0 €'} c="bg-yellow-50 text-yellow-700 border-yellow-100" icon={I.euro}/>
                                        </div>
                                    </div>}

                                    {/* MODULES */}
                                    <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 mt-2">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Czas w modułach</h4>
                                        {member.moduleBreakdown.length>0?<div className="space-y-2">{member.moduleBreakdown.map(mb=><MB key={mb.module} m={mb.module} mins={mb.minutes} mx={mx}/>)}</div>:<p className="text-xs text-slate-400 py-6 text-center">Brak danych o nawigacji</p>}
                                    </div>

                                    {/* SESSION FOOTER */}
                                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                                        <div className="flex items-center gap-4"><span>{member.sessionCount} {member.sessionCount===1?'sesja':member.sessionCount<5?'sesje':'sesji'}</span><span>Czas: {fmt(member.todayMinutes)}</span></div>
                                        {member.currentSessionStart&&<span className="flex items-center gap-1 text-emerald-500 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>Sesja od {new Date(member.currentSessionStart).toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'})}</span>}
                                    </div>
                                </div>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
