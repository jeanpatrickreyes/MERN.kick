import { useQuery, UseQueryResult } from "@tanstack/react-query";
import API from "../api/api";
import { Match } from "../models/match";
import AppGlobal from "../ultis/global";

export const useMatchs = (
  startDate?: string,
  endDate?: string,
  forceRefresh?: boolean
): UseQueryResult<Match[], Error> => {
  return useQuery<Match[], Error>({
    queryKey: ["matchs", startDate, endDate],
    queryFn: async () => {
      const url = AppGlobal.baseURL + "match/match-data" + (forceRefresh ? "?refresh=true" : "");
      const res = await API.GET(url);
      if (res.status === 200 && res.data) {
        if (Array.isArray(res.data)) return res.data;
        return [];
      }
      if (res.status !== 200) {
        throw new Error(`Failed to fetch matches: ${res.status}`);
      }
      return [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - match data doesn't change that often
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Don't refetch on tab switch
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};