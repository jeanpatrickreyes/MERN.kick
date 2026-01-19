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

function DetailsCardComponent({
    probability
}: Props) {
    const { t } = useTranslation();

    const homeWin = probability.ia && probability.ia.home ? probability.ia.home : (probability.predictions?.homeWinRate ?? 0);
    const awayWin = probability.ia && probability.ia.away ? probability.ia.away : (probability.predictions?.awayWinRate ?? 0);

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

    const conditionHome = probability.condition ? probability.condition.split(',')[0] : undefined
    const conditionAway = probability.condition ? probability.condition.split(',')[1] : undefined

    return (
        <div className="w-full flex justify-center items-center flex-col">

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

                                {
                                    conditionHome
                                        ? <ThemedText
                                            className="font-bold text-[15px] sm:text-[17px] leading-tight pl-3"
                                            type="defaultSemiBold"
                                            style={{
                                                color: "black",
                                            }}
                                        >
                                            {`     ${conditionHome.replace(".0", "")}`}
                                        </ThemedText> : undefined
                                }
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

                                {
                                    conditionAway
                                        ? <ThemedText
                                            className="font-bold text-[15px] sm:text-[17px] leading-tight pl-3"
                                            type="defaultSemiBold"
                                            style={{
                                                color: "black",
                                            }}
                                        >
                                            {`     ${conditionAway.replace(".0", "")}`}
                                        </ThemedText> : undefined
                                }
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



            <div className="sm:w-2/3 w-5/6 flex flex-col h-48 bg-white rounded-lg mt-5 items-center justify-center">

                <div className="flex items-start sm:w-2/3 w-5/6 mb-2">
                    <Card name={getTeamNameInCurrentLanguage(probability.homeLanguages, probability.homeTeamName)} condition={probability.condition ? probability.condition.split(',')[0] : undefined} img={probability.homeTeamLogo} probility={homeWin} />
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

            <div className="sm:w-2/3 w-5/6 flex flex-col h-48 bg-white rounded-lg mt-5 items-center justify-center">

                <div className="flex items-start sm:w-2/3 w-5/6 mb-2">
                    <Card name={getTeamNameInCurrentLanguage(probability.awayLanguages, probability.awayTeamName)} condition={probability.condition ? probability.condition.split(',')[1] : undefined} img={probability.awayTeamLogo} probility={awayWin} />
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
    img?: string, name: string, probility: number, condition?: string
}

function Card({
    img,
    name,
    probility,
    condition
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


            {
                condition
                    ? <ThemedText
                        className="font-bold text-[17px] sm:text-[17px] leading-tight pl-4"
                        type="defaultSemiBold"
                        style={{
                            color: "black",
                        }}
                    >
                        {`    ${condition.replace(".0", "")}`}
                    </ThemedText> : undefined
            }


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