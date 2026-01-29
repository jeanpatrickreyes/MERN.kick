import { useQuery, UseQueryResult } from "@tanstack/react-query";
import API from "../api/api";
import AppGlobal from "../ultis/global";
import { Probability } from "../models/probability";

export const useProbability = (
    id: string
): UseQueryResult<Probability, Error> => {
    return useQuery<Probability, Error>({
        queryKey: ["probability", id],
        queryFn: async () => {
            // Always fetch fresh data by adding refresh parameter
            const res = await API.GET(
                AppGlobal.baseURL + "match/match-data/" + id + "?refresh=true");
            if (res.status === 200 && res.data) return res.data;
            throw new Error(`Failed to fetch match details: ${res.status}`);
        },
        refetchOnMount: true, // Refetch when component mounts
        refetchOnWindowFocus: true, // Refetch when window regains focus
        staleTime: 0, // Always consider data stale to ensure fresh data
        gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    });
};