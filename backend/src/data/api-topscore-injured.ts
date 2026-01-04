import axios from "axios";

const key = process.env.KEY_API;

export const ApiTopScoreInjured = async (
    fixtureId: number,
    leagueId: number,
    season: string,
    homeTeam: number,
    awayTeam: number
) => {
    const headers = {
        "x-rapidapi-host": "v3.football.api-sports.io",
        "x-rapidapi-key": key,
    };

    try {
        const [topScorersRes, injuriesRes] = await Promise.all([
            axios.get(
                `https://v3.football.api-sports.io/players/topscorers?league=${leagueId}&season=${season}`,
                { headers }
            ),
            axios.get(
                `https://v3.football.api-sports.io/injuries?fixture=${fixtureId}`,
                { headers }
            ),
        ]);

        if (
            topScorersRes.status !== 200 ||
            injuriesRes.status !== 200
        ) {
            return { home: [], away: [] };
        }

        const topScorers = topScorersRes.data.response;
        const injuries = injuriesRes.data.response;

        const getKeyAbsences = (teamId: number) => {
            const teamScorers = topScorers.filter(
                (p: any) =>
                    p.statistics?.[0]?.team?.id === teamId
            );

            return teamScorers
                .filter((p: any) =>
                    injuries.find(
                        (inj: any) =>
                            inj.player.name === p.player.name &&
                            inj.team.id === teamId
                    )
                )
                .map((p: any) => {
                    const injury = injuries.find(
                        (inj: any) =>
                            inj.player.name === p.player.name &&
                            inj.team.id === teamId
                    );
                    return {
                        name: p.player.name,
                        reason: injury?.type || "-",
                    };
                });
        };

        return {
            home: getKeyAbsences(homeTeam),
            away: getKeyAbsences(awayTeam),
        };
    } catch (err) {
        console.error("Erro:", err);
        return {
            home: [],
            away: [],
        };
    }
};
