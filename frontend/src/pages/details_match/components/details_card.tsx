import { useTranslation } from "react-i18next";
import { Probability } from "../../../models/probability";
import ThemedText from "../../../components/themedText";
import AppAssets from "../../../ultis/assets";
import AppColors from "../../../ultis/colors";
import { getTeamNameInCurrentLanguage } from "../../../ultis/languageUtils";
import Crown from "../../../components/crown";


interface Props {
    probability: Probability;
}

/** Convert bestPick like "OVER_2.5" to Chinese display like "大2.5" */
function formatBestPick(bestPick?: string): string {
    if (!bestPick) return "";
    const pick = bestPick.toUpperCase();
    if (pick.startsWith("OVER_")) return "大" + pick.replace("OVER_", "");
    if (pick.startsWith("UNDER_")) return "細" + pick.replace("UNDER_", "");
    return bestPick;
}

function DetailsCardComponent({
    probability
}: Props) {
    const { t } = useTranslation();

    // Get raw probabilities
    let homeWin = probability.ia && probability.ia.home ? probability.ia.home : (probability.predictions?.homeWinRate ?? 0);
    let awayWin = probability.ia && probability.ia.away ? probability.ia.away : (probability.predictions?.awayWinRate ?? 0);

    // Ensure values are non-negative
    homeWin = Math.max(0, homeWin);
    awayWin = Math.max(0, awayWin);

    // Normalize to ensure they sum to exactly 100%
    const total = homeWin + awayWin;
    if (total > 0) {
        homeWin = (homeWin / total) * 100;
        awayWin = (awayWin / total) * 100;
    } else {
        homeWin = 50;
        awayWin = 50;
    }

    //HOME
    const homeStats = probability.lastGames.homeTeam;
    const homeGoals = homeStats.teamGoalsFor ? parseInt(homeStats.teamGoalsFor) : 0;
    const homeGoalsAway = homeStats.teamGoalsAway ? parseInt(homeStats.teamGoalsAway) : 0;
    const homeResults = homeStats.teamForm.split(",");
    const homeWinCount = homeResults.filter(r => r === "W").length;
    const homeWinRate = ((homeWinCount / homeResults.length) * 100).toFixed(0);

    //AWAY
    const awayStats = probability.lastGames.awayTeam;
    const awayGoals = awayStats.teamGoalsFor ? parseInt(awayStats.teamGoalsFor) : 0;
    const awayGoalsAway = awayStats.teamGoalsAway ? parseInt(awayStats.teamGoalsAway) : 0;
    const awayResults = awayStats.teamForm.split(",");
    const awayWinCount = awayResults.filter(r => r === "W").length;
    const awayWinRate = ((awayWinCount / awayResults.length) * 100).toFixed(0);

    const bestPick = probability.ia?.bestPick;
    const bestPickDisplay = formatBestPick(bestPick);

    return (
        <div className="w-full flex justify-center items-center flex-col">

            {/* Analysis Header: 分析：大2.5 */}
            {bestPickDisplay && (
                <div className="sm:w-2/3 w-5/6 flex flex-col bg-white rounded-lg mt-5 items-center justify-center py-4">
                    <p className="text-xl sm:text-2xl font-bold text-black">
                        分析：<span style={{ color: AppColors.primary }}>{bestPickDisplay}</span>
                    </p>
                </div>
            )}

            {/* Probability bars with HiLo pick */}
            <div className="sm:w-2/3 w-5/6 flex flex-col h-48 bg-white rounded-lg mt-5 items-center justify-center">

                <div className="sm:w-2/3 w-5/6 flex flex-col bg-white rounded-lg mt-5 items-center justify-center">
                    <div className="w-full space-y-3 px-6">
                        <div className="flex justify-between text-base text-gray-700 font-medium">

                            <div className="flex sm:w-2/3 w-5/6 items-center">
                                {
                                    probability.homeTeamLogo
                                        ? <img src={probability.homeTeamLogo}
                                            onError={(e: any) => {
                                                e.target.onerror = null;
                                                e.target.src = AppAssets.logo;
                                            }}
                                            className="h-8 w-8 sm:h-9 sm:w-9 object-contain mr-2" />
                                        : <></>
                                }

                                <ThemedText
                                    className="font-bold text-[17px] sm:text-[17px] leading-tight"
                                    type="defaultSemiBold"
                                    style={{
                                        color: "black",
                                    }}
                                >
                                    {`${getTeamNameInCurrentLanguage(probability.homeLanguages, probability.homeTeamName)}`}
                                </ThemedText>

                                {bestPickDisplay && (
                                    <span className="ml-3 px-2 py-0.5 border border-red-500 text-red-500 text-sm font-bold rounded">
                                        {bestPickDisplay}
                                    </span>
                                )}
                                <Crown winRate={homeWin} size="w-4" className="ml-2" />
                            </div>
                            <span>{homeWin.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
                            <div
                                className="h-full"
                                style={{
                                    width: `${homeWin}%`,
                                    background: 'linear-gradient(to right, rgba(255,0,0,0.1), rgba(255,0,0,0.6), rgba(255,0,0,1))',
                                    borderRadius: 'inherit',
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="sm:w-2/3 w-5/6 flex flex-col bg-white rounded-lg mt-5 items-center justify-center pb-7">
                    <div className="w-full space-y-3 px-6">
                        <div className="flex justify-between text-base text-gray-700 font-medium">

                            <div className="flex sm:w-2/3 w-5/6 items-center">
                                {
                                    probability.awayTeamLogo
                                        ? <img src={probability.awayTeamLogo}
                                            onError={(e: any) => {
                                                e.target.onerror = null;
                                                e.target.src = AppAssets.logo;
                                            }}
                                            className="h-8 w-8 sm:h-9 sm:w-9 object-contain mr-2" />
                                        : <></>
                                }

                                <ThemedText
                                    className="font-bold text-[17px] sm:text-[17px] leading-tight"
                                    type="defaultSemiBold"
                                    style={{
                                        color: "black",
                                    }}
                                >
                                    {`${getTeamNameInCurrentLanguage(probability.awayLanguages, probability.awayTeamName)}`}
                                </ThemedText>

                                {bestPickDisplay && (
                                    <span className="ml-3 px-2 py-0.5 border border-red-500 text-red-500 text-sm font-bold rounded">
                                        {bestPickDisplay}
                                    </span>
                                )}
                                <Crown winRate={awayWin} size="w-4" className="ml-2" />
                            </div>
                            <span>{awayWin.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
                            <div
                                className="h-full"
                                style={{
                                    width: `${awayWin}%`,
                                    background: 'linear-gradient(to right, rgba(255,0,0,0.1), rgba(255,0,0,0.6), rgba(255,0,0,1))',
                                    borderRadius: 'inherit',
                                }}
                            />
                        </div>
                    </div>
                </div>

            </div>


            {/* Home team stats card */}
            <div className="sm:w-2/3 w-5/6 flex flex-col h-48 bg-white rounded-lg mt-5 items-center justify-center">

                <div className="flex items-start sm:w-2/3 w-5/6 mb-2">
                    <Card name={getTeamNameInCurrentLanguage(probability.homeLanguages, probability.homeTeamName)} bestPick={bestPickDisplay} img={probability.homeTeamLogo} probility={homeWin} />
                </div>

                <p className="sm:text-sm text-sm sm:h-4 h-4 font-bold text-black text-center">
                    {t("PER_GAME")}
                </p>
                <p className="sm:text-sm text-sm font-heading sm:h-4 h-4 font-bold text-red-500 text-center">
                    {t("STATISTIC")}
                </p>

                <div className="flex flex-row justify-evenly items-center w-3/4 h-14 mt-1">
                    <div >
                        <p className="sm:text-4xl text-2xl h-19 font-bold text-black text-center">
                            {homeGoals}
                        </p>
                        <p className="sm:text-[10px] h-1 text-xs font-bold text-black/50 text-center">
                            {t("GOALS/GAME")}
                        </p>
                    </div>
                    <div className="h-12 bg-black/50 w-[2px]" />
                    <div >
                        <p className="sm:text-4xl text-2xl h-19 font-bold text-black text-center">
                            {homeGoalsAway}
                        </p>
                        <p className="sm:text-[10px] h-1 text-xs font-bold text-black/50 text-center">
                            {t("CONCEDED/GOALS/GAME")}
                        </p>
                    </div>
                    <div className="h-12 bg-black/50 w-[2px]" />
                    <div >
                        <p className="sm:text-4xl text-2xl h-19 font-bold text-black text-center">
                            {homeWinRate + "%"}
                        </p>
                        <p className="sm:text-[10px] h-1 text-xs font-bold text-black/50 text-center">
                            {t("WIN_RATE")}
                        </p>
                    </div>
                </div>
            </div>

            {/* Away team stats card */}
            <div className="sm:w-2/3 w-5/6 flex flex-col h-48 bg-white rounded-lg mt-5 items-center justify-center">

                <div className="flex items-start sm:w-2/3 w-5/6 mb-2">
                    <Card name={getTeamNameInCurrentLanguage(probability.awayLanguages, probability.awayTeamName)} bestPick={bestPickDisplay} img={probability.awayTeamLogo} probility={awayWin} />
                </div>

                <p className="sm:text-sm text-xs sm:h-4 h-4 font-bold text-black text-center">
                    {t("PER_GAME")}
                </p>
                <p className="sm:text-sm text-xs font-heading sm:h-4 h-4 font-bold text-red-500 text-center">
                    {t("STATISTIC")}
                </p>

                <div className="flex flex-row justify-evenly items-center w-3/4 h-14 mt-1">
                    <div >
                        <p className="sm:text-4xl text-2xl h-19 font-bold text-black text-center">
                            {awayGoals}
                        </p>
                        <p className="sm:text-[10px] h-1 text-xs font-bold text-black/50 text-center">
                            {t("GOALS/GAME")}
                        </p>
                    </div>
                    <div className="h-12 bg-black/50 w-[2px]" />
                    <div >
                        <p className="sm:text-4xl text-2xl h-19 font-bold text-black text-center">
                            {awayGoalsAway}
                        </p>
                        <p className="sm:text-[10px] h-1 text-xs font-bold text-black/50 text-center">
                            {t("CONCEDED/GOALS/GAME")}
                        </p>
                    </div>
                    <div className="h-12 bg-black/50 w-[2px]" />
                    <div >
                        <p className="sm:text-4xl text-2xl h-19 font-bold text-black text-center">
                            {awayWinRate + "%"}
                        </p>
                        <p className="sm:text-[10px] h-1 text-xs font-bold text-black/50 text-center">
                            {t("WIN_RATE")}
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}


interface PropsCard {
    img?: string, name: string, probility: number, bestPick?: string
}

function Card({
    img,
    name,
    probility,
    bestPick
}: PropsCard) {
    return <div style={{ flexDirection: "row" }}>

        <div style={{ flexDirection: "row", display: "flex", alignItems: "center", justifyItems: "flex-start", width: "100%" }} >

            {
                img
                    ? <img src={img}
                        onError={(e: any) => {
                            e.target.onerror = null;
                            e.target.src = AppAssets.logo;
                        }}
                        className="h-7 w-7 sm:h-10 sm:w-10 object-contain mr-2" />
                    : <></>
            }

            <ThemedText
                className="font-bold text-[19px] sm:text-[20px] leading-tight"
                type="defaultSemiBold"
                style={{
                    color: "black",
                }}
            >
                {`${name}`}
            </ThemedText>

            {bestPick && (
                <span className="ml-3 px-2 py-0.5 border border-red-500 text-red-500 text-base font-bold rounded">
                    {bestPick}
                </span>
            )}

            <div className="w-12 h-10 rounded-lg flex ml-4"
                style={{ backgroundColor: AppColors.primary, alignItems: "center", justifyContent: "center", justifyItems: "center" }}>

                <ThemedText
                    className="font-bold text-[12px] sm:text-[18px] leading-tight"
                    type="defaultSemiBold"
                    style={{
                        color: "white",
                    }}
                >
                    {`${probility.toFixed(0)}%`}
                </ThemedText>

            </div>

            <div style={{ width: 10 }} />
            <Crown winRate={probility} />


        </div>
    </div>
}

export default DetailsCardComponent;
