import { useTranslation } from "react-i18next";
import AppAssets from "../../../ultis/assets";
import useIsMobile from "../../../hooks/useIsMobile";
import { Records } from "../../../models/records";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import AppGlobal from "../../../ultis/global";

export type Props = {
    data: Records[]
};

export default function SectionComponent1({
    data
}: Props) {
    const isMobile = useIsMobile();
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <section className="flex flex-col bg-[#fc3a45]">

            {
                isMobile
                    ? <div className="h-36" />
                    : <div className="w-screen items-center z-0 justify-center flex mt-24">
                        <div className="h-1 w-11/12 bg-white/60" />
                    </div>
            }


            <div className="relative z-10 w-full flex items-center flex-col sm:pl-10 pl-2 pr-5 sm:mb-14 sm:mt-0 mt-10">
                <div className="relative z-10 w-full flex items-end h-[30vh]">
                    <div className="flex flex-1 items-center pl-5">
                        <div className="w-5 bg-white mr-4 self-stretch" />
                        <div className="flex flex-col justify-center space-y-2 text-white">
                            <p className="sm:text-1xl text-1xl font-bold leading-[1.1]">
                                {t("Professional_Match_Data_Analysis").toUpperCase()}
                            </p>
                            <p className="sm:text-5xl text-3xl font-semibold leading-tight">
                                {t("Based_on_Multidimensional_Metrics").toUpperCase()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap justify-center items-stretch gap-3 sm:gap-7 px-2 mb-20 mt-24 sm:m-0 m-10">

                {
                    data.length == 0
                        ? <div className="flex sm:h-40 h-80" />
                        : undefined
                }

                {data.filter((x) => x.media && x.media.length > 0).map((item: Records) => (
                    <div
                        key={item?.id}
                        className="backdrop-blur-sm bg-white/100 border-none border-white/20 rounded-xl overflow-hidden w-[48%] sm:w-[300px] sm:h-80 h-64 shadow-lg hover:scale-105 transition-transform flex flex-col"
                    >

                        <div className="h-4/6 w-full">
                            <img
                                src={AppGlobal.baseURL.replace("/api/", "") + item?.media[0]}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                decoding="async"
                            />
                        </div>

                        <div className="h-2/6 w-full p-3 flex flex-col justify-center text-white">
                            <p className="text-[9px] text-black">{format(new Date(item.date), 'yyyy年M月d日(E)', { locale: zhCN })}</p>
                            <h3 className="text-xs text-black mb-2 truncate"
                                style={{ whiteSpace: "pre-wrap", margin: 0 }}>{item?.description.toUpperCase()}</h3>
                            <div style={{ textAlign: 'left', marginBottom: -10, marginTop: 10 }}>
                                <div
                                    style={{
                                        fontSize: 15,
                                        cursor: 'pointer',
                                        color: '#198754',
                                        fontWeight: 600,
                                    }}
                                    className="text-decoration-underline"
                                    onClick={() => {
                                        navigate("records");
                                    }}
                                >
                                    {t("閱讀更多")}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>


            <img
                src={AppAssets.bottom_cover_white}
                className="w-full"
            />
        </section>
    );
}
