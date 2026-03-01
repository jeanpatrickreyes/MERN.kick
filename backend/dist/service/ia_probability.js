"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IaProbality = IaProbality;
const axios_1 = __importDefault(require("axios"));
async function IaProbality(match, playersInjured) {
    try {
        const matchDataInput = {
            data: match.kickOff.split(" ")[0],
            home: {
                name: match.homeTeamNameEn || match.homeTeamName,
                last5Matches: match.homeForm.split(',').slice(0, 5),
                averageGoals: match.lastGames ? Number(match.lastGames.homeTeam.teamGoalsFor) / Number(match.lastGames.homeTeam.teamPlayed) : null,
                winRate: match.lastGames ? (Number(match.lastGames.homeTeam.teamWin) / Number(match.lastGames.homeTeam.teamPlayed)) * 100 : null,
            },
            away: {
                name: match.awayTeamNameEn || match.awayTeamName,
                last5Matches: match.awayForm.split(',').slice(0, 5),
                averageGoals: match.lastGames ? Number(match.lastGames.awayTeam.teamGoalsFor) / Number(match.lastGames.awayTeam.teamPlayed) : null,
                winRate: match.lastGames ? (Number(match.lastGames.awayTeam.teamWin) / Number(match.lastGames.awayTeam.teamPlayed)) * 100 : null,
            }
        };
        const injuredHome = playersInjured.home.length;
        const injuredAway = playersInjured.away.length;
        const prompt = `
    You are a football analyst. Based on the data below, estimate the win probability percentage for the home team, draw, and away team.
    Respond only in this exact JSON format:
    {
      "home": number,
      "away": number,
      "draw": number
    }
    ### Match Information:
    - Date: ${matchDataInput.data}
    - Home Team: ${matchDataInput.home.name}
      - Last 5 matches: ${matchDataInput.home.last5Matches.join(', ')}
      - Average goals per game: ${matchDataInput.home.averageGoals}
      - Injured players: ${injuredHome}
    - Away Team: ${matchDataInput.away.name}
      - Last 5 matches: ${matchDataInput.away.last5Matches.join(', ')}
      - Average goals per game: ${matchDataInput.away.averageGoals}
      - Injured players: ${injuredAway}
    
    Take into account that injuries impact team performance. If both teams have a similar number of injuries, reduce the impact.
    Also consider that the home team has a small advantage just for playing at home, usually around 5%.
    Do not provide any explanations. Only return the JSON result.
    `;
        const response = await axios_1.default.post('https://api.x.ai/v1/chat/completions', {
            model: 'grok-3',
            messages: [
                {
                    role: 'system',
                    content: 'You are a football analyst with access to real-time'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.3,
            stream: false,
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        const content = response.data.choices[0].message.content;
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}');
        const jsonString = content.slice(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(jsonString);
        if (typeof parsed.home !== 'number' ||
            typeof parsed.away !== 'number' ||
            typeof parsed.draw !== 'number') {
            return null;
        }
        return parsed;
    }
    catch (error) {
        console.error("Erro ", error.message || error);
        return null;
    }
}
