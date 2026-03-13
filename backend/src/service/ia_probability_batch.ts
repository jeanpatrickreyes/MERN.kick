/**
 * Single AI call (Gemini or Grok) for multiple matches. Saves cost and avoids rate limits.
 * Returns one analysis per match (home, away, draw percentages).
 */
import { ResultIA } from "../model/match.model";
import { generateText, getModelName, getProviderName } from "./aiProvider";

export interface MatchForBatch {
  matchId: string;
  home: string;
  away: string;
  kickoff: string;
  /** HKJC real-time 1X2 implied % */
  hadHomePct?: string;
  hadDrawPct?: string;
  hadAwayPct?: string;
  /** HKJC handicap condition */
  condition?: string;
  /** HKJC HiLo lines */
  hiloLines?: { line: string; overPct: string; underPct: string }[];
}

export interface BatchAnalysisItem {
  matchId: string;
  home: number;
  away: number;
  draw: number;
  /** Optional AI recommendation tag for frontend. */
  bestPick?: string;
}

/**
 * Call Gemini once with all matches; returns array of { matchId, home, away, draw }.
 * Invalid or missing entries are omitted from the result.
 */
export async function IaProbabilityBatch(
  matches: MatchForBatch[]
): Promise<BatchAnalysisItem[]> {
  if (matches.length === 0) return [];

  try {
    const listText = matches
      .map((m, i) => {
        const base = `${i + 1}. [${m.matchId}] ${m.home} vs ${m.away} (${m.kickoff})`;
        const odds: string[] = [];
        if (m.hadHomePct != null && m.hadAwayPct != null) {
          odds.push(`1X2: H ${m.hadHomePct}% D ${m.hadDrawPct ?? "—"}% A ${m.hadAwayPct}%`);
        }
        if (m.condition) odds.push(`Handicap: ${m.condition}`);
        if (m.hiloLines?.length) {
          odds.push(
            "HiLo: " +
              m.hiloLines.map((l) => `${l.line} O${l.overPct}% U${l.underPct}%`).join("; ")
          );
        }
        return odds.length ? `${base} | HKJC: ${odds.join(" | ")}` : base;
      })
      .join("\n");

    const prompt = `
你是一個專業足球分析師,專門分析入球大小和比賽結果。你的分析不會看賠率去進行分析,會用最理智的方式去分析。

你必須根據以下因素對每場比賽進行深入分析:
1. 具體天氣狀況 — 比賽當天的天氣如何影響比賽節奏和入球數
2. 具體消耗曲線 — 兩隊近期賽程密度,體能疲勞程度
3. 傷停名單深入分析 — 受傷球員的位置和重要性,對球隊戰術的影響
4. 近期表現趨勢 — 上升還是下滑
5. 主客場表現差異
6. 兩隊歷史交鋒

賽事列表 (HKJC數據僅供參考,不要用賠率作為分析依據):
${listText}

重要規則:
- 分析必須基於球隊實力、狀態、傷停影響、天氣等客觀因素,不是基於賠率
- bestPick 只能從以下4個選項中選擇: OVER_2.5, UNDER_2.5, OVER_3.5, UNDER_3.5
- 選擇你最有信心的入球大小分析
- 給我勝率最高的推薦

Respond ONLY with a JSON array. One object per match in the same order. No other text.
[
  { "matchId": "<id>", "home": number, "away": number, "draw": number, "bestPick": "OVER_2.5" | "UNDER_2.5" | "OVER_3.5" | "UNDER_3.5" },
  ...
]
- home + away + draw = 100 per match.
- Exactly one bestPick per match from the 4 values above. Choose based on deep analysis of goal scoring trends.
`;

    const provider = getProviderName();
    const model = getModelName();
    console.log(`[${provider}] Calling batch API`, { model, matchCount: matches.length });
    const content = await generateText(prompt, {
      systemInstruction:
        "你是一個專業足球分析師,專門分析入球大小和比賽結果。你不會看賠率去分析,會用最理智的方式,根據天氣、消耗曲線、傷停名單進行深入分析。你可以運用你的足球知識來分析球隊實力和狀態。Respond only with a valid JSON array of objects with matchId, home, away, draw (sum 100), bestPick.",
      temperature: 0.2,
    });
    console.log(`[${provider}] Batch API response received`, { model, responseLength: content?.length ?? 0 });
    const jsonStart = content.indexOf("[");
    const jsonEnd = content.lastIndexOf("]");
    if (jsonStart === -1 || jsonEnd === -1) {
      console.warn("[IaProbabilityBatch] No JSON array in response");
      return [];
    }
    const jsonString = content.slice(jsonStart, jsonEnd + 1);
    const parsed = JSON.parse(jsonString) as any[];

    if (!Array.isArray(parsed)) return [];

    const byId = new Map<string, string>();
    matches.forEach((m) => byId.set(m.matchId, m.matchId));

    const results: BatchAnalysisItem[] = [];
    for (let i = 0; i < parsed.length && i < matches.length; i++) {
      const raw = parsed[i];
      const matchId = matches[i].matchId;
      const home = typeof raw?.home === "number" ? raw.home : null;
      const away = typeof raw?.away === "number" ? raw.away : null;
      const draw = typeof raw?.draw === "number" ? raw.draw : 0;
      if (home != null && away != null && home >= 0 && away >= 0) {
        const id = raw?.matchId ?? matchId;
        const bestPick =
          typeof raw?.bestPick === "string" ? raw.bestPick : undefined;
        results.push({
          matchId: String(id),
          home,
          away,
          draw,
          bestPick,
        });
      }
    }
    return results;
  } catch (error: any) {
    const msg = error?.message || String(error);
    const cause = error?.cause ? ` (cause: ${error.cause?.message ?? error.cause})` : "";
    console.error("[IaProbabilityBatch] Error:", msg + cause);
    if (msg.includes("fetch") || msg.includes("ECONNREFUSED") || msg.includes("ETIMEDOUT")) {
      const provider = getProviderName();
      if (provider === "Grok") {
        console.error("[IaProbabilityBatch] Check GROK_API_KEY or XAI_API_KEY in .env. See https://docs.x.ai");
      } else {
        console.error("[IaProbabilityBatch] Check GEMINI_API_KEY in .env and network. See https://ai.google.dev/gemini-api/docs");
      }
    }
    return [];
  }
}

/** Convert BatchAnalysisItem to ResultIA (redistribute draw into home/away like single-match flow). */
export function toResultIA(item: BatchAnalysisItem): ResultIA {
  const total = item.home + item.away;
  const homeShare = total ? item.home / total : 0.5;
  const awayShare = total ? item.away / total : 0.5;
  return {
    home: Number((item.home + item.draw * homeShare).toFixed(2)),
    away: Number((item.away + item.draw * awayShare).toFixed(2)),
    draw: item.draw,
    bestPick: item.bestPick,
  };
}
