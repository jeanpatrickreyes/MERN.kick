import { useTranslation } from "react-i18next";
import AppAssets from "../../../ultis/assets";

export default function SectionComponent4() {
    const { t } = useTranslation();

    return (
        <section className="flex bg-white flex-row h-screen">

            <div className="space-y-20 w-1/2 items-start justify-center flex flex-col pr-2 pl-2">

                <div>
                    <div className="flex items-center space-x-4">
                        <img src={AppAssets.card_img_4} alt="Trophy" className="w-28 h-28 text-red-500" />
                        <div className="flex flex-col justify-center sm:text-xl text-base">
                            <h3 className="sm:text-xl text-base font-bold text-black">{t("User_Trust").toUpperCase()}</h3>
                            <p className="text-gray-600">
                                {t("Accurate_Analysis_that_Enhancesr").toUpperCase()}
                            </p>
                        </div>
                    </div>
                    <div className="w-full h-px bg-gray-300 my-6" />
                </div>

                <div>
                    <div className="flex items-center space-x-4">
                        <img src={AppAssets.card_img_5} alt="Trophy" className="w-28 h-28 text-red-500" />
                        <div className="flex flex-col justify-center sm:text-xl text-base">
                            <h3 className="sm:text-xl text-base font-bold text-black">
                                {t("Analysis_Time_Saved").toUpperCase()}
                            </h3>
                            <p className="text-gray-600">
                                {t("10,000+_hours").toUpperCase()}
                            </p>
                        </div>
                    </div>
                    <div className="w-full h-px bg-gray-300 my-6" />
                </div>

                <div className="flex items-center space-x-4">
                    <img src={AppAssets.card_img_1} alt="Trophy" className="w-28 h-28 text-red-500" />
                    <div className="flex flex-col justify-center sm:text-xl text-base">
                        <h3 className="sm:text-xl text-base font-bold text-black">
                            {t("Average_Earnings").toUpperCase()}
                        </h3>
                        <p className="text-gray-600 text-lg">
                            {t("130.000+_HKD").toUpperCase()}
                        </p>
                    </div>
                </div>

            </div>


            <div className="w-1/2">
                <img
                    src={AppAssets.background_04_home_01}
                    className="w-full h-full object-cover"
                    alt="Football background"
                />
            </div>

        </section>
    );
}
