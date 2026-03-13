import API from "../api/api";
import { HKJC } from "../model/hkjc.model";

async function queryHKJC(oddsTypes: string[]): Promise<HKJC[]> {
    const queryWithDates = {
        ...base,
        variables: {
            ...base.variables,
            startDate: null,
            endDate: null,
            startIndex: 1,
            endIndex: 500,
            showAllMatch: false,
            fbOddsTypes: oddsTypes,
            fbOddsTypesM: oddsTypes,
            featuredMatchesOnly: false,
            inplayOnly: false,
        },
    };
    const res = await API.POST("https://info.cld.hkjc.com/graphql/base/", queryWithDates);
    if (res.status !== 200 || !res.data?.data) return [];
    return res.data.data.matches || [];
}

/** Fetch one match by id with HAD, HDC, TG (1X2, handicap, HiLo) for real-time odds. */
export async function ApiHKJCMatchById(matchId: string): Promise<HKJC | null> {
    try {
        const oddsTypes = ["HAD", "HDC", "TG"];
        const queryOne = {
            ...base,
            variables: {
                ...base.variables,
                matchIds: [matchId],
                startIndex: 0,
                endIndex: 1,
                showAllMatch: true,
                fbOddsTypes: oddsTypes,
                fbOddsTypesM: oddsTypes,
                featuredMatchesOnly: false,
                inplayOnly: false,
            },
        };
        const res = await API.POST("https://info.cld.hkjc.com/graphql/base/", queryOne);
        if (res.status !== 200 || !res.data?.data?.matches?.length) return null;
        return res.data.data.matches[0] as HKJC;
    } catch (error) {
        console.warn("[ApiHKJCMatchById] Error for", matchId, error);
        return null;
    }
}

/** Match list for website/sync: HDC only = same as HKJC handicap page (e.g. 32 matches, 26th/27th). */
export const ApiHKJCMatchList = async (): Promise<HKJC[]> => {
    try {
        console.log("[ApiHKJCMatchList] Fetching match list (HDC)");
        const matches = await queryHKJC(["HDC"]);
        console.log("[ApiHKJCMatchList] Received", matches.length, "matches");
        return matches;
    } catch (error) {
        console.error("[ApiHKJCMatchList] Error:", error);
        return [];
    }
};

export const ApiHKJC = async (): Promise<HKJC[]> => {
    try {
        console.log("[ApiHKJC] Fetching all matches from HKJC API");

        const oddsTypeGroups = [
            ["HAD"],
            ["HDC"],
            ["EDC"],
            ["HIL"],
            ["OOE"],
            ["CS"],
            ["TG"]
        ];

        const queryPromises = oddsTypeGroups.map(async (oddsTypes) => {
            try {
                console.log(`[ApiHKJC] Querying with odds types: ${oddsTypes.join(", ")}`);
                const matches = await queryHKJC(oddsTypes);
                console.log(`[ApiHKJC] Received ${matches.length} for ${oddsTypes.join(", ")}`);
                return matches;
            } catch (error) {
                console.warn(`[ApiHKJC] Error ${oddsTypes.join(", ")}:`, error);
                return [];
            }
        });

        const results = await Promise.all(queryPromises);

        // Merge matches by id and merge foPools so each match has HAD, HDC, HIL/TG etc.
        const allMatchesMap = new Map<string, HKJC>();
        results.forEach((matches) => {
            matches.forEach((match: HKJC) => {
                if (!match.id) return;
                const existing = allMatchesMap.get(match.id);
                if (existing) {
                    const existingTypes = new Set((existing.foPools || []).map((p: any) => p.oddsType));
                    (match.foPools || []).forEach((p: any) => {
                        if (!existingTypes.has(p.oddsType)) {
                            existing.foPools = existing.foPools || [];
                            existing.foPools.push(p);
                            existingTypes.add(p.oddsType);
                        }
                    });
                } else {
                    allMatchesMap.set(match.id, { ...match, foPools: match.foPools ? [...match.foPools] : [] });
                }
            });
        });

        const allMatches = Array.from(allMatchesMap.values());
        console.log("[ApiHKJC] Total unique matches after merging:", allMatches.length);

        if (allMatches.length > 0) {
            const dates = allMatches.map((m: HKJC): string | undefined => {
                const date = m.matchDate?.split('+')[0]?.split('T')[0];
                return date;
            }).filter((date: string | undefined): date is string => Boolean(date))
              .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
              .sort();
            if (dates.length > 0) {
                console.log("[ApiHKJC] Match dates range:", dates[0], "to", dates[dates.length - 1], "(" + dates.length + " unique dates)");
            }
        }

        return allMatches;
    } catch (error) {
        console.error("[ApiHKJC] Error fetching matches:", error);
        return [];
    }
};

