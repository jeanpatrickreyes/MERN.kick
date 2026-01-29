import { useTranslation } from "react-i18next";
import ImageSlider from "./image_slider";

export default function SectionComponent2() {
    const { t } = useTranslation();
    const items = [
        {
            id: 1,
            title: t("Smart_Forecast").toUpperCase(),
            line: t("Uses_AI_Algorithms_to_Analyze_Historicals").toUpperCase(),
        },
        {
            id: 2,
            title: t("Historical_Database").toUpperCase(),
            line: t("Cross-platform_Compatibility").toUpperCase(),
        },
        {
            id: 3,
            title: t("Compatible_with_Cell_Phones").toUpperCase(),
            line: t("Provides_Team_Tactical_Data_and_Heatmap").toUpperCase(),
        },
        {
            id: 4,
            title: t("Tactical_Analysis_Tools").toUpperCase(),
            line: t("Provides_Team_Tactical_Data").toUpperCase(),
        },
    ];

    return (
        <section className="flex flex-col bg-gradient-to-b from-white to-white/95 pb-20">
            <div className="w-screen items-center z-0 justify-center flex sm:mt-5 mt-14">
                <div className="h-[1px] w-11/12 bg-gray-500" />
            </div>

            {/* Image Slider Section */}
            <div className="w-full px-4 sm:px-8 py-8 sm:py-12">
                <ImageSlider />
            </div>

            <div className="relative z-10 w-full flex items-center flex-col pl-10">
                <div className="relative z-10 w-full flex items-end sm:h-[30vh] h-[18vh]">
                    <div className="flex flex-1 items-center pl-5">
                        <div className="w-5 bg-black mr-4 self-stretch" />
                        <div className="flex flex-col justify-center space-y-2 text-black">
                            <p className="sm:text-5xl text-3xl font-semibold leading-tight">
                                {t("Advantages_of_KICK_SYSTEM").toUpperCase()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-6 sm:px-20 pb-16 sm:mt-24 mt-14">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className="flex w-full max-w-md bg-white rounded-xl overflow-hidden shadow-lg border transition-shadow duration-300 hover:shadow-2xl"
                    >
                        <div className="bg-red-500 text-white flex flex-col justify-center items-center px-4 py-6" />

                        <div className="flex flex-col justify-center px-6 py-4">
                            <h3 className="sm:text-3xl text-xl font-bold text-black">{item.title}</h3>
                            <p className="sm:text-xl text-lg text-gray-700 mt-1">{item.line}</p>
                        </div>
                    </div>
                ))}
            </div>

        </section>
    );
}
