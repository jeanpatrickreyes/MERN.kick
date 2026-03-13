/**
 * Fetch team logos for matches that don't have them (api-sports.io via GetFixture).
 * Used when building the match list so logos show like in topx-betting-mern.
 */
import { db, doc, setDoc } from "../database/db";
import Tables from "../ultis/tables.ultis";
import { GetFixture } from "./getFixture";

const CONCURRENCY = 4;

type MatchItem = {
  id: string;
  kickOffDate?: string;
  kickOffDateLocal?: string;
  homeTeamNameEn?: string;
  awayTeamNameEn?: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  [key: string]: any;
};

/** Process items in chunks with concurrency limit */
async function runWithLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    const chunkResults = await Promise.all(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
}

/**
 * For each match in the list missing logos, call GetFixture and merge logos.
 * Updates DB so next list load has logos from cache.
 */
export async function fetchLogosForList(list: MatchItem[]): Promise<MatchItem[]> {
  const needLogos = list.filter(
    (m) => !m.homeTeamLogo || !m.awayTeamLogo
  );

  if (needLogos.length === 0) return list;

  const listById = new Map(list.map((m) => [m.id, m]));

  const results = await runWithLimit(needLogos, CONCURRENCY, async (m) => {
    const matchForFixture = {
      id: m.id,
      kickOffDate: m.kickOffDate || m.kickOffDateLocal,
      homeTeamNameEn: m.homeTeamNameEn || "",
      awayTeamNameEn: m.awayTeamNameEn || "",
    };
    const fixture = await GetFixture(matchForFixture as any);
    if (!fixture || (!fixture.homeLogo && !fixture.awayLogo)) return { id: m.id, home: "", away: "" };
    return {
      id: m.id,
      home: fixture.homeLogo || "",
      away: fixture.awayLogo || "",
    };
  });

  for (const r of results) {
    if (!r.home && !r.away) continue;
    const row = listById.get(r.id);
    if (!row) continue;
    if (r.home && !row.homeTeamLogo) row.homeTeamLogo = r.home;
    if (r.away && !row.awayTeamLogo) row.awayTeamLogo = r.away;
    try {
      const matchRef = doc(db, Tables.matches, r.id);
      await setDoc(
        matchRef,
        {
          homeTeamLogo: row.homeTeamLogo,
          awayTeamLogo: row.awayTeamLogo,
        },
        { merge: true }
      );
    } catch (e) {
      console.warn("[fetchLogosForList] Failed to save logos for", r.id, e);
    }
  }

  return list;
}
