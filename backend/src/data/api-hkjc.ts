import API from "../api/api";
import { HKJC } from "../model/hkjc.model";

export const ApiHKJC = async (): Promise<HKJC[]> => {
    try {
        // Calculate date range: today to 7 days in the future
        // Use Hong Kong timezone to match HKJC's timezone
        const now = new Date();
        const hkOffset = 8 * 60; // Hong Kong is UTC+8
        const hkTime = new Date(now.getTime() + (hkOffset - now.getTimezoneOffset()) * 60000);
        
        const today = new Date(hkTime);
        today.setHours(0, 0, 0, 0);
        
        const futureDate = new Date(hkTime);
        futureDate.setDate(futureDate.getDate() + 7);
        futureDate.setHours(23, 59, 59, 999);
        
        const startDateStr = today.toISOString().split('T')[0];
        const endDateStr = futureDate.toISOString().split('T')[0];
        
        console.log("[ApiHKJC] Fetching matches from", startDateStr, "to", endDateStr, "(HK timezone)");
        
        const queryWithDates = {
            ...base,
            variables: {
                ...base.variables,
                startDate: startDateStr,
                endDate: endDateStr,
                endIndex: 500, // Increased from 120 to get more matches
                showAllMatch: true // Show all matches in the date range
            }
        };
        
        const res = await API.POST("https://info.cld.hkjc.com/graphql/base/", queryWithDates);
        if (res.status == 200) {
            const matches = res.data.data.matches || [];
            console.log("[ApiHKJC] Received", matches.length, "matches from HKJC API");
            // Log date range of matches
            if (matches.length > 0) {
                const dates = matches.map(m => {
                    const date = m.matchDate?.split('+')[0]?.split('T')[0];
                    return date;
                }).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).sort();
                if (dates.length > 0) {
                    console.log("[ApiHKJC] Match dates range:", dates[0], "to", dates[dates.length - 1], "(" + dates.length + " unique dates)");
                }
            }
            return matches;
        }
        console.warn("[ApiHKJC] API returned status", res.status);
        return [];
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