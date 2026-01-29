import { useQuery, UseQueryResult } from "@tanstack/react-query";
import API from "../api/api";
import AppGlobal from "../ultis/global";
import { Config } from "../models/config";

export const useConfig = (): UseQueryResult<Config, Error> => {
    return useQuery<Config, Error>({
        queryKey: ["config"],
        queryFn: async () => {
            const res = await API.GET(`${AppGlobal.baseURL}config`);
            if (res.status === 200 && res.data) return res.data;
            throw new Error("Failed to fetch admins");
        },
        staleTime: 5 * 60 * 1000, // Config doesn't change often, cache for 5 minutes
        refetchOnMount: false, // Don't refetch on mount if data exists
    });
};