import { useQuery, UseQueryResult } from "@tanstack/react-query";
import API from "../api/api";
import { Match } from "../models/match";
import AppGlobal from "../ultis/global";

export const useMatchsHome = (
  startDate?: string,
  endDate?: string
): UseQueryResult<Match[], Error> => {
  return useQuery<Match[], Error>({
    queryKey: ["matchsHome", startDate, endDate],
    queryFn: async () => {
      const res = await API.GET(
        AppGlobal.baseURL + "home/matchs");
      if (res.status === 200 && res.data) return res.data;
    }
  });
};