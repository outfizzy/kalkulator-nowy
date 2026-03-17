
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { DatabaseService } from '../services/database';
import { useAuth } from '../contexts/AuthContext';
import type { Offer, OfferStatus, User, Contract } from '../types';
import { OfferPreviewModal } from './OfferPreviewModal';
import { SendEmailModal } from './leads/SendEmailModal';
import { extractOrderedItemsFromOffer } from '../utils/contractHelpers';

interface OffersListProps {
    offers?: Offer[];
    onDelete?: (id: string) => Promise<void>;
}

const STATUS_CONFIG: Record<OfferStatus, { label: string; labelDe: string; icon: string; bg: string; text: string; ring: string }> = {
    draft: { label: 'Utworzona', labelDe: 'Entwurf', icon: '📝', bg: 'bg-slate-100', text: 'text-slate-700', ring: 'ring-slate-300' },
    sent: { label: 'Wysłana', labelDe: 'Gesendet', icon: '📧', bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-300' },
    accepted: { label: 'Zaakceptowana', labelDe: 'Akzeptiert', icon: '✅', bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-300' },
    sold: { label: 'Sprzedana', labelDe: 'Verkauft', icon: '🤝', bg: 'bg-green-50', text: 'text-green-700', ring: 'ring-green-300' },
    rejected: { label: 'Odrzucona', labelDe: 'Abgelehnt', icon: '❌', bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-300' },
};

const MODEL_LABELS: Record<string, string> = {
    'Trendline': 'Trendline',
    'Trendstyle': 'Trendstyle',
    'Prestige': 'Prestige',
    'Designline': 'Designline',
    'Pergola': 'Pergola',
    'PergolaDeluxe': 'Pergola Deluxe',
    'MANUAL': 'Ręczna',
};

export const OffersList: React.FC<OffersListProps> = ({ offers: propOffers, onDelete }) => {
    const { currentUser, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [fetchedOffers, setFetchedOffers] = useState<Offer[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [filter, setFilter] = useState<OfferStatus | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserId, setSelectedUserId] = useState<string>('all');
    const [salesReps, setSalesReps] = useState<User[]>([]);
    const [previewOffer, setPreviewOffer] = useState<Offer | null>(null);
    const [selectedOfferForEmail, setSelectedOfferForEmail] = useState<Offer | null>(null);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortBy, setSortBy] = useState<'date' | 'value' | 'name'>('date');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [expandedActions, setExpandedActions] = useState<string | null>(null);
    const ITEMS_PER_PAGE = 20;

    const offers = propOffers || fetchedOffers;
    const [loading, setLoading] = useState(!propOffers);

    const loadOffers = React.useCallback(async () => {
        if (propOffers) return;
        if (!currentUser) return;
        setLoading(true);
        try {
            const [allOffers, allContracts, delegatedIds] = await Promise.all([
                DatabaseService.getOffers(),
                DatabaseService.getContracts(),
                DatabaseService.getDelegatedUserIds()
            ]);
            setContracts(allContracts);
            const realOffers = allOffers.filter(o =>
                !o.offerNumber?.startsWith('MANUAL/') && o.product?.modelId !== 'MANUAL'
            );
            if (isAdmin()) {
                const filtered = selectedUserId === 'all'
                    ? realOffers
                    : realOffers.filter(o => o.createdBy === selectedUserId);
                setFetchedOffers(filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
            } else {
                const userOffers = realOffers.filter(o =>
                    o.createdBy === currentUser.id || delegatedIds.includes(o.createdBy)
                );
                setFetchedOffers(userOffers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
            }
        } catch (error) {
            console.error('Error loading offers:', error);
            toast.error('Nie udało się załadować ofert');
        } finally {
            setLoading(false);
        }
    }, [currentUser, isAdmin, selectedUserId, propOffers]);

    useEffect(() => {
        const loadReps = async () => {
            if (currentUser && isAdmin()) {
                try {
                    const reps = await DatabaseService.getSalesReps();
                    setSalesReps(reps);
                } catch (error) {
                    console.error('Error loading sales reps:', error);
                }
            }
        };
        loadReps();
    }, [currentUser, isAdmin]);

    useEffect(() => { loadOffers(); }, [loadOffers]);

    // Close expanded actions when clicking outside
    useEffect(() => {
        const handleClick = () => setExpandedActions(null);
        if (expandedActions) document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [expandedActions]);

    // === ACTIONS ===
    const handleStatusChange = async (id: string, newStatus: OfferStatus) => {
        try {
            await DatabaseService.updateOffer(id, { status: newStatus });
            if (newStatus === 'sold') {
                const offer = offers.find(o => o.id === id);
                const existingContract = contracts.find(c => c.offerId === id);
                if (offer && !existingContract) {
                    const contract = await DatabaseService.createContract({
                        offerId: offer.id, status: 'draft', client: offer.customer,
                        product: offer.product, pricing: offer.pricing, commission: offer.commission,
                        requirements: { constructionProject: false, powerSupply: false, foundation: false },
                        orderedItems: extractOrderedItemsFromOffer(offer), comments: [], attachments: []
                    });
                    toast.success(`Utworzono umowę ${contract.contractNumber}`);
                } else { toast.success('Status zaktualizowany'); }
            } else { toast.success('Status zaktualizowany'); }
            loadOffers();
        } catch { toast.error('Błąd aktualizacji statusu'); }
    };

    const handleDelete = async (id: string) => {
        if (onDelete) { await onDelete(id); return; }
        if (confirm('Czy na pewno usunąć tę ofertę?')) {
            try {
                await DatabaseService.deleteOffer(id);
                toast.success('Oferta usunięta');
                loadOffers();
            } catch { toast.error('Błąd usuwania oferty'); }
        }
    };

    const handlePriceUpdate = async (id: string, currentNet: number) => {
        const newPriceStr = window.prompt('Podaj ostateczną cenę NETTO z umowy (EUR):', currentNet.toString());
        if (newPriceStr) {
            const newPrice = parseFloat(newPriceStr);
            if (!isNaN(newPrice) && newPrice > 0) {
                const offer = offers.find(o => o.id === id);
                if (offer) {
                    try {
                        await DatabaseService.updateOffer(id, { pricing: { ...offer.pricing, finalPriceNet: newPrice } });
                        loadOffers();
                        toast.success('Cena zaktualizowana');
                    } catch { toast.error('Błąd aktualizacji ceny'); }
                }
            } else { toast.error('Nieprawidłowa kwota'); }
        }
    };

    const handleCreateContract = async (offer: Offer) => {
        const existingContract = contracts.find(c => c.offerId === offer.id);
        if (existingContract) { toast.error('Umowa dla tej oferty już istnieje!'); return; }
        if (window.confirm('Czy na pewno chcesz wygenerować umowę dla tej oferty?')) {
            try {
                const contract = await DatabaseService.createContract({
                    offerId: offer.id, status: 'draft', client: offer.customer,
                    product: offer.product, pricing: offer.pricing, commission: offer.commission,
                    requirements: { constructionProject: false, powerSupply: false, foundation: false },
                    orderedItems: extractOrderedItemsFromOffer(offer), comments: [], attachments: []
                });
                toast.success(`Utworzono umowę ${contract.contractNumber}`);
                navigate(`/contracts/${contract.id}`);
            } catch { toast.error('Błąd tworzenia umowy'); }
        }
    };

    const handleCopyLink = async (offer: Offer) => {
        let token = offer.publicToken;
        if (!token) {
            try {
                token = await DatabaseService.ensurePublicToken(offer.id);
            } catch {
                toast.error('Błąd generowania linku');
                return;
            }
        }
        const url = `${window.location.origin}/p/offer/${token}`;
        await navigator.clipboard.writeText(url);
        toast.success('Link skopiowany!');
    };

    const handleOpenOffer = (offer: Offer) => {
        if (offer.publicToken) {
            window.open(`/p/offer/${offer.publicToken}`, '_blank');
        } else {
            toast.error('Brak tokenu oferty — skopiuj link najpierw');
        }
    };

    // === FILTERING & SORTING ===
    const filteredOffers = useMemo(() => {
        let result = offers
            .filter(o => filter === 'all' || o.status === filter)
            .filter(o => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return (
                    (o.customer.firstName || '').toLowerCase().includes(q) ||
                    (o.customer.lastName || '').toLowerCase().includes(q) ||
                    (o.customer.city || '').toLowerCase().includes(q) ||
                    (o.offerNumber || '').toLowerCase().includes(q) ||
                    (o.product?.modelId || '').toLowerCase().includes(q) ||
                    o.id.toLowerCase().includes(q)
                );
            });

        result.sort((a, b) => {
            let cmp = 0;
            if (sortBy === 'date') cmp = a.createdAt.getTime() - b.createdAt.getTime();
            else if (sortBy === 'value') cmp = (a.pricing?.sellingPriceGross || 0) - (b.pricing?.sellingPriceGross || 0);
            else if (sortBy === 'name') cmp = `${a.customer.lastName}`.localeCompare(`${b.customer.lastName}`);
            return sortDir === 'desc' ? -cmp : cmp;
        });

        return result;
    }, [offers, filter, searchQuery, sortBy, sortDir]);

    const isPaginated = !propOffers;
    const totalPages = Math.max(1, Math.ceil(filteredOffers.length / ITEMS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const startIdx = (safePage - 1) * ITEMS_PER_PAGE;
    const displayedOffers = isPaginated ? filteredOffers.slice(startIdx, startIdx + ITEMS_PER_PAGE) : filteredOffers;

    // === STATUS COUNTS ===
    const statusCounts = useMemo(() => ({
        all: offers.length,
        draft: offers.filter(o => o.status === 'draft').length,
        sent: offers.filter(o => o.status === 'sent').length,
        accepted: offers.filter(o => o.status === 'accepted').length,
        sold: offers.filter(o => o.status === 'sold').length,
        rejected: offers.filter(o => o.status === 'rejected').length,
    }), [offers]);

    const totalValue = useMemo(() =>
        offers.reduce((sum, o) => sum + (o.pricing?.sellingPriceGross || 0), 0),
        [offers]
    );

    // === HELPERS ===
    const getCreatorName = (offer: Offer) => {
        if (offer.creator) return `${offer.creator.firstName} ${offer.creator.lastName}`;
        const rep = salesReps.find(r => r.id === offer.createdBy);
        if (rep) return `${rep.firstName} ${rep.lastName}`;
        return offer.createdBy?.slice(0, 8) || '—';
    };

    const getModelLabel = (offer: Offer) => {
        const modelId = offer.product?.modelId || '';
        return MODEL_LABELS[modelId] || modelId || 'Kalkulator';
    };

    const formatPrice = (value: number) => value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="w-10 h-10 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-slate-400">Ładowanie ofert...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Oferty</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {offers.length} ofert • Łączna wartość: {formatPrice(totalValue)}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/new-offer')}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-semibold text-sm shadow-md hover:shadow-lg hover:from-indigo-700 hover:to-blue-700 transition-all flex items-center gap-2 w-fit"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Nowa Oferta
                </button>
            </div>

            {/* STATS CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {([['all', 'Wszystkie', '📊'], ['draft', 'Utworzone', '📝'], ['sent', 'Wysłane', '📧'], ['accepted', 'Zaakceptowane', '✅'], ['sold', 'Sprzedane', '🤝'], ['rejected', 'Odrzucone', '❌']] as const).map(([key, label, icon]) => (
                    <button
                        key={key}
                        onClick={() => { setFilter(key); setCurrentPage(1); }}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${filter === key
                            ? 'border-indigo-400 bg-indigo-50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{icon}</span>
                            <span className={`text-xs font-semibold uppercase tracking-wider ${filter === key ? 'text-indigo-600' : 'text-slate-400'}`}>
                                {label}
                            </span>
                        </div>
                        <div className={`text-xl font-bold ${filter === key ? 'text-indigo-700' : 'text-slate-800'}`}>
                            {statusCounts[key]}
                        </div>
                    </button>
                ))}
            </div>

            {/* FILTER BAR */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input
                            type="text"
                            placeholder="Szukaj: nazwisko, miasto, nr oferty, model..."
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition-all"
                        />
                    </div>
                    {/* Sort */}
                    <div className="flex gap-2">
                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value as any)}
                            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-400 outline-none"
                        >
                            <option value="date">Data</option>
                            <option value="value">Wartość</option>
                            <option value="name">Nazwisko</option>
                        </select>
                        <button
                            onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white hover:bg-slate-50 transition-colors"
                            title={sortDir === 'desc' ? 'Malejąco' : 'Rosnąco'}
                        >
                            {sortDir === 'desc' ? '↓' : '↑'}
                        </button>
                    </div>
                    {/* Admin: rep filter */}
                    {isAdmin() && salesReps.length > 0 && (
                        <select
                            value={selectedUserId}
                            onChange={e => setSelectedUserId(e.target.value)}
                            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-400 outline-none"
                        >
                            <option value="all">Wszyscy przedstawiciele</option>
                            {salesReps.map(rep => (
                                <option key={rep.id} value={rep.id}>{rep.firstName} {rep.lastName}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* OFFERS LIST */}
            {displayedOffers.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
                    <div className="text-4xl mb-3">📋</div>
                    <p className="text-slate-500 font-medium">Brak ofert do wyświetlenia</p>
                    <p className="text-sm text-slate-400 mt-1">Zmień filtry lub utwórz nową ofertę</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {displayedOffers.map((offer) => {
                        const pricing = offer.pricing || ({} as any);
                        const priceGross = Number(pricing.sellingPriceGross ?? pricing.sellingPriceNet ?? 0);
                        const commission = Number(offer.commission ?? 0);
                        const createdDate = offer.createdAt ? new Date(offer.createdAt) : null;
                        const statusConf = STATUS_CONFIG[offer.status] || STATUS_CONFIG.draft;
                        const hasContract = contracts.some(c => c.offerId === offer.id);
                        const isExpanded = expandedActions === offer.id;

                        return (
                            <div
                                key={offer.id}
                                className={`bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden ${offer.status === 'sold' ? 'border-l-4 border-l-green-400' : offer.status === 'accepted' ? 'border-l-4 border-l-emerald-400' : offer.status === 'rejected' ? 'border-l-4 border-l-red-300' : ''}`}
                            >
                                <div className="p-4 sm:p-5">
                                    {/* ROW 1: Main Info */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                        {/* Customer + Model */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start sm:items-center gap-3">
                                                {/* Avatar */}
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-50 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0 border border-indigo-200">
                                                    {(offer.customer.firstName?.[0] || '').toUpperCase()}{(offer.customer.lastName?.[0] || '').toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <button
                                                            onClick={() => offer.customer.id ? navigate(`/customers/${offer.customer.id}`) : null}
                                                            className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors truncate text-left"
                                                        >
                                                            {offer.customer.firstName} {offer.customer.lastName}
                                                        </button>
                                                        {offer.customer.companyName && (
                                                            <span className="text-xs text-slate-400 truncate">• {offer.customer.companyName}</span>
                                                        )}
                                                        {/* Status badge */}
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusConf.bg} ${statusConf.text}`}>
                                                            {statusConf.icon} {statusConf.label}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                                                        {offer.customer.city && (
                                                            <span className="flex items-center gap-1">
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                                {offer.customer.city}
                                                            </span>
                                                        )}
                                                        <span className="font-mono text-slate-400">{offer.offerNumber || offer.id.slice(0, 8)}</span>
                                                        {createdDate && (
                                                            <span>{createdDate.toLocaleDateString('pl-PL')}</span>
                                                        )}
                                                        {isAdmin() && (
                                                            <span className="text-indigo-500">→ {getCreatorName(offer)}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Product + Price */}
                                        <div className="flex items-center gap-3 sm:gap-4 pl-13 sm:pl-0">
                                            {/* Product info */}
                                            <div className="hidden sm:block text-right min-w-[140px]">
                                                <div className="text-sm font-medium text-slate-700">{getModelLabel(offer)}</div>
                                                <div className="text-xs text-slate-400">
                                                    {offer.product?.width && offer.product?.projection
                                                        ? `${offer.product.width} × ${offer.product.projection} mm`
                                                        : offer.product?.isManual ? 'Oferta ręczna' : '—'
                                                    }
                                                </div>
                                                {offer.product?.color && (
                                                    <div className="text-[10px] text-slate-400 mt-0.5">{offer.product.color}</div>
                                                )}
                                            </div>

                                            {/* Price */}
                                            <div className="text-right min-w-[100px]">
                                                <div className="text-lg font-bold text-slate-900">{formatPrice(priceGross)}</div>
                                                {commission > 0 && (
                                                    <div className="text-xs font-medium text-green-600">+{formatPrice(commission)} prowizja</div>
                                                )}
                                            </div>

                                            {/* Views badge — shows when and how many times client opened */}
                                            {(offer.viewCount || 0) > 0 && (
                                                <div className="hidden sm:flex flex-col items-end gap-0.5 min-w-[120px]">
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-lg text-xs font-semibold text-blue-700">
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                        Otwarta {offer.viewCount}×
                                                    </div>
                                                    {offer.lastViewedAt && (
                                                        <span className="text-[10px] text-blue-500 font-medium px-1">
                                                            {new Date(offer.lastViewedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}, {new Date(offer.lastViewedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* ROW 2: Mobile product info */}
                                    <div className="sm:hidden mt-3 pl-13 flex flex-wrap items-center gap-2 text-xs">
                                        <span className="px-2 py-1 bg-slate-100 rounded-md font-medium text-slate-600">{getModelLabel(offer)}</span>
                                        {offer.product?.width && offer.product?.projection && (
                                            <span className="text-slate-400">{offer.product.width} × {offer.product.projection} mm</span>
                                        )}
                                        {offer.product?.color && (
                                            <span className="text-slate-400">{offer.product.color}</span>
                                        )}
                                        {(offer.viewCount || 0) > 0 && (
                                            <span className="flex items-center gap-1 text-blue-500 font-medium">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                {offer.viewCount}×
                                                {offer.lastViewedAt && (
                                                    <span className="text-blue-400">({new Date(offer.lastViewedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}, {new Date(offer.lastViewedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })})</span>
                                                )}
                                            </span>
                                        )}
                                    </div>

                                    {/* ROW 3: Actions */}
                                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                                        {/* Status change */}
                                        <select
                                            value={offer.status}
                                            onChange={e => handleStatusChange(offer.id, e.target.value as OfferStatus)}
                                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${statusConf.bg} ${statusConf.text} border-0 cursor-pointer focus:ring-2 focus:ring-indigo-300 outline-none`}
                                        >
                                            <option value="draft">📝 Utworzona</option>
                                            <option value="sent">📧 Wysłana</option>
                                            <option value="accepted">✅ Zaakceptowana</option>
                                            <option value="sold">🤝 Sprzedana</option>
                                            <option value="rejected">❌ Odrzucona</option>
                                        </select>

                                        <div className="flex-1" />

                                        {/* Primary actions */}
                                        <div className="flex items-center gap-1 flex-wrap">
                                            {/* Open interactive offer */}
                                            <button
                                                onClick={() => handleOpenOffer(offer)}
                                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                                                title="Otwórz ofertę interaktywną"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                <span className="hidden sm:inline">Otwórz</span>
                                            </button>

                                            {/* Copy link */}
                                            <button
                                                onClick={() => handleCopyLink(offer)}
                                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                                                title="Kopiuj link do oferty"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                                <span className="hidden sm:inline">Link</span>
                                            </button>

                                            {/* Preview */}
                                            <button
                                                onClick={() => setPreviewOffer(offer)}
                                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                                                title="Podgląd"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                <span className="hidden sm:inline">Podgląd</span>
                                            </button>

                                            {/* Email */}
                                            <button
                                                onClick={() => { setSelectedOfferForEmail(offer); setIsEmailModalOpen(true); }}
                                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                                                title="Wyślij e-mail"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                                <span className="hidden sm:inline">E-mail</span>
                                            </button>

                                            {/* More actions dropdown */}
                                            <div className="relative">
                                                <button
                                                    onClick={e => { e.stopPropagation(); setExpandedActions(isExpanded ? null : offer.id); }}
                                                    className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-xs transition-colors"
                                                    title="Więcej akcji"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" /></svg>
                                                </button>

                                                {isExpanded && (
                                                    <div
                                                        className="absolute right-0 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl z-50 py-1 min-w-[180px] animate-in fade-in slide-in-from-top-1 duration-150"
                                                        onClick={e => e.stopPropagation()}
                                                    >
                                                        {/* Go to lead */}
                                                        {offer.leadId && (
                                                            <button
                                                                onClick={() => { navigate(`/leads/${offer.leadId}`); setExpandedActions(null); }}
                                                                className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                                            >
                                                                <span className="text-base">📋</span> Przejdź do Leada
                                                            </button>
                                                        )}
                                                        {/* Go to customer */}
                                                        {offer.customer.id && (
                                                            <button
                                                                onClick={() => { navigate(`/customers/${offer.customer.id}`); setExpandedActions(null); }}
                                                                className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                                            >
                                                                <span className="text-base">👤</span> Karta Klienta
                                                            </button>
                                                        )}
                                                        {/* Price update — for sold */}
                                                        {offer.status === 'sold' && (
                                                            <>
                                                                <button
                                                                    onClick={() => { handlePriceUpdate(offer.id, offer.pricing?.sellingPriceNet || 0); setExpandedActions(null); }}
                                                                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                                                >
                                                                    <span className="text-base">💰</span> Zmień cenę umowy
                                                                </button>
                                                                {!hasContract && (
                                                                    <button
                                                                        onClick={() => { handleCreateContract(offer); setExpandedActions(null); }}
                                                                        className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                                                    >
                                                                        <span className="text-base">📄</span> Generuj umowę
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                        {hasContract && (
                                                            <button
                                                                onClick={() => {
                                                                    const c = contracts.find(c => c.offerId === offer.id);
                                                                    if (c) navigate(`/contracts/${c.id}`);
                                                                    setExpandedActions(null);
                                                                }}
                                                                className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                                            >
                                                                <span className="text-base">📑</span> Otwórz umowę
                                                            </button>
                                                        )}
                                                        {/* Delete */}
                                                        {(isAdmin() || !propOffers) && (
                                                            <>
                                                                <div className="border-t border-slate-100 my-1" />
                                                                <button
                                                                    onClick={() => { handleDelete(offer.id); setExpandedActions(null); }}
                                                                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                                                >
                                                                    <span className="text-base">🗑️</span> Usuń ofertę
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* PAGINATION */}
            {isPaginated && filteredOffers.length > ITEMS_PER_PAGE && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 p-4">
                    <span className="text-sm text-slate-500">
                        Pokazuje {startIdx + 1}–{Math.min(startIdx + ITEMS_PER_PAGE, filteredOffers.length)} z {filteredOffers.length}
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={safePage <= 1}
                            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                        >
                            ←
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                            .reduce<(number | '...')[]>((acc, p, i, arr) => {
                                if (i > 0 && p - (arr[i - 1]) > 1) acc.push('...');
                                acc.push(p);
                                return acc;
                            }, [])
                            .map((p, i) =>
                                p === '...' ? (
                                    <span key={`d${i}`} className="px-2 text-slate-400">…</span>
                                ) : (
                                    <button
                                        key={p}
                                        onClick={() => setCurrentPage(p)}
                                        className={`w-8 h-8 text-sm font-medium rounded-lg transition-colors ${p === safePage ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        {p}
                                    </button>
                                )
                            )}
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={safePage >= totalPages}
                            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                        >
                            →
                        </button>
                    </div>
                </div>
            )}

            {/* MODALS */}
            {previewOffer && (
                <OfferPreviewModal offer={previewOffer} onClose={() => setPreviewOffer(null)} />
            )}
            {selectedOfferForEmail && (
                <SendEmailModal
                    isOpen={isEmailModalOpen}
                    onClose={() => setIsEmailModalOpen(false)}
                    to={selectedOfferForEmail.customer.email}
                    offer={selectedOfferForEmail}
                />
            )}
        </div>
    );
};
