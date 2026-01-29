import { useState } from "react";
import { FaBasketball } from "react-icons/fa6";
import { NavigateFunction } from "react-router-dom";
import { Match } from "../models/match";
import { useTranslation } from "react-i18next";
import moment from 'moment-timezone';
import { Probability } from "../models/probability";
import useIsMobile from "../hooks/useIsMobile";
import API from "../api/api";
import AppGlobal from "../ultis/global";
import Crown from "./crown";

export type Props = {
    teams: string[]
    id?: string
    widht?: any,
    match: Match | Probability
    navigate: NavigateFunction
};

export function CardMatch({
    teams,
    id,
    widht,
    navigate,
    match,
}: Props) {
    const { t } = useTranslation();
    const isMobile = useIsMobile();
    const [showModal, setShowModal] = useState(false);

    const dateStr = match.kickOff;
    moment.locale('zh-hk');
    // Handle both "YYYY-MM-DD HH:mm" and ISO format "YYYY-MM-DDTHH:mm:ss..."
    let date: moment.Moment;
    if (dateStr.includes('T')) {
        // ISO format: "2026-01-30T00:00:00.000+08:00"
        date = moment.tz(dateStr, 'Asia/Hong_Kong');
    } else {
        // Format: "2026-01-30 01:30"
        date = moment.tz(dateStr, 'YYYY-MM-DD HH:mm', 'Asia/Hong_Kong');
    }
    const day = date.date();
    const chineseShortMonths = [
        t('jan'),
        t('feb'),
        t('mar'),
        t('apr'),
        t('may'),
        t('jun'),
        t('jul'),
        t('aug'),
        t('sep'),
        t('oct'),
        t('nov'),
        t('dec')
    ];
    const month = chineseShortMonths[date.month()];

    const homeWin = match.ia && match.ia.home ? match.ia.home : match.predictions && match.predictions.homeWinRate ? match.predictions.homeWinRate : null;
    const awayWin = match.ia && match.ia.away ? match.ia.away : match.predictions && match.predictions.awayWinRate ? match.predictions.awayWinRate : null;

    const handleClick = async () => {
        if (id) {
            const res = await API.GET(AppGlobal.baseURL + "user/verify/vip");
            if (res.status === 200) {
                navigate("/details-match/" + id);
            } else {
                setShowModal(true);
            }
        }
    };

    return (
        <>
            <div
                onClick={handleClick}
                className="flex rounded-xl sm:h-32 h-22 border-none backdrop-blur-sm bg-gradient-to-l from-white/40 via-white/80 to-white 
                 shadow-xl hover:shadow-2xl overflow-hidden transition-all duration-300 
                 hover:scale-[1.02] cursor-pointer w-full mx-auto"
                style={{ willChange: 'transform' }}
            >
                <div className="bg-black text-white sm:w-14 w-9 flex flex-col items-center justify-start py-4 text-center">
                    <span className="sm:text-3xl text-1xl font-bold leading-none">{day}</span>
                    <span className="text-xs font-semibold mt-1">{month.toUpperCase()}</span>
                </div>

                <div className="flex flex-1 border border-gray-500 items-center justify-between py-4 px-6 text-[#191919] font-sans">
                    <div className="flex items-center space-y-1 flex-row">
                        <img
                            src={match.homeTeamLogo}
                            alt={teams[0]}
                            className="sm:w-16 sm:h-16 h-10 w-10 object-contain"
                        />
                        <div className="text-center ml-2 sm:w-48 w-36"
                            style={{ width: widht }}>
                            <p className="sm:text-base text-xs font-bold mt-1"> {teams[0]}</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center">
                        {/* Show crowns for the team with higher win rate above REPORT */}
                        {(() => {
                            const higherWinRate = homeWin && awayWin 
                                ? (homeWin > awayWin ? homeWin : awayWin)
                                : (homeWin || awayWin);
                            return higherWinRate && higherWinRate > 70 ? (
                                <div className="mb-1.5 flex justify-center">
                                    <Crown winRate={higherWinRate} size="w-4 sm:w-5" />
                                </div>
                            ) : null;
                        })()}
                        <div className="flex flex-row items-center justify-center gap-1.5">
                            <FaBasketball color="#fc3a45" size={isMobile ? 5 : 10} />
                            <div
                                className="sm:text-[12px] text-[5px] font-semibold text-black/80 hover:text-red-600 transition duration-200"
                            >
                                REPORT
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-y-1 flex-row">
                        <div className="text-center ml-2 sm:w-48 w-36" style={{ width: widht }}>
                            <p className="sm:text-base text-xs font-bold mt-1"> {teams[1]}</p>
                        </div>
                        <img
                            src={match.awayTeamLogo}
                            alt={teams[1]}
                            className="sm:w-16 sm:h-16 h-10 w-10 object-contain"
                        />
                    </div>
                </div>
            </div>

            {/* Modal VIP */}
            {showModal && (
                <div
                    className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="bg-white p-6 rounded shadow-lg max-w-xs w-full"
                        onClick={e => e.stopPropagation()}
                    >
                        <p className="mb-4 text-center text-black font-semibold">
                            {t("you_need_to_be_VIP") || "You need to be VIP member to see the analysis."}
                        </p>

                        <div className="flex justify-end space-x-4">
                            <button
                                className="text-black px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition"
                                onClick={() => setShowModal(false)}
                            >
                                {t("cancel")}
                            </button>

                            <button
                                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-700 transition"
                                onClick={() => {
                                    window.location.href = "/";
                                    setShowModal(false);
                                }}
                            >
                                {t("Contact_Us")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
