/**
 * Extract HAD (主客和), HDC (讓球), and TG (大細 HiLo) from HKJC foPools.
 * Shared by match controller (detail) and analysis worker (batch).
 */
import { HKJC, FoPool, Line, Combination } from "../model/hkjc.model";

export interface HKJCMarkets {
  hadHomePct?: string;
  hadDrawPct?: string;
  hadAwayPct?: string;
  condition?: string;
  hiloLines?: { line: string; overPct: string; underPct: string }[];
}

export function extractHKJCMarkets(hkjcMatch: HKJC): HKJCMarkets {
  const out: HKJCMarkets = {};
  const pools = hkjcMatch.foPools || [];
  const hadPool = pools.find((p: FoPool) => p.oddsType === "HAD");
  if (hadPool && hadPool.lines?.length) {
    const line = hadPool.lines[0];
    const combs = (line.combinations || []) as Combination[];
    const home = { odds: 0 };
    const draw = { odds: 0 };
    const away = { odds: 0 };
    combs.forEach((c: Combination) => {
      const sel = c.selections?.[0];
      const name = (sel?.name_ch || sel?.name_en || "").trim();
      const odds = parseFloat(c.currentOdds || "0");
      if (odds <= 0) return;
      if (name === "主") home.odds = odds;
      else if (name === "和") draw.odds = odds;
      else if (name === "客") away.odds = odds;
    });
    const inv = (o: number) => (o > 0 ? 100 / o : 0);
    const h = inv(home.odds);
    const d = inv(draw.odds);
    const a = inv(away.odds);
    const total = h + d + a;
    if (total > 0) {
      out.hadHomePct = ((h / total) * 100).toFixed(2);
      out.hadDrawPct = ((d / total) * 100).toFixed(2);
      out.hadAwayPct = ((a / total) * 100).toFixed(2);
    }
  }
  const hdcPool = pools.find((p: FoPool) => p.oddsType === "HDC");
  if (hdcPool && hdcPool.lines?.length) {
    const line = hdcPool.lines.find((l: Line) => l.condition);
    if (line?.condition) {
      const more = line.condition.includes("+");
      const regex = new RegExp(more ? "\\+" : "-", "g");
      out.condition = line.condition + "," + line.condition.replace(regex, more ? "-" : "+");
    }
  }
  const tgPool = pools.find((p: FoPool) => p.oddsType === "TG");
  if (tgPool && tgPool.lines?.length) {
    const hilo: { line: string; overPct: string; underPct: string }[] = [];
    (tgPool.lines as Line[]).forEach((l: Line) => {
      const cond = (l.condition || "").trim();
      if (!cond) return;
      const combs = (l.combinations || []) as Combination[];
      let overOdds = 0,
        underOdds = 0;
      combs.forEach((c: Combination) => {
        const sel = c.selections?.[0];
        const name = (sel?.name_ch || sel?.name_en || "").trim();
        const odds = parseFloat(c.currentOdds || "0");
        if (name === "大" || (name && name.toLowerCase().includes("over"))) overOdds = odds;
        else if (name === "細" || (name && name.toLowerCase().includes("under"))) underOdds = odds;
      });
      if (overOdds > 0 && underOdds > 0) {
        const o = 100 / overOdds;
        const u = 100 / underOdds;
        const total = o + u;
        hilo.push({
          line: cond,
          overPct: ((o / total) * 100).toFixed(2),
          underPct: ((u / total) * 100).toFixed(2),
        });
      }
    });
    if (hilo.length) out.hiloLines = hilo;
  }
  return out;
}
