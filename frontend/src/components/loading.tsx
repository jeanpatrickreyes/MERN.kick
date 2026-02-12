import { useTranslation } from "react-i18next";
import AppAssets from "../ultis/assets";

export function Loading() {
    const { t } = useTranslation();
    return (
        <div className="absolute inset-0 w-full h-full z-[900] bg-black">

            <div className="items-center justify-center flex flex-col h-full">
                <div
                    className="w-52 h-52 bg-cover bg-center pointer-events-none mb-1"
                    style={{
                        backgroundImage: `url(${AppAssets.logo})`,
                    }}
                ></div>
                <div className="w-6 h-6  mb-2 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                <p className="sm:text-sm text-xs sm:h-8 h-8 font-bold leading-[1.1] text-white">
                    {t("Loading_please_wait").toUpperCase()}
                </p>
            </div>

        </div>
    );
}
