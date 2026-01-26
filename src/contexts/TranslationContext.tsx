import React, { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import pl from '../translations/pl.json';
import de from '../translations/de.json';
import en from '../translations/en.json';
import ro from '../translations/ro.json';
import uk from '../translations/uk.json';

type TranslationLanguage = 'pl' | 'de' | 'en' | 'mo' | 'uk';
type Translations = typeof pl;

const translations: Record<TranslationLanguage, Translations> = {
    pl,
    de,
    en,
    mo: ro, // Moldovan uses Romanian
    uk
};

interface TranslationContextType {
    t: (key: string) => string;
    language: TranslationLanguage;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();

    // Default language logic: User Profile -> Browser -> Fallback (PL)
    const language = ((): TranslationLanguage => {
        if (currentUser?.preferredLanguage) {
            // Handle case where user DB language might be unsupported
            const userLang = currentUser.preferredLanguage as string;
            if (['pl', 'de', 'en', 'uk', 'mo'].includes(userLang)) {
                return userLang as TranslationLanguage;
            }
        }

        // Browser detection
        const browserLang = navigator.language.split('-')[0];
        if (browserLang === 'de') return 'de';
        if (browserLang === 'en') return 'en';
        if (browserLang === 'uk') return 'uk';
        if (browserLang === 'ro') return 'mo';

        return 'pl';
    })();

    const t = (key: string): string => {
        const keys = key.split('.');
        let value: any = translations[language];

        for (const k of keys) {
            value = value?.[k];
        }

        return value || key;
    };

    return (
        <TranslationContext.Provider value={{ t, language }}>
            {children}
        </TranslationContext.Provider>
    );
};

export const useTranslation = () => {
    const context = useContext(TranslationContext);
    if (!context) {
        throw new Error('useTranslation must be used within TranslationProvider');
    }
    return context;
};
