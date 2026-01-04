export interface FootyLogicLastGames {
    statusCode: number
    data: LastGameData
    message: string
}

export interface LastGameData {
    homeTeam: HomeTeam
    awayTeam: AwayTeam
}

export interface HomeTeam {
    recentMatch: RecentMatch[]
    teamPlayed: string
    teamWin: string
    teamDraw: string
    teamLoss: string
    teamGoalsFor: string
    teamGoalsAway: string
    teamForm: string
    nextMatch?: NextMatch
}

export interface RecentMatch {
    homeTeamName: string
    awayTeamName: string
    kickOff: string
    competitionName: string
    score: string
    result: string
}

export interface NextMatch {
    homeTeamName: string
    awayTeamName: string
    kickOff: string
    competitionName: string
}

export interface AwayTeam {
    recentMatch: RecentMatch2[]
    teamPlayed: string
    teamWin: string
    teamDraw: string
    teamLoss: string
    teamGoalsFor: string
    teamGoalsAway: string
    teamForm: string
    nextMatch?: NextMatch2
}

export interface RecentMatch2 {
    homeTeamName: string
    awayTeamName: string
    kickOff: string
    competitionName: string
    score: string
    result: string
}

export interface NextMatch2 {
    homeTeamName: string
    awayTeamName: string
    kickOff: string
    competitionName: string
}
