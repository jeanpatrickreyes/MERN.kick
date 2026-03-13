/**
 * Ensures analysis exists in the analysis collection for matches.
 * When user opens 比賽 page, we get matches from DB and call this to get/fill analysis (Gemini).
 */
import { collection, doc, getDoc, getDocs, setDoc } from "../database/db";
import { db } from "../firebase/firebase";
import Tables from "../ultis/tables.ultis";
import { Match } from "../model/match.model";
import { ResultIA } from "../model/match.model";
import { IaProbality } from "./ia_probability";
import { CalculationProbality } from "./calculationProbality";
import { ApiTopScoreInjured } from "../data/api-topscore-injured";
import API from "../api/api";
import Global from "../ultis/global.ultis";
import { GetFixture } from "./getFixture";
import { Predictions } from "./predictions";
import { matchTeamSimilarity } from "./similarity";
import { ApiFixtureByDate } from "../data/api-fixture";
import { FootyLogicRecentForm } from "../model/footylogic_recentform.model";

const CONCURRENCY = 2;

function parseToInformationForm(resultRecentForm: FootyLogicRecentForm, home: string, away: string) {
  const matchesAway = resultRecentForm.recent8Results.awayTeam;
  const teamFormAway = matchesAway.map((m: any) => m.fullTimeResult).join(",");
  const countResults = (res: string) => matchesAway.filter((m: any) => m.fullTimeResult === res).length;
  const recentMatch = matchesAway.map((match: any) => ({
    homeTeamName: away,
    awayTeamName: match.oppTeamName,
    kickOff: match.kickOff,
    competitionName: match.competitionName,
    score: match.fullTimeScore,
    result: match.fullTimeResult,
  }));
  const awayTeam = {
    recentMatch,
    teamPlayed: matchesAway.length.toString(),
    teamWin: countResults("W").toString(),
    teamDraw: countResults("D").toString(),
    teamLoss: countResults("L").toString(),
    teamGoalsFor: matchesAway.reduce((sum: number, m: any) => {
      const [gf] = m.fullTimeScore.split(":").map(Number);
      return sum + (gf || 0);
    }, 0).toString(),
    teamGoalsAway: matchesAway.reduce((sum: number, m: any) => {
      const [, ga] = m.fullTimeScore.split(":").map(Number);
      return sum + (ga || 0);
    }, 0).toString(),
    teamForm: teamFormAway,
  };

  const matchesHome = resultRecentForm.recent8Results.homeTeam;
  const teamFormHome = matchesHome.map((m: any) => m.fullTimeResult).join(",");
  const countResultsHome = (res: string) => matchesHome.filter((m: any) => m.fullTimeResult === res).length;
  const recentMatchHome = matchesHome.map((match: any) => ({
    homeTeamName: home,
    awayTeamName: match.oppTeamName,
    kickOff: match.kickOff,
    competitionName: match.competitionName,
    score: match.fullTimeScore,
    result: match.fullTimeResult,
  }));
  const homeTeam = {
    recentMatch: recentMatchHome,
    teamPlayed: matchesHome.length.toString(),
    teamWin: countResultsHome("W").toString(),
    teamDraw: countResultsHome("D").toString(),
    teamLoss: countResultsHome("L").toString(),
    teamGoalsFor: matchesHome.reduce((sum: number, m: any) => {
      const [gf] = m.fullTimeScore.split(":").map(Number);
      return sum + (gf || 0);
    }, 0).toString(),
    teamGoalsAway: matchesHome.reduce((sum: number, m: any) => {
      const [, ga] = m.fullTimeScore.split(":").map(Number);
      return sum + (ga || 0);
    }, 0).toString(),
    teamForm: teamFormHome,
  };
  return { homeTeam, awayTeam };
}

