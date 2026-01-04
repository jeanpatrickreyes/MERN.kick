import { useState } from "react";
import AppAssets from "../../ultis/assets";
import API from "../../api/api";
import AppGlobal from "../../ultis/global";
import useAuthStore from "../../store/userAuthStore";
import { useNavigate } from "react-router-dom";
import ThemedText from "../../components/themedText";
import { useTranslation } from "react-i18next";

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showErro, setShowErro] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const data = {
      email: email,
      password: password
    };
    const res = await API.POST(AppGlobal.baseURL + "user/login", data);
    if (res.status === 200) {
      login(res.data.role);
      navigate("/");
    } else {
      setShowErro(true);
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
                  {t("login").toUpperCase()}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-10">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-600"> {t('email')}</label>
                <input
                  type="email"
                  id="text"
                  name="text"
                  className="w-full p-3 mt-2 bg-[#f7f7e3] text-black border rounded-md border-[#fc3a45] focus:outline-none focus:ring-2 focus:ring-[##fc3a45]"
                  placeholder={t('enterYourEmail')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-600">{t('password')}</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  className="w-full p-3 mt-2 bg-[#f7f7e3] text-black border rounded-md border-[#fc3a45] focus:outline-none focus:ring-2 focus:ring-[##fc3a45]"
                  placeholder={t('輸入您的密碼')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
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
                {loading ? t("loading") : t("login")}
              </button>

              <div className="mt-4 text-center">
                <a href="/forget-password" className="text-sm text-[#fc3a45] hover:underline">{t("forgotPassword")}</a>
              </div>

              <div className="mt-4 text-center">
                <a href="/register" className="text-sm text-[#fc3a45] hover:underline">{t("register")}</a>
              </div>


            </form>
          </div>
        </div>
      </div>
    </div>

  );
}

export default LoginPage;
