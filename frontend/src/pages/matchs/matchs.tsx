import { useEffect, useState } from "react";
import AppBarCompoonent from "../../components/appBar";
import ThemedText from "../../components/themedText";
import AppColors from "../../ultis/colors";
import { useMatchs } from "../../hooks/userMatchs";
import { Match } from "../../models/match";
import { Loading } from "../../components/loading";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../store/userAuthStore";
import { useTranslation } from "react-i18next";
import moment from "moment";
import { CardMatch } from "../../components/card_match";
import AppAssets from "../../ultis/assets";
import { getTeamNameInCurrentLanguage } from "../../ultis/languageUtils";


function MatchsPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [days, setDays] = useState<string[]>([]);
    const [matchs, setMatchs] = useState<Match[]>([]);
    const [selectedDay, setSelectedDay] = useState<string>();
    const { userRole } = useAuthStore();

    const { data, isLoading, error } = useMatchs();

    useEffect(() => {
        if (!data) return;
        const allMatches: Match[] = data;
        const dates = getDates(allMatches);
        setDays(dates);
    }, [data]);

    useEffect(() => {
        if (!data) {
            setMatchs([]);
            return;
        }
        const dates = getDates(data);
        getMatch(data, dates);
    }, [data, selectedDay]);

    function getMatch(matches: Match[], dates: string[]) {
        const allMatch: Match[] = matches.map((m) => {
            const dateStr = m.kickOff.split(' ')[0];
            const [_, month, day] = dateStr.split('-');
            const formatted = `${day}/${month}`;
            if (dates.includes(formatted)) {
                m.matchDateFormated = formatted;
            } else {
                m.matchDateFormated = "";
            }
            return m;
        });
        setMatchs(allMatch);
    }


    function getDates(match: Match[]) {
        const datasOrden = match
            .map(item => item.kickOff.split(' ')[0])
            .filter(Boolean)
            .sort((a, b) => b.localeCompare(a));
        const datasUnicas: string[] = [];
        for (const dataStr of datasOrden) {
            const [_, mes, dia] = dataStr.split('-');
            const formatada = `${dia}/${mes}`;
            if (!datasUnicas.includes(formatada)) {
                datasUnicas.push(formatada);
            }
            if (datasUnicas.length >= 10) break;
        }
        return datasUnicas.reverse();
    }

    return (
        error ?
            <Loading />
            : isLoading
                ?
                <Loading />
                : <div className="overflow-x-hidden h-screen">


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


                    <AppBarCompoonent />

                    <div className="w-screen flex flex-col items-start mt-20">
                        <div
                            className="sm:w-2/3 w-5/6 mx-auto bg-white/70 mt-5 rounded justify-center items-center flex flex-wrap gap-2 p-2"
                            style={{
                                backgroundColor: "black",
                                // background: AppStyle.backgroundGradient
                            }}
                        >
                            <div
                                onClick={() => setSelectedDay(undefined)}
                                style={{
                                    backgroundColor: !selectedDay ? AppColors.primary : AppColors.background,
                                }}
                                className="p-4 rounded cursor-pointer transform transition-transform duration-300 hover:scale-105 text-white"
                            >
                                <ThemedText
                                    type="subtitle"
                                    className="text-[10px] sm:text-sm text-white"
                                    colorText="white"
                                >
                                    {t("all")}
                                </ThemedText>
                            </div>

                            {days.map((day, index) => (
                                <div
                                    key={index}
                                    onClick={() => setSelectedDay(day)}
                                    style={{
                                        backgroundColor: selectedDay === day ? AppColors.primary : AppColors.background,
                                    }}
                                    className="p-4 rounded cursor-pointer transform transition-transform duration-300 hover:scale-105 text-white"
                                >
                                    <ThemedText
                                        type="title"
                                        className="text-[10px] sm:text-base font-body text-white"
                                        colorText="white"
                                    >
                                        {day}
                                    </ThemedText>
                                </div>
                            ))}
                        </div>
                    </div>



                    {
                        selectedDay
                            ? <div style={{ marginTop: 20 }}>
                                {matchs
                                    .filter((x) => x.matchDateFormated === selectedDay)
                                    .sort((a, b) =>
                                        moment(a.kickOff, 'YYYY-MM-DD HH:mm').valueOf() -
                                        moment(b.kickOff, 'YYYY-MM-DD HH:mm').valueOf()
                                    )
                                    .map((m) => (
                                        <div className="mb-2 sm:w-2/3 w-5/6 mx-auto">
                                            <CardMatch

                                                widht={"100%"}

                                                key={m.id}
                                                id={m.id}
                                                navigate={navigate}
                                                match={m}
                                                teams={[getTeamNameInCurrentLanguage(m.homeLanguages, m.homeTeamName), getTeamNameInCurrentLanguage(m.awayLanguages, m.awayTeamName)]}
                                            />
                                        </div>
                                    ))}
                            </div>
                            : days.map((d) => {
                                return <div>
                                    <div className="sm:w-2/3 w-5/6 mx-auto items-start flex mb-6 mt-8">

                                        <div className="flex items-start w-screen">
                                            <div className="w-1 bg-red-500 mr-2 self-stretch" />
                                            <div className="flex flex-col justify-center space-y-2 text-white">
                                                <p className="sm:text-2xl text-base sm:h-7 h-6 font-bold">
                                                    {d}
                                                </p>
                                            </div>
                                        </div>

                                    </div>

                                    {matchs
                                        .filter((x) => x.matchDateFormated === d)
                                        .sort((a, b) =>
                                            moment(a.kickOff, 'YYYY-MM-DD HH:mm').valueOf() -
                                            moment(b.kickOff, 'YYYY-MM-DD HH:mm').valueOf()
                                        )
                                        .map((m) => (
                                            <div className="mb-2 sm:w-2/3 w-5/6 mx-auto">
                                                <CardMatch

                                                    widht={"100%"}

                                                    id={m.id}
                                                    key={m.id}
                                                    navigate={navigate}
                                                    match={m}
                                                    teams={[getTeamNameInCurrentLanguage(m.homeLanguages, m.homeTeamName), getTeamNameInCurrentLanguage(m.awayLanguages, m.awayTeamName)]}
                                                />
                                            </div>

                                        ))}


                                </div>
                            })
                    }


                    {userRole && (userRole === "admin" || userRole === "subadmin") &&
                        <a
                            href={`/api/match/match-data/all/generate`}
                            className="sm:w-1/3 w-5/6 h-10 mt-5 mb-5 mx-auto bg-[#fc3a45] rounded-xl justify-center items-center flex text-white hover:text-white font-bold text-lg hover:bg-purple-600 transition"
                        >
                            {t('generate_excel')}
                        </a>
                    }

                </div >




    );
}
export default MatchsPage

