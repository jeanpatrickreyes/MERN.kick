import { getModel } from "../database/models";
import { connectMongo, isMongoEnabled } from "../database/mongodb";
import { IaProbality } from "./ia_probability";
import { CalculationProbality } from "./calculationProbality";
import { ApiTopScoreInjured } from "../data/api-topscore-injured";
import { cacheDel, cacheDelPattern, CacheKeys } from "../cache/redis";
import { Match } from "../model/match.model";

const BATCH_CONCURRENCY = 3;
const MATCHES_COLLECTION = "matches";

export async function runBatchAnalysis(): Promise<void> {
  if (!isMongoEnabled()) {
    console.log("[BatchAnalysis] Skipped (MongoDB not enabled)");
    return;
  }
  try {
    await connectMongo();
    const Model = getModel(MATCHES_COLLECTION);
    const docs = await Model.find({
      "predictions.homeWinRate": { $exists: true },
      $or: [
        { "ia": { $exists: false } },
        { "ia.home": { $exists: false } },
      ],
    }).lean();

    if (docs.length === 0) {
      console.log("[BatchAnalysis] No matches need analysis");
      return;
    }

    console.log("[BatchAnalysis] Starting analysis for", docs.length, "matches");

    const toDoc = (d: any) => {
      const o = d.toObject ? d.toObject() : { ...d };
      if (o._id) {
        o.eventId = o.eventId || String(o._id);
        o.id = String(o._id);
      }
      return o as Match;
    };

    let processed = 0;
    for (let i = 0; i < docs.length; i += BATCH_CONCURRENCY) {
      const chunk = docs.slice(i, i + BATCH_CONCURRENCY);
      await Promise.all(
        chunk.map(async (raw: any) => {
          const match = toDoc(raw);
          const eventId = match.eventId || (raw._id && String(raw._id));
          if (!eventId) return;

          let playersInjured = { home: [] as any[], away: [] as any[] };
          if (
            match.fixture_id &&
            match.league_id &&
            match.homeTeamId &&
            match.awayTeamId &&
            match.kickOff
          ) {
            try {
              playersInjured = await ApiTopScoreInjured(
                match.fixture_id,
                match.league_id,
                match.kickOff.split("-")[0],
                match.homeTeamId,
                match.awayTeamId
              );
            } catch (_) {}
          }

          const homeWinRate = match.predictions?.homeWinRate ?? 50;
          const awayWinRate = match.predictions?.awayWinRate ?? 50;
          const homeForm = (match.homeForm || "").split(",");
          const awayForm = (match.awayForm || "").split(",");

          let ia: { home: number; away: number; draw: number } | null = null;
          const resultIa = await IaProbality(match, playersInjured);
          if (resultIa) {
            const total = resultIa.home + resultIa.away;
            const homeShare = total ? resultIa.home / total : 0.5;
            const awayShare = total ? resultIa.away / total : 0.5;
            ia = {
              home: Number((resultIa.home + resultIa.draw * homeShare).toFixed(2)),
              away: Number((resultIa.away + resultIa.draw * awayShare).toFixed(2)),
              draw: resultIa.draw,
            };
          } else {
            ia = CalculationProbality(
              playersInjured,
              homeWinRate,
              awayWinRate,
              homeForm,
              awayForm
            );
          }

          await Model.updateOne(
            { _id: eventId },
            { $set: { ia } }
          );
          await cacheDel(CacheKeys.matchDetail(eventId));
          processed++;
        })
      );
    }

    console.log("[BatchAnalysis] Done. Processed", processed, "matches");
    await cacheDelPattern("matches:list:*");
  } catch (err) {
    console.error("[BatchAnalysis] Error:", err);
  }
}

export function scheduleBatchAnalysis(): void {
  setImmediate(() => {
    runBatchAnalysis().catch((e) => console.error("[BatchAnalysis] Fatal:", e));
  });
}
