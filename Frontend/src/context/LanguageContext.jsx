import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    // Try to get language from localStorage, default to 'en'
    const [language, setLanguage] = useState(() => {
        const stored = localStorage.getItem('language');
        return translations[stored] ? stored : 'en';
    });

    // Update localStorage when language changes
    useEffect(() => {
        localStorage.setItem('language', language);
        // Optional: Update HTML dir attribute for RTL support if you want full RTL
        // document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr';
        // For now, keeping LTR but valid translation is fine as requested.
    }, [language]);

    const toggleLanguage = (lang) => {
        if (lang === 'ENGLISH') setLanguage('en');
        else if (lang === 'URDU') setLanguage('ur');
        else if (lang === 'en' || lang === 'ur') setLanguage(lang);
    };

    const t = (key) => {
        const langData = translations[language] || translations['en'];
        return langData[key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useTranslation = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useTranslation must be used within a LanguageProvider');
    }
    return context;
};
