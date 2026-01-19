import moment from "moment-timezone";
import ThemedText from "../../../components/themedText";
import { Match } from "../../../models/match";
import AppAssets from "../../../ultis/assets";
import AppColors from "../../../ultis/colors";
import { NavigateFunction } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Crown from "../../../components/crown";

export type Props = {
    teams: string[]
    match: Match
    navigate: NavigateFunction
};

export function CardMatchComponent({
    teams,
    navigate,
    match,
}: Props) {
    const { t } = useTranslation();
    const kickOffTime = match.kickOff;
    const timeOnly = kickOffTime.slice(11, 16);

    const dateStr = match.kickOff;
    moment.locale('zh-hk');
    const date = moment.tz(dateStr, 'Asia/Hong_Kong');
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

    return (
        <div
            onClick={() => {
                navigate("/details-match/" + match.id);
            }}
            className="group relative sm:w-2/3 w-5/6 h-24 mx-auto mb-2 rounded-xl overflow-hidden 
                 shadow-lg transition-all duration-300 hover:shadow-2xl cursor-pointer"
            style={{ height: 90 }}
        >
            <div
                className="absolute inset-0 bg-gradient-to-r from-white via-white to-white 
                   transition-all duration-300 z-0"
            ></div>

            <div className="relative z-10 flex items-stretch justify-between h-full">

                <div className="flex flex-col text-center text-sm font-semibold bg-[#fc3a45] w-10 text-white justify-center h-full">
                    <div>{day}</div>
                    <div className="uppercase text-[9px] sm:text-xs">{month}</div>
                </div>

                <div className="relative z-10 flex items-center justify-center h-full w-full px-10">

                    <div className="flex gap-2 items-center justify-end mr-4" style={{ width: "70%" }}>
                        <div>
                            <div style={{ height: 10 }} />
                            <div className="flex items-center justify-end gap-1">
                                <ThemedText
                                    className="font-bold text-[9px] sm:text-[14px] leading-tight"
                                    type="defaultSemiBold"
                                    style={{
                                        color: AppColors.primary,
                                        textAlign: "right",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "normal",
                                        display: "-webkit-box",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                    }}
                                >
                                    {teams[0]}
                                </ThemedText>
                                {homeWin && <Crown winRate={homeWin} size="w-3 sm:w-4" />}
                            </div>

                            <div style={{ height: 5 }} />

                            <div className="flex flex-row">
                                {match.homeForm.split(',').reverse().map((z, index) => (
                                    <div
                                        key={index}
                                        style={{ backgroundColor: z == 'D' ? "orange" : z == "L" ? "red" : "green" }}
                                        className="w-3 h-3 sm:w-4 sm:h-4 rounded flex items-center justify-center mr-1">
                                        <ThemedText
                                            type="defaultSemiBold"
                                            className="text-white sm:text-[10px] text-[7px]"
                                        >
                                            {z}
                                        </ThemedText>
                                    </div>
                                ))}
                            </div>

                        </div>


                        {
                            match.homeTeamLogo
                                ? <img src={match.homeTeamLogo}
                                    onError={(e: any) => {
                                        e.target.onerror = null;
                                        e.target.src = AppAssets.logo;
                                    }} className="h-9 w-9 sm:h-14 sm:w-14 object-contain" />
                                : <></>
                        }
                    </div>

                    <div  >
                        <div className="text-pink-400 text-[18px] sm:text-xl" style={{
                            width: "10%",
                            color: AppColors.primary,
                            alignItems: "center"
                        }}>VS</div>
                        <ThemedText
                            type="default"
                            className="font-bold text-[10px] sm:text-xm"
                            style={{
                                color: "#eab308",
                                fontWeight: "bold",
                            }}
                        >
                            {timeOnly}
                        </ThemedText>
                    </div>

                    <div className="flex gap-2 items-center justify-start ml-4" style={{ width: "70%" }}>
                        {
                            match.awayTeamLogo
                                ? <img src={match.awayTeamLogo}
                                    onError={(e: any) => {
                                        e.target.onerror = null;
                                        e.target.src = AppAssets.logo;
                                    }}
                                    className="h-9 w-9 sm:h-14 sm:w-14 object-contain" />
                                : <></>
                        }
                        <div>
                            <div className="flex items-center gap-1">
                                <ThemedText
                                    className="font-bold text-[9px] sm:text-[14px] leading-tight"
                                    type="defaultSemiBold"
                                    style={{
                                        color: AppColors.primary,
                                        textAlign: "left",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "normal",
                                        display: "-webkit-box",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                    }}
                                >
                                    {teams[1]}
                                </ThemedText>
                                {awayWin && <Crown winRate={awayWin} size="w-3 sm:w-4" />}
                            </div>
                            <div style={{ height: 5 }} />

                            <div className="flex flex-row">
                                {match.awayForm.split(',').reverse().map((z, index) => (
                                    <div
                                        key={index}
                                        style={{ backgroundColor: z == 'D' ? "orange" : z == "L" ? "red" : "green" }}
                                        className="w-3 h-3 sm:w-4 sm:h-4 rounded flex items-center justify-center mr-1">
                                        <ThemedText
                                            type="defaultSemiBold"
                                            className="text-white sm:text-[10px] text-[7px]"
                                        >
                                            {z}
                                        </ThemedText>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

        </div >
    );
}
