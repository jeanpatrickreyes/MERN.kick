import { useQuery, UseQueryResult } from "@tanstack/react-query";
import API from "../api/api";
import AppGlobal from "../ultis/global";

export const useVIP = (): UseQueryResult<boolean, Error> => {
    return useQuery<boolean, Error>({
        queryKey: ["vip-status"],
        queryFn: async () => {
            const res = await API.GET(AppGlobal.baseURL + "user/verify/vip");
            return res.status === 200;
        },
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
        refetchOnMount: true,
    });
};

