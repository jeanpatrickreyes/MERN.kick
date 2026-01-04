import { useTranslation } from "react-i18next";
import ThemedText from "../../../components/themedText";
import { RecentMatch } from "../../../models/probability";
import AppAssets from "../../../ultis/assets";
import AppColors from "../../../ultis/colors";
import { PieChart } from '@mui/x-charts/PieChart';

interface Props {
    img?: string
    name: string
    lastGames: RecentMatch[];
}

function LastGameDetailsComponent({
    img,
    name,
    lastGames
}: Props) {
    const { t } = useTranslation();

    const data = [
        { id: 0, value: lastGames.filter((x) => x.result == "W").length, label: '贏', color: "green" },
        { id: 1, value: lastGames.filter((x) => x.result == "D").length, label: '和', color: "orange" },
        { id: 2, value: lastGames.filter((x) => x.result == "L").length, label: '輸', color: "red" },
    ];

    let golsHome = 0;
    for (let x in lastGames) {
        golsHome = golsHome + parseInt(lastGames[x].score.split(":")[0]);
    }
    let golsAway = 0;
    for (let x in lastGames) {
        golsAway = golsAway + parseInt(lastGames[x].score.split(":")[1]);
    }

    const dataGols = [
        { id: 0, value: golsHome, label: '贏', color: "green" },
        { id: 1, value: golsAway, label: '失球數' }
    ];

    const isMobile = window.innerWidth <= 768;
    return (
        <div className="sm:w-2/3 w-5/6 mx-auto bg-white mt-5 pt-4 pb-1 justify-center flex rounded-lg">

            <div style={{ width: "50%" }}>

                <div className="flex gap-2items-center justify-start ml-8 items-center" style={{ width: "100%", flexDirection: "row" }}>
                    {
                        img
                            ? <img src={img}
                                onError={(e: any) => {
                                    e.target.onerror = null;
                                    e.target.src = AppAssets.logo;
                                }}
                                className="h-10 w-10 sm:h-14 sm:w-14 object-contain mr-2" />
                            : <></>
                    }
                    <div>
                        <ThemedText
                            className="font-bold text-[12px] sm:text-[17px] leading-tight"
                            type="defaultSemiBold"
                            style={{
                                color: AppColors.primary,
                                textAlign: "left",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "normal",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                            }}
                        >
                            {name}
                        </ThemedText>
                    </div>
                </div>

                <div className="h-4" />

                {
                    lastGames.map((x) => {
                        return <div style={{ width: "100%", marginLeft: 20, marginBottom: 5 }}>

                            <div className="flex flex-row h-10 items-center">

                                <div style={{ height: "100%", width: 10, borderRadius: 2, marginRight: 10, backgroundColor: x.result == 'D' ? "orange" : x.result == "L" ? "red" : "green" }} />


                                <ThemedText
                                    className="font-bold text-[8px] sm:text-[14px] leading-tight"
                                    type="defaultSemiBold"
                                    style={{
                                        color: AppColors.background,
                                        textAlign: "right",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "normal",
                                        display: "-webkit-box",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                    }}
                                >
                                    {x.homeTeamName}
                                </ThemedText>


                                <div className="flex-col ml-2 mr-2"
                                    style={{ display: "flex", alignItems: "center", justifyItems: "center", alignContent: "center" }}  >
                                    <ThemedText
                                        type="default"
                                        className="font-bold text-[10px] sm:text-xm"
                                        style={{
                                            color: AppColors.background,
                                            fontWeight: "bold",
                                        }}
                                    >
                                        {x.score}
                                    </ThemedText>
                                    <ThemedText
                                        type="default"
                                        className="font-bold text-[10px] sm:text-xm"
                                        style={{
                                            color: "#eab308",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        {x.kickOff.split(" ")[0]}
                                    </ThemedText>
                                </div>

                                <ThemedText
                                    className="font-bold text-[8px] sm:text-[14px] leading-tight"
                                    type="defaultSemiBold"
                                    style={{
                                        color: AppColors.background,
                                        textAlign: "right",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "normal",
                                        display: "-webkit-box",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                    }}
                                >
                                    {x.awayTeamName}
                                </ThemedText>

                            </div>



                        </div>
                    })
                }
            </div>

            <div
                style={{
                    width: "50%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-around",
                    alignItems: "center",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 0,
                    }}
                >
                    <ThemedText
                        type="defaultSemiBold"
                        style={{
                            color: AppColors.primary,
                            textAlign: "center",
                            marginBottom: 0,
                            lineHeight: 1,
                        }}
                    >
                        {t('resultStatistics')}
                    </ThemedText>

                    <PieChart
                        margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
                        series={[{ data }]}
                        width={isMobile ? 50 : 100}
                        height={isMobile ? 50 : 100}
                    />
                </div>

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 0,
                    }}
                >
                    <ThemedText
                        type="defaultSemiBold"
                        style={{
                            color: AppColors.primary,
                            textAlign: "center",
                            marginBottom: 0,
                            lineHeight: 1,
                        }}
                    >
                        {t('goals')}
                    </ThemedText>

                    <PieChart
                        margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
                        series={[
                            {
                                data: dataGols
                            },
                        ]}
                        width={isMobile ? 50 : 100}
                        height={isMobile ? 50 : 100}

                    />
                </div>
            </div>
        </div >
    );
}

export default LastGameDetailsComponent;