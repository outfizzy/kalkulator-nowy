export const formatCurrency = (amount: number, currency: string = 'PLN'): string => {
    return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
    }).format(amount);
};
