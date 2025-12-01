export const translations = {
    // Labels
    offer: "ANGEBOT",
    date: "Datum",
    customer: "Kunde",
    seller: "Verkäufer",
    specification: "Produktspezifikation",
    model: "Modell",
    dimensions: "Maße (Breite x Tiefe)",
    color: "Konstruktionsfarbe",
    roofType: "Dacheindeckung",
    snowZone: "Schneelastzone",
    addons: "Zubehör",
    installation: "Montage",
    summary: "Zusammenfassung",
    netPrice: "Nettopreis",
    vat: "MwSt.",
    grossPrice: "Gesamtpreis (Brutto)",

    // Values
    models: {
        'orangestyle': 'Orangestyle',
        'trendstyle': 'Trendstyle',
        'trendstyle_plus': 'Trendstyle+',
    },
    colors: {
        'RAL 7016': 'Anthrazitgrau (RAL 7016)',
        'RAL 9016': 'Verkehrsweiß (RAL 9016)',
        'RAL 9005': 'Tiefschwarz (RAL 9005)',
        'RAL 9007': 'Graualuminium (RAL 9007)',
    },
    roofTypes: {
        'polycarbonate': 'Polycarbonat (16mm)',
        'glass': 'Verbundsicherheitsglas (VSG)',
    },
    polycarbonateTypes: {
        'standard': 'Klar / Opal',
        'ir-gold': 'IR Gold (Hitzeschutz)',
    },
    glassTypes: {
        'standard': 'Klar (8mm)',
        'mat': 'Matt / Milchglas',
        'sunscreen': 'Sonnenschutzglas',
    },
    installationTypes: {
        'wall-mounted': 'Wandmontage',
        'freestanding': 'Freistehend',
    },

    // Footer
    validity: "Angebot gültig für 14 Tage.",
    paymentTerms: "Zahlungsbedingungen: 50% Anzahlung bei Bestellung, 50% nach Montage.",
    contact: "PolenDach 24 | Musterstraße 1, 12345 Berlin | St-Nr: DE123456789"
};

export function translate(key: string, category?: keyof typeof translations): string {
    if (category && translations[category]) {
        const cat = translations[category] as Record<string, string>;
        if (cat[key]) return cat[key];
    }
    return (translations as Record<string, any>)[key] || key;
}

export function formatCurrency(amount: number | undefined | null): string {
    const safe = Number(amount ?? 0);
    if (Number.isNaN(safe)) return '0,00 €';
    return safe.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}
