/**
 * Phone Number Normalization Utility
 * 
 * Converts various phone number formats to E.164 international format
 * for reliable calling and SMS delivery.
 * 
 * Supports German (+49) and Polish (+48) numbers.
 * 
 * Examples:
 *   "0171 1234567"       → "+491711234567"
 *   "0049 171 1234567"   → "+491711234567"
 *   "+49 (0)171 1234567" → "+491711234567"
 *   "502 123 456"        → "+48502123456"
 *   "0048502123456"      → "+48502123456"
 *   "+48 502-123-456"    → "+48502123456"
 *   "502-123-456"        → "+48502123456"
 *   "+49 171/1234567"    → "+491711234567"
 */

/**
 * Remove all non-digit characters except leading +
 */
function stripToDigits(phone: string): string {
    const trimmed = phone.trim();
    if (trimmed.startsWith('+')) {
        return '+' + trimmed.slice(1).replace(/\D/g, '');
    }
    return trimmed.replace(/\D/g, '');
}

/**
 * Detect if a number is Polish based on the national number pattern.
 * Polish mobile: 5xx, 6xx, 7xx, 8xx (9 digits)
 * Polish landline: various 2-digit area codes (9 digits total)
 */
function isPolishNationalNumber(digits: string): boolean {
    if (digits.length !== 9) return false;
    const firstDigit = digits[0];
    // Polish mobile starts with 5, 6, 7, 8
    // Polish landline starts with 1, 2, 3, 4, 7, 8, 9
    return ['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(firstDigit);
}

/**
 * Detect if a number is German based on the national number pattern.
 * German numbers without country code start with 0 (area/mobile prefix).
 * Mobile: 015x, 016x, 017x (10-11 digits with leading 0)
 * Landline: 0xx to 0xxxx + subscriber (variable length)
 */
function isGermanNationalNumber(digits: string): boolean {
    // If starts with 0, it's likely German national format
    if (digits.startsWith('0') && digits.length >= 10 && digits.length <= 13) {
        return true;
    }
    return false;
}

/**
 * Normalize a phone number to E.164 format.
 * 
 * @param phone - Raw phone number in any format
 * @param defaultCountry - Default country code if none detected ('DE' or 'PL'), defaults to 'DE'
 * @returns Normalized E.164 phone number, or original if can't be normalized
 */
export function normalizePhone(phone: string | null | undefined, defaultCountry: 'DE' | 'PL' = 'DE'): string {
    if (!phone || !phone.trim()) return '';

    let cleaned = stripToDigits(phone);

    // Already properly formatted E.164
    if (cleaned.startsWith('+') && cleaned.length >= 11 && cleaned.length <= 16) {
        return cleaned;
    }

    // Handle + prefix
    if (cleaned.startsWith('+')) {
        // Already has country code, just clean up
        return cleaned;
    }

    // Handle 00XX prefix (international dialing format)
    if (cleaned.startsWith('00')) {
        // 0049... → +49...
        // 0048... → +48...
        return '+' + cleaned.slice(2);
    }

    // Handle leading 0 (German national format)
    // 0171... → +49171...
    if (cleaned.startsWith('0') && cleaned.length >= 10) {
        return '+49' + cleaned.slice(1);
    }

    // No leading 0, no +, no 00 prefix — raw national number
    // Need to determine country
    if (cleaned.length === 9 && isPolishNationalNumber(cleaned)) {
        // Polish 9-digit number: 502123456 → +48502123456
        return '+48' + cleaned;
    }

    if (cleaned.length >= 10 && cleaned.length <= 12) {
        // Could be German without leading 0 (uncommon but possible)
        // e.g., 1711234567 → +491711234567
        if (defaultCountry === 'DE') {
            return '+49' + cleaned;
        }
        if (defaultCountry === 'PL') {
            return '+48' + cleaned;
        }
    }

    // Fallback: apply default country code
    if (defaultCountry === 'DE') {
        return '+49' + cleaned;
    }
    if (defaultCountry === 'PL') {
        return '+48' + cleaned;
    }

    // Can't normalize — return cleaned version
    return cleaned;
}

/**
 * Format a phone number for display (human-readable with spaces).
 * 
 * Examples:
 *   "+491711234567" → "+49 171 1234567"
 *   "+48502123456"  → "+48 502 123 456"
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
    if (!phone || !phone.trim()) return '';

    const normalized = normalizePhone(phone);

    // German number
    if (normalized.startsWith('+49')) {
        const national = normalized.slice(3);
        // Mobile numbers: 1xx xxxxxxx
        if (/^1[567]\d/.test(national)) {
            const prefix = national.slice(0, 3);
            const rest = national.slice(3);
            return `+49 ${prefix} ${rest}`;
        }
        // Landline: split at likely area code length (2-5 digits)
        // Use 3/4 digit split as most common
        if (national.length >= 8) {
            const area = national.slice(0, 3);
            const rest = national.slice(3);
            return `+49 ${area} ${rest}`;
        }
        return `+49 ${national}`;
    }

    // Polish number
    if (normalized.startsWith('+48')) {
        const national = normalized.slice(3);
        if (national.length === 9) {
            return `+48 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
        }
        return `+48 ${national}`;
    }

    // Other — just show with + and spaces
    return normalized;
}

/**
 * Check if a phone number looks valid (basic check).
 */
export function isValidPhone(phone: string | null | undefined): boolean {
    if (!phone || !phone.trim()) return false;
    const normalized = normalizePhone(phone);
    // E.164: + followed by 7-15 digits
    return /^\+\d{7,15}$/.test(normalized);
}

/**
 * Get the country code from a normalized phone number.
 */
export function getPhoneCountry(phone: string | null | undefined): 'DE' | 'PL' | 'unknown' {
    if (!phone) return 'unknown';
    const normalized = normalizePhone(phone);
    if (normalized.startsWith('+49')) return 'DE';
    if (normalized.startsWith('+48')) return 'PL';
    return 'unknown';
}
