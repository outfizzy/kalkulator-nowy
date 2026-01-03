/**
 * System prowizji dla przedstawiciela handlowego
 * 
 * Składniki:
 * 1. Prowizja bazowa: 5% marży
 * 2. Bonus za marżę: im wyższa marża, tym wyższa prowizja
 * 3. Bonus za wolumen: im więcej sprzedanych ofert, tym wyższa prowizja
 */

export interface CommissionBreakdown {
    baseRate: number;        // Bazowa stawka (5%)
    marginBonus: number;     // Bonus za wysoką marżę
    volumeBonus: number;     // Bonus za liczbę sprzedanych ofert
    totalRate: number;       // Łączna stawka prowizji
    commission: number;      // Kwota prowizji w EUR
}

/**
 * Oblicza bonus za wolumen sprzedaży
 */
function getVolumeBonus(soldOffersCount: number): number {
    if (soldOffersCount >= 21) return 0.015;  // +1.5% dla 21+ ofert
    if (soldOffersCount >= 11) return 0.010;  // +1.0% dla 11-20 ofert
    if (soldOffersCount >= 6) return 0.005;   // +0.5% dla 6-10 ofert
    return 0;                                  // Brak bonusu dla 1-5 ofert
}

/**
 * Oblicza prowizję z pełnym rozpisaniem
 */
export function calculateCommissionDetailed(
    netPrice: number,
    marginPercentage: number,
    soldOffersCount: number,
    baseCommissionRate: number = 0.05, // Default 5%, can be customized per user
    config: { enableMarginBonus: boolean; enableVolumeBonus: boolean } = { enableMarginBonus: false, enableVolumeBonus: false }
): CommissionBreakdown {
    // Bonus za marżę: Jeśli marża > 30%, dodajemy 1% do prowizji za każde 10% powyżej
    let marginBonus = 0;
    if (config.enableMarginBonus && marginPercentage > 30) {
        marginBonus = Math.floor((marginPercentage - 30) / 10) * 0.01;
    }

    // Bonus za wolumen
    const volumeBonus = config.enableVolumeBonus ? getVolumeBonus(soldOffersCount) : 0;

    // Łączna stawka
    const totalRate = baseCommissionRate + marginBonus + volumeBonus;

    // Kwota prowizji
    const commission = netPrice * totalRate;

    return {
        baseRate: baseCommissionRate,
        marginBonus,
        volumeBonus,
        totalRate,
        commission,
    };
}

/**
 * Oblicza prowizję (uproszczona wersja)
 */
export function calculateCommission(
    netPrice: number,
    marginPercentage: number,
    soldOffersCount: number = 0,
    baseCommissionRate: number = 0.05,
    config: { enableMarginBonus: boolean; enableVolumeBonus: boolean } = { enableMarginBonus: false, enableVolumeBonus: false }
): number {
    return calculateCommissionDetailed(netPrice, marginPercentage, soldOffersCount, baseCommissionRate, config).commission;
}

/**
 * Zwraca stawkę prowizji jako procent
 */
export function getCommissionRate(marginPercentage: number, soldOffersCount: number = 0): number {
    return calculateCommissionDetailed(0, marginPercentage, soldOffersCount).totalRate;
}

/**
 * Opisy progów wolumenu dla UI
 */
export const VOLUME_TIERS = [
    { min: 1, max: 5, bonus: 0, label: '1-5 ofert: Brak bonusu' },
    { min: 6, max: 10, bonus: 0.5, label: '6-10 ofert: +0.5%' },
    { min: 11, max: 20, bonus: 1.0, label: '11-20 ofert: +1.0%' },
    { min: 21, max: Infinity, bonus: 1.5, label: '21+ ofert: +1.5%' },
];
