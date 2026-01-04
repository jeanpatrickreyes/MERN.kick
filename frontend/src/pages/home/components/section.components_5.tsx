import { useTranslation } from "react-i18next";
import AppAssets from "../../../ultis/assets";

export default function SectionComponent5() {
    const { t } = useTranslation();

    return (
        <div>
            <section className="flex bg-gradient-to-b from-white to-white/95 flex-row h-1/3">

                <div className="sm:space-y-14 space-y-10 w-1/2 items-start justify-center flex flex-col pr-2 sm:pl-12 pl-4
 ">


                    <div />

                    <div className="flex space-x-4 sm:h-20 h-12 mt-7">
                        <img src={AppAssets.card_img_4} alt="Trophy" className="sm:w-24 sm:h-24 w-14 h-14 text-red-500" />
                        <div className="flex flex-col justify-center sm:text-2xl text-sm">
                            <h3 className="sm:text-2xl text-sm font-bold text-black">{t("User_Trust").toUpperCase()}</h3>
                            <p className="text-gray-600">≠≠
                                {t("Accurate_Analysis_that_Enhancesr").toUpperCase()}
                            </p>
                        </div>
                    </div>

                    <div className="flex space-x-4 sm:h-20 h-12">
                        <img src={AppAssets.card_img_5} alt="Trophy" className="sm:w-24 sm:h-24 w-14 h-14 text-red-500" />
                        <div className="flex flex-col justify-center sm:text-2xl text-sm">
                            <h3 className="sm:text-2xl text-sm font-bold text-black">
                                {t("Analysis_Time_Saved").toUpperCase()}
                            </h3>
                            <p className="text-gray-600">
                                {t("10,000+_hours").toUpperCase()}
                            </p>
                        </div>
                    </div>

                    <div className="flex space-x-4 sm:h-20 h-12">
                        <img src={AppAssets.card_img_1} alt="Trophy" className="sm:w-24 sm:h-24 w-14 h-14 text-red-500" />
                        <div className="flex flex-col justify-center sm:text-2xl text-sm">
                            <h3 className="sm:text-2xl text-sm font-bold text-black">
                                {t("Average_Earnings").toUpperCase()}
                            </h3>
                            <p className="text-gray-600 text-lg">
                                {t("130.000+_HKD").toUpperCase()}
                            </p>
                        </div>
                    </div>

                    <div />

                </div>


                <div className="w-1/2 items-start justify-center flex flex-col">
                    <img
                        src={AppAssets.background_04_home_01}
                        className="w-full h-full object-cover"
                        alt="Football background"
                    />
                </div>


            </section>

            <section className="flex bg-gradient-to-b from-white to-white/95 flex-row h-1/3">


                <div className="w-1/2 items-start justify-center flex flex-col">
                    <img
                        src={AppAssets.background_04_home_02}
                        className="w-full h-full object-full"
                        alt="Football background"
                    />
                </div>

                <div className="space-y-14 w-1/2 items-start justify-center flex flex-col pr-2 sm:pl-12 pl-4
                 ">

                    <div />
                    <div className="flex space-x-4 sm:h-20 h-12">
                        <img src={AppAssets.card_img_2} alt="Trophy" className="sm:w-24 sm:h-24 w-14 h-14 text-red-500" />
                        <div className="flex flex-col justify-center sm:text-2xl text-sm">
                            <h3 className="sm:text-2xl text-sm font-bold text-black">
                                {t("Successful_Predictions").toUpperCase()}
                            </h3>
                            <p className="text-gray-600">
                                {t("25,000+_times").toUpperCase()}
                            </p>
                        </div>
                    </div>

                    <div className="flex space-x-4 sm:h-20 h-12">
                        <img src={AppAssets.card_img_3} alt="Trophy" className="sm:w-24 sm:h-24 w-14 h-14 text-red-500" />
                        <div className="flex flex-col justify-center sm:text-2xl text-sm">
                            <h3 className="sm:text-2xl text-sm font-bold text-black">
                                {t("Matches_Analyzed").toUpperCase()}
                            </h3>
                            <p className="text-gray-600 text-lg">
                                {t("25,000+_times").toUpperCase()}
                            </p>
                        </div>
                    </div>

                    <div />
                </div>


            </section>

        </div>
    );
}
