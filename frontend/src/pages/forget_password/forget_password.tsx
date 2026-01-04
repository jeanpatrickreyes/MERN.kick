import { useState } from "react";
import AppAssets from "../../ultis/assets";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import AppGlobal from "../../ultis/global";
import API from "../../api/api";
import { toast, ToastContainer } from "react-toastify";

function ForgetPasswordPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);

        const data = {
            email: email
        };
        await API.POST(AppGlobal.baseURL + "user/recover-password", data);
        toast.success("🎉 " + t("emailSent"));
        navigate("/login");
        setLoading(false);
    };


    return (
        <div className="overflow-hidden h-screen w-screen flex items-center justify-center bg-black" >
            <ToastContainer position="top-right" autoClose={3000} />
            <div className="w-full max-w-lg p-8 items-center">
                <div className="w-full max-w-lg sm:p-8 p-4 space-y-4 rounded-lg shadow-xl">
                    <div className="flex justify-center ">
                        <img src={AppAssets.logo} alt="Logo"
                            className="h-44 flex justify-center mb-0 " />
                    </div>
                    <div className="bg-white sm:p-10 p-7 rounded-xl">

                        <div className="flex items-start w-screen">
                            <div className="w-2 bg-red-500 mr-2 self-stretch" />
                            <div className="flex flex-col justify-center space-y-2 text-black">
                                <p className="sm:text-xl text-base sm:h-7 h-5 font-bold">
                                    {t("forgot-password").toUpperCase()}
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 mt-10">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-600">
                                    {t('email')}

                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    className="w-full p-3 mt-2 bg-[#f7f7e3] text-black border rounded-md border-[#fc3a45] focus:outline-none focus:ring-2 focus:ring-[#fc3a45]"
                                    placeholder={t('enterYourEmail')}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 mt-12 text-white bg-[#fc3a45] hover:bg-red-700 focus:outline-none focus:ring-2 border-none"
                                disabled={loading}
                            >
                                {loading ? t("send") + "..." : t("send")}
                            </button>

                            <div className="mt-4 text-center">
                                <a href="/login" className="text-sm text-[#fc3a45] hover:underline">{t("I remembered the password")}</a>
                            </div>

                        </form>
                    </div>
                </div>
            </div>
        </div>

    );
}

export default ForgetPasswordPage;
