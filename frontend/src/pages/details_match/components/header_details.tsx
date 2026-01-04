import { Probability } from "../../../models/probability";
import { CardMatch } from "../../../components/card_match";
import { useNavigate } from "react-router-dom";
import { getTeamNameInCurrentLanguage } from "../../../ultis/languageUtils";

interface Props {
    data: Probability;
}

function HeaderDetailsComponent({
    data
}: Props) {
    const navigate = useNavigate();
    return (
        <div className="w-full flex justify-center items-center">
            <div className="sm:w-2/3 w-5/6 flex">
                <CardMatch

                    widht={"100%"}

                    navigate={navigate}
                    match={data}
                    teams={[getTeamNameInCurrentLanguage(data.homeLanguages, data.homeTeamName), getTeamNameInCurrentLanguage(data.awayLanguages, data.awayTeamName)]}
                />
            </div>
        </div>
    );
}
export default HeaderDetailsComponent;