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
import { ApiHKJC, ApiHKJCMatchList, ApiHKJCMatchById, ApiHKJCMatchListHAD } from "../data/api-hkjc";
import { FootyLogicRecentForm } from "model/footylogic_recentform.model";
import { HKJC } from "model/hkjc.model";
import { extractHKJCMarkets } from "../service/hkjcMarkets";
import { format } from 'date-fns';
import { convertToSimplifiedChinese } from "../service/chinese-simplify";
import { cacheGet, cacheSet, cacheDel, CacheKeys } from "../cache/redis";
import { runAnalysisBatch } from "../service/analysisWorker";
import { fetchLogosForList } from "../service/fetchLogosForList";

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
        let items: any[] = [];
        let itemsAdd: any[] = [];
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
                                    items.filter((i) => daum.label == i.kickOffDate)[m].homeTeamLogo = fixture.homeLogo;
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


    /** Get matches: HKJC API is the source of truth. Exactly those matches, no extra, no less. DB used only to merge enrichment (ia, predictions, etc.). */
    static async getMatchs(req: Request, res: Response) {
        try {
            const refresh = req.query.refresh === 'true';
            // Fill ia from predictions/HKJC when ia is missing or 50/50 (so list never shows all 50%)
            const fillListIAFromPredictions = (match: any): void => {
                const hasNoIA = !match.ia || match.ia.home == null || match.ia.away == null;
                const isFiftyFifty = match.ia && match.ia.home === 50 && match.ia.away === 50;
                if (!hasNoIA && !isFiftyFifty) return;
                let h: number | null = null;
                let a: number | null = null;
                if (match.predictions?.homeWinRate != null && match.predictions?.awayWinRate != null) {
                    h = Number(match.predictions.homeWinRate);
                    a = Number(match.predictions.awayWinRate);
                } else if (match.hadHomePct != null && match.hadAwayPct != null) {
                    h = parseFloat(match.hadHomePct);
                    a = parseFloat(match.hadAwayPct);
                }
                if (h == null || a == null || Number.isNaN(h) || Number.isNaN(a)) return;
                const total = h + a;
                if (total <= 0) return;
                match.ia = { home: (h / total) * 100, away: (a / total) * 100, draw: 0, bestPick: match.ia?.bestPick };
            };
            if (!refresh) {
                const cached = await cacheGet<any[]>(CacheKeys.matchesList(false));
                if (cached && Array.isArray(cached) && cached.length > 0) {
                    cached.forEach(fillListIAFromPredictions);
                    if (!res.headersSent) return res.json(cached);
                    return;
                }
            }

            const hkjc: HKJC[] = await ApiHKJCMatchList();
            const matchesCol = collection(db, Tables.matches);
            const snapshot = await getDocs(matchesCol);
            const dbById: Record<string, any> = {};
            snapshot.docs.forEach((docSnap) => {
                const data = docSnap.data();
                dbById[docSnap.id] = { id: docSnap.id, kickOff: data.kickOff, ...data };
            });

            const list: any[] = [];

            // Preferred path: HKJC is source of truth when it returns matches
            if (hkjc && hkjc.length > 0) {
                for (const m of hkjc) {
                    let matchDate = m.matchDate?.split("+")[0].split("T")[0] ?? "";
                    const kickOffTime = m.kickOffTime ?? "";
                    let kickOff: string;
                    if (kickOffTime && (kickOffTime.includes("T") || kickOffTime.includes(" "))) {
                        kickOff = kickOffTime;
                    } else {
                        kickOff = `${matchDate} ${kickOffTime}`;
                    }
                    try {
                        const t = kickOff.includes("T") ? new Date(kickOff) : new Date(kickOff.replace(" ", "T"));
                        if (isNaN(t.getTime())) continue;
                    } catch {
                        continue;
                    }
                    const [y, mo, d] = matchDate.split("-");
                    const kickOffDate = mo && d && y ? `${mo}/${d}/${y}` : "";
                    const kickOffDateLocal = mo && d && y ? `${d}/${mo}/${y}` : "";

                    const base: any = {
                        id: m.id,
                        eventId: m.id,
                        kickOff,
                        kickOffDate,
                        kickOffDateLocal,
                        kickOffTime: m.kickOffTime ?? "",
                        homeTeamName: m.homeTeam?.name_ch || m.homeTeam?.name_en || "",
                        awayTeamName: m.awayTeam?.name_ch || m.awayTeam?.name_en || "",
                        homeTeamNameEn: m.homeTeam?.name_en,
                        awayTeamNameEn: m.awayTeam?.name_en,
                        competitionName: m.tournament?.name_ch || m.tournament?.name_en || "",
                        competitionId: parseInt(m.tournament?.id || "0", 10),
                        matchOutcome: "",
                        homeForm: "",
                        awayForm: "",
                        homeLanguages: {
                            en: m.homeTeam?.name_en || "",
                            zh: m.homeTeam?.name_ch || "",
                            zhCN: m.homeTeam?.name_ch || "",
                        },
                        awayLanguages: {
                            en: m.awayTeam?.name_en || "",
                            zh: m.awayTeam?.name_ch || "",
                            zhCN: m.awayTeam?.name_ch || "",
                        },
                    };

                    const dbData = dbById[m.id];
                    if (dbData) {
                        list.push({ ...base, ...dbData, id: m.id, eventId: m.id, kickOff: base.kickOff, kickOffDate: base.kickOffDate, kickOffDateLocal: base.kickOffDateLocal });
                    } else {
                        list.push(base);
                    }
                }
            } else {
                // Fallback: HKJC returned 0 matches (API down or no data).
                // Always return something so the website can load: use future matches
                // already stored in DB as last known state.
                console.warn("[getMatchs] HKJC returned 0 matches - falling back to DB matches");
                const now = new Date();
                for (const docId of Object.keys(dbById)) {
                    const m = dbById[docId];
                    if (!m.kickOff) continue;
                    try {
                        const t = m.kickOff.includes("T") ? new Date(m.kickOff) : new Date(m.kickOff.replace(" ", "T"));
                        if (isNaN(t.getTime())) continue;
                        if (t.getTime() < now.getTime()) continue; // only future matches
                    } catch {
                        continue;
                    }
                    list.push({
                        ...m,
                        id: docId,
                        eventId: docId,
                    });
                }
            }

            for (const m of hkjc || []) {
                let matchDate = m.matchDate?.split("+")[0].split("T")[0] ?? "";
                const kickOffTime = m.kickOffTime ?? "";
                let kickOff: string;
                if (kickOffTime && (kickOffTime.includes("T") || kickOffTime.includes(" "))) {
                    kickOff = kickOffTime;
                } else {
                    kickOff = `${matchDate} ${kickOffTime}`;
                }
                try {
                    const t = kickOff.includes("T") ? new Date(kickOff) : new Date(kickOff.replace(" ", "T"));
                    if (isNaN(t.getTime())) continue;
                } catch {
                    continue;
                }
            }

            const futureMatches = list.sort((a: any, b: any) => new Date(a.kickOff).getTime() - new Date(b.kickOff).getTime());
            futureMatches.forEach(fillListIAFromPredictions);

            // Fill ia from HKJC HAD (1X2) odds for matches still missing ia
            const needsIA = futureMatches.some((m: any) => !m.ia || m.ia.home == null);
            if (needsIA) {
                try {
                    const hadMatches = await ApiHKJCMatchListHAD();
                    const hadMap = new Map<string, any>();
                    hadMatches.forEach((h) => {
                        if (h.id) hadMap.set(h.id, extractHKJCMarkets(h));
                    });
                    for (const m of futureMatches) {
                        if (m.ia && m.ia.home != null && m.ia.away != null) continue;
                        const markets = hadMap.get(m.id);
                        if (markets?.hadHomePct && markets?.hadAwayPct) {
                            const h = parseFloat(markets.hadHomePct);
                            const a = parseFloat(markets.hadAwayPct);
                            const total = h + a;
                            if (total > 0) {
                                m.ia = { home: (h / total) * 100, away: (a / total) * 100, draw: 0 };
                            }
                        }
                    }
                } catch (e) {
                    console.warn("[getMatchs] HAD odds fetch failed, crowns may not show:", (e as Error)?.message);
                }
            }

            // Fetch logos for matches that don't have them (api-sports.io via GetFixture), like topx-betting-mern
            const listWithLogos = await fetchLogosForList(futureMatches);

            // Short TTL (60s) so list stays in sync with HKJC; avoids stale "extra" dates from Redis
            await cacheSet(CacheKeys.matchesList(refresh), listWithLogos, 60);
            if (!res.headersSent) return res.json(listWithLogos);
        } catch (error) {
            if (!res.headersSent) {
                return res.status(500).json({
                    error: 'Failed to fetch matches',
                    message: error instanceof Error ? error.message : String(error),
                });
            }
        }
    }

    static async getMatchDetails(req: Request, res: Response) {
        const { id } = req.params; // id is eventId
        const refresh = req.query.refresh === 'true';
        console.log("[getMatchDetails] Fetching match details for eventId:", id, "refresh:", refresh);
        try {
            // Helper: fill IA from predictions so we never return 50/50 when we have real odds
            const fillIAFromPredictions = (match: Match): void => {
                const pred = match.predictions;
                if (pred?.homeWinRate == null || pred?.awayWinRate == null) return;
                const hasNoIA = !match.ia || match.ia.home == null || match.ia.away == null;
                const isFiftyFifty = match.ia && match.ia.home === 50 && match.ia.away === 50;
                if (!hasNoIA && !isFiftyFifty) return;
                const h = Number(pred.homeWinRate);
                const a = Number(pred.awayWinRate);
                if (Number.isNaN(h) || Number.isNaN(a)) return;
                const total = h + a;
                if (total <= 0) return;
                match.ia = { home: (h / total) * 100, away: (a / total) * 100, draw: 0, bestPick: match.ia?.bestPick };
            };

            // Try Redis cache first when not forcing refresh
            if (!refresh) {
                const cached = await cacheGet<Match>(CacheKeys.matchDetail(id));
                if (cached && cached.lastGames?.homeTeam && cached.lastGames?.awayTeam) {
                    fillIAFromPredictions(cached);
                    console.log("[getMatchDetails] Returning match from Redis cache");
                    return res.json(cached);
                }
            }
            // Then try database
            let existingMatchData: Match | null = null;
            if (!refresh) {
                const matchRef = doc(db, Tables.matches, id);
                const matchSnap = await getDoc(matchRef);

                if (matchSnap.exists()) {
                    existingMatchData = matchSnap.data() as Match;
                    // If match exists in DB with complete data, return it and cache it
                    if (existingMatchData.lastGames && existingMatchData.lastGames.homeTeam && existingMatchData.lastGames.awayTeam) {
                        fillIAFromPredictions(existingMatchData);
                        console.log("[getMatchDetails] Returning complete match from database");
                        await cacheSet(CacheKeys.matchDetail(id), existingMatchData, 300);
                        return res.json(existingMatchData);
                    } else {
                        console.log("[getMatchDetails] Match found in database but missing lastGames, will fetch from APIs to complete...");
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
                ApiHKJC().catch((err: any) => { console.error("[getMatchDetails] Error fetching HKJC:", err); return []; })
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
                // Fallback: match may be from HKJC only (e.g. U20 women's not in FootyLogic) or from a stale list
                const hkjcMatch = Array.isArray(hkjcData) ? hkjcData.find((x: HKJC) => x.id === id) : null;
                if (hkjcMatch) {
                    const m = hkjcMatch;
                    let matchDate = m.matchDate?.split("+")[0].split("T")[0] ?? "";
                    const kickOffTime = m.kickOffTime ?? "";
                    const kickOff = kickOffTime && (kickOffTime.includes("T") || kickOffTime.includes(" "))
                        ? kickOffTime
                        : `${matchDate} ${kickOffTime}`;
                    const [y, mo, d] = matchDate.split("-");
                    const kickOffDate = mo && d && y ? `${mo}/${d}/${y}` : "";
                    const kickOffDateLocal = mo && d && y ? `${d}/${mo}/${y}` : "";
                    const minimalMatch: Match = {
                        id: id,
                        eventId: id,
                        kickOff,
                        kickOffDate,
                        kickOffDateLocal,
                        kickOffTime: m.kickOffTime ?? "",
                        homeTeamName: m.homeTeam?.name_ch || m.homeTeam?.name_en || "",
                        awayTeamName: m.awayTeam?.name_ch || m.awayTeam?.name_en || "",
                        homeTeamNameEn: m.homeTeam?.name_en,
                        awayTeamNameEn: m.awayTeam?.name_en,
                        competitionName: m.tournament?.name_ch || m.tournament?.name_en || "",
                        competitionId: parseInt(m.tournament?.id || "0", 10),
                        matchOutcome: "",
                        homeForm: "",
                        awayForm: "",
                        homeLanguages: { en: m.homeTeam?.name_en || "", zh: m.homeTeam?.name_ch || "", zhCN: m.homeTeam?.name_ch || "" },
                        awayLanguages: { en: m.awayTeam?.name_en || "", zh: m.awayTeam?.name_ch || "", zhCN: m.awayTeam?.name_ch || "" },
                    } as Match;
                    const matchRef = doc(db, Tables.matches, id);
                    await setDoc(matchRef, { ...minimalMatch, analysis_status: "pending", analysis_updated_at: null }, { merge: true });
                    await cacheDel(CacheKeys.matchDetail(id));
                    await cacheDel(CacheKeys.matchesList(false));
                    await cacheDel(CacheKeys.matchesList(true));
                    await cacheSet(CacheKeys.matchDetail(id), minimalMatch, 300);
                    console.log("[getMatchDetails] Returning HKJC-only match (no FootyLogic data):", id);
                    return res.json(minimalMatch);
                }
                console.error("[getMatchDetails] Match not found in database, games API, details API, or HKJC");
                return res.status(404).json({ error: 'Match not found' });
            }

            // If we have existing match data but no matchEvent from games API, return DB data
            if (existingMatchData && !matchEvent) {
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

            // Apply HKJC data: Chinese names + HAD, HDC, HiLo/TG
            const hkjcMatch = hkjcData.find((x: HKJC) => x.id === id);
            if (hkjcMatch) {
                if (hkjcMatch.homeTeam?.name_ch) {
                    matchData.homeTeamName = hkjcMatch.homeTeam.name_ch;
                }
                if (hkjcMatch.awayTeam?.name_ch) {
                    matchData.awayTeamName = hkjcMatch.awayTeam.name_ch;
                }
                const markets = extractHKJCMarkets(hkjcMatch);
                if (markets.hadHomePct != null) matchData.hadHomePct = markets.hadHomePct;
                if (markets.hadDrawPct != null) matchData.hadDrawPct = markets.hadDrawPct;
                if (markets.hadAwayPct != null) matchData.hadAwayPct = markets.hadAwayPct;
                if (markets.condition) matchData.condition = markets.condition;
                if (markets.hiloLines?.length) matchData.hiloLines = markets.hiloLines;
            }

            // Add language support (use existing if available, otherwise convert)
            const homeZh = matchData.homeTeamName ?? "";
            const awayZh = matchData.awayTeamName ?? "";

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
                matchData.predictions = existingMatchData.predictions;
            }

            // Fill IA whenever we have data so we never show 50/50 when we have odds/form.
            const needsIA = !matchData.ia || !matchData.ia.home || !matchData.ia.away;
            if (needsIA) {
                if (existingMatchData?.ia) {
                    matchData.ia = existingMatchData.ia;
                } else {
                    let homeWinRate: number | null = null;
                    let awayWinRate: number | null = null;
                    if (matchData.predictions?.homeWinRate != null && matchData.predictions?.awayWinRate != null) {
                        homeWinRate = matchData.predictions.homeWinRate;
                        awayWinRate = matchData.predictions.awayWinRate;
                    } else if (matchData.hadHomePct != null && matchData.hadAwayPct != null) {
                        homeWinRate = parseFloat(matchData.hadHomePct);
                        awayWinRate = parseFloat(matchData.hadAwayPct);
                    }
                    if (homeWinRate !== null && awayWinRate !== null) {
                        if (matchData.homeForm && matchData.awayForm) {
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
                                } catch {
                                    // ignore
                                }
                            }
                            try {
                                const result = CalculationProbality(
                                    playersInjured,
                                    homeWinRate,
                                    awayWinRate,
                                    matchData.homeForm.split(","),
                                    matchData.awayForm.split(",")
                                );
                                matchData.ia = result;
                            } catch {
                                matchData.ia = { home: homeWinRate, away: awayWinRate, draw: 0 };
                            }
                        } else {
                            matchData.ia = { home: homeWinRate, away: awayWinRate, draw: 0 };
                        }
                        // When refresh requested, run Gemini in background and update DB later
                        if (refresh && matchData.lastGames && matchData.homeTeamNameEn && matchData.awayTeamNameEn) {
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
                                } catch {
                                    // ignore
                                }
                            }
                            IaProbality(matchData, playersInjured)
                                .then((resultIa) => {
                                    if (!resultIa) return;
                                    const total = resultIa.home + resultIa.away;
                                    const homeShare = total > 0 ? resultIa.home / total : 0.5;
                                    const awayShare = total > 0 ? resultIa.away / total : 0.5;
                                    const redistributedHome = resultIa.home + resultIa.draw * homeShare;
                                    const redistributedAway = resultIa.away + resultIa.draw * awayShare;
                                    const ia = {
                                        home: Number(redistributedHome.toFixed(2)),
                                        away: Number(redistributedAway.toFixed(2)),
                                        draw: resultIa.draw,
                                        bestPick: resultIa.bestPick,
                                    };
                                    const matchRef = doc(db, Tables.matches, id);
                                    setDoc(matchRef, { ia, analysis_status: "completed" }, { merge: true }).then(() => {
                                        cacheDel(CacheKeys.matchDetail(id));
                                        cacheDel(CacheKeys.matchesList(false));
                                        cacheDel(CacheKeys.matchesList(true));
                                        console.log("[getMatchDetails] Background Gemini IA saved for match:", id, ia);
                                    }).catch((err) => console.warn("[getMatchDetails] Background save IA failed:", err));
                                })
                                .catch((err) => console.warn("[getMatchDetails] Background Gemini IA failed:", err));
                        }
                    }
                }
            }

            let homeWin = matchData.ia?.home ?? matchData.predictions?.homeWinRate ?? null;
            let awayWin = matchData.ia?.away ?? matchData.predictions?.awayWinRate ?? null;

            if ((!homeWin || homeWin === 0) && (!awayWin || awayWin === 0)) {
                homeWin = 50;
                awayWin = 50;
            } else if (!homeWin || homeWin === 0) {
                homeWin = Math.max(0, Math.min(100, 100 - awayWin));
            } else if (!awayWin || awayWin === 0) {
                awayWin = Math.max(0, Math.min(100, 100 - homeWin));
            }

            // Normalize to ensure they sum to 100%
            const total = homeWin + awayWin;
            if (total > 0 && total !== 100) {
                homeWin = (homeWin / total) * 100;
                awayWin = (awayWin / total) * 100;
            }

            homeWin = Math.round(homeWin);
            awayWin = Math.round(awayWin);

            const finalTotal = homeWin + awayWin;
            if (finalTotal !== 100) {
                if (homeWin >= awayWin) {
                    homeWin = 100 - awayWin;
                } else {
                    awayWin = 100 - homeWin;
                }
            }

            homeWin = Math.max(0, Math.min(100, homeWin));
            awayWin = Math.max(0, Math.min(100, awayWin));

            if (matchData.ia) {
                matchData.ia.home = homeWin;
                matchData.ia.away = awayWin;
            }
            if (matchData.predictions) {
                matchData.predictions.homeWinRate = homeWin;
                matchData.predictions.awayWinRate = awayWin;
            }

            // Save match to database
            try {
                const matchRef = doc(db, Tables.matches, id);
                await setDoc(matchRef, matchData, { merge: true });
                console.log("[getMatchDetails] Successfully saved match to database");
                await cacheDel(CacheKeys.matchDetail(id));
                await cacheDel(CacheKeys.matchesList(false));
                await cacheDel(CacheKeys.matchesList(true));
            } catch (error) {
                console.error("[getMatchDetails] Error saving match to database:", error);
            }

            await cacheSet(CacheKeys.matchDetail(id), matchData, 300);
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
                // If match already has analysis, always return it so user sees the same result
                if (matchData.ia && typeof matchData.ia.home === "number" && typeof matchData.ia.away === "number") {
                    return res.json(matchData.ia);
                }
                const hkjcMatch = await ApiHKJCMatchById(id);
                if (hkjcMatch) {
                    const markets = extractHKJCMarkets(hkjcMatch);
                    if (markets.hadHomePct != null) matchData.hadHomePct = markets.hadHomePct;
                    if (markets.hadDrawPct != null) matchData.hadDrawPct = markets.hadDrawPct;
                    if (markets.hadAwayPct != null) matchData.hadAwayPct = markets.hadAwayPct;
                    if (markets.condition) matchData.condition = markets.condition;
                    if (markets.hiloLines?.length) matchData.hiloLines = markets.hiloLines;
                }
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
                    const homeShare = total > 0 ? resultIa.home / total : 0.5;
                    const awayShare = total > 0 ? resultIa.away / total : 0.5;
                    const redistributedHome = resultIa.home + resultIa.draw * homeShare;
                    const redistributedAway = resultIa.away + resultIa.draw * awayShare;
                    matchData.ia = {
                        home: Number(redistributedHome.toFixed(2)),
                        away: Number(redistributedAway.toFixed(2)),
                        draw: resultIa.draw,
                        bestPick: resultIa.bestPick,
                    };
                } else {
                    matchData.ia = CalculationProbality(playersInjured, homeWinRate, awayWinRate, homeForm.split(","), awayForm.split(","));
                }
                await setDoc(matchRef, matchData, { merge: true });
                await cacheDel(CacheKeys.matchDetail(id));
                await cacheDel(CacheKeys.matchesList(false));
                await cacheDel(CacheKeys.matchesList(true));
                const analysisRef = doc(db, Tables.analysis, id);
                await setDoc(analysisRef, { matchId: id, ...matchData.ia }, { merge: true });
                return res.json(matchData.ia);
            }

            return res.status(404).json({ error: 'predictions not found' });

        } catch (error: any) {
            console.error('Error analyzing match:', error.response?.data || error.message);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    /** Get all match analysis from DB/cache only. Triggers background batch worker if some matches need analysis (no Gemini on request). */
    static async getAllMatchAnalysis(req: Request, res: Response) {
        try {
            const refresh = req.query.refresh === "true";
            if (!refresh) {
                const cached = await cacheGet<Record<string, { home: number; away: number; draw: number }>>(CacheKeys.analysisAll());
                if (cached && typeof cached === "object" && Object.keys(cached).length > 0) {
                    if (!res.headersSent) return res.json(cached);
                    return;
                }
            }

            const cutoffTime = new Date(Date.now() - 60 * 60 * 1000);
            const matchesCol = collection(db, Tables.matches);
            const snapshot = await getDocs(matchesCol);
            const analysisMap: Record<string, { home: number; away: number; draw: number; bestPick?: string }> = {};

            for (const docSnap of snapshot.docs) {
                const data = docSnap.data() as Match;
                if (!data.kickOff) continue;
                try {
                    const t = data.kickOff.includes("T") ? new Date(data.kickOff) : new Date(data.kickOff.replace(" ", "T"));
                    if (isNaN(t.getTime()) || t < cutoffTime) continue;
                } catch {
                    continue;
                }
                if (data.ia && typeof data.ia.home === "number" && typeof data.ia.away === "number") {
                    analysisMap[docSnap.id] = {
                        home: data.ia.home,
                        away: data.ia.away,
                        draw: data.ia.draw ?? 0,
                        bestPick: data.ia.bestPick,
                    };
                }
            }

            await cacheSet(CacheKeys.analysisAll(), analysisMap, 300);
            if (!res.headersSent) res.json(analysisMap);

            setImmediate(() => {
                runAnalysisBatch()
                    .then((r) => {
                        if (r.ran && r.processed) console.log("[getAllMatchAnalysis] Background batch processed", r.processed);
                    })
                    .catch((e) => console.warn("[getAllMatchAnalysis] Background batch error:", e));
            });
        } catch (error) {
            console.error("[getAllMatchAnalysis]", error);
            if (!res.headersSent) {
                return res.status(500).json({
                    error: "Failed to get match analysis",
                    message: error instanceof Error ? error.message : String(error),
                });
            }
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
