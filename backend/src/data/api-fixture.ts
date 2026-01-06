import axios from "axios";
import dotenv from 'dotenv';
dotenv.config();

const key = process.env.KEY_API;

type Fixture = {
    id: number;
    league_id: number,
    team: string;
    homeLogo: string;
    awayLogo: string;
    away: string
    home: string
};

export const ApiFixtureByDate = async (date: string): Promise<Fixture[] | undefined> => {
    let fixtures: Fixture[] = [];
    const options = {
        method: "GET",
        url: "https://v3.football.api-sports.io/fixtures",
        params: { date: date, timezone: "Asia/Shanghai" },
        headers: {
            "x-rapidapi-host": "v3.football.api-sports.io",
            "x-rapidapi-key": key,
        },
    };
    try {
        const response = await axios(options);
        const data = response.data;
        if (response.status == 200) {
            data.response.forEach((match: any) => {
                fixtures.push({
                    id: match.fixture.id,
                    league_id: match.league.id,
                    team: `${match.teams.home.name}/${match.teams.away.name}`,
                    home: match.teams.home.name,
                    away: match.teams.away.name,
                    homeLogo: match.teams.home.logo,
                    awayLogo: match.teams.away.logo,
                });
            });
        }
        return fixtures;
    } catch (error) {
        console.error(`Error fetching data for date ${date}: ${error}`);
        return []; // Return empty array instead of undefined
    }
};

