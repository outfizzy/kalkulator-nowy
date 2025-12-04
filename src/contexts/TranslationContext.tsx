import React, { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import pl from '../translations/pl.json';
import ro from '../translations/ro.json';
import uk from '../translations/uk.json';

type TranslationLanguage = 'pl' | 'mo' | 'uk';
type Translations = typeof pl;

const translations: Record<TranslationLanguage, Translations> = {
    pl,
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
    const language = (currentUser?.preferredLanguage || 'pl') as TranslationLanguage;

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
