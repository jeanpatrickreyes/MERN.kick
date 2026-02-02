import i18n from "i18next";

export function getTeamNameInCurrentLanguage(
    languages?: { en: string; zh: string; zhCN: string },
    fallbackName?: string
): string {
    if (!languages) return fallbackName || "";

    const currentLang = i18n.language || "";
    
    // Normalize language code - handle both "zhCN" and "zh-CN" formats
    const normalizedLang = currentLang.toLowerCase().replace(/-/g, "").trim();

    // Check for Simplified Chinese (zhCN or zh-CN)
    // Priority: zhCN field if available, otherwise fallback
    if (normalizedLang === "zhcn" || currentLang === "zhCN" || currentLang === "zh-CN" || currentLang.startsWith("zh-CN")) {
        // Prefer zhCN, but if it's empty or same as zh (not converted), use zh as fallback
        if (languages.zhCN && languages.zhCN !== languages.zh && languages.zhCN.trim() !== "") {
            return languages.zhCN;
        }
        // If zhCN is not properly set, fallback to zh (Traditional)
        return languages.zh || languages.en || fallbackName || "";
    }

    // Check for Traditional Chinese (zh but not zhCN)
    if (normalizedLang.startsWith("zh") && normalizedLang !== "zhcn") {
        return languages.zh || languages.zhCN || languages.en || fallbackName || "";
    }

    // Default to English
    return languages.en || languages.zh || languages.zhCN || fallbackName || "";
}