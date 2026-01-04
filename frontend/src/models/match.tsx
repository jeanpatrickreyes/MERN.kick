import { Predictions, ResultIA } from "./probability"

export interface TeamLanguages {
  en: string;
  zh: string;
  zhCN: string;
}

export interface Match {
  homeLanguages?: TeamLanguages;
  awayLanguages?: TeamLanguages;
  id: string
  matchDateFormated: string
  awayTeamName: string
  lastGames: LastGames
  outcomeName: string
  subMarketName?: string
  kickOffTime: string
  countryName?: string
  eventId: string
  homeTeamNameEn: string
  kickOff: string
  kickOffDateLocal: string
  awayTeamImgUrl: any
  bestBetName: string
  homeForm: string
  countryId: string
  awayTeamNameEn: string
  matchOutcome: string
  competitionId: number
  competitionIdNav: number
  homeTeamLogo: string
  kickOffDate: string
  hadDrawPct: string
  hadHomePct: string
  competitionName: string
  awayForm: string
  homeTeamName: string
  hadAwayPct: string
  awayTeamId: number
  homeTeamId: number
  awayTeamLogo: string
  ia?: ResultIA
  predictions?: Predictions
}

export interface LastGames {
  homeTeam: HomeTeam
  awayTeam: AwayTeam
}

export interface HomeTeam {
  recentMatch: RecentMatch[]
  teamGoalsFor: string
  teamWin: string
  teamLoss: string
  teamPlayed: string
  teamForm: string
  teamDraw: string
  nextMatch: NextMatch
  teamGoalsAway: string
}

export interface RecentMatch {
  result: string
  score: string
  kickOff: string
  awayTeamName: string
  homeTeamName: string
  competitionName: string
}

export interface NextMatch {
  kickOff: string
  homeTeamName: string
  awayTeamName: string
  competitionName: string
}

export interface AwayTeam {
  teamDraw: string
  nextMatch: NextMatch2
  teamGoalsFor: string
  teamLoss: string
  teamWin: string
  teamGoalsAway: string
  teamForm: string
  recentMatch: RecentMatch2[]
  teamPlayed: string
}

export interface NextMatch2 {
  awayTeamName: string
  kickOff: string
  competitionName: string
  homeTeamName: string
}

export interface RecentMatch2 {
  competitionName: string
  homeTeamName: string
  kickOff: string
  result: string
  awayTeamName: string
  score: string
}
