export interface FootyLogic {
    statusCode: number
    data: Daum[]
    message: string
}

export interface Daum {
    id: number
    label: string
    events: Event[]
}

export interface Event {
    kickOff: string
    kickOffTime: string
    kickOffDate: string
    eventId: string
    hadHomePct: string
    bestBetName: string
    subMarketName?: string
    matchOutcome: string
    hadAwayPct: string
    hadDrawPct: string
    homeForm: string
    awayForm: string
    countryId: string
    countryName?: string
    competitionId: number
    competitionName: string
    homeTeamName: string
    awayTeamName: string
    awayTeamImgUrl: any
    outcomeName: string
    kickOffDateLocal: string
    competitionIdNav: number
}
