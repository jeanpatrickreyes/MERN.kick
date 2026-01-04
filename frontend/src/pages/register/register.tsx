import { useState } from "react";
import AppAssets from "../../ultis/assets";
import API from "../../api/api";
import AppGlobal from "../../ultis/global";
import useAuthStore from "../../store/userAuthStore";
import { useNavigate } from "react-router-dom";
import ThemedText from "../../components/themedText";
import { useTranslation } from "react-i18next";
import { FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material";

function RegisterPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { login } = useAuthStore();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [ageRange, setAgeRange] = useState("");

    const [errors, setErrors] = useState({
        email: "",
        password: ""
    });

    const validateForm = () => {
        let isValid = true;
        let tempErrors = { email: "", password: "", price: "", date: "" };
        if (!email) {
            tempErrors.email = t("usernameRequired");
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            tempErrors.email = t("usernameRequired");
            isValid = false;
        }
        if (!password || password.length < 6) {
            tempErrors.password = t("passwordRequired");
            isValid = false;
        }
        if (!ageRange) {
            isValid = false;
            alert(t("selectAgeRange") || "選擇年齡範圍");
        }

        setErrors(tempErrors);
        return isValid;
    };
    const [loading, setLoading] = useState(false);
    const [showErro, setShowErro] = useState(false);

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        if (validateForm()) {
            const data = {
                email: email,
                ageRange: ageRange,
                password: password
            };
            const res = await API.POST(`${AppGlobal.baseURL}user/register`, data);
            if (res.status == 200) {
                const res = await API.POST(AppGlobal.baseURL + "user/login", data);
                if (res.status === 200) {
                    login(res.data.role);
                    navigate("/");
                } else {
                    setShowErro(true);
                }
            } else if (res.status == 409) {
                alert(res.data.error)
            }
        }
        setLoading(false);
    };


    return (
        <div className="overflow-hidden h-screen w-screen flex items-center justify-center bg-black" >
            <div className="w-full max-w-lg p-8 items-center">
                <div className="w-full max-w-lg sm:p-8 p-4 space-y-4 rounded-lg shadow-xl">
                    <div className="flex justify-center ">
                        <img src={AppAssets.logo} alt="Logo"
                            className="h-44 flex justify-center mb-0 " />
                    </div>
                    <div className="bg-white sm:p-10 p-7 rounded-xl">

                        <div className="flex items-start w-screen">
                            <div className="w-2 bg-[#fc3a45] mr-2 self-stretch" />
                            <div className="flex flex-col justify-center space-y-2 text-black">
                                <p className="sm:text-2xl text-base sm:h-7 h-6 font-bold">
                                    {t("register").toUpperCase()}
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-4 mt-10">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-600"> {t('email')}</label>
                                <TextField
                                    type="email"
                                    id="text"
                                    name="text"
                                    required={false}
                                    className="w-full p-3 mt-2 bg-[#f7f7e3] text-black border rounded-md border-[#fc3a45] focus:outline-none focus:ring-2 focus:ring-[##fc3a45]"
                                    placeholder={t('enterYourEmail')}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    error={Boolean(errors.email)}
                                    helperText={errors.email}

                                />
                            </div>
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-600">{t('password')}</label>
                                <TextField
                                    type="password"
                                    id="password"
                                    required={false}
                                    name="password"
                                    className="w-full p-3 mt-2 bg-[#f7f7e3] text-black border rounded-md border-[#fc3a45] focus:outline-none focus:ring-2 focus:ring-[##fc3a45]"
                                    placeholder={t('輸入您的密碼')}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    error={Boolean(errors.password)}
                                    helperText={errors.password}

                                />
                            </div>

                            <div>
                                <FormControl fullWidth required={false}>
                                    <InputLabel
                                        id="age-label">{t("ageRange") || "Faixa Etária"}</InputLabel>
                                    <Select
                                        labelId="age-label"
                                        id="age"
                                        value={ageRange}
                                        onChange={(e) => setAgeRange(e.target.value)}
                                        className="bg-[#f7f7e3] text-black rounded-md mt-2 border-none"
                                    >
                                        <MenuItem value="18-24">18-24</MenuItem>
                                        <MenuItem value="25-34">25-34</MenuItem>
                                        <MenuItem value="35-44">35-44</MenuItem>
                                        <MenuItem value="45-54">45-54</MenuItem>
                                        <MenuItem value="55+">55+</MenuItem>
                                    </Select>
                                </FormControl>
                            </div>


                            {showErro ?
                                <div className="bg-red-500 rounded-lg p-2 mt-2 flex-row flex items-center justify-center">
                                    <ThemedText
                                        className="font-bold text-[12px] sm:text-[16px] leading-tight"
                                        type="defaultSemiBold"
                                        style={{
                                            color: "white",
                                        }}
                                    >
                                        {t("invalidEmailOrPassword")}
                                    </ThemedText>
                                </div> : undefined
                            }

                            <button
                                type="submit"
                                className="w-full py-3 mt-12 text-white bg-[#fc3a45] hover:bg-red-700 focus:outline-none focus:ring-2 border-none"
                                disabled={loading}
                            >
                                {loading ? t("loading") : t("register")}
                            </button>

                            <div className="mt-4 text-center">
                                <a href="/login" className="text-sm text-[#fc3a45] hover:underline">{"返回"}</a>
                            </div>


                        </form>
                    </div>
                </div>
            </div>
        </div>

    );
}

export default RegisterPage;
