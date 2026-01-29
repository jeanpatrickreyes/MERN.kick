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
        console.log('[MatchsPage] Total matches received:', allMatches.length);
        // Log unique dates found
        const uniqueDates = [...new Set(allMatches.map(m => m.kickOff?.split(' ')[0]).filter(Boolean))];
        console.log('[MatchsPage] Unique dates in matches:', uniqueDates);
        const dates = getDates(allMatches);
        console.log('[MatchsPage] Formatted dates for display:', dates);
        setDays(dates);
    }, [data]);

    useEffect(() => {
        if (!data) {
            setMatchs([]);
            return;
        }
        getMatch(data);
    }, [data, selectedDay]);

    function getMatch(matches: Match[]) {
        // Like 111 project: backend already filters past matches, so we just format dates
        // No additional filtering needed on frontend
        const allMatch: Match[] = matches
            .filter((m) => {
                // Only filter out matches with invalid kickOff dates
                if (!m.kickOff) return false;
                try {
                    // Handle both "YYYY-MM-DD HH:mm" and ISO format "YYYY-MM-DDTHH:mm:ss..."
                    let kickOffMoment: moment.Moment;
                    if (m.kickOff.includes('T')) {
                        // ISO format: "2026-01-30T00:00:00.000+08:00"
                        kickOffMoment = moment(m.kickOff);
                    } else {
                        // Format: "2026-01-30 01:30"
                        kickOffMoment = moment(m.kickOff, 'YYYY-MM-DD HH:mm');
                    }
                    
                    if (!kickOffMoment.isValid()) {
                        console.warn('Invalid kickOff date:', m.kickOff);
                        return false;
                    }
                    return true;
                } catch (error) {
                    console.warn('Error parsing kickOff date:', m.kickOff, error);
                    return false;
                }
            })
            .map((m) => {
                // Extract date part - handle both formats
                let dateStr: string;
                if (m.kickOff.includes('T')) {
                    // ISO format: "2026-01-30T00:00:00.000+08:00" -> "2026-01-30"
                    dateStr = m.kickOff.split('T')[0];
                } else {
                    // Format: "2026-01-30 01:30" -> "2026-01-30"
                    dateStr = m.kickOff.split(' ')[0];
                }
                
                const [_, month, day] = dateStr.split('-');
                const formatted = `${day}/${month}`;
                // Always set matchDateFormated for all matches
                m.matchDateFormated = formatted;
                return m;
            });
        setMatchs(allMatch);
    }


    function getDates(match: Match[]) {
        if (!match || match.length === 0) {
            console.log('[MatchsPage] getDates: No matches provided');
            return [];
        }
        
        const datasOrden = match
            .map(item => {
                if (!item.kickOff) return null;
                // Handle both "YYYY-MM-DD HH:mm" and ISO format "YYYY-MM-DDTHH:mm:ss..."
                if (item.kickOff.includes('T')) {
                    // ISO format: "2026-01-30T00:00:00.000+08:00" -> "2026-01-30"
                    return item.kickOff.split('T')[0];
                } else {
                    // Format: "2026-01-30 01:30" -> "2026-01-30"
                    return item.kickOff.split(' ')[0];
                }
            })
            .filter((date): date is string => date !== null && date !== undefined)
            .sort((a, b) => {
                // Sort dates in ascending order (oldest first)
                return a.localeCompare(b);
            });
        
        console.log('[MatchsPage] getDates: Raw dates extracted:', datasOrden);
        
        const datasUnicas: string[] = [];
        for (const dataStr of datasOrden) {
            const parts = dataStr.split('-');
            if (parts.length !== 3) {
                console.warn('[MatchsPage] getDates: Invalid date format:', dataStr);
                continue;
            }
            const [, mes, dia] = parts; // year not needed for display
            const formatada = `${dia}/${mes}`;
            if (!datasUnicas.includes(formatada)) {
                datasUnicas.push(formatada);
            }
        }
        
        console.log('[MatchsPage] getDates: Formatted unique dates:', datasUnicas);
        // Return dates in ascending order (earliest first)
        return datasUnicas;
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
                                    .sort((a, b) => {
                                        // Handle both "YYYY-MM-DD HH:mm" and ISO format
                                        const momentA = a.kickOff.includes('T') 
                                            ? moment(a.kickOff) 
                                            : moment(a.kickOff, 'YYYY-MM-DD HH:mm');
                                        const momentB = b.kickOff.includes('T') 
                                            ? moment(b.kickOff) 
                                            : moment(b.kickOff, 'YYYY-MM-DD HH:mm');
                                        return momentA.valueOf() - momentB.valueOf();
                                    })
                                    .map((m) => {
                                        const matchId = m.id || (m as any).eventId;
                                        if (!matchId) {
                                            console.warn('Match missing id:', m);
                                            return null;
                                        }
                                        return (
                                            <div key={matchId} className="mb-2 sm:w-2/3 w-5/6 mx-auto">
                                                <CardMatch
                                                    widht={"100%"}
                                                    id={matchId}
                                                    navigate={navigate}
                                                    match={m}
                                                    teams={[getTeamNameInCurrentLanguage(m.homeLanguages, m.homeTeamName), getTeamNameInCurrentLanguage(m.awayLanguages, m.awayTeamName)]}
                                                />
                                            </div>
                                        );
                                    })
                                    .filter(Boolean)}
                            </div>
                            : days.map((d) => {
                                return <div key={d}>
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
                                        .sort((a, b) => {
                                            // Handle both "YYYY-MM-DD HH:mm" and ISO format
                                            const momentA = a.kickOff.includes('T') 
                                                ? moment(a.kickOff) 
                                                : moment(a.kickOff, 'YYYY-MM-DD HH:mm');
                                            const momentB = b.kickOff.includes('T') 
                                                ? moment(b.kickOff) 
                                                : moment(b.kickOff, 'YYYY-MM-DD HH:mm');
                                            return momentA.valueOf() - momentB.valueOf();
                                        })
                                        .map((m) => {
                                            const matchId = m.id || (m as any).eventId;
                                            if (!matchId) {
                                                console.warn('Match missing id:', m);
                                                return null;
                                            }
                                            return (
                                                <div key={matchId} className="mb-2 sm:w-2/3 w-5/6 mx-auto">
                                                    <CardMatch
                                                        widht={"100%"}
                                                        id={matchId}
                                                        navigate={navigate}
                                                        match={m}
                                                        teams={[getTeamNameInCurrentLanguage(m.homeLanguages, m.homeTeamName), getTeamNameInCurrentLanguage(m.awayLanguages, m.awayTeamName)]}
                                                    />
                                                </div>
                                            );
                                        })
                                        .filter(Boolean)}


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