/** Enrich match from FootyLogic (details, form, fixture, predictions) and save to DB. */
async function enrichMatch(matchId: string, matchData: Match): Promise<Match> {
  let fixture_id = matchData.fixture_id;
  if (!fixture_id && matchData.homeTeamNameEn && matchData.awayTeamNameEn && matchData.kickOffDate) {
    try {
      const [month, day, year] = matchData.kickOffDate.split("/");
      if (month && day && year) {
        const formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        const team = await ApiFixtureByDate(formattedDate);
        if (team && Array.isArray(team) && team.length > 0) {
          const fixture = await matchTeamSimilarity(team, matchData.homeTeamNameEn, matchData.awayTeamNameEn);
          if (fixture?.id) {
            fixture_id = fixture.id;
            matchData.fixture_id = fixture.id;
            matchData.league_id = fixture.league_id;
            if (fixture.homeLogo && !matchData.homeTeamLogo) matchData.homeTeamLogo = fixture.homeLogo;
            if (fixture.awayLogo && !matchData.awayTeamLogo) matchData.awayTeamLogo = fixture.awayLogo;
          }
        }
      }
    } catch (_) {}
  }
  const resultDetails = await API.GET(Global.footylogicDetails + matchId).catch(() => ({ status: 500, data: null }));
  if (resultDetails.status === 200 && resultDetails.data?.statusCode === 200) {
    const d = resultDetails.data.data;
    if (d.homeTeamLogo && d.awayTeamLogo) {
      matchData.homeTeamLogo = Global.footylogicImg + d.homeTeamLogo + ".png";
      matchData.awayTeamLogo = Global.footylogicImg + d.awayTeamLogo + ".png";
    }
    matchData.homeTeamNameEn = d.homeTeamName || matchData.homeTeamNameEn;
    matchData.awayTeamNameEn = d.awayTeamName || matchData.awayTeamNameEn;
    matchData.homeTeamId = d.homeTeamId;
    matchData.awayTeamId = d.awayTeamId;
    if (d.homeTeamId && d.awayTeamId) {
      const resultLastGames = await API.GET(
        Global.footylogicRecentForm +
          "&homeTeamId=" + d.homeTeamId +
          "&awayTeamId=" + d.awayTeamId +
          "&marketGroupId=1&optionIdH=1&optionIdA=1&mode=1"
      ).catch(() => ({ status: 500, data: null }));
      if (resultLastGames.status === 200 && resultLastGames.data?.statusCode === 200) {
        const formData = resultLastGames.data.data;
        matchData.lastGames = parseToInformationForm(formData, matchData.homeTeamName ?? "", matchData.awayTeamName ?? "");
        matchData.homeForm = (matchData.lastGames as any).homeTeam?.teamForm ?? matchData.homeForm ?? "";
        matchData.awayForm = (matchData.lastGames as any).awayTeam?.teamForm ?? matchData.awayForm ?? "";
      }
    }
  }
  if (fixture_id && !matchData.predictions) {
    try {
      const predictions = await Predictions(fixture_id);
      if (predictions) matchData.predictions = predictions;
    } catch (_) {}
  }
  const matchRef = doc(db, Tables.matches, matchId);
  await setDoc(matchRef, matchData, { merge: true });
  return matchData;
}

