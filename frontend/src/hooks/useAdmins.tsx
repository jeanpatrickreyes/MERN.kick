import { useQuery, UseQueryResult } from "@tanstack/react-query";
import API from "../api/api";
import AppGlobal from "../ultis/global";

export const useAdmins = (
    page: number,
    limit: number
): UseQueryResult<any, Error> => {
    return useQuery<any, Error>({
        queryKey: ["admins", page, limit],
        queryFn: async () => {
            const res = await API.GET(`${AppGlobal.baseURL}admin/admins?page=${page}&limit=${limit}`);
            if (res.status === 200 && res.data) return res.data;
            throw new Error("Failed to fetch admins");
        },
    });
};