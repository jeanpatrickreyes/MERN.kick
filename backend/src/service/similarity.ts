import stringSimilarity from 'string-similarity';

export const matchTeamSimilarity = (fixtures: any, homeName: string, awayName: string) => {
    // Validate fixtures is an array
    if (!fixtures || !Array.isArray(fixtures) || fixtures.length === 0) {
        return null;
    }
    
    let bestMatch = null;
    let highestScore = 0;
    for (let fix of fixtures) {
        const homeScore = stringSimilarity.compareTwoStrings(fix.home.toLowerCase(), homeName.toLowerCase());
        const awayScore = stringSimilarity.compareTwoStrings(fix.away.toLowerCase(), awayName.toLowerCase());
        const avgScore = (homeScore + awayScore) / 2;

        if (avgScore > 0.55 && avgScore > highestScore) {
            highestScore = avgScore;
            bestMatch = fix;
        }
    }

    if (!bestMatch) {
        for (let fix of fixtures) {
            const homeScore = stringSimilarity.compareTwoStrings(fix.home.toLowerCase(), homeName.toLowerCase());
            const awayScore = stringSimilarity.compareTwoStrings(fix.away.toLowerCase(), awayName.toLowerCase());
            const avgScore = (homeScore + awayScore) / 2;

            if (avgScore > 0.40 && avgScore > highestScore) {
                highestScore = avgScore;
                bestMatch = fix;
            }
        }
    }

    if (!bestMatch) {
        for (let fix of fixtures) {
            const homeScore = stringSimilarity.compareTwoStrings(fix.home.toLowerCase(), homeName.toLowerCase());
            const awayScore = stringSimilarity.compareTwoStrings(fix.away.toLowerCase(), awayName.toLowerCase());
            const avgScore = (homeScore + awayScore) / 2;

            if (avgScore > 0.30 && avgScore > highestScore) {
                highestScore = avgScore;
                bestMatch = fix;
            }
        }
    }

    if (!bestMatch) {
        for (let fix of fixtures) {
            const homeScore = stringSimilarity.compareTwoStrings(fix.home.toLowerCase(), homeName.toLowerCase());
            const awayScore = stringSimilarity.compareTwoStrings(fix.away.toLowerCase(), awayName.toLowerCase());
            const avgScore = (homeScore + awayScore) / 2;

            if (avgScore > 0.15 && avgScore > highestScore) {
                highestScore = avgScore;
                bestMatch = fix;
            }
        }
    }

    return bestMatch || null;
};
