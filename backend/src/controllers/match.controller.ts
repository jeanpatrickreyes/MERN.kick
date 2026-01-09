import { API } from "../api/api";
import { Request, Response } from "express";
import { Daum, FootyLogic } from "model/footylogic.model";
import { FootyLogicDetails } from "model/footylogic_details.model";
import { AwayTeam, HomeTeam, RecentMatch } from "model/footylogic_last_games";
import { Match } from "model/match.model";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore'
import { db } from "../firebase/firebase";
import Global from "../ultis/global.ultis";
import Tables from "../ultis/tables.ultis";
import { ApiFixtureByDate } from "../data/api-fixture";
import { Predictions } from "../service/predictions";
import { matchTeamSimilarity } from "../service/similarity";
import { CalculationProbality } from "../service/calculationProbality";
import { ApiTopScoreInjured } from "../data/api-topscore-injured";
import { IaProbality } from "../service/ia_probability";
import { GetFixture } from "../service/getFixture";
import ExcelJS from 'exceljs';
import { ApiHKJC } from "../data/api-hkjc";
import { FootyLogicRecentForm } from "model/footylogic_recentform.model";
import { HKJC } from "model/hkjc.model";
import { format } from 'date-fns';
import { convertToSimplifiedChinese } from "../service/chinese-simplify";

