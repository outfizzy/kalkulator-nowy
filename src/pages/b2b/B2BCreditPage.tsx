/**
 * B2B Credit Application Page
 * Partner page for applying for trade credit (kredyt kupiecki)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { B2BService, B2BCreditApplication, B2BPartner } from '../../services/database/b2b.service';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    draft: { label: 'Entwurf', color: 'bg-gray-100 text-gray-700', icon: '📝' },
    submitted: { label: 'Eingereicht', color: 'bg-blue-100 text-blue-700', icon: '📤' },
    under_review: { label: 'In Prüfung', color: 'bg-yellow-100 text-yellow-800', icon: '🔍' },
    approved: { label: 'Genehmigt', color: 'bg-green-100 text-green-700', icon: '✅' },
    rejected: { label: 'Abgelehnt', color: 'bg-red-100 text-red-700', icon: '❌' },
    cancelled: { label: 'Storniert', color: 'bg-gray-100 text-gray-500', icon: '🚫' }
};

interface TradeReference {
    company: string;
    contact: string;
    phone: string;
    email: string;
}

export function B2BCreditPage() {
    const navigate = useNavigate();
    const [partner, setPartner] = useState<B2BPartner | null>(null);
    const [applications, setApplications] = useState<B2BCreditApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        requested_amount: '',
        requested_payment_days: '30',
        company_name: '',
        tax_id: '',
        registration_number: '',
        company_address: { street: '', city: '', zip: '', country: 'Deutschland' },
        annual_revenue: '',
        years_in_business: '',
        number_of_employees: '',
        industry: '',
        bank_name: '',
        bank_account_iban: '',
        credit_contact_name: '',
        credit_contact_email: '',
        credit_contact_phone: '',
        trade_references: [{ company: '', contact: '', phone: '', email: '' }] as TradeReference[]
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const p = await B2BService.getCurrentPartner();
            setPartner(p);
            if (p) {
                const apps = await B2BService.getCreditApplications(p.id);
                setApplications(apps);

                // Pre-fill form with partner data
                setFormData(prev => ({
                    ...prev,
                    company_name: p.company_name,
                    tax_id: p.tax_id || '',
                    company_address: p.address || prev.company_address,
                    credit_contact_email: p.contact_email || '',
                    credit_contact_phone: p.contact_phone || ''
                }));
            }
        } catch (err) {
            console.error('Error loading data:', err);
        }
        setLoading(false);
    }

    function updateFormData(field: string, value: any) {
        setFormData(prev => ({ ...prev, [field]: value }));
    }

    function updateAddress(field: string, value: string) {
        setFormData(prev => ({
            ...prev,
            company_address: { ...prev.company_address, [field]: value }
        }));
    }

    function updateReference(index: number, field: keyof TradeReference, value: string) {
        setFormData(prev => {
            const refs = [...prev.trade_references];
            refs[index] = { ...refs[index], [field]: value };
            return { ...prev, trade_references: refs };
        });
    }

    function addReference() {
        setFormData(prev => ({
            ...prev,
            trade_references: [...prev.trade_references, { company: '', contact: '', phone: '', email: '' }]
        }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!partner) return;

        // Validation
        if (!formData.requested_amount || parseFloat(formData.requested_amount) <= 0) {
            toast.error('Bitte geben Sie den gewünschten Kreditrahmen ein');
            return;
        }
        if (!formData.company_name || !formData.tax_id) {
            toast.error('Firmenname und Steuernummer sind Pflichtfelder');
            return;
        }

        setSubmitting(true);
        try {
            await B2BService.createCreditApplication({
                partner_id: partner.id,
                requested_by: null,
                requested_amount: parseFloat(formData.requested_amount),
                requested_payment_days: parseInt(formData.requested_payment_days),
                company_name: formData.company_name,
                tax_id: formData.tax_id,
                registration_number: formData.registration_number || null,
                company_address: formData.company_address,
                annual_revenue: formData.annual_revenue ? parseFloat(formData.annual_revenue) : null,
                years_in_business: formData.years_in_business ? parseInt(formData.years_in_business) : null,
                number_of_employees: formData.number_of_employees ? parseInt(formData.number_of_employees) : null,
                industry: formData.industry || null,
                bank_name: formData.bank_name || null,
                bank_account_iban: formData.bank_account_iban || null,
                credit_contact_name: formData.credit_contact_name || null,
                credit_contact_email: formData.credit_contact_email || null,
                credit_contact_phone: formData.credit_contact_phone || null,
                trade_references: formData.trade_references.filter(r => r.company),
                documents: [],
                status: 'submitted'
            });

            toast.success('Antrag erfolgreich eingereicht!');
            setShowForm(false);
            await loadData();
        } catch (err: any) {
            console.error('Error submitting application:', err);
            toast.error(err.message || 'Fehler beim Einreichen des Antrags');
        }
        setSubmitting(false);
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Check if there's an active/pending application
    const activeApplication = applications.find(a => ['submitted', 'under_review', 'approved'].includes(a.status));

    return (
        <div className="p-6 max-w-[1200px] mx-auto">
            {/* Header */}
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        💳 Kredyt kupiecki
                    </h1>
                    <p className="text-gray-500 mt-1">Beantragen Sie einen Kreditrahmen für Ihre Bestellungen</p>
                </div>
                {!showForm && !activeApplication && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
                    >
                        ➕ Neuen Antrag stellen
                    </button>
                )}
            </div>

            {/* Current Credit Info */}
            {partner && partner.credit_limit > 0 && (
                <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200">
                    <h3 className="font-semibold text-green-800 mb-4">✅ Ihr aktueller Kreditrahmen</h3>
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <div className="text-3xl font-bold text-green-700">
                                €{partner.credit_limit.toLocaleString()}
                            </div>
                            <div className="text-sm text-green-600">Kreditrahmen</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-orange-600">
                                €{partner.credit_used.toLocaleString()}
                            </div>
                            <div className="text-sm text-orange-500">Genutzt</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-green-700">
                                €{(partner.credit_limit - partner.credit_used).toLocaleString()}
                            </div>
                            <div className="text-sm text-green-600">Verfügbar</div>
                        </div>
                    </div>
                    <div className="mt-4 text-sm text-green-700">
                        Zahlungsziel: <b>{partner.payment_terms_days} Tage</b>
                    </div>
                </div>
            )}

            {/* Active Application Info */}
            {activeApplication && !showForm && (
                <div className="mb-6 p-6 bg-blue-50 rounded-2xl border border-blue-200">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="font-semibold text-blue-800 mb-2">📋 Aktiver Antrag</h3>
                            <p className="text-blue-700">
                                Sie haben einen Antrag über <b>€{activeApplication.requested_amount.toLocaleString()}</b> eingereicht.
                            </p>
                            <div className="mt-2">
                                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${STATUS_CONFIG[activeApplication.status]?.color}`}>
                                    {STATUS_CONFIG[activeApplication.status]?.icon} {STATUS_CONFIG[activeApplication.status]?.label}
                                </span>
                            </div>
                        </div>
                        <div className="text-sm text-blue-600">
                            Eingereicht: {format(new Date(activeApplication.created_at), 'dd.MM.yyyy')}
                        </div>
                    </div>

                    {activeApplication.status === 'approved' && (
                        <div className="mt-4 p-4 bg-green-100 rounded-xl">
                            <h4 className="font-medium text-green-800">🎉 Genehmigt!</h4>
                            <p className="text-green-700">
                                Kreditrahmen: <b>€{activeApplication.approved_amount?.toLocaleString()}</b> •
                                Zahlungsziel: <b>{activeApplication.approved_payment_days} Tage</b>
                            </p>
                            {activeApplication.decision_notes && (
                                <p className="text-sm text-green-600 mt-2">{activeApplication.decision_notes}</p>
                            )}
                        </div>
                    )}

                    {activeApplication.status === 'rejected' && activeApplication.decision_notes && (
                        <div className="mt-4 p-4 bg-red-100 rounded-xl">
                            <h4 className="font-medium text-red-800">Ablehnungsgrund:</h4>
                            <p className="text-red-700">{activeApplication.decision_notes}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Application Form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">📝 Kreditantrag</h2>

                    {/* Requested Amount Section */}
                    <div className="mb-8 p-6 bg-blue-50 rounded-xl border border-blue-200">
                        <h3 className="font-semibold text-blue-800 mb-4">💰 Gewünschter Kreditrahmen</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Kreditrahmen (€) *
                                </label>
                                <input
                                    type="number"
                                    value={formData.requested_amount}
                                    onChange={e => updateFormData('requested_amount', e.target.value)}
                                    placeholder="z.B. 50000"
                                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Zahlungsziel (Tage) *
                                </label>
                                <select
                                    value={formData.requested_payment_days}
                                    onChange={e => updateFormData('requested_payment_days', e.target.value)}
                                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="14">14 Tage</option>
                                    <option value="30">30 Tage</option>
                                    <option value="45">45 Tage</option>
                                    <option value="60">60 Tage</option>
                                    <option value="90">90 Tage</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Company Information */}
                    <div className="mb-8">
                        <h3 className="font-semibold text-gray-800 mb-4">🏢 Unternehmensdaten</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Firmenname *</label>
                                <input
                                    type="text"
                                    value={formData.company_name}
                                    onChange={e => updateFormData('company_name', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Steuernummer / USt-IdNr. *</label>
                                <input
                                    type="text"
                                    value={formData.tax_id}
                                    onChange={e => updateFormData('tax_id', e.target.value)}
                                    placeholder="DE123456789"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Handelsregisternummer</label>
                                <input
                                    type="text"
                                    value={formData.registration_number}
                                    onChange={e => updateFormData('registration_number', e.target.value)}
                                    placeholder="HRB 12345"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Branche</label>
                                <input
                                    type="text"
                                    value={formData.industry}
                                    onChange={e => updateFormData('industry', e.target.value)}
                                    placeholder="z.B. Bauwesen, Handel"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Address */}
                        <div className="mt-4 grid grid-cols-4 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Straße</label>
                                <input
                                    type="text"
                                    value={formData.company_address.street}
                                    onChange={e => updateAddress('street', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
                                <input
                                    type="text"
                                    value={formData.company_address.zip}
                                    onChange={e => updateAddress('zip', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Stadt</label>
                                <input
                                    type="text"
                                    value={formData.company_address.city}
                                    onChange={e => updateAddress('city', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Financial Information */}
                    <div className="mb-8">
                        <h3 className="font-semibold text-gray-800 mb-4">📊 Finanzielle Angaben</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Jahresumsatz (€)</label>
                                <input
                                    type="number"
                                    value={formData.annual_revenue}
                                    onChange={e => updateFormData('annual_revenue', e.target.value)}
                                    placeholder="z.B. 500000"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Jahre in Geschäft</label>
                                <input
                                    type="number"
                                    value={formData.years_in_business}
                                    onChange={e => updateFormData('years_in_business', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mitarbeiteranzahl</label>
                                <input
                                    type="number"
                                    value={formData.number_of_employees}
                                    onChange={e => updateFormData('number_of_employees', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bank Information */}
                    <div className="mb-8">
                        <h3 className="font-semibold text-gray-800 mb-4">🏦 Bankverbindung</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
                                <input
                                    type="text"
                                    value={formData.bank_name}
                                    onChange={e => updateFormData('bank_name', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
                                <input
                                    type="text"
                                    value={formData.bank_account_iban}
                                    onChange={e => updateFormData('bank_account_iban', e.target.value)}
                                    placeholder="DE00 0000 0000 0000 0000 00"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contact Person */}
                    <div className="mb-8">
                        <h3 className="font-semibold text-gray-800 mb-4">👤 Ansprechpartner für Kreditangelegenheiten</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={formData.credit_contact_name}
                                    onChange={e => updateFormData('credit_contact_name', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                                <input
                                    type="email"
                                    value={formData.credit_contact_email}
                                    onChange={e => updateFormData('credit_contact_email', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                                <input
                                    type="tel"
                                    value={formData.credit_contact_phone}
                                    onChange={e => updateFormData('credit_contact_phone', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Trade References */}
                    <div className="mb-8">
                        <h3 className="font-semibold text-gray-800 mb-4">📇 Handelsreferenzen</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Bitte geben Sie mindestens eine Handelsreferenz an (z.B. bestehende Lieferanten)
                        </p>
                        {formData.trade_references.map((ref, idx) => (
                            <div key={idx} className="grid grid-cols-4 gap-3 mb-3 p-3 bg-gray-50 rounded-lg">
                                <input
                                    type="text"
                                    value={ref.company}
                                    onChange={e => updateReference(idx, 'company', e.target.value)}
                                    placeholder="Firma"
                                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                    type="text"
                                    value={ref.contact}
                                    onChange={e => updateReference(idx, 'contact', e.target.value)}
                                    placeholder="Ansprechpartner"
                                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                    type="tel"
                                    value={ref.phone}
                                    onChange={e => updateReference(idx, 'phone', e.target.value)}
                                    placeholder="Telefon"
                                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                    type="email"
                                    value={ref.email}
                                    onChange={e => updateReference(idx, 'email', e.target.value)}
                                    placeholder="E-Mail"
                                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addReference}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                            ➕ Weitere Referenz hinzufügen
                        </button>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                        >
                            Abbrechen
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    Wird eingereicht...
                                </>
                            ) : (
                                '📤 Antrag einreichen'
                            )}
                        </button>
                    </div>
                </form>
            )}

            {/* Past Applications */}
            {applications.length > 0 && !showForm && (
                <div className="bg-white rounded-2xl border shadow-sm">
                    <div className="p-4 border-b">
                        <h3 className="font-semibold text-gray-800">📜 Antragshistorie</h3>
                    </div>
                    <div className="divide-y">
                        {applications.map(app => (
                            <div key={app.id} className="p-4 hover:bg-gray-50">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-medium text-gray-900">
                                            Antrag über €{app.requested_amount.toLocaleString()}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {app.requested_payment_days} Tage Zahlungsziel
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[app.status]?.color}`}>
                                            {STATUS_CONFIG[app.status]?.icon} {STATUS_CONFIG[app.status]?.label}
                                        </span>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {format(new Date(app.created_at), 'dd.MM.yyyy')}
                                        </div>
                                    </div>
                                </div>
                                {app.status === 'approved' && (
                                    <div className="mt-2 text-sm text-green-600">
                                        ✅ Genehmigt: €{app.approved_amount?.toLocaleString()} • {app.approved_payment_days} Tage
                                    </div>
                                )}
                                {app.status === 'rejected' && app.decision_notes && (
                                    <div className="mt-2 text-sm text-red-600">
                                        ❌ {app.decision_notes}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default B2BCreditPage;
