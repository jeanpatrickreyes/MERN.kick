import { useQuery, UseQueryResult } from "@tanstack/react-query";
import API from "../api/api";
import AppGlobal from "../ultis/global";

export const useRecords = (
    page: number,
    limit: number
): UseQueryResult<any, Error> => {
    return useQuery<any, Error>({
        queryKey: ["records", page, limit],
        queryFn: async () => {
            const res = await API.GET(`${AppGlobal.baseURL}records?page=${page}&limit=${limit}`);
            if (res.status === 200 && res.data) return res.data;
            throw new Error("Failed to fetch members");
        },
        staleTime: 2 * 60 * 1000, // Cache records for 2 minutes
        refetchOnMount: false, // Don't block initial render
    });
};