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
      const res = await API.GET(
        AppGlobal.baseURL + "match/match-data");
      if (res.status === 200 && res.data) return res.data;
    }
  });
};