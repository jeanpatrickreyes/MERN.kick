import { ApiFixtureByDate } from "../data/api-fixture";
import { Match } from "../model/match.model";
import { matchTeamSimilarity } from "./similarity";

export async function GetFixture(
    match: Match): Promise<any> {
    const [month, day, year] = match.kickOffDate.split("/");
    const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    let team = await ApiFixtureByDate(formattedDate);
    const homeTeamName = match.homeTeamNameEn;
    const awayTeamName = match.awayTeamNameEn;
    if (homeTeamName && awayTeamName) {
        const fixture = await matchTeamSimilarity(team, homeTeamName, awayTeamName);
        return fixture;
    }
    return null;
}
