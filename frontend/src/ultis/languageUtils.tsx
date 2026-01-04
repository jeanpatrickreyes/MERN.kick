import i18n from "i18next";

export function getTeamNameInCurrentLanguage(
    languages?: { en: string; zh: string; zhCN: string },
    fallbackName?: string
): string {
    if (!languages) return fallbackName || "";

    const currentLang = i18n.language;

    if (currentLang.startsWith("zh-CN") || currentLang === "zhCN") {
        return languages.zhCN || languages.zh || languages.en || fallbackName || "";
    }

    if (currentLang.startsWith("zh") && currentLang !== "zhCN") {
        return languages.zh || languages.zhCN || languages.en || fallbackName || "";
    }

    return languages.en || languages.zh || languages.zhCN || fallbackName || "";
}