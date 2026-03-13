import { Match, ResultIA } from "../model/match.model";
import { generateText, getModelName, getProviderName } from "./aiProvider";

export async function IaProbality(match: Match, playersInjured: any): Promise<ResultIA | null> {
  try {
    const matchDataInput = {
      data: match.kickOff.split(" ")[0],
      home: {
        name: match.homeTeamNameEn || match.homeTeamName,
        last5Matches: match.homeForm.split(",").slice(0, 5),
        averageGoals: match.lastGames
          ? Number(match.lastGames.homeTeam.teamGoalsFor) / Number(match.lastGames.homeTeam.teamPlayed)
          : null,
        winRate: match.lastGames
          ? (Number(match.lastGames.homeTeam.teamWin) / Number(match.lastGames.homeTeam.teamPlayed)) * 100
          : null,
      },
      away: {
        name: match.awayTeamNameEn || match.awayTeamName,
        last5Matches: match.awayForm.split(",").slice(0, 5),
        averageGoals: match.lastGames
          ? Number(match.lastGames.awayTeam.teamGoalsFor) / Number(match.lastGames.awayTeam.teamPlayed)
          : null,
        winRate: match.lastGames
          ? (Number(match.lastGames.awayTeam.teamWin) / Number(match.lastGames.awayTeam.teamPlayed)) * 100
          : null,
      },
    };
    const injuredHome = playersInjured.home.length;
    const injuredAway = playersInjured.away.length;

    const hadHome = match.hadHomePct ?? match.predictions?.homeWinRate;
    const hadAway = match.hadAwayPct ?? match.predictions?.awayWinRate;
    const hadDraw = match.hadDrawPct;
    const hkjc1x2 =
      hadHome != null && hadAway != null
        ? `HKJC 1X2 (real-time implied %): Home ${hadHome}%, Draw ${hadDraw ?? "—"}%, Away ${hadAway}%.`
        : "";
    const hkjcHandicap = match.condition ? `HKJC Handicap: ${match.condition}.` : "";
    const hkjcHilo =
      match.hiloLines?.length
        ? "HKJC HiLo: " +
          match.hiloLines.map((l) => `${l.line} — Over ${l.overPct}%, Under ${l.underPct}%`).join("; ") +
          "."
        : "";
    const hkjcBlock = [hkjc1x2, hkjcHandicap, hkjcHilo].filter(Boolean).join(" ");

    const prompt = `
你是一個專業足球分析師,專門分析入球大小和比賽結果。你的分析不會看賠率去進行分析,會用最理智的方式去分析。

你必須根據以下因素進行深入分析:
1. 具體天氣狀況 — 比賽當天的天氣(雨、風、高溫等)如何影響比賽節奏和入球數
2. 具體消耗曲線 — 兩隊近期賽程密度,是否有體能疲勞,上一場比賽間隔天數
3. 傷停名單進行更深入的球員分析 — 不只是數量,要分析受傷球員的位置和重要性(例如主力前鋒受傷vs替補後衛受傷影響完全不同)
4. 近5場表現趨勢 — 是上升趨勢還是下滑趨勢
5. 主客場表現差異
6. 兩隊歷史交鋒記錄

比賽資料:
- 日期: ${matchDataInput.data}
- 主隊: ${matchDataInput.home.name}
  - 近5場: ${matchDataInput.home.last5Matches.join(", ")}
  - 場均入球: ${matchDataInput.home.averageGoals}
  - 勝率: ${matchDataInput.home.winRate ? matchDataInput.home.winRate.toFixed(1) + "%" : "N/A"}
  - 傷停人數: ${injuredHome}
- 客隊: ${matchDataInput.away.name}
  - 近5場: ${matchDataInput.away.last5Matches.join(", ")}
  - 場均入球: ${matchDataInput.away.averageGoals}
  - 勝率: ${matchDataInput.away.winRate ? matchDataInput.away.winRate.toFixed(1) + "%" : "N/A"}
  - 傷停人數: ${injuredAway}
${hkjcBlock ? `\nHKJC 參考數據（僅供參考,不要用賠率作為分析依據）: ${hkjcBlock}\n` : ""}

重要規則:
- 你的分析必須基於球隊實力、狀態、傷停影響、天氣等客觀因素,不是基於賠率
- bestPick 只能從以下4個選項中選擇: OVER_2.5, UNDER_2.5, OVER_3.5, UNDER_3.5
- 選擇你最有信心的入球大小分析,勝率要高
- 如果你對任何選項都沒有足夠信心,仍然選擇最有把握的一個

Respond ONLY with this JSON (no other text):
{
  "home": number,
  "away": number,
  "draw": number,
  "bestPick": "OVER_2.5" | "UNDER_2.5" | "OVER_3.5" | "UNDER_3.5"
}
- home + away + draw = 100.
- Exactly one bestPick from the 4 values above. Choose based on your deep analysis of goal scoring trends.
`;

    const provider = getProviderName();
    const model = getModelName();
    console.log(`[${provider}] Calling single-match API`, { model, matchId: match.id || match.eventId, home: match.homeTeamNameEn || match.homeTeamName, away: match.awayTeamNameEn || match.awayTeamName });
    const content = await generateText(prompt, {
      systemInstruction: "你是一個專業足球分析師,專門分析入球大小和比賽結果。你不會看賠率去分析,會用最理智的方式,根據天氣、消耗曲線、傷停名單進行深入分析。你可以運用你的足球知識來分析球隊實力和狀態。Respond only with valid JSON.",
      temperature: 0.2,
    });
    console.log(`[${provider}] Single-match API response received`, { model, responseLength: content?.length ?? 0 });

    const jsonStart = content.indexOf("{");
    const jsonEnd = content.lastIndexOf("}");
    const jsonString = content.slice(jsonStart, jsonEnd + 1);
    const parsed = JSON.parse(jsonString);

    if (
      typeof parsed.home !== "number" ||
      typeof parsed.away !== "number" ||
      typeof parsed.draw !== "number"
    ) {
      return null;
    }

    const result: ResultIA = {
      home: parsed.home,
      away: parsed.away,
      draw: parsed.draw,
      bestPick: typeof parsed.bestPick === "string" ? parsed.bestPick : undefined,
    };

    return result;
  } catch (error: any) {
    console.error("IaProbality error:", error.message || error);
    return null;
  }
}
