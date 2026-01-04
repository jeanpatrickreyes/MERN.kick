import { useTranslation } from "react-i18next";
import AppAssets from "../../../ultis/assets";

export function SectionComponent6() {
    const { t } = useTranslation();
    return (
        <section id="about-us"
            className="flex items-center justify-center sm:mt-0 p-3 flex-col bg-gradient-to-b from-white to-white/95  w-screen">

            <div className="relative z-10 w-full flex items-center flex-col pl-10 pb-5">
                <div className="relative z-10 w-full flex items-end sm:h-[20vh] h-[18vh]">
                    <div className="flex flex-1 items-center pl-5">
                        <div className="w-5 bg-black mr-4 self-stretch" />
                        <div className="flex flex-col justify-center space-y-2 text-black">
                            <p className="sm:text-5xl text-3xl font-semibold leading-tight">
                                {t("About_Us").toUpperCase()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <img src={AppAssets.logo_red} className="h-72" alt="Logo" />

            <p className="text-center mt-5 max-w-xl text-gray-700 text-xl">
                {t("About_com").toUpperCase()}
            </p>

            <div className="h-12" />
        </section>
    );
}