const base = {
    "query": "query matchList($startIndex: Int, $endIndex: Int, $startDate: String, $endDate: String, $matchIds: [String], $tournIds: [String], $fbOddsTypes: [FBOddsType]!, $fbOddsTypesM: [FBOddsType]!, $inplayOnly: Boolean, $featuredMatchesOnly: Boolean, $frontEndIds: [String], $earlySettlementOnly: Boolean, $showAllMatch: Boolean) {\n  matches(startIndex: $startIndex, endIndex: $endIndex, startDate: $startDate, endDate: $endDate, matchIds: $matchIds, tournIds: $tournIds, fbOddsTypes: $fbOddsTypesM, inplayOnly: $inplayOnly, featuredMatchesOnly: $featuredMatchesOnly, frontEndIds: $frontEndIds, earlySettlementOnly: $earlySettlementOnly, showAllMatch: $showAllMatch) {\n    id\n    frontEndId\n    matchDate\n    kickOffTime\n    status\n    updateAt\n    sequence\n    esIndicatorEnabled\n    homeTeam {\n      id\n      name_en\n      name_ch\n    }\n    awayTeam {\n      id\n      name_en\n      name_ch\n    }\n    tournament {\n      id\n      frontEndId\n      nameProfileId\n      isInteractiveServiceAvailable\n      code\n      name_en\n      name_ch\n    }\n    isInteractiveServiceAvailable\n    inplayDelay\n    venue {\n      code\n      name_en\n      name_ch\n    }\n    tvChannels {\n      code\n      name_en\n      name_ch\n    }\n    liveEvents {\n      id\n      code\n    }\n    featureStartTime\n    featureMatchSequence\n    poolInfo {\n      normalPools\n      inplayPools\n      sellingPools\n      ntsInfo\n      entInfo\n      definedPools\n    }\n    runningResult {\n      homeScore\n      awayScore\n      corner\n      homeCorner\n      awayCorner\n    }\n    runningResultExtra {\n      homeScore\n      awayScore\n      corner\n      homeCorner\n      awayCorner\n    }\n    adminOperation {\n      remark {\n        typ\n      }\n    }\n    foPools(fbOddsTypes: $fbOddsTypes) {\n      id\n      status\n      oddsType\n      instNo\n      inplay\n      name_ch\n      name_en\n      updateAt\n      expectedSuspendDateTime\n      lines {\n        lineId\n        status\n        condition\n        main\n        combinations {\n          combId\n          str\n          status\n          offerEarlySettlement\n          currentOdds\n          selections {\n            selId\n            str\n            name_ch\n            name_en\n          }\n        }\n      }\n    }\n  }\n}",
    "variables": {
        "fbOddsTypes": ["HDC", "EDC"],
        "fbOddsTypesM": ["HDC", "EDC"],
        "featuredMatchesOnly": false,
        "startDate": null,
        "endDate": null,
        "tournIds": null,
        "matchIds": null,
        "tournId": null,
        "tournProfileId": null,
        "subType": null,
        "startIndex": 1,
        "endIndex": 120,
        "frontEndIds": null,
        "earlySettlementOnly": false,
        "showAllMatch": false,
        "tday": null,
        "tIdList": null
    }
}
    ;
