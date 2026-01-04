import { useTranslation } from "react-i18next";
import AppAssets from "../../../ultis/assets";

export default function SectionComponent3() {
    const { t } = useTranslation();

    return (
        <section className="flex bg-white flex-row h-screen">
            <div className="w-1/2">
                <img
                    src={AppAssets.background_03_home_02}
                    className="w-full h-full object-cover"
                    alt="Football background"
                />
            </div>

            <div className="w-1/2 flex justify-center items-center px-12">
                <div className="max-w-xl">
                    <img
                        src={AppAssets.logo_black}
                        alt="Logo"
                        className="sm:w-40 w-28 mb-3"
                    />

                    <p className="sm:text-2xl text-base italic text-red-500 mb-6 font-bold">
                        {t("testimony_name") + " - " + t("Using_the_system_for")}
                    </p>

                    <p className="text-gray-700 mb-6 sm:text-xl text-sm">
                        {t("testimony")}
                    </p>

                    <div>
                        <p className="font-bold text-black text-lgl">{t("testimony_name")}</p>
                        <p className="text-sm text-gray-700 mb-2">{t("testimony_job")}</p>
                        <img
                            src={AppAssets.signature}
                            alt="Signature"
                            className="w-44"
                        />
                    </div>
                </div>

            </div>
        </section>
    );
}
