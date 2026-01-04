
export interface HKJC {
    id: string
    frontEndId: string
    matchDate: string
    kickOffTime: string
    status: string
    updateAt: string
    sequence: string
    esIndicatorEnabled: boolean
    homeTeam: HomeTeam
    awayTeam: AwayTeam
    tournament: Tournament
    isInteractiveServiceAvailable: boolean
    inplayDelay: boolean
    venue?: Venue
    tvChannels: TvChannel[]
    liveEvents: LiveEvent[]
    featureStartTime: string
    featureMatchSequence: string
    poolInfo: PoolInfo
    runningResult?: RunningResult
    runningResultExtra: any
    adminOperation: AdminOperation
    foPools: FoPool[]
}

export interface HomeTeam {
    id: string
    name_en: string
    name_ch: string
}

export interface AwayTeam {
    id: string
    name_en: string
    name_ch: string
}

export interface Tournament {
    id: string
    frontEndId: string
    nameProfileId: string
    isInteractiveServiceAvailable: boolean
    code: string
    name_en: string
    name_ch: string
}

export interface Venue {
    code: string
    name_en: string
    name_ch: string
}

export interface TvChannel {
    code: string
    name_en: string
    name_ch: string
}

export interface LiveEvent {
    id: string
    code: string
}

export interface PoolInfo {
    normalPools: string[]
    inplayPools: string[]
    sellingPools: string[]
    ntsInfo: string[]
    entInfo: any[]
    definedPools: string[]
}

export interface RunningResult {
    homeScore: number
    awayScore: number
    corner: number
    homeCorner: number
    awayCorner: number
}

export interface AdminOperation {
    remark: any
}

export interface FoPool {
    id: string
    status: string
    oddsType: string
    instNo: number
    inplay: boolean
    name_ch: string
    name_en: string
    updateAt: string
    expectedSuspendDateTime: string
    lines: Line[]
}

export interface Line {
    lineId: string
    status: string
    condition: string
    main: boolean
    combinations: Combination[]
}

export interface Combination {
    combId: string
    str: string
    status: string
    offerEarlySettlement: string
    currentOdds: string
    selections: Selection[]
}

export interface Selection {
    selId: string
    str: string
    name_ch: string
    name_en: string
}
