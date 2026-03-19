import { createContext, useContext, useState, useEffect } from "react";
import en from "../i18n/en";
import fr from "../i18n/fr";
import ar from "../i18n/ar";

const LanguageContext = createContext();

const dictionaries = { en, fr, ar };

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(
    localStorage.getItem("m4m_language") || "en"
  );

  useEffect(() => {
    localStorage.setItem("m4m_language", language);
  }, [language]);

  // Update document language attribute when language changes (layout remains LTR)
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dir = "ltr";
    document.documentElement.lang = language || "en";
  }, [language]);

  const t = (key) => {
    const dict = dictionaries[language] || dictionaries.en;
    const value = dict[key] ?? dictionaries.en[key] ?? '';
    // Optional debug aid: warns only when the key is missing from both dictionaries.
    if (value === '' && !(dict[key] ?? dictionaries.en[key])) {
      // eslint-disable-next-line no-console
      console.warn('Missing i18n key:', key);
    }
    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