/** Compute IA for a match and save to analysis collection. */
async function computeAndSaveAnalysis(matchId: string, matchData: Match): Promise<ResultIA | null> {
  const homeForm = matchData.homeForm || "";
  const awayForm = matchData.awayForm || "";
  let playersInjured = { home: [] as any[], away: [] as any[] };
  if (
    matchData.fixture_id &&
    matchData.league_id &&
    matchData.homeTeamId &&
    matchData.awayTeamId &&
    matchData.kickOff
  ) {
    try {
      playersInjured = await ApiTopScoreInjured(
        matchData.fixture_id,
        matchData.league_id,
        matchData.kickOff.split("-")[0],
        matchData.homeTeamId,
        matchData.awayTeamId
      );
    } catch (_) {}
  }
  const homeWinRate = matchData.predictions?.homeWinRate ?? 50;
  const awayWinRate = matchData.predictions?.awayWinRate ?? 50;
  let ia: ResultIA | null = null;
  if (homeForm && awayForm) {
    const resultIa = await IaProbality(matchData, playersInjured);
    if (resultIa) {
      const total = resultIa.home + resultIa.away;
      const homeShare = total ? resultIa.home / total : 0.5;
      const awayShare = total ? resultIa.away / total : 0.5;
      ia = {
        home: Number((resultIa.home + resultIa.draw * homeShare).toFixed(2)),
        away: Number((resultIa.away + resultIa.draw * awayShare).toFixed(2)),
        draw: resultIa.draw,
        bestPick: resultIa.bestPick,
      };
    } else {
      ia = CalculationProbality(
        playersInjured,
        homeWinRate,
        awayWinRate,
        homeForm.split(","),
        awayForm.split(",")
      );
    }
  } else {
    ia = CalculationProbality(playersInjured, homeWinRate, awayWinRate, [], []);
  }
  if (ia) {
    const analysisRef = doc(db, Tables.analysis, matchId);
    await setDoc(analysisRef, { matchId, ...ia });
  }
  return ia;
}

export type AnalysisMap = Record<string, ResultIA>;

/** Get or create analysis for all future matches. Returns map matchId -> { home, away, draw, bestPick? }. */
export async function ensureAllMatchAnalysis(): Promise<AnalysisMap> {
  const cutoffTime = new Date(Date.now() - 60 * 60 * 1000);
  const matchesCol = collection(db, Tables.matches);
  const matchesSnap = await getDocs(matchesCol);
  const matchIds: string[] = [];
  const matchesData: Record<string, Match> = {};
  for (const docSnap of matchesSnap.docs) {
    const data = docSnap.data() as Match;
    if (!data.kickOff) continue;
    try {
      const t = data.kickOff.includes("T") ? new Date(data.kickOff) : new Date(data.kickOff.replace(" ", "T"));
      if (!isNaN(t.getTime()) && t >= cutoffTime) {
        matchIds.push(docSnap.id);
        matchesData[docSnap.id] = { ...data, eventId: docSnap.id } as Match;
      }
    } catch (_) {}
  }

  const analysisCol = collection(db, Tables.analysis);
  const analysisSnap = await getDocs(analysisCol);
  const result: AnalysisMap = {};
  for (const docSnap of analysisSnap.docs) {
    const d = docSnap.data();
    if (d.home != null && d.away != null) {
      result[docSnap.id] = {
        home: d.home,
        away: d.away,
        draw: d.draw ?? 0,
        bestPick: d.bestPick,
      };
    }
  }

  const missing = matchIds.filter((id) => !result[id]);
  if (missing.length === 0) {
    console.log("[ensureMatchAnalysis] All", matchIds.length, "matches already have analysis");
    return result;
  }
  console.log("[ensureMatchAnalysis] Generating analysis for", missing.length, "matches (Gemini may take a while)");

  for (let i = 0; i < missing.length; i += CONCURRENCY) {
    const chunk = missing.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (matchId) => {
        try {
          let matchData = matchesData[matchId];
          if (!matchData) {
            const matchRef = doc(db, Tables.matches, matchId);
            const snap = await getDoc(matchRef);
            if (!snap.exists()) return;
            matchData = snap.data() as Match;
          }
          const needsEnrich = !matchData.predictions || !matchData.homeForm || !matchData.awayForm;
          if (needsEnrich) {
            matchData = await enrichMatch(matchId, { ...matchData });
          }
          const ia = await computeAndSaveAnalysis(matchId, matchData);
          if (ia) result[matchId] = ia;
        } catch (err) {
          console.warn("[ensureMatchAnalysis] Failed for", matchId, err);
        }
      })
    );
  }
  console.log("[ensureMatchAnalysis] Done. Total analysis count:", Object.keys(result).length);
  return result;
}
