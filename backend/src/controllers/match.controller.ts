import { API } from "../api/api";
import { Request, Response } from "express";
import { Daum, FootyLogic } from "model/footylogic.model";
import { FootyLogicDetails } from "model/footylogic_details.model";
import { AwayTeam, HomeTeam, RecentMatch } from "model/footylogic_last_games";
import { Match } from "model/match.model";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, writeBatch } from '../database/db'
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
        const methodStartTime = Date.now();
        try {
            const refresh = req.query.refresh === 'true';
            console.log("========================================");
            console.log("[getMatchs] Request received");
            console.log("[getMatchs] Refresh parameter:", refresh);
            console.log("[getMatchs] Request origin:", req.headers.origin);
            console.log("[getMatchs] Request method:", req.method);
            console.log("========================================");
            
            // Always fetch from HKJC API to check for updates and cleanup old matches
            console.log("[getMatchs] ========================================");
            console.log("[getMatchs] Fetching from HKJC API...");
            const hkjcStartTime = Date.now();
            const hkjc: HKJC[] = await ApiHKJC();
            const hkjcDuration = Date.now() - hkjcStartTime;
            console.log("[getMatchs] HKJC API returned", hkjc.length, "matches in", hkjcDuration + "ms");
            
            // Log detailed date information from HKJC API
            if (hkjc.length > 0) {
                const hkjcDates = hkjc.map(m => {
                    if (!m.matchDate) return null;
                    return m.matchDate.split('+')[0].split('T')[0];
                }).filter((date): date is string => date !== null);
                
                const uniqueDates = [...new Set(hkjcDates)].sort();
                console.log("[getMatchs] ========================================");
                console.log("[getMatchs] HKJC API DATE ANALYSIS:");
                console.log("[getMatchs] Total unique dates:", uniqueDates.length);
                console.log("[getMatchs] Date range:", uniqueDates[0], "to", uniqueDates[uniqueDates.length - 1]);
                console.log("[getMatchs] All unique dates:", uniqueDates);
                
                // Show distribution of matches per date
                const dateDistribution = uniqueDates.map(date => ({
                    date,
                    count: hkjc.filter(m => {
                        const matchDate = m.matchDate?.split('+')[0].split('T')[0];
                        return matchDate === date;
                    }).length
                }));
                console.log("[getMatchs] Matches per date:", dateDistribution);
                console.log("[getMatchs] ========================================");
            }
            
            console.log("[getMatchs] HKJC matches sample:", hkjc.slice(0, 2).map(m => ({ 
                id: m.id, 
                home: m.homeTeam?.name_en, 
                away: m.awayTeam?.name_en,
                matchDate: m.matchDate,
                kickOffTime: m.kickOffTime
            })));
            
            // Log dates from HKJC API to see what dates are available
            const hkjcDates = [...new Set(hkjc.map(m => {
                if (!m.matchDate) return null;
                return m.matchDate.split('+')[0].split('T')[0];
            }).filter(Boolean))].sort();
            console.log("[getMatchs] Dates in HKJC API response:", hkjcDates);
            console.log("[getMatchs] HKJC API date distribution:", hkjcDates.map(date => ({
                date,
                count: hkjc.filter(m => {
                    const matchDate = m.matchDate?.split('+')[0].split('T')[0];
                    return matchDate === date;
                }).length
            })));
            
            if (hkjc.length === 0) {
                console.log("[getMatchs] No matches from HKJC API");
                
                // Check if we have matches in database to return as fallback
                console.log("[getMatchs] Checking database for existing matches as fallback...");
                const matchesCol = collection(db, Tables.matches);
                const matchesSnapshot = await getDocs(matchesCol);
                const dbMatches = matchesSnapshot.empty ? [] : matchesSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        kickOff: data.kickOff,
                        ...data
                    };
                });
                
                // Log ALL database matches (including past ones) to see what's stored
                console.log("[getMatchs] ========================================");
                console.log("[getMatchs] ALL DATABASE MATCHES (INCLUDING PAST):");
                console.log("[getMatchs] Total matches in database:", dbMatches.length);
                if (dbMatches.length > 0) {
                    const allDbDates = [...new Set(dbMatches.map((m: any) => {
                        if (!m.kickOff) return null;
                        const datePart = m.kickOff.split(' ')[0].split('T')[0];
                        return datePart;
                    }).filter(Boolean))].sort();
                    console.log("[getMatchs] Total unique dates in database (all matches):", allDbDates.length);
                    if (allDbDates.length > 0) {
                        console.log("[getMatchs] Date range in database:", allDbDates[0], "to", allDbDates[allDbDates.length - 1]);
                        console.log("[getMatchs] All dates in database:", allDbDates);
                        console.log("[getMatchs] Matches per date (all matches):", allDbDates.map(date => ({
                            date,
                            count: dbMatches.filter((m: any) => {
                                if (!m.kickOff) return false;
                                const datePart = m.kickOff.split(' ')[0].split('T')[0];
                                return datePart === date;
                            }).length
                        })));
                    }
                }
                console.log("[getMatchs] ========================================");
                
                if (dbMatches.length > 0) {
                    // Log database matches analysis
                    console.log("[getMatchs] ========================================");
                    console.log("[getMatchs] DATABASE MATCHES ANALYSIS:");
                    const dbDates = [...new Set(dbMatches.map((m: any) => {
                        if (!m.kickOff) return null;
                        const datePart = m.kickOff.split(' ')[0].split('T')[0];
                        return datePart;
                    }).filter(Boolean))].sort();
                    console.log("[getMatchs] Total matches in database:", dbMatches.length);
                    console.log("[getMatchs] Total unique dates in database:", dbDates.length);
                    if (dbDates.length > 0) {
                        console.log("[getMatchs] Date range in database:", dbDates[0], "to", dbDates[dbDates.length - 1]);
                        console.log("[getMatchs] All dates in database:", dbDates);
                        console.log("[getMatchs] Matches per date in database:", dbDates.map(date => ({
                            date,
                            count: dbMatches.filter((m: any) => {
                                if (!m.kickOff) return false;
                                const datePart = m.kickOff.split(' ')[0].split('T')[0];
                                return datePart === date;
                            }).length
                        })));
                    }
                    console.log("[getMatchs] ========================================");
                    
                    // Filter out past matches (like 111 project - only show future matches)
                    const now = new Date();
                    // Subtract 1 hour to be less strict - show matches from today even if they're slightly in the past
                    const cutoffTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
                    const futureMatches = dbMatches.filter((match: any) => {
                        if (!match.kickOff) return false;
                        try {
                            let kickOffTime: Date;
                            if (match.kickOff.includes('T')) {
                                kickOffTime = new Date(match.kickOff);
                            } else {
                                const normalized = match.kickOff.replace(' ', 'T');
                                kickOffTime = new Date(normalized);
                            }
                            if (isNaN(kickOffTime.getTime())) {
                                return false;
                            }
                            // Use cutoffTime (1 hour ago) instead of now to be less strict
                            return kickOffTime >= cutoffTime;
                        } catch (error) {
                            return false;
                        }
                    });

                    // Log future matches analysis
                    const futureDates = [...new Set(futureMatches.map((m: any) => {
                        if (!m.kickOff) return null;
                        const datePart = m.kickOff.split(' ')[0].split('T')[0];
                        return datePart;
                    }).filter(Boolean))].sort();
                    console.log("[getMatchs] Future matches after filtering:", futureMatches.length);
                    console.log("[getMatchs] Future matches dates:", futureDates);

                    // Sort by kickOff date
                    const sortedMatches = futureMatches.sort((a, b) => {
                        const dateA = new Date(a.kickOff);
                        const dateB = new Date(b.kickOff);
                        return dateA.getTime() - dateB.getTime();
                    });
                    console.log("[getMatchs] Returning", sortedMatches.length, "matches from database (HKJC API returned 0, filtered to future matches only)");
                    console.log("[getMatchs] Sample database matches:", sortedMatches.slice(0, 2).map((m: any) => ({ id: m.id || m.eventId, home: m.homeTeamName || 'N/A', away: m.awayTeamName || 'N/A', kickOff: m.kickOff })));
                    if (!res.headersSent) {
                        return res.json(sortedMatches);
                    } else {
                        console.warn("[getMatchs] Response already sent, cannot return database matches");
                        return;
                    }
                }
                
                console.log("[getMatchs] No matches in database either, returning empty array");
                console.log("[getMatchs] Response status will be 200 with empty array");
                if (!res.headersSent) {
                    return res.json([]);
                } else {
                    console.warn("[getMatchs] Response already sent, cannot send empty array");
                    return;
                }
            }

            // Always cleanup old matches that are no longer in HKJC API
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

            const validHKJCIds = hkjc.map(m => m.id);
            // Delete matches that are no longer in HKJC API
            for (const match of existingMatchesList) {
                if (!validHKJCIds.includes(match.eventId)) {
                    console.log("[getMatchs] Deleting match no longer in HKJC API:", match.eventId);
                    await deleteDoc(doc(db, Tables.matches, match.eventId));
                }
            }

            // Check if we have matches in DB - create a map for quick lookup
            console.log("[getMatchs] Checking database for existing matches...");
            const matchesCol = collection(db, Tables.matches);
            const matchesSnapshot = await getDocs(matchesCol);
            const dbMatchesMap = new Map<string, any>();
            matchesSnapshot.docs.forEach(doc => {
                const data = doc.data();
                dbMatchesMap.set(data.eventId || doc.id, {
                    id: doc.id,
                    kickOff: data.kickOff,
                    ...data
                });
            });
            console.log("[getMatchs] Found", dbMatchesMap.size, "matches in database");

            // If not refreshing and we have matches in DB, check if HKJC has newer dates
            const dbMatchesArray = Array.from(dbMatchesMap.values());
            if (!refresh && dbMatchesArray.length > 0) {
                // Get the latest date from database
                const dbDates = dbMatchesArray.map(m => m.kickOff?.split(' ')[0]).filter(Boolean).sort();
                const latestDbDate = dbDates[dbDates.length - 1];
                
                // Get dates from HKJC API response
                const hkjcDates = hkjc.map(m => m.matchDate?.split('+')[0]?.split('T')[0]).filter(Boolean).sort();
                const latestHkjcDate = hkjcDates[hkjcDates.length - 1];
                
                // If HKJC has matches for dates beyond what's in DB, or if refresh is requested, fetch fresh data
                if (latestHkjcDate && latestDbDate && latestHkjcDate > latestDbDate) {
                    console.log("[getMatchs] HKJC has newer matches (latest:", latestHkjcDate, "vs DB:", latestDbDate, "), fetching fresh data...");
                    // Continue to fetch fresh data below
                } else {
                    // Filter out past matches (like 111 project - only show future matches)
                    const now = new Date();
                    // Subtract 1 hour to be less strict - show matches from today even if they're slightly in the past
                    const cutoffTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
                    const futureMatches = dbMatchesArray.filter((match: any) => {
                        if (!match.kickOff) return false;
                        let kickOffTime: Date;
                        if (match.kickOff.includes('T')) {
                            kickOffTime = new Date(match.kickOff);
                        } else {
                            const normalized = match.kickOff.replace(' ', 'T');
                            kickOffTime = new Date(normalized);
                        }
                        if (isNaN(kickOffTime.getTime())) {
                            return false;
                        }
                        // Use cutoffTime (1 hour ago) instead of now to be less strict
                        return kickOffTime >= cutoffTime;
                    });

                    // Sort by kickOff date
                    const sortedMatches = futureMatches.sort((a, b) => {
                        const dateA = new Date(a.kickOff);
                        const dateB = new Date(b.kickOff);
                        return dateA.getTime() - dateB.getTime();
                    });

                    console.log("[getMatchs] Returning", sortedMatches.length, "matches from database (filtered to future matches only)");
                    console.log("[getMatchs] Sample matches:", sortedMatches.slice(0, 2).map((m: any) => ({ id: m.id || m.eventId, home: m.homeTeamName || 'N/A', away: m.awayTeamName || 'N/A', hasPredictions: !!m.predictions, hasIA: !!m.ia })));
                    if (!res.headersSent) {
                        return res.json(sortedMatches);
                    } else {
                        console.warn("[getMatchs] Response already sent, cannot return database matches");
                        return;
                    }
                }
            } else if (!refresh && dbMatchesArray.length === 0) {
                console.log("[getMatchs] No matches in database, fetching from APIs...");
            } else {
                console.log("[getMatchs] Refresh requested or new matches detected, fetching from APIs...");
            }

            // Fetch from FootyLogic API (optional enrichment)
            let footylogicEventsMap = new Map<string, any>();
            try {
                const result = await API.GET(Global.footylogicGames);
                if (result.status === 200) {
                    const dataLogic: FootyLogic = result.data;
                    // Build a map of eventId -> event for quick lookup
                    for (const daum of dataLogic.data) {
                        if (daum.events && Array.isArray(daum.events)) {
                            for (const event of daum.events) {
                                footylogicEventsMap.set(event.eventId, event);
                            }
                        }
                    }
                    console.log("[getMatchs] FootyLogic API returned", footylogicEventsMap.size, "events for enrichment");
                }
            } catch (error) {
                console.warn("[getMatchs] FootyLogic API failed, continuing with HKJC data only:", error);
            }

            // Build matches from HKJC data (primary source)
            const allMatches: Match[] = [];
            const matchDetailsPromises: Promise<any>[] = [];
            
            console.log("[getMatchs] Building matches from", hkjc.length, "HKJC matches");
            
            // Create match objects from all HKJC matches
            for (const hkjcMatch of hkjc) {
                // Check if this match already exists in database
                const existingMatch = dbMatchesMap.get(hkjcMatch.id);
                
                // Parse HKJC date and time
                // matchDate might be "YYYY-MM-DD" or "YYYY-MM-DD+HH:mm" 
                // kickOffTime might be "HH:mm" or full ISO datetime
                let matchDate = hkjcMatch.matchDate;
                let kickOffTime = hkjcMatch.kickOffTime;
                
                // If kickOffTime is already a full ISO datetime, use it directly (like 111 project)
                let kickOff: string;
                if (kickOffTime && (kickOffTime.includes('T') || kickOffTime.includes(' '))) {
                    // kickOffTime is already a full datetime, use it directly
                    kickOff = kickOffTime;
                } else {
                    // Construct from separate date and time
                    // Extract just the date part (before any + or T)
                    matchDate = matchDate.split('+')[0].split('T')[0];
                    kickOff = `${matchDate} ${kickOffTime}`;
                }
                
                // Extract date components for kickOffDate (format: MM/DD/YYYY)
                const [year, month, day] = matchDate.split('-');
                const kickOffDate = `${month}/${day}/${year}`;
                const kickOffDateLocal = `${day}/${month}/${year}`;
                
                // Start with basic match from HKJC
                const match: Match = {
                    id: hkjcMatch.id,
                    eventId: hkjcMatch.id,
                    kickOff: kickOff,
                    kickOffDate: kickOffDate,
                    kickOffDateLocal: kickOffDateLocal,
                    kickOffTime: kickOffTime,
                    homeTeamName: hkjcMatch.homeTeam?.name_ch || hkjcMatch.homeTeam?.name_en || "",
                    awayTeamName: hkjcMatch.awayTeam?.name_ch || hkjcMatch.awayTeam?.name_en || "",
                    homeTeamNameEn: hkjcMatch.homeTeam?.name_en,
                    awayTeamNameEn: hkjcMatch.awayTeam?.name_en,
                    competitionName: hkjcMatch.tournament?.name_ch || hkjcMatch.tournament?.name_en || "",
                    competitionId: parseInt(hkjcMatch.tournament?.id || "0"),
                    // Default values for fields that may not be in HKJC
                    matchOutcome: "",
                    homeForm: "",
                    awayForm: "",
                    homeLanguages: {
                        en: hkjcMatch.homeTeam?.name_en || "",
                        zh: hkjcMatch.homeTeam?.name_ch || "",
                        zhCN: hkjcMatch.homeTeam?.name_ch || ""
                    },
                    awayLanguages: {
                        en: hkjcMatch.awayTeam?.name_en || "",
                        zh: hkjcMatch.awayTeam?.name_ch || "",
                        zhCN: hkjcMatch.awayTeam?.name_ch || ""
                    }
                } as Match;
                
                // Merge existing match data (preserve predictions, IA, lastGames, etc.)
                if (existingMatch) {
                    // Preserve predictions and IA for crowns
                    if (existingMatch.predictions) {
                        match.predictions = existingMatch.predictions;
                    }
                    if (existingMatch.ia) {
                        match.ia = existingMatch.ia;
                    }
                    if (existingMatch.ia2) {
                        match.ia2 = existingMatch.ia2;
                    }
                    // Preserve lastGames if available
                    if (existingMatch.lastGames) {
                        match.lastGames = existingMatch.lastGames;
                    }
                    // Preserve forms if available (more accurate than FootyLogic)
                    if (existingMatch.homeForm) {
                        match.homeForm = existingMatch.homeForm;
                    }
                    if (existingMatch.awayForm) {
                        match.awayForm = existingMatch.awayForm;
                    }
                    // Preserve other calculated fields
                    if (existingMatch.fixture_id) {
                        match.fixture_id = existingMatch.fixture_id;
                    }
                    if (existingMatch.league_id) {
                        match.league_id = existingMatch.league_id;
                    }
                    console.log("[getMatchs] Merged existing match data for", hkjcMatch.id, "- predictions:", !!match.predictions, "ia:", !!match.ia);
                }

                // Enrich with FootyLogic data if available
                const footylogicEvent = footylogicEventsMap.get(hkjcMatch.id);
                if (footylogicEvent) {
                    // Merge FootyLogic data into match
                    if (footylogicEvent.homeTeamLogo) {
                        match.homeTeamLogo = Global.footylogicImg + footylogicEvent.homeTeamLogo + ".png";
                    }
                    if (footylogicEvent.awayTeamLogo) {
                        match.awayTeamLogo = Global.footylogicImg + footylogicEvent.awayTeamLogo + ".png";
                    }
                    if (footylogicEvent.matchOutcome) {
                        match.matchOutcome = footylogicEvent.matchOutcome;
                    }
                    if (footylogicEvent.homeForm) {
                        match.homeForm = footylogicEvent.homeForm;
                    }
                    if (footylogicEvent.awayForm) {
                        match.awayForm = footylogicEvent.awayForm;
                    }
                    if (footylogicEvent.competitionId) {
                        match.competitionId = footylogicEvent.competitionId;
                    }
                    
                    // Add promise to fetch details in parallel
                    matchDetailsPromises.push(
                        API.GET(Global.footylogicDetails + hkjcMatch.id)
                            .then(resultDetails => ({ eventId: hkjcMatch.id, resultDetails }))
                            .catch(error => ({ eventId: hkjcMatch.id, error }))
                    );
                }

                allMatches.push(match);
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
                    // Preserve fixture_id and league_id from FootyLogic if available
                    if (footylogicDetails.fixture_id) {
                        match.fixture_id = footylogicDetails.fixture_id;
                    }
                    if (footylogicDetails.league_id) {
                        match.league_id = footylogicDetails.league_id;
                    }
                }
            });
            
            // Calculate predictions and IA for matches that don't have them but have required data
            console.log("[getMatchs] Checking for matches that need predictions/IA calculation...");
            let matchesNeedingCalc = 0;
            let matchesWithPredictions = 0;
            let matchesWithIA = 0;
            
            const calculationPromises = allMatches.map(async (match) => {
                // Always recalculate predictions and IA to ensure fresh data for crowns
                // This ensures crowns show up correctly in match lists
                const matchId = match.eventId;
                
                // Check if we need to recalculate (missing or incomplete data)
                const hasCompletePredictions = match.predictions && match.predictions.homeWinRate && match.predictions.awayWinRate;
                const hasCompleteIA = match.ia && match.ia.home && match.ia.away;
                
                // If we have complete data, we can skip, but log it
                if (hasCompletePredictions && hasCompleteIA) {
                    matchesWithPredictions++;
                    matchesWithIA++;
                    console.log("[getMatchs] Match", matchId, "already has complete predictions and IA");
                    return match;
                }
                
                matchesNeedingCalc++;
                
                // Need fixture_id for predictions
                let fixture_id = match.fixture_id;
                let needsPredictions = !match.predictions;
                let needsIA = !match.ia || !match.ia.home || !match.ia.away;
                
                // Try to get fixture_id if not available but we have team names and date
                if (!fixture_id && (needsPredictions || needsIA) && match.homeTeamNameEn && match.awayTeamNameEn && match.kickOffDate) {
                    try {
                        const [month, day, year] = match.kickOffDate.split("/");
                        if (month && day && year) {
                            const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                            let team = await ApiFixtureByDate(formattedDate);
                            
                            if (team && Array.isArray(team) && team.length > 0) {
                                const fixture = await matchTeamSimilarity(team, match.homeTeamNameEn, match.awayTeamNameEn);
                                if (fixture && fixture.id) {
                                    fixture_id = fixture.id;
                                    match.fixture_id = fixture.id;
                                    if (fixture.league_id) {
                                        match.league_id = fixture.league_id;
                                    }
                                    if (fixture.homeLogo && !match.homeTeamLogo) {
                                        match.homeTeamLogo = fixture.homeLogo;
                                    }
                                    if (fixture.awayLogo && !match.awayTeamLogo) {
                                        match.awayTeamLogo = fixture.awayLogo;
                                    }
                                    console.log("[getMatchs] Found fixture_id", fixture_id, "for match", match.eventId);
                                }
                            }
                        }
                    } catch (error) {
                        console.error("[getMatchs] Error fetching fixture for match", match.eventId, ":", error);
                    }
                }
                
                // Calculate predictions if needed and we have fixture_id
                if (needsPredictions && fixture_id) {
                    try {
                        console.log("[getMatchs] Starting predictions calculation for match", matchId, "with fixture_id", fixture_id);
                        const predictions = await Predictions(fixture_id);
                        if (predictions) {
                            match.predictions = predictions;
                            matchesWithPredictions++;
                            console.log("[getMatchs] ✓ Calculated predictions for match", matchId, "- home:", predictions.homeWinRate.toFixed(1), "%, away:", predictions.awayWinRate.toFixed(1), "%");
                        } else {
                            console.warn("[getMatchs] ✗ Predictions returned null for match", matchId);
                        }
                    } catch (error) {
                        console.error("[getMatchs] ✗ Error calculating predictions for match", matchId, ":", error instanceof Error ? error.message : String(error));
                    }
                } else {
                    if (!fixture_id) {
                        console.log("[getMatchs] ⚠ Skipping predictions for match", matchId, "- no fixture_id");
                    }
                }
                
                // Calculate IA if needed and we have homeForm/awayForm
                if (needsIA && match.homeForm && match.awayForm) {
                    try {
                        let playersInjured = { home: [], away: [] };
                        // Get injured players if we have fixture_id and league_id
                        if (fixture_id && match.league_id && match.homeTeamId && match.awayTeamId) {
                            try {
                                const dateStr = match.kickOff?.split(' ')[0];
                                playersInjured = await ApiTopScoreInjured(fixture_id, match.league_id, dateStr, match.homeTeamId, match.awayTeamId);
                            } catch (error) {
                                console.warn("[getMatchs] Could not fetch injured players for match", match.eventId);
                            }
                        }
                        
                        // Try to get lastGames if not available
                        if (!match.lastGames && match.homeTeamName && match.awayTeamName) {
                            try {
                                const lastGamesResult = await API.GET(Global.footylogicDetails + match.eventId);
                                if (lastGamesResult.status === 200 && lastGamesResult.data.statusCode === 200) {
                                    const resultRecentForm = lastGamesResult.data.data;
                                    match.lastGames = parseToInformationForm(resultRecentForm, match.homeTeamName, match.awayTeamName);
                                }
                            } catch (error) {
                                // Ignore if lastGames can't be fetched
                                console.warn("[getMatchs] Could not fetch lastGames for match", match.eventId);
                            }
                        }
                        
                        // Calculate IA
                        console.log("[getMatchs] Starting IA calculation for match", matchId);
                        const resultIa = await IaProbality(match, playersInjured);
                        if (resultIa) {
                            const total = resultIa.home + resultIa.away;
                            const homeShare = resultIa.home / total;
                            const awayShare = resultIa.away / total;
                            const redistributedHome = resultIa.home + resultIa.draw * homeShare;
                            const redistributedAway = resultIa.away + resultIa.draw * awayShare;
                            match.ia = {
                                home: Number(redistributedHome.toFixed(2)),
                                away: Number(redistributedAway.toFixed(2)),
                                draw: resultIa.draw
                            };
                            matchesWithIA++;
                            console.log("[getMatchs] ✓ Calculated IA for match", matchId, "- home:", match.ia.home.toFixed(1), "%, away:", match.ia.away.toFixed(1), "%");
                        } else {
                            // Fallback to CalculationProbality if IaProbality fails
                            console.log("[getMatchs] IA calculation returned null, trying fallback for match", matchId);
                            const homeWinRate = match.predictions?.homeWinRate || 50;
                            const awayWinRate = match.predictions?.awayWinRate || 50;
                            const result = CalculationProbality(playersInjured, homeWinRate, awayWinRate, match.homeForm.split(","), match.awayForm.split(","));
                            if (result) {
                                match.ia = result;
                                matchesWithIA++;
                                console.log("[getMatchs] ✓ Calculated IA (fallback) for match", matchId, "- home:", result.home.toFixed(1), "%, away:", result.away.toFixed(1), "%");
                            } else {
                                console.warn("[getMatchs] ✗ IA fallback also returned null for match", matchId);
                            }
                        }
                    } catch (error) {
                        console.error("[getMatchs] ✗ Error calculating IA for match", matchId, ":", error instanceof Error ? error.message : String(error));
                    }
                } else {
                    if (!match.homeForm || !match.awayForm) {
                        console.log("[getMatchs] ⚠ Skipping IA for match", matchId, "- missing homeForm or awayForm");
                    }
                }
                
                return match;
            });
            
            // Calculate predictions/IA in parallel - WAIT for all to complete
            console.log("[getMatchs] Starting calculations for", matchesNeedingCalc, "matches...");
            const startCalcTime = Date.now();
            const calculationResults = await Promise.allSettled(calculationPromises);
            const calcDuration = Date.now() - startCalcTime;
            
            // Log results
            const successful = calculationResults.filter(r => r.status === 'fulfilled').length;
            const failed = calculationResults.filter(r => r.status === 'rejected').length;
            console.log("[getMatchs] Calculations completed:", successful, "succeeded,", failed, "failed in", calcDuration, "ms");
            console.log("[getMatchs] Summary - Matches with predictions:", matchesWithPredictions, ", with IA:", matchesWithIA, "out of", allMatches.length);

            // Convert Chinese names to simplified Chinese for all matches
            const convertPromises = allMatches.map(async (match) => {
                if (match.homeLanguages?.zh && !match.homeLanguages.zhCN) {
                    try {
                        match.homeLanguages.zhCN = await convertToSimplifiedChinese(match.homeLanguages.zh) || match.homeLanguages.zh;
                    } catch (error) {
                        match.homeLanguages.zhCN = match.homeLanguages.zh;
                    }
                }
                if (match.awayLanguages?.zh && !match.awayLanguages.zhCN) {
                    try {
                        match.awayLanguages.zhCN = await convertToSimplifiedChinese(match.awayLanguages.zh) || match.awayLanguages.zh;
                    } catch (error) {
                        match.awayLanguages.zhCN = match.awayLanguages.zh;
                    }
                }
            });
            await Promise.all(convertPromises);

            // Sort matches by kickOff date
            allMatches.sort((a, b) => {
                const dateA = new Date(a.kickOff);
                const dateB = new Date(b.kickOff);
                return dateA.getTime() - dateB.getTime();
            });

            // Save matches to database - use setDoc with merge to preserve existing fields
            console.log("[getMatchs] Saving", allMatches.length, "matches to database...");
            const savePromises = allMatches.map(async (match) => {
                const matchRef = doc(db, Tables.matches, match.eventId);
                // Use merge: true to preserve existing fields like predictions and IA
                await setDoc(matchRef, match, { merge: true });
            });
            try {
                await Promise.all(savePromises);
                console.log("[getMatchs] Successfully saved matches to database (with merge to preserve predictions/IA)");
            } catch (error) {
                console.error("[getMatchs] Error saving matches to database:", error);
            }

            // Log matches with predictions/IA for debugging
            const matchesWithCrowns = allMatches.filter(m => (m.ia && (m.ia.home > 70 || m.ia.away > 70)) || (m.predictions && (m.predictions.homeWinRate > 70 || m.predictions.awayWinRate > 70)));
            console.log("[getMatchs] Matches with crown data:", matchesWithCrowns.length, "out of", allMatches.length);
            if (matchesWithCrowns.length > 0) {
                console.log("[getMatchs] Sample matches with crowns:", matchesWithCrowns.slice(0, 3).map(m => ({ 
                    id: m.eventId, 
                    home: m.homeTeamName, 
                    away: m.awayTeamName,
                    ia: m.ia ? { home: m.ia.home, away: m.ia.away } : null,
                    predictions: m.predictions ? { home: m.predictions.homeWinRate, away: m.predictions.awayWinRate } : null
                })));
            }
            
            // Final verification - ensure predictions/IA are in the response
            const matchesWithData = allMatches.filter(m => m.predictions || (m.ia && m.ia.home && m.ia.away));
            console.log("[getMatchs] Final check - Matches with predictions or IA in response:", matchesWithData.length, "out of", allMatches.length);
            
            // Log matches that will show crowns (win rate > 70%)
            const matchesWithCrownsInResponse = allMatches.filter(m => {
                const homeWin = m.ia?.home ?? m.predictions?.homeWinRate ?? 0;
                const awayWin = m.ia?.away ?? m.predictions?.awayWinRate ?? 0;
                const higherWinRate = Math.max(homeWin, awayWin);
                return higherWinRate > 70;
            });
            console.log("[getMatchs] Matches that will show crowns (win rate > 70%):", matchesWithCrownsInResponse.length);
            if (matchesWithCrownsInResponse.length > 0) {
                console.log("[getMatchs] Sample matches with crowns:", matchesWithCrownsInResponse.slice(0, 5).map(m => {
                    const homeWin = m.ia?.home ?? m.predictions?.homeWinRate ?? 0;
                    const awayWin = m.ia?.away ?? m.predictions?.awayWinRate ?? 0;
                    return {
                        id: m.eventId,
                        home: m.homeTeamName,
                        away: m.awayTeamName,
                        homeWin: homeWin.toFixed(1) + '%',
                        awayWin: awayWin.toFixed(1) + '%',
                        higherWinRate: Math.max(homeWin, awayWin).toFixed(1) + '%',
                        hasIA: !!m.ia,
                        hasPredictions: !!m.predictions
                    };
                }));
            }
            
            // Log date distribution in allMatches BEFORE filtering
            console.log("[getMatchs] ========================================");
            console.log("[getMatchs] ALLMATCHES DATE ANALYSIS (BEFORE FILTERING):");
            const allMatchesDates = [...new Set(allMatches.map((m: any) => {
                if (!m.kickOff) return null;
                // Extract date part (handle both "YYYY-MM-DD HH:mm" and ISO format)
                const datePart = m.kickOff.split(' ')[0].split('T')[0];
                return datePart;
            }).filter(Boolean))].sort();
            console.log("[getMatchs] Total matches built:", allMatches.length);
            console.log("[getMatchs] Total unique dates:", allMatchesDates.length);
            if (allMatchesDates.length > 0) {
                console.log("[getMatchs] Date range:", allMatchesDates[0], "to", allMatchesDates[allMatchesDates.length - 1]);
                console.log("[getMatchs] All unique dates:", allMatchesDates);
                console.log("[getMatchs] Matches per date:", allMatchesDates.map(date => ({
                    date,
                    count: allMatches.filter((m: any) => {
                        if (!m.kickOff) return false;
                        const datePart = m.kickOff.split(' ')[0].split('T')[0];
                        return datePart === date;
                    }).length
                })));
            }
            console.log("[getMatchs] ========================================");
            
            // Log detailed sample of what's being returned
            console.log("[getMatchs] Returning", allMatches.length, "matches from APIs");
            allMatches.slice(0, 3).forEach((m, idx) => {
                console.log(`[getMatchs] Match ${idx + 1}:`, {
                    id: m.eventId, 
                    home: m.homeTeamName, 
                    away: m.awayTeamName,
                    hasPredictions: !!m.predictions,
                    hasIA: !!m.ia,
                    homeWinRate: m.ia?.home || m.predictions?.homeWinRate || 'N/A',
                    awayWinRate: m.ia?.away || m.predictions?.awayWinRate || 'N/A',
                    willShowCrown: ((m.ia?.home || m.predictions?.homeWinRate || 0) > 70) || ((m.ia?.away || m.predictions?.awayWinRate || 0) > 70)
                });
            });
            
            // Filter out past matches (like 111 project - only show future matches)
            // Use >= instead of > to include matches happening right now (like 111 project)
            const now = new Date();
            // Subtract 1 hour to be less strict - show matches from today even if they're slightly in the past
            // This ensures we show matches from the current day and future days
            const cutoffTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
            
            // Log dates before filtering
            const datesBeforeFilter = [...new Set(allMatches.map((m: any) => {
                if (!m.kickOff) return null;
                return m.kickOff.split(' ')[0].split('T')[0];
            }).filter(Boolean))].sort();
            console.log("[getMatchs] Dates in allMatches before filtering:", datesBeforeFilter);
            console.log("[getMatchs] Current time:", now.toISOString());
            console.log("[getMatchs] Cutoff time (1 hour ago):", cutoffTime.toISOString());
            
            const futureMatches = allMatches.filter((match: any) => {
                if (!match.kickOff) return false;
                try {
                    // Parse the kickOff datetime string
                    // Handle both "YYYY-MM-DD HH:mm" and ISO format
                    let kickOffTime: Date;
                    if (match.kickOff.includes('T')) {
                        // ISO format: "2026-01-30T01:30:00+08:00" or "2026-01-30T01:30:00Z"
                        kickOffTime = new Date(match.kickOff);
                    } else {
                        // Format: "2026-01-30 01:30" - need to ensure proper parsing
                        // Replace space with T for ISO-like format
                        const normalized = match.kickOff.replace(' ', 'T');
                        kickOffTime = new Date(normalized);
                    }
                    
                    // Check if date is valid
                    if (isNaN(kickOffTime.getTime())) {
                        console.warn("[getMatchs] Invalid kickOff date:", match.kickOff, "for match", match.eventId);
                        return false;
                    }
                    
                    // Use cutoffTime (1 hour ago) instead of now to be less strict
                    // This ensures we show matches from today even if they're slightly in the past
                    const isFuture = kickOffTime >= cutoffTime;
                    if (!isFuture) {
                        console.log("[getMatchs] Filtering out past match:", match.kickOff, "kickOffTime:", kickOffTime.toISOString(), "cutoff:", cutoffTime.toISOString(), "diff (ms):", cutoffTime.getTime() - kickOffTime.getTime());
                    }
                    // Use >= cutoffTime to be less strict (includes matches from last hour)
                    return isFuture;
                } catch (error) {
                    console.warn("[getMatchs] Error parsing kickOff:", match.kickOff, error);
                    return false;
                }
            });

            // Log dates after filtering
            console.log("[getMatchs] ========================================");
            console.log("[getMatchs] FUTURE MATCHES DATE ANALYSIS (AFTER FILTERING):");
            const datesAfterFilter = [...new Set(futureMatches.map((m: any) => {
                if (!m.kickOff) return null;
                const datePart = m.kickOff.split(' ')[0].split('T')[0];
                return datePart;
            }).filter(Boolean))].sort();
            console.log("[getMatchs] Total future matches:", futureMatches.length);
            console.log("[getMatchs] Total unique dates:", datesAfterFilter.length);
            if (datesAfterFilter.length > 0) {
                console.log("[getMatchs] Date range:", datesAfterFilter[0], "to", datesAfterFilter[datesAfterFilter.length - 1]);
                console.log("[getMatchs] All unique dates:", datesAfterFilter);
                console.log("[getMatchs] Matches per date:", datesAfterFilter.map(date => ({
                    date,
                    count: futureMatches.filter((m: any) => {
                        if (!m.kickOff) return false;
                        const datePart = m.kickOff.split(' ')[0].split('T')[0];
                        return datePart === date;
                    }).length
                })));
            } else {
                console.log("[getMatchs] WARNING: No future matches found!");
            }
            console.log("[getMatchs] ========================================");

            const totalDuration = Date.now() - methodStartTime;
            console.log("[getMatchs] Total method duration:", totalDuration + "ms");
            console.log("[getMatchs] Returning", futureMatches.length, "future matches (filtered from", allMatches.length, "total matches)");
            console.log("[getMatchs] ✅ Ready to return matches with crown data calculated!");
            
            if (!res.headersSent) {
                return res.json(futureMatches);
            } else {
                console.warn("[getMatchs] Response already sent, cannot return API matches");
                return;
            }
        } catch (error) {
            const totalDuration = Date.now() - methodStartTime;
            console.error("========================================");
            console.error("[getMatchs] ERROR occurred after", totalDuration + "ms");
            console.error("[getMatchs] Error type:", error instanceof Error ? error.constructor.name : typeof error);
            console.error("[getMatchs] Error message:", error instanceof Error ? error.message : String(error));
            console.error("[getMatchs] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
            console.error("========================================");
            
            if (!res.headersSent) {
                return res.status(500).json({ 
                    error: 'Failed to fetch matches',
                    message: error instanceof Error ? error.message : String(error),
                    timestamp: new Date().toISOString()
                });
            } else {
                console.error("[getMatchs] Response already sent, cannot send error response");
            }
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
                    // If match exists in DB with complete data, return it immediately
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
            
            // Extract match event from games result first (this is more reliable)
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

            // Extract footylogicDetails from details API response
            const footylogicDetails = resultDetails.status === 200 && resultDetails.data?.statusCode === 200 ? resultDetails.data.data : null;

            // Check if we have match data from DB or games API
            if (!existingMatchData && !matchEvent && !footylogicDetails) {
                // No match found in DB, games API, or details API
                console.error("[getMatchDetails] Match not found in database, games API, or details API");
                return res.status(404).json({ error: 'Match not found' });
            }

            // If we have existing match data but no matchEvent from games API, return DB data
            if (existingMatchData && !matchEvent) {
                // Match exists in DB but not in games API, return DB data
                console.log("[getMatchDetails] Returning match from database (not found in games API)");
                return res.json(existingMatchData);
            }
            
            // If matchEvent not found but we have details, use data from details API
            if (!matchEvent && footylogicDetails) {
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

            // If we still don't have matchEvent and no existing data, return 404
            if (!matchEvent && !existingMatchData) {
                console.error("[getMatchDetails] Match not found in any API or database");
                return res.status(404).json({ error: 'Match not found' });
            }

            // Build match data from API responses
            // If we have existing matchData from DB, merge it; otherwise create new
            let matchDataFromAPI: Match = {
                ...matchEvent,
                id: id,
                eventId: id,
                homeTeamLogo: footylogicDetails?.homeTeamLogo 
                    ? Global.footylogicImg + footylogicDetails.homeTeamLogo + ".png" 
                    : matchEvent.homeTeamLogo,
                awayTeamLogo: footylogicDetails?.awayTeamLogo 
                    ? Global.footylogicImg + footylogicDetails.awayTeamLogo + ".png" 
                    : matchEvent.awayTeamLogo,
                homeTeamNameEn: footylogicDetails?.homeTeamName || matchEvent.homeTeamNameEn || matchEvent.homeTeamName,
                awayTeamNameEn: footylogicDetails?.awayTeamName || matchEvent.awayTeamNameEn || matchEvent.awayTeamName,
                homeTeamId: footylogicDetails?.homeTeamId || matchEvent.homeTeamId,
                awayTeamId: footylogicDetails?.awayTeamId || matchEvent.awayTeamId,
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

            // Auto-generate IA if refresh is requested and we have the necessary data
            const needsIA = !matchData.ia || !matchData.ia.home || !matchData.ia.away;
            if (refresh && needsIA && matchData.homeForm && matchData.awayForm) {
                try {
                    console.log("[getMatchDetails] Auto-generating IA analysis for match:", id);
                    let playersInjured = { home: [], away: [] };
                    if (matchData.fixture_id && matchData.league_id && matchData.homeTeamId && matchData.awayTeamId) {
                        try {
                            playersInjured = await ApiTopScoreInjured(
                                matchData.fixture_id, 
                                matchData.league_id, 
                                matchData.kickOff.split("-")[0], 
                                matchData.homeTeamId, 
                                matchData.awayTeamId
                            );
                        } catch (error) {
                            console.warn("[getMatchDetails] Error fetching injured players, continuing without:", error);
                        }
                    }
                    
                    // Try to use predictions if available, otherwise use HKJC odds as fallback
                    let homeWinRate: number | null = null;
                    let awayWinRate: number | null = null;
                    
                    if (matchData.predictions?.homeWinRate && matchData.predictions?.awayWinRate) {
                        homeWinRate = matchData.predictions.homeWinRate;
                        awayWinRate = matchData.predictions.awayWinRate;
                    } else if ((matchData as any).hadHomePct && (matchData as any).hadAwayPct) {
                        // Use HKJC odds as fallback (from FootyLogic Event data)
                        homeWinRate = parseFloat((matchData as any).hadHomePct);
                        awayWinRate = parseFloat((matchData as any).hadAwayPct);
                        console.log("[getMatchDetails] Using HKJC odds as fallback for IA generation:", homeWinRate, awayWinRate);
                    }
                    
                    if (homeWinRate !== null && awayWinRate !== null) {
                        // Try AI-based IA first if we have lastGames data
                        if (matchData.lastGames && matchData.homeTeamNameEn && matchData.awayTeamNameEn) {
                            try {
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
                                    console.log("[getMatchDetails] IA generated successfully using AI:", matchData.ia);
                                }
                            } catch (error) {
                                console.warn("[getMatchDetails] AI IA generation failed, using calculation fallback:", error);
                            }
                        }
                        
                        // Fallback to CalculationProbality if AI failed or not available
                        if (!matchData.ia) {
                            try {
                                const result = CalculationProbality(
                                    playersInjured, 
                                    homeWinRate, 
                                    awayWinRate, 
                                    matchData.homeForm.split(","), 
                                    matchData.awayForm.split(",")
                                );
                                matchData.ia = result;
                                console.log("[getMatchDetails] IA generated using CalculationProbality:", matchData.ia);
                            } catch (error) {
                                console.error("[getMatchDetails] Error generating IA with CalculationProbality:", error);
                            }
                        }
                    } else {
                        console.warn("[getMatchDetails] Cannot generate IA: missing predictions and HKJC odds for match:", id);
                    }
                } catch (error) {
                    console.error("[getMatchDetails] Error auto-generating IA:", error);
                }
            } else if (existingMatchData?.ia) {
                // Preserve ia from existing data if it exists and we're not refreshing
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