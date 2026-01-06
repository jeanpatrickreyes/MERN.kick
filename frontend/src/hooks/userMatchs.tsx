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
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
};