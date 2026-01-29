import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import zh from "./locales/zh/translation.json";
import en from "./locales/en/translation.json";
import zhCN from "./locales/zh-CN/translation.json";

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            zh: { translation: zh },
            en: { translation: en },
            zhCN: { translation: zhCN }
        },
        lng: "zhCN", // Set default language to Simplified Chinese
        fallbackLng: {
            "zhCN": ["zhCN"],
            "zh-SG": ["zhCN"],
            "zh-TW": ["zh"],
            "zh-HK": ["zh"],
            "zh-MO": ["zh"],
            default: ["zhCN"], // Change default fallback to Simplified Chinese
        },
        supportedLngs: ["zh", "zhCN", "en"],
        detection: {
            // Only detect language if not already set in localStorage
            lookupLocalStorage: "i18nextLng",
            caches: ["localStorage"],
            // Check localStorage first, then use default if not found
            order: ["localStorage"],
        },
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
