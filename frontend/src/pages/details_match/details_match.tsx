import AppBarComponent from "../../components/appBar";
import { Loading } from "../../components/loading";
import { useProbability } from "../../hooks/useProbality";
import { useNavigate, useParams } from "react-router-dom";
import LastGameDetailsComponent from "./components/last_games_details";
import DetailsCardComponent from "./components/details_card";
import AppColors from "../../ultis/colors";
import AppAssets from "../../ultis/assets";
import ThemedText from "../../components/themedText";
import AppGlobal from "../../ultis/global";
import API from "../../api/api";
import { Probability } from "../../models/probability";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import useAuthStore from "../../store/userAuthStore";
import HeaderDetailsComponent from "./components/header_details";
import { getTeamNameInCurrentLanguage } from "../../ultis/languageUtils";


function DetailsMatchPage() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { id } = useParams();
    const { data, isLoading, error } = useProbability(id ?? "");
    const [loadingGenerate, setLoadingGenerate] = useState(false);
    const [hasGenerated, setHasGenerated] = useState(false);
    const navigate = useNavigate();
    const { userRole } = useAuthStore();

    useEffect(() => {
        if (!userRole) {
            navigate("/");
        }
    }, [userRole, navigate]);

    // Automatically generate analysis when data loads and doesn't have ia
    useEffect(() => {
        if (!data || hasGenerated || loadingGenerate || !id) return;
        
        // If analysis doesn't exist, try to generate it
        if (!data.ia) {
            // If predictions don't exist, first fetch match details with refresh to get predictions
            if (!data.predictions) {
                setLoadingGenerate(true);
                setHasGenerated(true);
                // Fetch match details with refresh to get predictions and other missing data
                API.GET(AppGlobal.baseURL + "match/match-data/" + id + "?refresh=true")
                    .then((refreshRes) => {
                        if (refreshRes.status === 200 && refreshRes.data) {
                            // Update query data with refreshed data
                            queryClient.setQueryData(['probability', id], refreshRes.data);
                            // If we now have predictions but no analysis, generate analysis
                            if (refreshRes.data.predictions && !refreshRes.data.ia) {
                                return API.GET(AppGlobal.baseURL + "match/match-analyze/" + id)
                                    .then((analyzeRes) => {
                                        if (analyzeRes.status === 200 && analyzeRes.data) {
                                            // Update the query data with the new analysis
                                            queryClient.setQueryData(['probability', id], (oldData: Probability) => {
                                                if (!oldData) return oldData;
                                                return {
                                                    ...oldData,
                                                    ia: analyzeRes.data
                                                };
                                            });
                                        }
                                    });
                            }
                        }
                    })
                    .catch((err) => {
                        console.error('Error fetching/analyzing match:', err);
                        setHasGenerated(false); // Allow retry on error
                    })
                    .finally(() => {
                        setLoadingGenerate(false);
                    });
            } else if (data.predictions) {
                // Predictions exist, just generate analysis
                setHasGenerated(true);
                setLoadingGenerate(true);
                API.GET(AppGlobal.baseURL + "match/match-analyze/" + id)
                    .then((res) => {
                        if (res.status === 200 && res.data) {
                            // Update the query data with the new analysis - this will trigger a re-render
                            queryClient.setQueryData(['probability', id], (oldData: Probability) => {
                                if (!oldData) return oldData;
                                return {
                                    ...oldData,
                                    ia: res.data
                                };
                            });
                        }
                    })
                    .catch((err) => {
                        console.error('Error generating analysis:', err);
                        setHasGenerated(false); // Allow retry on error
                    })
                    .finally(() => {
                        setLoadingGenerate(false);
                    });
            }
        }
    }, [data, hasGenerated, loadingGenerate, id, queryClient]);

    async function generateIA() {
        if (loadingGenerate || hasGenerated || !id) return;
        setLoadingGenerate(true);
        setHasGenerated(true);
        const res = await API.GET(
            AppGlobal.baseURL + "match/match-analyze/" + id);
        if (res.status === 200 && res.data) {
            queryClient.setQueryData(['probability', id], (oldData: Probability) => ({
                ...oldData,
                ia: res.data
            }));
            // Invalidate query to refetch
            queryClient.invalidateQueries({ queryKey: ['probability', id] });
        };
        setLoadingGenerate(false);
    }

    return (
        error ?
            <Loading />
            : isLoading || !data
                ?
                <Loading />
                : <div className="overflow-x-hidden h-screen w-screen">

                    <div className="absolute inset-0 w-full h-full z-[-1]">
                        <div
                            className="absolute inset-0 w-full h-full bg-cover bg-center pointer-events-none"
                            style={{
                                backgroundImage: `url(${AppAssets.background_image})`,
                                opacity: 1,
                            }}
                        ></div>
                        <div
                            className="absolute inset-0"
                            style={{
                                backgroundColor: 'black',
                                opacity: 0.2,
                            }}
                        ></div>
                        <div
                            className="absolute inset-0"
                            style={{
                                backgroundColor: AppColors.primary,
                                opacity: 0.1,
                            }}
                        ></div>
                    </div>

                    <AppBarComponent />
                    <div className="mt-24" >


                        <HeaderDetailsComponent data={data} />


                        {!data.ia && loadingGenerate ?
                            <div style={{ marginTop: 30 }}>

                                <div style={{
                                    flexDirection: "row",
                                    display: "flex",
                                    width: "100%",
                                    marginTop: 10,
                                    marginBottom: 50,
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}>
                                    <div style={{ width: "20%", height: 2, backgroundColor: AppColors.primary }} />

                                    <div
                                        style={{
                                            width: 70, height: 70, backgroundColor: AppColors.primary, borderRadius: 20, justifyContent: "center", display: "flex", marginLeft: 40, marginRight: 40,
                                            alignItems: "center", justifyItems: "center"
                                        }}>
                                        <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                    </div>

                                    <div style={{ width: "20%", height: 2, backgroundColor: AppColors.primary }} />
                                </div>
                            </div>
                        : !data.ia ?
                            <div style={{ marginTop: 30, cursor: "pointer" }}
                                onClick={generateIA}      >

                                <div className="flex items-center justify-center" >
                                    <div className="bg-white rounded-lg p-2 mt-2 flex-row flex items-center justify-center">
                                        <ThemedText
                                            className="font-bold text-[12px] sm:text-[16px] leading-tight"
                                            type="defaultSemiBold"
                                            style={{
                                                color: AppColors.background,
                                            }}
                                        >
                                            {t('generateStats')}
                                        </ThemedText>
                                    </div>
                                </div>


                                <div style={{
                                    flexDirection: "row",
                                    display: "flex",
                                    width: "100%",
                                    marginTop: 10,
                                    marginBottom: 50,
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}>
                                    <div style={{ width: "20%", height: 2, backgroundColor: AppColors.primary }} />

                                    <div
                                        style={{
                                            width: 70, height: 70, backgroundColor: AppColors.primary, borderRadius: 20, justifyContent: "center", display: "flex", marginLeft: 40, marginRight: 40,
                                            alignItems: "center", justifyItems: "center"
                                        }}>
                                        <img
                                            src={AppAssets.ia}
                                            className="w-8"
                                            style={{ filter: "brightness(0) invert(1)" }} />
                                    </div>

                                    <div style={{ width: "20%", height: 2, backgroundColor: AppColors.primary }} />
                                </div>
                            </div> : (data.predictions || data.ia) ?
                                <DetailsCardComponent probability={data} />
                                : <div />
                        }

                        {
                            //  <DetailsInfoComponent probability={data} />
                        }



                        <LastGameDetailsComponent name={getTeamNameInCurrentLanguage(data.homeLanguages, data.homeTeamName)} img={data.homeTeamLogo} lastGames={data.lastGames.homeTeam.recentMatch} />

                        <LastGameDetailsComponent name={getTeamNameInCurrentLanguage(data.awayLanguages, data.awayTeamName)} img={data.awayTeamLogo} lastGames={data.lastGames.awayTeam.recentMatch} />




                        {userRole && (userRole === "admin" || userRole === "subadmin") &&
                            <a
                                href={`/api/match/match-data/generate/${id}`}
                                className="sm:w-2/3 w-5/6 h-16 mt-5 mx-auto bg-[#fc3a45] rounded-xl justify-center items-center flex text-white hover:text-white font-bold text-lg hover:bg-purple-600 transition"
                            >
                                {t('generate_excel')}
                            </a>
                        }



                        <div style={{ height: 30 }} />


                    </div>
                </div >

    );
}
export default DetailsMatchPage;

