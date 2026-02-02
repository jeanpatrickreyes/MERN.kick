import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import moment from "moment-timezone";

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
            <div className="sm:w-2/3 w-5/6 flex flex-col bg-white rounded-lg mt-5 items-center justify-center py-8 px-6">
                <div className="w-full flex items-center">
                    <div className="w-1 bg-blue-500 h-12 mr-4"></div>
                    <span className="text-black font-semibold text-base sm:text-lg">
                        {t("analysis") || "分析"}
                    </span>
                </div>

                <div className="flex flex-col items-center justify-center mt-6">
                    {/* Locked Icon */}
                    <div className="relative mb-4 flex items-center justify-center">
                        <svg
                            width="100"
                            height="100"
                            viewBox="0 0 100 100"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            {/* Document/Clipboard Background */}
                            <path
                                d="M25 20C25 17.2386 27.2386 15 30 15H42C42.5523 15 43 15.4477 43 16V22C43 24.7614 45.2386 27 48 27H63C63.5523 27 64 27.4477 64 28V70C64 72.7614 61.7614 75 59 75H30C27.2386 75 25 72.7614 25 70V20Z"
                                fill="#FF9500"
                                fillOpacity="0.15"
                            />
                            <path
                                d="M43 16V22C43 24.7614 45.2386 27 48 27H64M43 16H30C27.2386 16 25 18.2386 25 21V70C25 72.7614 27.2386 75 30 75H59C61.7614 75 64 72.7614 64 70V28H48C45.2386 28 43 24.7614 43 22V16Z"
                                stroke="#FF9500"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            {/* Pen */}
                            <path
                                d="M52 42L62 32M62 32L58 28M62 32L66 36"
                                stroke="#FF9500"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            {/* Lock */}
                            <rect
                                x="38"
                                y="48"
                                width="24"
                                height="18"
                                rx="2.5"
                                fill="#FF9500"
                            />
                            <path
                                d="M42 48V43C42 38.5817 45.5817 35 50 35C54.4183 35 58 38.5817 58 43V48"
                                stroke="#FF9500"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            {/* Sparkle/Star decorations */}
                            <circle cx="35" cy="25" r="2" fill="#FF9500" fillOpacity="0.6" />
                            <circle cx="65" cy="30" r="1.5" fill="#FF9500" fillOpacity="0.6" />
                            <circle cx="70" cy="50" r="1.5" fill="#FF9500" fillOpacity="0.6" />
                        </svg>
                    </div>

                    {/* Text: 付费后可查看分析 */}
                    <p className="text-black font-medium text-sm sm:text-base text-center mb-4">
                        {t("pay_to_view_analysis") || "付费后可查看分析"}
                    </p>

                    {/* Text: 距离开赛剩余 */}
                    <div className="flex items-center justify-center mb-2">
                        <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                        <p className="text-gray-500 text-xs sm:text-sm text-center">
                            {t("time_remaining_until_match") || "距离开赛剩余"}
                        </p>
                        <span className="w-1 h-1 bg-gray-400 rounded-full ml-2"></span>
                    </div>

                    {/* Countdown Timer */}
                    <div className="text-orange-500 font-bold text-3xl sm:text-4xl mt-2">
                        {timeRemaining}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LockedAnalysisCard;

