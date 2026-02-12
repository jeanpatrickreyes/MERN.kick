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
    queryKey: ["matchs", startDate, endDate, forceRefresh],
    queryFn: async () => {
      try {
        const url = AppGlobal.baseURL + "match/match-data" + (forceRefresh ? "?refresh=true" : "");
        const res = await API.GET(url);
        console.log('[useMatchs] API response status:', res.status);
        console.log('[useMatchs] API response data type:', typeof res.data);
        console.log('[useMatchs] API response is array:', Array.isArray(res.data));
        
        if (res.status === 200 && res.data) {
          if (Array.isArray(res.data)) {
            console.log('[useMatchs] Returning', res.data.length, 'matches');
            return res.data;
          } else {
            console.warn('[useMatchs] Response data is not an array:', res.data);
            return [];
          }
        }
        
        // Handle error responses
        if (res.status !== 200) {
          console.error('[useMatchs] API returned error status:', res.status, res.data);
          throw new Error(`Failed to fetch matches: ${res.status} - ${res.data?.error || res.data?.message || 'Unknown error'}`);
        }
        
        // If no data, return empty array instead of throwing
        console.warn('[useMatchs] No data in response, returning empty array');
        return [];
      } catch (error) {
        console.error('[useMatchs] Error fetching matches:', error);
        // Return empty array on error instead of throwing to prevent crashes
        // React Query will still mark it as an error state
        throw error;
      }
    },
    staleTime: 10000, // 10 seconds - match data changes frequently (like 111 project)
    refetchInterval: 30000, // Refetch every 30 seconds for live updates (like 111 project)
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    retry: 2, // Retry failed requests
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};