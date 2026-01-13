import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Prize, FairProductConfig } from '../../types';
import { DatabaseService } from '../../services/database';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { generateFairPDF } from '../../utils/fairPdfGenerator';

interface FairLeadFormProps {
    fairId: string;
    fairName: string;
    onSaved: (leadId: string, customerName: string, prize?: string) => void;
    onCancel: () => void;
}

export default function FairLeadForm({ fairId, fairName, onSaved, onCancel }: FairLeadFormProps) {
    const { currentUser } = useAuth();

    // --- STATE ---
    const [viewMode, setViewMode] = useState<'hub' | 'config' | 'interview' | 'finalize' | 'wheel'>('hub');
    const [prizes, setPrizes] = useState<Prize[]>([]);

    // Main Lead Data
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [city, setCity] = useState('');
    const [zip, setZip] = useState('');
    const [address, setAddress] = useState('');
    const [mainNotes, setMainNotes] = useState('');
    const [conversationSummary, setConversationSummary] = useState('');

    // Products
    const [products, setProducts] = useState<FairProductConfig[]>([]);

    // Interview
    const [clientQuestions, setClientQuestions] = useState<string[]>([]);
    const [newQuestion, setNewQuestion] = useState('');
    const [nextActions, setNextActions] = useState<string[]>([]);

    // Config Wizard
    const [currentProduct, setCurrentProduct] = useState<FairProductConfig | null>(null);
    const [configStep, setConfigStep] = useState<'type' | 'dimensions'>('type');

    // Photos
    const [photos, setPhotos] = useState<{ url: string; name: string }[]>([]);
    const [uploading, setUploading] = useState(false);

    // Loading
    const [loading, setLoading] = useState(false);
    const [spinning, setSpinning] = useState(false);

    // Assignment (Admin/Manager)
    const [assignees, setAssignees] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
    const [selectedAssigneeId, setSelectedAssigneeId] = useState(currentUser?.id || '');

    useEffect(() => {
        loadPrizes();
        if (currentUser?.role === 'admin' || currentUser?.role === 'manager') {
            loadAssignees();
        }
    }, [currentUser]);

    const loadPrizes = async () => {
        try {
            const { data, error } = await supabase
                .from('fair_prizes')
                .select('*')
                .eq('fair_id', fairId)
                .eq('is_active', true)
                .order('display_order');
            if (error) throw error;
            setPrizes(data || []);
        } catch (e) {
            console.error('Failed to load prizes:', e);
        }
    };

    const loadAssignees = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, first_name, last_name')
                .in('role', ['admin', 'manager', 'sales_rep']);
            if (error) throw error;
            setAssignees(data?.map(p => ({
                id: p.id,
                firstName: p.first_name || '',
                lastName: p.last_name || ''
            })) || []);
        } catch (e) {
            console.error('Failed to load assignees:', e);
        }
    };

    // Helper to determine current step number for progress
    const getCurrentStep = () => {
        switch (viewMode) {
            case 'hub': case 'config': return 1;
            case 'interview': return 2;
            case 'finalize': return 3;
            case 'wheel': return 4;
            default: return 1;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30">
            {/* MODERN HEADER WITH PROGRESS */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        {/* Fair Info */}
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
                                <span className="text-2xl">🎪</span>
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-slate-800">{fairName}</h1>
                                <p className="text-sm text-slate-500">Formularz Leada</p>
                            </div>
                        </div>

                        {/* Progress Indicator */}
                        <div className="hidden md:flex items-center gap-2">
                            {['Produkty', 'Wywiad', 'Dane', 'Nagroda'].map((label, i) => {
                                const step = i + 1;
                                const current = getCurrentStep();
                                const completed = step < current;
                                const active = step === current;

                                return (
                                    <React.Fragment key={i}>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${completed ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg' :
                                                    active ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-xl ring-4 ring-blue-100' :
                                                        'bg-slate-100 text-slate-400 border-2 border-slate-200'
                                                }`}>
                                                {completed ? '✓' : step}
                                            </div>
                                            <span className={`text-xs font-semibold ${active ? 'text-blue-600' : 'text-slate-400'}`}>
                                                {label}
                                            </span>
                                        </div>
                                        {i < 3 && (
                                            <div className={`w-8 h-1 rounded-full mb-6 transition-all ${step < current ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-slate-200'
                                                }`} />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={onCancel}
                            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 transition-all flex items-center justify-center group"
                        >
                            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Mobile Progress Bar */}
                    <div className="md:hidden mt-3">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                            <span>Krok {getCurrentStep()} z 4</span>
                            <span>{Math.round((getCurrentStep() / 4) * 100)}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-500 ease-out"
                                style={{ width: `${(getCurrentStep() / 4) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Content will be rendered here based on viewMode */}
                {viewMode === 'hub' && <div>Product Hub (będzie przeprojektowane dalej)</div>}
                {viewMode === 'finalize' && <div>Finalize View (będzie przeprojektowane dalej)</div>}
            </div>
        </div>
    );
}
