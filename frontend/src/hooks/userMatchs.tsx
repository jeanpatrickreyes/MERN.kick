import { useQuery, UseQueryResult } from "@tanstack/react-query";
import API from "../api/api";
import { Match } from "../models/match";
import AppGlobal from "../ultis/global";

export const useMatchs = (
  startDate?: string,
  endDate?: string
): UseQueryResult<Match[], Error> => {
  return useQuery<Match[], Error>({
    queryKey: ["matchs", startDate, endDate],
    queryFn: async () => {
      const url = AppGlobal.baseURL + "match/match-data";
      const res = await API.GET(url);
      if (res.status === 200 && res.data) {
        return Array.isArray(res.data) ? res.data : [];
      }
      throw new Error(`Failed to fetch matches: ${res.status}`);
    },
    staleTime: 10000, // 10 seconds - match data changes frequently (like 111 project)
    refetchInterval: 30000, // Refetch every 30 seconds for live updates (like 111 project)
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
};