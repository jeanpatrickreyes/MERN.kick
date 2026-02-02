import { FaBasketball } from "react-icons/fa6";
import { NavigateFunction } from "react-router-dom";
import { Match } from "../models/match";
import { useTranslation } from "react-i18next";
import moment from 'moment-timezone';
import { Probability } from "../models/probability";
import useIsMobile from "../hooks/useIsMobile";
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

    // Get raw probabilities and normalize (same logic as analysis page for consistency)
    let homeWin = match.ia?.home ?? match.predictions?.homeWinRate ?? 0;
    let awayWin = match.ia?.away ?? match.predictions?.awayWinRate ?? 0;
    
    // Normalize to ensure they sum to exactly 100% (prevent 100%/0% scenarios)
    homeWin = Math.max(0, homeWin);
    awayWin = Math.max(0, awayWin);
    const total = homeWin + awayWin;
    if (total > 0) {
        homeWin = (homeWin / total) * 100;
        awayWin = (awayWin / total) * 100;
    } else {
        homeWin = 50;
        awayWin = 50;
    }

    const handleClick = () => {
        if (id) {
            navigate("/details-match/" + id);
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
                            const higherWinRate = Math.max(homeWin, awayWin);
                            return higherWinRate > 70 ? (
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
        </>
    );
}
