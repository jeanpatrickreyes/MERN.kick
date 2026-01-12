import { useTranslation } from "react-i18next";
import { Probability } from "../../../models/probability";

interface Props {
    probability: Probability;
}

function DetailsInfoComponent({
    probability
}: Props) {
    const { t } = useTranslation();

    if (!probability.predictions) {
        return null;
    }

    const isHome = probability.predictions.homeWinRate > probability.predictions.awayWinRate;
    const winRate = isHome ? probability.predictions.homeWinRate : probability.predictions.awayWinRate;
    const kelly = isHome ? probability.predictions.kellyHome : probability.predictions.kellyAway;
    const odds = 100 / winRate;
    const overRound = probability.predictions.overRound;
    const market = overRound;
    const kellyIndex = kelly;
    const handicap = (winRate - 50) * (isHome ? 1 : -1);
    const confidence = Math.min((kelly / 500) * 100, 100);

    const homeWin = probability.ia && probability.ia.home ? probability.ia.home : probability.predictions.homeWinRate;
    const awayWin = probability.ia && probability.ia.away ? probability.ia.away : probability.predictions.awayWinRate;

    return (
        <div className="sm:w-2/3 w-5/6 mx-auto bg-white mt-5 pt-4 pb-4 items-center justify-center flex rounded-lg flex-col">

            <p className="sm:text-sm text-xs sm:h-4 h-4 font-bold text-black text-center">
                {t("RESULT").toUpperCase()}
            </p>
            <p className="sm:text-sm text-xs font-heading sm:h-4 h-4 font-bold text-red-500 text-center">
                {t("STATISTIC")}
            </p>

            <div className="flex flex-row justify-evenly items-center w-3/4 h-14 mt-1">
                <div className="w-1/4" >
                    <p className="sm:text-4xl text-2xl h-19 font-bold text-black text-center">
                        {kellyIndex.toFixed(2)}
                    </p>
                    <p className="sm:text-[10px] h-1 text-xs font-bold text-black/50 text-center">
                        {t("Kelly_index").toUpperCase()}
                    </p>
                </div>
                <div className="h-12 bg-black/50 w-[2px]" />
                <div className="w-1/4" >
                    <p className="sm:text-4xl text-2xl h-19 font-bold text-black text-center">
                        {handicap.toFixed(0)}
                    </p>
                    <p className="sm:text-[10px] h-1 text-xs font-bold text-black/50 text-center">
                        {t("handicap").toUpperCase()}
                    </p>
                </div>
                <div className="h-12 bg-black/50 w-[2px]" />
                <div className="w-1/4" >
                    <p className="sm:text-4xl text-2xl h-19 font-bold text-black text-center">
                        {`${confidence.toFixed(0)}%`}
                    </p>
                    <p className="sm:text-[10px] h-1 text-xs font-bold text-black/50 text-center">
                        {t("betting_confidence").toUpperCase()}
                    </p>
                </div>
            </div>

            <div className="h-4" />

            <div className="flex flex-row justify-evenly items-center w-3/4 h-14 mt-1">
                <div className="w-1/4" >
                    <p className="sm:text-4xl text-2xl h-19 font-bold text-black text-center">
                        {market.toFixed(2)}
                    </p>
                    <p className="sm:text-[10px] h-1 text-xs font-bold text-black/50 text-center">
                        {t("market_sentiment").toUpperCase()}
                    </p>
                </div>
                <div className="h-12 bg-black/50 w-[2px]" />
                <div className="w-1/4" >
                    <p className="sm:text-4xl text-2xl h-19 font-bold text-black text-center">
                        {odds.toFixed(2)}
                    </p>
                    <p className="sm:text-[10px] h-1 text-xs font-bold text-black/50 text-center">
                        {t("Odds_value").toUpperCase()}
                    </p>
                </div>
                <div className="h-12 bg-black/50 w-[2px]" />
                <div className="w-1/4" >
                    <p className="sm:text-4xl text-2xl h-19 font-bold text-black text-center">
                        {homeWin > awayWin ? `${homeWin.toFixed(0)}%` : `${awayWin.toFixed(0)}%`}
                    </p>
                    <p className="sm:text-[10px] h-1 text-xs font-bold text-black/50 text-center">
                        {t("win_probality").toUpperCase()}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default DetailsInfoComponent;