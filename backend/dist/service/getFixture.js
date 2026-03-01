"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetFixture = GetFixture;
const api_fixture_1 = require("../data/api-fixture");
const similarity_1 = require("./similarity");
async function GetFixture(match) {
    try {
        if (!match.kickOffDate) {
            return null;
        }
        const [month, day, year] = match.kickOffDate.split("/");
        if (!month || !day || !year) {
            return null;
        }
        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        let team = await (0, api_fixture_1.ApiFixtureByDate)(formattedDate);
        // Validate team is an array
        if (!team || !Array.isArray(team) || team.length === 0) {
            return null;
        }
        const homeTeamName = match.homeTeamNameEn;
        const awayTeamName = match.awayTeamNameEn;
        if (homeTeamName && awayTeamName) {
            const fixture = await (0, similarity_1.matchTeamSimilarity)(team, homeTeamName, awayTeamName);
            return fixture;
        }
        return null;
    }
    catch (error) {
        console.error("[GetFixture] Error:", error);
        return null;
    }
}
