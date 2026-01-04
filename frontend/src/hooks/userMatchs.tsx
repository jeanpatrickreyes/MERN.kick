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
      // Add timestamp to bypass HTTP cache
      const url = AppGlobal.baseURL + "match/match-data" + `?_t=${Date.now()}`;
      const res = await API.GET(
        url,
        {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      );
      // Handle both 200 (OK) and 304 (Not Modified) responses
      if ((res.status === 200 || res.status === 304) && res.data) {
        return Array.isArray(res.data) ? res.data : [];
      }
      // If 304 but no data, return empty array (cache might be stale)
      if (res.status === 304) {
        return [];
      }
      throw new Error(`Failed to fetch matches: ${res.status}`);
    },
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache in React Query
  });
};