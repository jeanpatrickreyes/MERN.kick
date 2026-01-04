import axios from "axios";

const key = process.env.KEY_API;

export const ApiPredictions = async (fixtureId: number) => {
    const options = {
        method: "GET",
        url: "https://v3.football.api-sports.io/odds",
        params: { fixture: fixtureId },
        headers: {
            "x-rapidapi-host": "v3.football.api-sports.io",
            "x-rapidapi-key": key,
        },
    };
    try {
        const response = await axios(options);
        const data = response.data;
        if (response.status == 200 && data.response.length > 0) {
            const bet365Bookmarker = data.response[0].bookmakers.find((bookmaker: any) => bookmaker.id === 8);
            if (bet365Bookmarker) {
                const odds = bet365Bookmarker.bets.find((bet: any) => bet.name === "Home/Away");
                if (odds && odds.values) {
                    return {
                        homeOdds: odds.values.find((value: any) => value.value === "Home").odd,
                        awayOdds: odds.values.find((value: any) => value.value === "Away").odd
                    }
                }
            } else {
                const Pinnacle = data.response[0].bookmakers.find((bookmaker: any) => bookmaker.id === 4);
                if (Pinnacle) {
                    const odds = Pinnacle.bets.find((bet: any) => bet.name === "Home/Away");
                    if (odds && odds.values) {
                        return {
                            homeOdds: odds.values.find((value: any) => value.value === "Home").odd,
                            awayOdds: odds.values.find((value: any) => value.value === "Away").odd
                        }
                    }
                } else {
                    const Marathonbet = data.response[0].bookmakers.find((bookmaker: any) => bookmaker.id === 2);
                    if (Marathonbet) {
                        const odds = Marathonbet.bets.find((bet: any) => bet.name === "Match Winner");
                        if (odds && odds.values) {
                            return {
                                homeOdds: odds.values.find((value: any) => value.value === "Home").odd,
                                awayOdds: odds.values.find((value: any) => value.value === "Away").odd
                            }
                        }
                    } else {

                        for (let x in data.response[0].bookmakers) {
                            const bookmaker = data.response[0].bookmakers[x];
                            if (bookmaker.bets.find((bet: any) => bet.name === "Home/Away").length != 0) {
                                const odds = bookmaker.bets.find((bet: any) => bet.name === "Home/Away");
                                if (odds && odds.values) {
                                    return {
                                        homeOdds: odds.values.find((value: any) => value.value === "Home").odd,
                                        awayOdds: odds.values.find((value: any) => value.value === "Away").odd
                                    }
                                }
                            } else if (bookmaker.bets.find((bet: any) => bet.name === "Match Winner").length != 0) {
                                const odds = bookmaker.bets.find((bet: any) => bet.name === "Match Winner");
                                if (odds && odds.values) {
                                    return {
                                        homeOdds: odds.values.find((value: any) => value.value === "Home").odd,
                                        awayOdds: odds.values.find((value: any) => value.value === "Away").odd
                                    }
                                }
                            }
                        }

                    }
                }
            }
        }
        return null;
    } catch (error) {
        console.error(`Error fetching data for date 1: ${error}`);
    }
};

