export interface FootyLogicDetails {
    statusCode: number
    data: Data
    message: string
}

export interface Data {
    eventId: string
    homeTeamLogo: number
    awayTeamLogo: number
    homeTeamName: string
    awayTeamName: string
    competitionName: string
    kickOffTime: string
    homeOdds: number
    awayOdds: number
    drawOdds: number
    homeTeamId: number
    homeTeamIdNav: number
    awayTeamId: number
    awayTeamIdNav: number
    matchNumber: any
    homeTeamPos: string
    awayTeamPos: string
    matchDayCode: string
    competitionId: number
    tournamentType: string
    homePlayerAnalysis: number
    awayPlayerAnalysis: number
    homeLeagueShortName: any
    awayLeagueShortName: any
    competitionIdNav: number
}
