/**
 * Walidacja formularza klienta
 */
export function validateCustomer(data: {
    firstName: string;
    lastName: string;
    postalCode: string;
    city: string;
}): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    if (!data.firstName.trim()) {
        errors.firstName = 'Imię jest wymagane';
    } else if (data.firstName.length < 2) {
        errors.firstName = 'Imię musi mieć min. 2 znaki';
    }

    if (!data.lastName.trim()) {
        errors.lastName = 'Nazwisko jest wymagane';
    } else if (data.lastName.length < 2) {
        errors.lastName = 'Nazwisko musi mieć min. 2 znaki';
    }

    if (!data.postalCode.trim()) {
        errors.postalCode = 'Kod pocztowy jest wymagany';
    } else if (!/^\d{2}-\d{3}$/.test(data.postalCode)) {
        errors.postalCode = 'Format: XX-XXX (np. 00-001)';
    }

    if (!data.city.trim()) {
        errors.city = 'Miasto jest wymagane';
    } else if (data.city.length < 2) {
        errors.city = 'Nazwa miasta musi mieć min. 2 znaki';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
}

/**
 * Formatowanie kodu pocztowego podczas wpisywania
 */
export function formatPostalCode(value: string): string {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}`;
}