class MatchController {
    static async getMatchResults() {
        console.log("START....")
        const matchesCol = collection(db, Tables.matches);
        const matchesSnapshot = await getDocs(matchesCol);
        const matchesList = matchesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                eventId: data.eventId,
                kickOffDate: data.kickOffDate
            };
        });

        const hkjc: HKJC[] = await ApiHKJC();
        if (hkjc.length == 0) {
            return;
        }

        const ids = hkjc.map((x) => x.id);
        let items = [];
        let itemsAdd = [];
        const result = await API.GET(Global.footylogicGames);
        if (result.status == 200) {

            const dataLogic: FootyLogic = result.data;
            const footylogic: Daum[] = dataLogic.data
                .map((daum) => {
                    const filteredEvents = daum.events
                        .filter((event) => ids.includes(event.eventId))
                        .sort((a, b) =>
                            new Date(b.kickOff.replace(" ", "T")).getTime() -
                            new Date(a.kickOff.replace(" ", "T")).getTime()
                        )
                    return {
                        ...daum,
                        events: filteredEvents
                    };
                })
                .filter((daum) => daum.events.length > 0)

            const validLabels = footylogic.map(d => d.label);
            const matchesWithInvalidDate = matchesList.filter(m => !validLabels.includes(m.kickOffDate));
            for (const match of matchesWithInvalidDate) {
                await deleteDoc(doc(db, Tables.matches, match.eventId));
            }

            console.log("STEP 1: ", footylogic);

            for (let d in footylogic) {
                try {
                    const daum = footylogic[d];
                    for (let match of matchesList.filter((x) => x.kickOffDate == daum.label)) {
                        const matchId = match.eventId;
                        if (daum.events.filter(ev => ev.eventId === matchId).length == 0) {
                            await deleteDoc(doc(db, Tables.matches, matchId));
                        }
                    }

                    console.log("STEP 2: ", daum.events);

                    for (let e in daum.events) {
                        const events = daum.events[e];
                        if (matchesList.filter((x) => x.id == events.eventId).length != 0) {
                            continue;
                        }
                        const resultDetails = await API.GET(Global.footylogicDetails + events.eventId);

                        if (resultDetails.status == 200 && resultDetails.data.statusCode == 200) {
                            const footylogicDetails: FootyLogicDetails = resultDetails.data;
                            let item: Match = events;

                            const hkjcIndex = hkjc.filter((x) => x.id == item.eventId)[0];
                            let condition = undefined;
                            if (hkjcIndex && hkjcIndex.foPools.length != 0) {
                                for (let foPools of hkjcIndex.foPools.filter((a) => a.oddsType == 'HDC')) {
                                    for (let lines of foPools.lines) {
                                        if (lines.condition && !condition) {
                                            condition = lines.condition;
                                        }
                                    }
                                }
                            }


                            if (condition) {
                                let more = condition.includes("+");
                                const regex = new RegExp(more ? "\\+" : "-", "g");
                                item.condition = condition + "," + condition.replace(regex, more ? "-" : "+");
                            }

                            if (footylogicDetails.data.awayTeamId && footylogicDetails.data.homeTeamId) {
                                item.awayTeamId = footylogicDetails.data.awayTeamId;
                                item.homeTeamId = footylogicDetails.data.homeTeamId;
                                item.awayTeamLogo = Global.footylogicImg + footylogicDetails.data.awayTeamLogo + ".png";
                                item.homeTeamLogo = Global.footylogicImg + footylogicDetails.data.homeTeamLogo + ".png";
                                item.awayTeamNameEn = footylogicDetails.data.awayTeamName;
                                item.homeTeamNameEn = footylogicDetails.data.homeTeamName;
                                const resultLastGames = await API.GET(Global.footylogicRecentForm + "&homeTeamId="
                                    + item.homeTeamId + "&awayTeamId=" + item.awayTeamId + "&marketGroupId=1&optionIdH=1&optionIdA=1&mode=1");
                                if (resultLastGames.status == 200 && resultLastGames.data.statusCode == 200) {
                                    const resultRecentForm: FootyLogicRecentForm = resultLastGames.data.data;
                                    const x = parseToInformationForm(resultRecentForm, item.homeTeamName ?? "", item.awayTeamName ?? "");
                                    item.lastGames = x;
                                }

                                const homeZh = item.homeTeamName ?? "";
                                const awayZh = item.awayTeamName ?? "";

                                const [homeZhCN, awayZhCN] = await Promise.all([
                                    convertToSimplifiedChinese(homeZh),
                                    convertToSimplifiedChinese(awayZh)
                                ]);

                                item.homeLanguages = {
                                    en: item.homeTeamNameEn || item.homeTeamName || "",
                                    zh: homeZh,
                                    zhCN: homeZhCN
                                };

                                item.awayLanguages = {
                                    en: item.awayTeamNameEn || item.awayTeamName || "",
                                    zh: awayZh,
                                    zhCN: awayZhCN
                                };

                                items.push(item);
                            }
                        }
                    }
                    // football API
                    console.log("STEP 3: ", items);
                    //
                    if (items.filter((i) => daum.label == i.kickOffDate).length != 0) {
                        for (let m in items.filter((i) => daum.label == i.kickOffDate)) {
                            const match = items.filter((i) => daum.label == i.kickOffDate)[m];
                            const fixture = await GetFixture(match);

                            if (fixture) {
                                if (!match.homeTeamLogo) {
                                    items.filter((i) => daum.label == i.kickOffDate)[m].homeTeamLogo = fixture.homeLo1go;
                                }
                                if (!match.awayTeamLogo) {
                                    items.filter((i) => daum.label == i.kickOffDate)[m].awayTeamLogo = fixture.awayLogo;
                                }
                                items.filter((i) => daum.label == i.kickOffDate)[m].league_id = fixture.league_id,
                                    items.filter((i) => daum.label == i.kickOffDate)[m].fixture_id = fixture.id;
                                if (fixture.id) {
                                    const predictions = await Predictions(fixture.id);
                                    if (predictions) {
                                        console.log(1);
                                        items.filter((i) => daum.label == i.kickOffDate)[m].predictions = predictions;
                                        const item = items.filter((i) => daum.label == i.kickOffDate)[m];

                                        let homeWinRate = predictions.homeWinRate;
                                        let awayWinRate = predictions.awayWinRate;
                                        let homeForm = item.homeForm;
                                        let awayForm = item.awayForm;
                                        let playersInjured = { home: [], away: [] };
                                        if (item.fixture_id && item.league_id && item.homeTeamId && item.awayTeamId) {
                                            playersInjured = await ApiTopScoreInjured(item.fixture_id, item.league_id, item.kickOff.split("-")[0], item.homeTeamId, item.awayTeamId);
                                        }

                                        const resultIa = await IaProbality(item, playersInjured);
                                        if (resultIa) {
                                            const total = resultIa.home + resultIa.away;
                                            const homeShare = resultIa.home / total;
                                            const awayShare = resultIa.away / total;
                                            const redistributedHome = resultIa.home + resultIa.draw * homeShare;
                                            const redistributedAway = resultIa.away + resultIa.draw * awayShare;
                                            items.filter((i) => daum.label == i.kickOffDate)[m].ia = {
                                                home: Number(redistributedHome.toFixed(2)),
                                                away: Number(redistributedAway.toFixed(2)),
                                                draw: resultIa.draw
                                            };

                                            const result2 = CalculationProbality(playersInjured, homeWinRate, awayWinRate, homeForm.split(","), awayForm.split(","));
                                            items.filter((i) => daum.label == i.kickOffDate)[m].ia2 = result2;
                                        } else {
                                            const result = CalculationProbality(playersInjured, homeWinRate, awayWinRate, homeForm.split(","), awayForm.split(","));
                                            items.filter((i) => daum.label == i.kickOffDate)[m].ia = result;
                                        }
                                        itemsAdd.push(match);
                                    }
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.log(error);
                    const daum = footylogic[d];
                    console.log(daum);
                }
            }
        }
        console.log("itmes", itemsAdd.length);
        const batch = writeBatch(db)
        itemsAdd.forEach(match => {
            const matchRef = doc(db, Tables.matches, match.eventId)
            batch.set(matchRef, match)
        })
        try {
            await batch.commit()
        } catch (error) {
            console.error('Erro:', error)
        }
    }

    static async get2Matchs(req: Request, res: Response) {
        try {
            const matchesCol = collection(db, Tables.matches);
            const matchesSnapshot = await getDocs(matchesCol);
            const matchesList = matchesSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    kickOff: data.kickOff,
                    ...data
                };
            });

            const sortedMatches = matchesList.sort((a, b) => {
                const dateA = new Date(a.kickOff);
                const dateB = new Date(b.kickOff);
                return dateA.getTime() - dateB.getTime();
            });

            const recentTwoMatches = sortedMatches.slice(0, 2).map(match => ({
                ...match,
                lastGames: null,
                ia2: null,
                ia: null,
                predictions: null,
                fixture_id: null
            }));

            return res.json(recentTwoMatches);
        } catch (error) {
            return res.status(500).json({ error: error });
        }
    }


    static async getMatchs(req: Request, res: Response) {
        try {
            const refresh = req.query.refresh === 'true';
            console.log("[getMatchs] Request received, refresh:", refresh);
            
            // First, try to get matches from database
            if (!refresh) {
                const matchesCol = collection(db, Tables.matches);
                const matchesSnapshot = await getDocs(matchesCol);
                
                if (!matchesSnapshot.empty) {
                    const matchesList = matchesSnapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            kickOff: data.kickOff,
                            ...data
                        };
                    });

                    // Sort by kickOff date
                    const sortedMatches = matchesList.sort((a, b) => {
                        const dateA = new Date(a.kickOff);
                        const dateB = new Date(b.kickOff);
                        return dateA.getTime() - dateB.getTime();
                    });

                    console.log("[getMatchs] Returning", sortedMatches.length, "matches from database");
                    return res.json(sortedMatches);
                }
                console.log("[getMatchs] No matches in database, fetching from APIs...");
            } else {
                console.log("[getMatchs] Refresh requested, fetching from APIs...");
            }
            
            // If DB is empty or refresh requested, fetch from APIs
            // Fetch from HKJC API
            const hkjc: HKJC[] = await ApiHKJC();
            console.log("[getMatchs] HKJC API returned", hkjc.length, "matches");
            
            if (hkjc.length === 0) {
                return res.json([]);
            }

            const ids = hkjc.map((x) => x.id);
            
            // Fetch from FootyLogic API
            const result = await API.GET(Global.footylogicGames);
            console.log("[getMatchs] FootyLogic API status:", result.status);
            
            if (result.status !== 200) {
                return res.status(500).json({ error: "Failed to fetch matches from FootyLogic API" });
            }

            const dataLogic: FootyLogic = result.data;
            const footylogic: Daum[] = dataLogic.data
                .map((daum) => {
                    const filteredEvents = daum.events
                        .filter((event) => ids.includes(event.eventId))
                        .sort((a, b) =>
                            new Date(b.kickOff.replace(" ", "T")).getTime() -
                            new Date(a.kickOff.replace(" ", "T")).getTime()
                        );
                    return {
                        ...daum,
                        events: filteredEvents
                    };
                })
                .filter((daum) => daum.events.length > 0);

            // Delete old matches that are no longer in the API response
            console.log("[getMatchs] Checking for old matches to delete...");
            const existingMatchesCol = collection(db, Tables.matches);
            const existingMatchesSnapshot = await getDocs(existingMatchesCol);
            const existingMatchesList = existingMatchesSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    eventId: data.eventId,
                    kickOffDate: data.kickOffDate
                };
            });

            // Get valid date labels from footylogic
            const validLabels = footylogic.map(d => d.label);
            
            // Delete matches with invalid dates (dates not in current API response)
            const matchesWithInvalidDate = existingMatchesList.filter(m => !validLabels.includes(m.kickOffDate));
            for (const match of matchesWithInvalidDate) {
                console.log("[getMatchs] Deleting match with invalid date:", match.eventId, match.kickOffDate);
                await deleteDoc(doc(db, Tables.matches, match.eventId));
            }

            // Delete matches that are no longer in the events list for their date
            for (const daum of footylogic) {
                const existingMatchesForDate = existingMatchesList.filter((x) => x.kickOffDate === daum.label);
                const validEventIds = daum.events.map(ev => ev.eventId);
                
                for (const match of existingMatchesForDate) {
                    if (!validEventIds.includes(match.eventId)) {
                        console.log("[getMatchs] Deleting match no longer in API:", match.eventId);
                        await deleteDoc(doc(db, Tables.matches, match.eventId));
                    }
                }
            }

            // Flatten matches from all days
            const allMatches: Match[] = [];
            const matchDetailsPromises: Promise<any>[] = [];
            
            // First, create all match objects
            for (const daum of footylogic) {
                for (const event of daum.events) {
                    const hkjcMatch = hkjc.find((x) => x.id === event.eventId);
                    const match: Match = {
                        ...event,
                        id: event.eventId,
                        eventId: event.eventId,
                        kickOffDate: daum.label,
                    } as Match;

                    // Add HKJC data if available (HKJC has Chinese names)
                    if (hkjcMatch) {
                        if (hkjcMatch.homeTeam?.name_ch) {
                            match.homeTeamName = hkjcMatch.homeTeam.name_ch;
                        }
                        if (hkjcMatch.awayTeam?.name_ch) {
                            match.awayTeamName = hkjcMatch.awayTeam.name_ch;
                        }
                    }

                    allMatches.push(match);
                    
                    // Add promise to fetch details in parallel
                    matchDetailsPromises.push(
                        API.GET(Global.footylogicDetails + event.eventId)
                            .then(resultDetails => ({ eventId: event.eventId, resultDetails }))
                            .catch(error => ({ eventId: event.eventId, error }))
                    );
                }
            }

            // Fetch all match details in parallel
            console.log(`[getMatchs] Fetching details for ${matchDetailsPromises.length} matches in parallel...`);
            const detailsResults = await Promise.all(matchDetailsPromises);

            // Map details to matches
            const detailsMap = new Map();
            detailsResults.forEach(({ eventId, resultDetails, error }) => {
                if (error) {
                    console.error(`[getMatchs] Error fetching details for match ${eventId}:`, error);
                    return;
                }
                if (resultDetails.status === 200 && resultDetails.data.statusCode === 200) {
                    detailsMap.set(eventId, resultDetails.data.data);
                }
            });

            // Apply details to matches
            allMatches.forEach(match => {
                const footylogicDetails = detailsMap.get(match.eventId);
                if (footylogicDetails) {
                    if (footylogicDetails.homeTeamLogo && footylogicDetails.awayTeamLogo) {
                        match.homeTeamLogo = Global.footylogicImg + footylogicDetails.homeTeamLogo + ".png";
                        match.awayTeamLogo = Global.footylogicImg + footylogicDetails.awayTeamLogo + ".png";
                    }
                    if (footylogicDetails.homeTeamName) {
                        match.homeTeamNameEn = footylogicDetails.homeTeamName;
                    }
                    if (footylogicDetails.awayTeamName) {
                        match.awayTeamNameEn = footylogicDetails.awayTeamName;
                    }
                    if (footylogicDetails.homeTeamId) {
                        match.homeTeamId = footylogicDetails.homeTeamId;
                    }
                    if (footylogicDetails.awayTeamId) {
                        match.awayTeamId = footylogicDetails.awayTeamId;
                    }
                }
            });

            // Save matches to database
            console.log("[getMatchs] Saving", allMatches.length, "matches to database...");
            const batch = writeBatch(db);
            allMatches.forEach(match => {
                const matchRef = doc(db, Tables.matches, match.eventId);
                batch.set(matchRef, match);
            });
            try {
                await batch.commit();
                console.log("[getMatchs] Successfully saved matches to database");
            } catch (error) {
                console.error("[getMatchs] Error saving matches to database:", error);
            }

            console.log("[getMatchs] Returning", allMatches.length, "matches from APIs");
            return res.json(allMatches);
        } catch (error) {
            console.error("[getMatchs] Error fetching matches:", error);
            return res.status(500).json({ error: error });
        }
    }

    static async getMatchDetails(req: Request, res: Response) {
        const { id } = req.params; // id is eventId
        const refresh = req.query.refresh === 'true';
        console.log("[getMatchDetails] Fetching match details for eventId:", id, "refresh:", refresh);
        try {
            // First, try to get match from database
            let existingMatchData: Match | null = null;
            if (!refresh) {
                const matchRef = doc(db, Tables.matches, id);
                const matchSnap = await getDoc(matchRef);
                
                if (matchSnap.exists()) {
                    existingMatchData = matchSnap.data() as Match;
                    // Check if match has all required fields (especially lastGames for details page)
                    if (existingMatchData.lastGames && existingMatchData.lastGames.homeTeam && existingMatchData.lastGames.awayTeam) {
                        console.log("[getMatchDetails] Returning complete match from database");
                        return res.json(existingMatchData);
                    } else {
                        console.log("[getMatchDetails] Match found in database but missing lastGames, will fetch from APIs to complete...");
                        // Continue to fetch from API to complete the data, but use existing matchData as base
                    }
                } else {
                    console.log("[getMatchDetails] Match not found in database, fetching from APIs...");
                }
            } else {
                console.log("[getMatchDetails] Refresh requested, fetching from APIs...");
            }
            
            // If not in DB or refresh requested, fetch from APIs
            // Parallelize independent API calls for better performance
            console.log("[getMatchDetails] Starting parallel API calls...");
            const [resultDetails, gamesResult, hkjcData] = await Promise.all([
                API.GET(Global.footylogicDetails + id).catch(err => ({ status: 500, data: null, error: err })),
                API.GET(Global.footylogicGames).catch(err => ({ status: 500, data: null, error: err })),
                ApiHKJC().catch(err => { console.error("[getMatchDetails] Error fetching HKJC:", err); return []; })
            ]);
            
            if (resultDetails.status !== 200 || !resultDetails.data || resultDetails.data.statusCode !== 200) {
                console.error("[getMatchDetails] FootyLogic Details API error:", {
                    status: resultDetails.status,
                    statusCode: resultDetails.data?.statusCode,
                    data: resultDetails.data
                });
                return res.status(404).json({ error: 'Match not found' });
            }

            const footylogicDetails = resultDetails.data.data;
            
            if (!footylogicDetails) {
                console.error("[getMatchDetails] FootyLogic details data is null/undefined");
                return res.status(404).json({ error: 'Match details not found' });
            }
            
            // Extract match event from games result
            let matchEvent: any = null;
            if (gamesResult.status === 200 && gamesResult.data && gamesResult.data.data) {
                for (const daum of gamesResult.data.data) {
                    if (daum.events && Array.isArray(daum.events)) {
                        const event = daum.events.find((e: any) => e.eventId === id);
                        if (event) {
                            matchEvent = event;
                            break;
                        }
                    }
                }
            }

            // If matchEvent not found, use data from details API
            if (!matchEvent) {
                console.warn("[getMatchDetails] Match event not found in games API, using details data only");
                matchEvent = {
                    eventId: id,
                    kickOff: footylogicDetails.kickOffTime || "",
                    kickOffDate: footylogicDetails.kickOffTime ? footylogicDetails.kickOffTime.split(' ')[0] : "",
                    homeTeamName: footylogicDetails.homeTeamName,
                    awayTeamName: footylogicDetails.awayTeamName,
                    competitionName: footylogicDetails.competitionName || "",
                };
            }

            // Build match data from API responses
            // If we have existing matchData from DB, merge it; otherwise create new
            let matchDataFromAPI: Match = {
                ...matchEvent,
                id: id,
                eventId: id,
                homeTeamLogo: footylogicDetails.homeTeamLogo 
                    ? Global.footylogicImg + footylogicDetails.homeTeamLogo + ".png" 
                    : undefined,
                awayTeamLogo: footylogicDetails.awayTeamLogo 
                    ? Global.footylogicImg + footylogicDetails.awayTeamLogo + ".png" 
                    : undefined,
                homeTeamNameEn: footylogicDetails.homeTeamName || matchEvent.homeTeamName,
                awayTeamNameEn: footylogicDetails.awayTeamName || matchEvent.awayTeamName,
                homeTeamId: footylogicDetails.homeTeamId,
                awayTeamId: footylogicDetails.awayTeamId,
            } as Match;
            
            // Merge with existing matchData from DB if it exists (preserve DB data, override with API data)
            const matchData: Match = existingMatchData ? { ...existingMatchData, ...matchDataFromAPI } : matchDataFromAPI;

            // Apply HKJC data for Chinese names (already fetched in parallel)
            const hkjcMatch = hkjcData.find((x) => x.id === id);
            if (hkjcMatch) {
                if (hkjcMatch.homeTeam?.name_ch) {
                    matchData.homeTeamName = hkjcMatch.homeTeam.name_ch;
                }
                if (hkjcMatch.awayTeam?.name_ch) {
                    matchData.awayTeamName = hkjcMatch.awayTeam.name_ch;
                }
            }

            // Add language support (use existing if available, otherwise convert)
            const homeZh = matchData.homeTeamName ?? "";
            const awayZh = matchData.awayTeamName ?? "";
            
            // Use existing language data if available, otherwise convert
            let homeZhCN = existingMatchData?.homeLanguages?.zhCN || homeZh;
            let awayZhCN = existingMatchData?.awayLanguages?.zhCN || awayZh;
            
            // Only convert if not already in DB (parallel with other operations)
            if (!existingMatchData?.homeLanguages?.zhCN || !existingMatchData?.awayLanguages?.zhCN) {
                try {
                    const [homeZhCNResult, awayZhCNResult] = await Promise.all([
                        convertToSimplifiedChinese(homeZh).catch(() => homeZh),
                        convertToSimplifiedChinese(awayZh).catch(() => awayZh)
                    ]);
                    homeZhCN = homeZhCNResult || homeZh;
                    awayZhCN = awayZhCNResult || awayZh;
                } catch (error) {
                    console.error("[getMatchDetails] Error converting to simplified Chinese:", error);
                    // Use original names if conversion fails
                }
            }

            matchData.homeLanguages = {
                en: matchData.homeTeamNameEn || matchData.homeTeamName || "",
                zh: homeZh,
                zhCN: homeZhCN
            };

            matchData.awayLanguages = {
                en: matchData.awayTeamNameEn || matchData.awayTeamName || "",
                zh: awayZh,
                zhCN: awayZhCN
            };

            // Determine what needs to be fetched
            const needsFixture = !matchData.fixture_id;
            const needsPredictions = !matchData.predictions || !matchData.predictions.homeWinRate;
            const needsLastGames = !matchData.lastGames || !matchData.lastGames.homeTeam || !matchData.lastGames.awayTeam;
            
            // Prepare parallel fetch promises for what's needed
            const fetchPromises: Promise<any>[] = [];
            
            // Fetch fixture information if needed
            let fixture_id = matchData.fixture_id;
            if (needsFixture) {
                fetchPromises.push(
                    (async () => {
                        try {
                            const fixture = await GetFixture(matchData);
                            if (fixture && fixture.id) {
                                return { type: 'fixture', data: fixture };
                            }
                        } catch (error) {
                            console.error("[getMatchDetails] Error in GetFixture:", error);
                        }
                        return null;
                    })()
                );
            }
            
            // Fetch last games if needed (can be done in parallel with fixture)
            if (needsLastGames && matchData.homeTeamId && matchData.awayTeamId) {
                fetchPromises.push(
                    API.GET(Global.footylogicRecentForm + "&homeTeamId="
                        + matchData.homeTeamId + "&awayTeamId=" + matchData.awayTeamId + "&marketGroupId=1&optionIdH=1&optionIdA=1&mode=1")
                        .then(result => ({ type: 'lastGames', data: result }))
                        .catch(error => {
                            console.error("[getMatchDetails] Error fetching last games:", error);
                            return null;
                        })
                );
            }
            
            // Execute parallel fetches
            const fetchResults = await Promise.all(fetchPromises);
            
            // Process fixture results
            for (const result of fetchResults) {
                if (result && result.type === 'fixture' && result.data) {
                    const fixture = result.data;
                    if (fixture.id) {
                        if (!matchData.homeTeamLogo) {
                            matchData.homeTeamLogo = fixture.homeLogo;
                        }
                        if (!matchData.awayTeamLogo) {
                            matchData.awayTeamLogo = fixture.awayLogo;
                        }
                        matchData.league_id = fixture.league_id;
                        matchData.fixture_id = fixture.id;
                        fixture_id = fixture.id;
                    }
                }
            }
            
            // If still no fixture_id, try alternative method
            if (!fixture_id && matchData.kickOffDate) {
                try {
                    const [month, day, year] = matchData.kickOffDate.split("/");
                    if (month && day && year) {
                        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                        let team = await ApiFixtureByDate(formattedDate);
                        
                        if (team && Array.isArray(team) && team.length > 0) {
                            const fixture = await matchTeamSimilarity(team, matchData.homeTeamNameEn ?? "", matchData.awayTeamNameEn ?? "");
                            if (fixture && fixture.id) {
                                if (!matchData.homeTeamLogo && fixture.homeLogo) {
                                    matchData.homeTeamLogo = fixture.homeLogo;
                                }
                                if (!matchData.awayTeamLogo && fixture.awayLogo) {
                                    matchData.awayTeamLogo = fixture.awayLogo;
                                }
                                if (fixture.league_id) {
                                    matchData.league_id = fixture.league_id;
                                }
                                if (fixture.id) {
                                    matchData.fixture_id = fixture.id;
                                    fixture_id = fixture.id;
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error("[getMatchDetails] Error fetching fixture by date:", error);
                }
            }
            
            // Process last games results
            for (const result of fetchResults) {
                if (result && result.type === 'lastGames' && result.data) {
                    const resultLastGames = result.data;
                    if (resultLastGames.status === 200 && resultLastGames.data.statusCode === 200) {
                        const resultRecentForm = resultLastGames.data.data;
                        const lastGames = parseToInformationForm(resultRecentForm, matchData.homeTeamName ?? "", matchData.awayTeamName ?? "");
                        matchData.lastGames = lastGames;
                    }
                }
            }
            
            // Fetch predictions only if needed and we have fixture_id
            if (needsPredictions && fixture_id) {
                try {
                    const predictions = await Predictions(fixture_id);
                    if (predictions) {
                        matchData.predictions = predictions;
                    }
                } catch (error) {
                    console.error("[getMatchDetails] Error fetching predictions:", error);
                }
            } else if (existingMatchData?.predictions) {
                // Preserve predictions from existing data
                matchData.predictions = existingMatchData.predictions;
            }

            // Preserve ia from existing data if it exists
            if (existingMatchData?.ia) {
                matchData.ia = existingMatchData.ia;
            }

            let homeWin = Math.round(matchData.ia?.home ?? matchData.predictions?.homeWinRate ?? 0);
            let awayWin = Math.round(matchData.ia?.away ?? matchData.predictions?.awayWinRate ?? 0);

            if (homeWin >= awayWin) {
                awayWin = Math.abs(homeWin - 100);
            } else {
                homeWin = Math.abs(awayWin - 100);
            }

            if (matchData.ia?.home && matchData.ia?.away) {
                matchData.ia.home = homeWin;
                matchData.ia.away = awayWin;
            } else if (matchData.predictions?.homeWinRate && matchData.predictions?.awayWinRate) {
                matchData.predictions.homeWinRate = homeWin;
                matchData.predictions.awayWinRate = awayWin;
            }

            // Save match to database
            try {
                const matchRef = doc(db, Tables.matches, id);
                await setDoc(matchRef, matchData, { merge: true });
                console.log("[getMatchDetails] Successfully saved match to database");
            } catch (error) {
                console.error("[getMatchDetails] Error saving match to database:", error);
            }

            return res.json(matchData);
        } catch (error: any) {
            console.error('[getMatchDetails] Error fetching match details:', error);
            console.error('[getMatchDetails] Error stack:', error?.stack);
            console.error('[getMatchDetails] Error message:', error?.message);
            return res.status(500).json({ 
                error: 'Internal server error',
                message: error?.message || 'Unknown error',
                eventId: id
            });
        }
    }


    static async analyzeMatch(req: Request, res: Response) {
        const { id } = req.params;

        try {
            const matchRef = doc(db, Tables.matches, id);
            const matchSnap = await getDoc(matchRef)
            if (!matchSnap.exists()) {
                return res.status(404).json({ error: 'Match not found' });
            }
            let matchData = matchSnap.data() as Match;
            if (matchData.predictions) {
                let homeWinRate = matchData.predictions.homeWinRate;
                let awayWinRate = matchData.predictions.awayWinRate;
                let homeForm = matchData.homeForm;
                let awayForm = matchData.awayForm;
                let playersInjured = { home: [], away: [] };
                if (matchData.fixture_id && matchData.league_id && matchData.homeTeamId && matchData.awayTeamId) {
                    playersInjured = await ApiTopScoreInjured(matchData.fixture_id, matchData.league_id, matchData.kickOff.split("-")[0], matchData.homeTeamId, matchData.awayTeamId);
                }
                const resultIa = await IaProbality(matchData, playersInjured);
                if (resultIa) {
                    const total = resultIa.home + resultIa.away;
                    const homeShare = resultIa.home / total;
                    const awayShare = resultIa.away / total;
                    const redistributedHome = resultIa.home + resultIa.draw * homeShare;
                    const redistributedAway = resultIa.away + resultIa.draw * awayShare;
                    matchData.ia = {
                        home: Number(redistributedHome.toFixed(2)),
                        away: Number(redistributedAway.toFixed(2)),
                        draw: resultIa.draw
                    };
                } else {
                    const result = CalculationProbality(playersInjured, homeWinRate, awayWinRate, homeForm.split(","), awayForm.split(","));
                    matchData.ia = result;
                }
                await setDoc(matchRef, matchData, { merge: true });
                return res.json(matchData.ia);
            }

            return res.status(404).json({ error: 'predictions not found' });

        } catch (error: any) {
            console.error('Error analyzing match:', error.response?.data || error.message);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async excelGenerate(req: Request, res: Response) {
        const { id } = req.params;
        try {
            const matchRef = doc(db, Tables.matches, id);
            const matchSnap = await getDoc(matchRef);

            if (!matchSnap.exists()) {
                return res.status(404).json({ error: 'Match not found' });
            }
            const data = matchSnap.data();
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Match Info');

            const fillTeamSection = (title: string, teamData: any, winRate: number, startRow: number) => {
                const recentMatches = teamData.recentMatch || [];

                sheet.mergeCells(`A${startRow}:B${startRow}`);
                sheet.getCell(`A${startRow}`).value = title;
                sheet.getCell(`A${startRow}`).font = { bold: true, size: 14 };
                let row = startRow + 1;

                sheet.getCell(`A${row}`).value = '';
                sheet.getCell(`B${row}`).value = title.includes('Home') ? data.homeTeamName : data.awayTeamName;
                row++;

                sheet.getCell(`A${row}`).value = 'Win Rate: ';
                sheet.getCell(`B${row}`).value = `${winRate.toFixed(2)}%`;
                row++;

                sheet.getCell(`A${row}`).value = 'Form: ';
                sheet.getCell(`B${row}`).value = teamData.teamForm;
                row += 2;

                sheet.getCell(`A${row}`).value = 'Recent Matches: ';
                sheet.getCell(`A${row}`).font = { bold: true };
                row++;

                sheet.getRow(row).values = ['Main Team', 'Other Team', 'Result', 'Competition'];
                sheet.getRow(row).font = { bold: true };
                row++;

                for (const match of recentMatches) {
                    sheet.getRow(row).values = [
                        match.homeTeamName,
                        match.score,
                        match.awayTeamName,
                        match.result,
                        match.competitionName
                    ];
                    row++;
                }

                return row + 2;
            };

            const homeWin = data.ia && data.ia.home ? data.ia.home : data.predictions.homeWinRate;
            const awayWin = data.ia && data.ia.away ? data.ia.away : data.predictions.awayWinRate;
            let nextRow = 1;
            nextRow = fillTeamSection('Home Team: ', data.lastGames.homeTeam, homeWin, nextRow);
            fillTeamSection('Away Team: ', data.lastGames.awayTeam, awayWin, nextRow);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=match_${id}.xlsx`);

            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            console.error('Error generating Excel:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }


    static async excelGenerateAll(req: Request, res: Response) {
        try {
            const matchesCol = collection(db, Tables.matches);
            const matchesSnapshot = await getDocs(matchesCol);

            if (matchesSnapshot.empty) {
                return res.status(404).json({ error: 'No matches found' });
            }

            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('All Matches');

            const matchesByDate: { [date: string]: Match[] } = {};

            for (const docSnap of matchesSnapshot.docs) {
                const data = docSnap.data() as Match;

                if (!data.kickOff) continue;

                const date = format(new Date(data.kickOff), 'yyyy/MM/dd');
                if (!matchesByDate[date]) matchesByDate[date] = [];
                matchesByDate[date].push(data);
            }

            let currentRow = 1;

            for (const date of Object.keys(matchesByDate).sort()) {
                sheet.getCell(`A${currentRow}`).value = date.toString().replace("/", ".").replace("/", ".");
                currentRow++;
                currentRow++;

                for (const match of matchesByDate[date]) {
                    const homeTeam = match.homeTeamName ?? '';
                    const awayTeam = match.awayTeamName ?? '';
                    const homeWin = match.ia?.home ?? match.predictions?.homeWinRate ?? 0;
                    const awayWin = match.ia?.away ?? match.predictions?.awayWinRate ?? 0;
                    sheet.getCell(`A${currentRow}`).value = homeTeam;
                    sheet.getCell(`B${currentRow}`).value = match.condition ? match.condition.split(",")[0] : " - ";
                    sheet.getCell(`C${currentRow}`).value = Math.round(homeWin) + '%';
                    currentRow++;
                    sheet.getCell(`A${currentRow}`).value = awayTeam;
                    sheet.getCell(`B${currentRow}`).value = match.condition ? match.condition.split(",")[1] : " - ";
                    sheet.getCell(`C${currentRow}`).value = Math.round(awayWin) + '%';
                    currentRow++;
                    currentRow++;
                }
            }

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=all_matches.xlsx');

            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            console.error('Error generating Excel:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }


}


function parseToInformationForm(resultRecentForm: FootyLogicRecentForm, home: string, away: string) {
    const matchesAway = resultRecentForm.recent8Results.awayTeam;
    const teamFormAway = matchesAway.map(m => m.fullTimeResult).join(",");
    const countResults = (res: string) =>
        matchesAway.filter(m => m.fullTimeResult === res).length;
    const recentMatch: RecentMatch[] = matchesAway.map(match => ({
        homeTeamName: away,
        awayTeamName: match.oppTeamName,
        kickOff: match.kickOff,
        competitionName: match.competitionName,
        score: match.fullTimeScore,
        result: match.fullTimeResult,
    }));
    const awayTeam: AwayTeam = {
        recentMatch,
        teamPlayed: matchesAway.length.toString(),
        teamWin: countResults("W").toString(),
        teamDraw: countResults("D").toString(),
        teamLoss: countResults("L").toString(),
        teamGoalsFor: matchesAway.reduce((sum, m) => {
            const [gf, ga] = m.fullTimeScore.split(":").map(Number);
            return sum + gf;
        }, 0).toString(),
        teamGoalsAway: matchesAway.reduce((sum, m) => {
            const [gf, ga] = m.fullTimeScore.split(":").map(Number);
            return sum + ga;
        }, 0).toString(),
        teamForm: teamFormAway,
    };

    const matchesHome = resultRecentForm.recent8Results.homeTeam;
    const teamFormHome = matchesHome.map(m => m.fullTimeResult).join(",");
    const countResultsHome = (res: string) =>
        matchesHome.filter(m => m.fullTimeResult === res).length;
    const recentMatchHome: RecentMatch[] = matchesHome.map(match => ({
        homeTeamName: home,
        awayTeamName: match.oppTeamName,
        kickOff: match.kickOff,
        competitionName: match.competitionName,
        score: match.fullTimeScore,
        result: match.fullTimeResult,
    }));
    const homeTeam: HomeTeam = {
        recentMatch: recentMatchHome,
        teamPlayed: matchesHome.length.toString(),
        teamWin: countResultsHome("W").toString(),
        teamDraw: countResultsHome("D").toString(),
        teamLoss: countResultsHome("L").toString(),
        teamGoalsFor: matchesHome.reduce((sum, m) => {
            const [gf, ga] = m.fullTimeScore.split(":").map(Number);
            return sum + gf;
        }, 0).toString(),
        teamGoalsAway: matchesHome.reduce((sum, m) => {
            const [gf, ga] = m.fullTimeScore.split(":").map(Number);
            return sum + ga;
        }, 0).toString(),
        teamForm: teamFormHome,
    };
    return {
        homeTeam: homeTeam,
        awayTeam: awayTeam
    }
}

export default MatchController;