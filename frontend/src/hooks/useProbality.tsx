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
            const res = await API.GET(
                AppGlobal.baseURL + "match/match-data/" + id);
            if (res.status === 200 && res.data) return res.data;
            throw new Error(`Failed to fetch match details: ${res.status}`);
        },
        refetchOnMount: true, // Refetch when component mounts
        refetchOnWindowFocus: true, // Refetch when window regains focus
        staleTime: 30 * 1000, // Consider data fresh for 30 seconds (reduced for production)
        gcTime: 60 * 1000, // Keep in cache for 1 minute (reduced for production)
    });
};