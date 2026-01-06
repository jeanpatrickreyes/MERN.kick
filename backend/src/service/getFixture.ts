import { ApiFixtureByDate } from "../data/api-fixture";
import { Match } from "../model/match.model";
import { matchTeamSimilarity } from "./similarity";

export async function GetFixture(
    match: Match): Promise<any> {
    try {
        if (!match.kickOffDate) {
            return null;
        }
        
        const [month, day, year] = match.kickOffDate.split("/");
        if (!month || !day || !year) {
            return null;
        }
        
        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        let team = await ApiFixtureByDate(formattedDate);
        
        // Validate team is an array
        if (!team || !Array.isArray(team) || team.length === 0) {
            return null;
        }
        
        const homeTeamName = match.homeTeamNameEn;
        const awayTeamName = match.awayTeamNameEn;
        if (homeTeamName && awayTeamName) {
            const fixture = await matchTeamSimilarity(team, homeTeamName, awayTeamName);
            return fixture;
        }
        return null;
    } catch (error) {
        console.error("[GetFixture] Error:", error);
        return null;
    }
}
