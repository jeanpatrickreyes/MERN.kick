/**
 * Syncs HKJC API data into the matches collection.
 * Called on website load and every 5 minutes.
 * Only updates match list (id, kickOff, teams, etc.); does not compute predictions or IA.
 */
import { ApiHKJCMatchList } from "../data/api-hkjc";
import { HKJC } from "../model/hkjc.model";
import { Match } from "../model/match.model";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "../database/db";
import { db } from "../firebase/firebase";
import Tables from "../ultis/tables.ultis";
import { cacheDel, CacheKeys } from "../cache/redis";

export async function syncHkjcToMatches(): Promise<void> {
  try {
    const hkjc: HKJC[] = await ApiHKJCMatchList();
    if (hkjc.length === 0) {
      console.log("[syncHkjc] No matches from HKJC API, skipping sync");
      return;
    }

    const validIds = new Set(hkjc.map((m) => m.id));

    // Delete matches that are no longer in HKJC
    const matchesCol = collection(db, Tables.matches);
    const snapshot = await getDocs(matchesCol);
    for (const d of snapshot.docs) {
      const id = d.id;
      if (!validIds.has(id)) {
        await deleteDoc(doc(db, Tables.matches, id));
        console.log("[syncHkjc] Removed match no longer in HKJC:", id);
      }
    }

    // Upsert each HKJC match (merge so we keep existing predictions/ia if present)
    for (const m of hkjc) {
      let matchDate = m.matchDate?.split("+")[0].split("T")[0] ?? "";
      const kickOffTime = m.kickOffTime ?? "";
      let kickOff: string;
      if (kickOffTime && (kickOffTime.includes("T") || kickOffTime.includes(" "))) {
        kickOff = kickOffTime;
      } else {
        kickOff = `${matchDate} ${kickOffTime}`;
      }
      const [y, mo, d] = matchDate.split("-");
      const kickOffDate = mo && d && y ? `${mo}/${d}/${y}` : "";
      const kickOffDateLocal = mo && d && y ? `${d}/${mo}/${y}` : "";

      const matchRef = doc(db, Tables.matches, m.id);
      const existing = await getDoc(matchRef);
      const isNew = !existing.exists();

      const match: Partial<Match> = {
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
      if (isNew) {
        (match as any).analysis_status = "pending";
        (match as any).analysis_updated_at = null;
      }

      await setDoc(matchRef, match, { merge: true });
    }

    console.log("[syncHkjc] Synced", hkjc.length, "matches to DB");
    await cacheDel(CacheKeys.matchesList(false));
    await cacheDel(CacheKeys.matchesList(true));
  } catch (err) {
    console.error("[syncHkjc] Error:", err);
  }
}
