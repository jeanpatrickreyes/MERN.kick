"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalculationProbality = CalculationProbality;
function CalculationProbality(playersInjured, homeWinRate, awayWinRate, homeForm, awayForm) {
    const injuredHome = playersInjured.home.length;
    const injuredAway = playersInjured.away.length;
    const injuryDiff = Math.abs(injuredHome - injuredAway);
    if (injuredHome + injuredAway > 0) {
        const totalInjuries = injuredHome + injuredAway;
        const percent = (injuryDiff / totalInjuries) * 20;
        if (injuredHome < injuredAway) {
            homeWinRate += percent;
            awayWinRate -= percent;
        }
        else if (injuredAway < injuredHome) {
            awayWinRate += percent;
            homeWinRate -= percent;
        }
    }
    const scoreForm = (form) => form.reduce((acc, val) => acc + (val === "W" ? 3 : val === "D" ? 1 : 0), 0);
    const homeScore = scoreForm(homeForm);
    const awayScore = scoreForm(awayForm);
    const totalScore = homeScore + awayScore;
    if (totalScore > 0) {
        const percent = 20;
        const diff = homeScore - awayScore;
        const bonus = Math.abs(diff / totalScore) * percent;
        if (diff > 0) {
            homeWinRate += bonus;
            awayWinRate -= bonus;
        }
        else if (diff < 0) {
            awayWinRate += bonus;
            homeWinRate -= bonus;
        }
    }
    homeWinRate = Math.max(0, Math.min(homeWinRate, 93));
    awayWinRate = Math.max(0, Math.min(awayWinRate, 93));
    return {
        home: parseFloat(homeWinRate.toFixed(2)),
        away: parseFloat(awayWinRate.toFixed(2)),
        draw: parseFloat(Math.abs(homeWinRate - awayWinRate).toFixed(2))
    };
}
