/**
 * Production analysis flow:
 * - Find matches that need analysis (pending or stale > 1h)
 * - Acquire Redis lock to prevent duplicate Gemini calls
 * - Call Gemini once (batch) for all such matches
 * - Save results to MongoDB, invalidate Redis cache
 * - When Gemini fails or returns no result for a match, use predictions/HKJC odds from DB
 *   so we never persist 50/50 when we have real odds.
 */
import { collection, doc, getDoc, getDocs, updateDoc } from "../database/db";
import { db } from "../firebase/firebase";
import Tables from "../ultis/tables.ultis";
import { acquireLock, releaseLock, cacheDel, CacheKeys } from "../cache/redis";
import {
  IaProbabilityBatch,
  toResultIA,
  MatchForBatch,
} from "./ia_probability_batch";
import { CalculationProbality } from "./calculationProbality";
import { ResultIA } from "../model/match.model";
import { ApiHKJC } from "../data/api-hkjc";
import { extractHKJCMarkets } from "./hkjcMarkets";

const LOCK_TTL_SECONDS = 120; // Lock held for up to 2 min during batch

/**
 * Find match IDs that need analysis: no analysis yet, or analysis older than STALE_MS.
 * Includes all matches with valid kickOff (so every HKJC match can get analysis).
 */
async function getMatchIdsNeedingAnalysis(): Promise<
  { matchId: string; home: string; away: string; kickoff: string }[]
> {
  const matchesCol = collection(db, Tables.matches);
  const snapshot = await getDocs(matchesCol);
  const out: { matchId: string; home: string; away: string; kickoff: string }[] = [];

  for (const d of snapshot.docs) {
    const data = d.data();
    const kickOff = data?.kickOff;
    if (!kickOff) continue;
    let kickTime: Date;
    try {
      kickTime = kickOff.includes("T")
        ? new Date(kickOff)
        : new Date(kickOff.replace(" ", "T"));
    } catch {
      continue;
    }
    if (isNaN(kickTime.getTime())) continue;

    // Once a match has completed analysis (ia), never overwrite it
    if (data?.analysis_status === "completed" && data?.ia) continue;

    const home =
      data?.homeTeamNameEn || data?.homeTeamName || "Home";
    const away =
      data?.awayTeamNameEn || data?.awayTeamName || "Away";
    out.push({
      matchId: d.id,
      home,
      away,
      kickoff: kickOff,
    });
  }

  return out;
}

/**
 * Run one batch: lock → find pending/stale → Gemini batch → save to Mongo → invalidate cache.
 * Safe to call from cron or on-demand; only one run at a time globally (Redis lock).
 */
