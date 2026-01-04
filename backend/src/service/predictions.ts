import { ApiPredictions } from "../data/api-predictions";

export async function Predictions(fixture_id: number) {
    try {
        const winRate = await ApiPredictions(fixture_id);

        let homeOdd;
        let awayOdd;
        if (winRate?.homeOdds) {
            homeOdd = winRate.homeOdds;
            awayOdd = winRate.awayOdds;
        } else {
            return null;
        }

        const homeWinProb = parseFloat((100 / homeOdd).toFixed(1));
        const awayWinProb = parseFloat((100 / awayOdd).toFixed(1));

        const homeWinRate = homeWinProb * 100 / (homeWinProb + awayWinProb);
        const awayWinRate = awayWinProb * 100 / (homeWinProb + awayWinProb);

        const overRound = parseFloat((homeWinProb + awayWinProb - 100).toFixed(1));

        const bet_funds = 100;
        const evHome = parseFloat(
            ((homeWinProb / 100) * homeOdd * bet_funds -
                (awayWinProb / 100) * bet_funds).toFixed(2),
        );
        const evAway = parseFloat(
            ((awayWinProb / 100) * awayOdd * bet_funds -
                (homeWinProb / 100) * bet_funds).toFixed(2),
        );

        const pbrHome = parseFloat((homeOdd / homeWinProb).toFixed(2));
        const pbrAway = parseFloat((awayOdd / awayWinProb).toFixed(2));

        const kellyHome = parseFloat(
            ((homeWinProb * (homeOdd - 1) - (1 - homeWinProb)) / (homeOdd - 1))
                .toFixed(
                    2,
                ),
        );
        const kellyAway = parseFloat(
            ((awayWinProb * (awayOdd - 1) - (1 - awayWinProb)) / (awayOdd - 1))
                .toFixed(
                    2,
                ),
        );

        const matchResult = {
            homeWinRate: homeWinRate,
            awayWinRate: awayWinRate,
            overRound,
            evHome,
            evAway,
            pbrHome,
            pbrAway,
            kellyHome,
            kellyAway,
        };
        return matchResult;
    } catch (error) {
        return null;
    }
}