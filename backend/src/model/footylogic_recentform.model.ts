export interface FootyLogicRecentForm {
    recent8Results: Recent8Results
}

export interface Recent8Results {
    homeTeam: HomeTeam[]
    awayTeam: AwayTeam[]
}

export interface HomeTeam {
    competitionName: string
    kickOff: string
    homeOrAway: string
    oppTeamName: string
    teamPos: number
    fullTimeScore: string
    halfTimeScore: string
    fullTimeResult: string
    firstHalfHad: string
}

export interface AwayTeam {
    competitionName: string
    kickOff: string
    homeOrAway: string
    oppTeamName: string
    teamPos: number
    fullTimeScore: string
    halfTimeScore: string
    fullTimeResult: string
    firstHalfHad: string
}