export async function runAnalysisBatch(): Promise<{
  ran: boolean;
  reason?: string;
  processed?: number;
}> {
  const toAnalyze = await getMatchIdsNeedingAnalysis();
  if (toAnalyze.length === 0) {
    return { ran: false, reason: "no matches need analysis" };
  }

  const locked = await acquireLock(
    CacheKeys.analysisBatchLock(),
    LOCK_TTL_SECONDS
  );
  if (!locked) {
    return { ran: false, reason: "analysis already running (lock held)" };
  }

  try {
    let hkjcMap = new Map<string, ReturnType<typeof extractHKJCMarkets>>();
    try {
      const hkjc = await ApiHKJC();
      hkjc.forEach((h) => {
        if (h.id) hkjcMap.set(h.id, extractHKJCMarkets(h));
      });
    } catch (e) {
      console.warn("[analysisWorker] HKJC fetch failed, batch will run without odds:", (e as Error)?.message);
    }

    const matchesForBatch: MatchForBatch[] = toAnalyze.map((m) => {
      const markets = hkjcMap.get(m.matchId);
      return {
        matchId: m.matchId,
        home: m.home,
        away: m.away,
        kickoff: m.kickoff,
        ...(markets?.hadHomePct && { hadHomePct: markets.hadHomePct }),
        ...(markets?.hadDrawPct && { hadDrawPct: markets.hadDrawPct }),
        ...(markets?.hadAwayPct && { hadAwayPct: markets.hadAwayPct }),
        ...(markets?.condition && { condition: markets.condition }),
        ...(markets?.hiloLines?.length && { hiloLines: markets.hiloLines }),
      };
    });

    const results = await IaProbabilityBatch(matchesForBatch);
    const now = new Date();
    const resultById = new Map(results.map((r) => [String(r.matchId), r]));

    /**
     * When Gemini returns no result for a match, compute IA from DB (predictions or HKJC odds)
     * so we never persist 50/50 when we have real data.
     */
    function fallbackIAFromMatchData(data: any): ResultIA | null {
      if (!data) return null;
      let homePct: number | null = null;
      let awayPct: number | null = null;
      if (data.predictions?.homeWinRate != null && data.predictions?.awayWinRate != null) {
        homePct = Number(data.predictions.homeWinRate);
        awayPct = Number(data.predictions.awayWinRate);
      } else if (data.hadHomePct != null && data.hadAwayPct != null) {
        homePct = parseFloat(data.hadHomePct);
        awayPct = parseFloat(data.hadAwayPct);
      }
      if (homePct == null || awayPct == null || Number.isNaN(homePct) || Number.isNaN(awayPct)) return null;
      const total = homePct + awayPct;
      if (total <= 0) return null;
      const homeForm = (data.homeForm || "").toString().split(",").filter(Boolean);
      const awayForm = (data.awayForm || "").toString().split(",").filter(Boolean);
      try {
        return CalculationProbality(
          data.playersInjured ?? { home: [], away: [] },
          homePct,
          awayPct,
          homeForm,
          awayForm
        );
      } catch {
        return { home: (homePct / total) * 100, away: (awayPct / total) * 100, draw: 0 };
      }
    }

    // Load full match docs only for matches missing Gemini result (for fallback)
    const missingIds = toAnalyze.filter((m) => !resultById.has(String(m.matchId))).map((m) => m.matchId);
    const fallbackByMatchId = new Map<string, ResultIA | null>();
    if (missingIds.length > 0) {
      const BATCH = 30;
      for (let i = 0; i < missingIds.length; i += BATCH) {
        const chunk = missingIds.slice(i, i + BATCH);
        const snaps = await Promise.all(chunk.map((id) => getDoc(doc(db, Tables.matches, id))));
        snaps.forEach((snap, idx) => {
          const matchId = chunk[idx];
          if (snap.exists()) {
            const ia = fallbackIAFromMatchData(snap.data());
            if (ia) fallbackByMatchId.set(matchId, ia);
          }
        });
      }
    }

    for (const m of toAnalyze) {
      const item = resultById.get(String(m.matchId));
      let ia: ResultIA;
      if (item) {
        ia = toResultIA(item);
      } else {
        const fallback = fallbackByMatchId.get(m.matchId) ?? null;
        if (fallback) {
          ia = fallback;
        } else {
          console.warn("[analysisWorker] No Gemini result and no predictions/had for", m.matchId, m.home, "vs", m.away, "- skipping update (no 50/50)");
          continue;
        }
      }
      const matchRef = doc(db, Tables.matches, m.matchId);
      try {
        await updateDoc(matchRef, {
          ia,
          analysis_status: "completed",
          analysis_updated_at: now,
        });
        await cacheDel(CacheKeys.matchDetail(m.matchId));
      } catch (e) {
        console.warn("[analysisWorker] Update failed for", m.matchId, e);
      }
    }

    await cacheDel(CacheKeys.matchesList(false));
    await cacheDel(CacheKeys.matchesList(true));
    await cacheDel(CacheKeys.analysisAll());

    console.log(
      "[analysisWorker] Batch done. Analyzed:",
      toAnalyze.length,
      "matches (Gemini returned",
      results.length,
      ")"
    );
    return { ran: true, processed: toAnalyze.length };
  } finally {
    await releaseLock(CacheKeys.analysisBatchLock());
  }
}
