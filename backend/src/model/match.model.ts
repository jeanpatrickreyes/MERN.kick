import { LastGameData } from "./footylogic_last_games"

export interface TeamLanguages {
    en: string;
    zh: string;
    zhCN: string;
}

export interface Match {
    homeLanguages?: TeamLanguages;
    awayLanguages?: TeamLanguages;
    condition?: string
    kickOffTime: string
    kickOffDate: string
    competitionId: number
    eventId: string
    matchOutcome: string
    homeForm: string
    awayForm: string
    competitionName: string
    homeTeamName: string
    kickOff: string
    awayTeamName: string
    kickOffDateLocal: string
    homeTeamNameEn?: string
    awayTeamNameEn?: string
    homeTeamLogo?: string
    awayTeamLogo?: string
    homeTeamId?: number
    awayTeamId?: number
    lastGames?: LastGameData
    fixture_id?: number
    league_id?: number,
    predictions?: Predictions
    ia?: ResultIA
    ia2?: ResultIA
}

export interface ResultIA {
    draw: number;
    home: number;
    away: number;
}

export interface Predictions {
    homeWinRate: number;
    awayWinRate: number;
    overRound: number;
    evHome: number;
    evAway: number;
    pbrHome: number;
    pbrAway: number;
    kellyHome: number;
    kellyAway: number;
}
