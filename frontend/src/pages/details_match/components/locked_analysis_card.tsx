import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import moment from "moment-timezone";
import AppAssets from "../../../ultis/assets";

interface Props {
    kickOff: string;
}

function LockedAnalysisCard({ kickOff }: Props) {
    const { t } = useTranslation();
    const [timeRemaining, setTimeRemaining] = useState<string>("00:00:00");

    useEffect(() => {
        const updateCountdown = () => {
            let date: moment.Moment;
            if (kickOff.includes('T')) {
                date = moment.tz(kickOff, 'Asia/Hong_Kong');
            } else {
                date = moment.tz(kickOff, 'YYYY-MM-DD HH:mm', 'Asia/Hong_Kong');
            }

            const now = moment.tz('Asia/Hong_Kong');
            const diff = date.diff(now);

            if (diff > 0) {
                const duration = moment.duration(diff);
                const hours = Math.floor(duration.asHours()).toString().padStart(2, '0');
                const minutes = duration.minutes().toString().padStart(2, '0');
                const seconds = duration.seconds().toString().padStart(2, '0');
                setTimeRemaining(`${hours}:${minutes}:${seconds}`);
            } else {
                setTimeRemaining("00:00:00");
            }
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);

        return () => clearInterval(interval);
    }, [kickOff]);

    return (
        <div className="w-full flex justify-center items-center">
            <div className="sm:w-2/3 w-5/6 flex flex-col bg-white rounded-lg mt-5 items-center justify-center py-4 px-6">
                <div className="w-full flex items-center mb-3">
                    <div className="w-1 bg-blue-500 h-8 mr-4"></div>
                    <span className="text-black font-semibold text-base sm:text-lg">
                        {t("analysis") || "分析"}
                    </span>
                </div>

                <div className="flex flex-col items-center justify-center">
                    {/* Locked Icon */}
                    <div className="relative mb-3 flex items-center justify-center">
                        <img
                            src={AppAssets.lock}
                            alt="Locked"
                            className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
                        />
                    </div>

                    {/* Text: 付费后可查看分析 */}
                    <p className="text-black font-medium text-sm sm:text-base text-center mb-3">
                        {t("pay_to_view_analysis") || "付费后可查看分析"}
                    </p>

                    {/* Text: 距离开赛剩余 */}
                    <div className="flex items-center justify-center mb-1">
                        <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                        <p className="text-gray-500 text-xs sm:text-sm text-center">
                            {t("time_remaining_until_match") || "距离开赛剩余"}
                        </p>
                        <span className="w-1 h-1 bg-gray-400 rounded-full ml-2"></span>
                    </div>

                    {/* Countdown Timer */}
                    <div className="text-orange-500 font-bold text-2xl sm:text-3xl mt-1">
                        {timeRemaining}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LockedAnalysisCard;

