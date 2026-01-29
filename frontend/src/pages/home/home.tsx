import AppBarComponent from "../../components/appBar";
import { Loading } from "../../components/loading";
import { useMatchs } from "../../hooks/userMatchs";
import { HeroCarousel } from "./components/carousel";
import SectionComponent2 from "./components/section.components_2";
import SectionComponent5 from "./components/section.components_5";
import { SectionComponent6 } from "./components/section.components_6";
import { SectionComponent8 } from "./components/section.components_8";
import { useRecords } from "../../hooks/useRecords";
import useIsMobile from "../../hooks/useIsMobile";
import { useConfig } from "../../hooks/useConfig";
import SectionComponent7 from "./components/section.components_7";
import { FaTelegramPlane, FaWhatsapp } from "react-icons/fa";
import i18n from "../../i18n";
import { useEffect, useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import useAuthStore from "../../store/userAuthStore";
import { useNavigate } from "react-router-dom";
import AppGlobal from "../../ultis/global";
import API from "../../api/api";
import { useQueryClient } from "@tanstack/react-query";


const languages = [
    { code: "zh", label: "繁體中文", flag: "🇭🇰" },
    { code: "zhCN", label: "简体中文", flag: "🇨🇳" },
    { code: "en", label: "English", flag: "🇺🇸" },
];


export default function HomePage() {
    const isMobile = useIsMobile();
    const { data, isLoading } = useMatchs();
    const { data: records, isError } = useRecords(1, isMobile ? 4 : 6);
    const { data: config } = useConfig();
    const { t } = useTranslation();
    const { userRole } = useAuthStore();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const admin = userRole && (userRole === "admin" || userRole === "subadmin");

    const [currentLang, setCurrentLang] = useState(languages[0]);
    const [urlModalVisible, setUrlModalVisible] = useState(false);
    const [urlInput, setUrlInput] = useState("");

    useEffect(() => {
        const lang =
            languages.find(l => l.code === i18n.language) || languages[0];

        setCurrentLang(lang);

        const interval = setInterval(() => {
            const lang =
                languages.find(l => l.code === i18n.language) || languages[0];

            setCurrentLang(lang);
        }, 1000);

        return () => clearInterval(interval);
    }, [i18n.language]);

    const handleWeChatClick = () => {
        if (admin) {
            // Admin: Show modal to edit
            setUrlInput(config?.whatsapp ?? "https://wa.me/85266750460");
            setUrlModalVisible(true);
        } else {
            // Client: Open WhatsApp link directly
            const whatsappUrl = config?.whatsapp || "https://wa.me/85266750460";
            window.open(whatsappUrl, "_blank");
        }
    };

    const handleUrlModalClose = () => {
        setUrlModalVisible(false);
        setUrlInput("");
    };

    const handleUrlSave = async () => {
        if (urlInput.trim()) {
            if (admin) {
                // Admin: Save to config
                const data = {
                    instagram: config?.instagram ?? "",
                    threads: config?.threads ?? "",
                    telegram: config?.telegram ?? "",
                    whatsapp: urlInput.trim(),
                    message: config?.message ?? ""
                };
                const res = await API.POST(`${AppGlobal.baseURL}config`, data);
                if (res.status == 200 || res.status == 201) {
                    queryClient.invalidateQueries({ queryKey: ["config"] });
                    navigate("/success");
                }
            } else {
                // Client: Just open the URL
                const url = urlInput.trim();
                if (!url.startsWith("http://") && !url.startsWith("https://")) {
                    window.open(`https://${url}`, "_blank");
                } else {
                    window.open(url, "_blank");
                }
            }
        }
        setUrlModalVisible(false);
        setUrlInput("");
    };

    // Show content progressively instead of blocking on all data
    // Only show loading for critical above-the-fold content
    const showLoading = isLoading && !data;

    return (
        <div className="h-screen w-screen overflow-x-hidden bg-black">
            <AppBarComponent />

            {showLoading ? (
                <Loading />
            ) : (
                <>
                    <HeroCarousel match={data ?? []} data={!isError ? records.data ?? [] : []} />

                    <SectionComponent2 />

            {
                //         <SectionComponent3 />
            }

            <SectionComponent5 />

            <SectionComponent6 />

            <SectionComponent7 config={config} />

                    <SectionComponent8 />
                </>
            )}

            {currentLang.code === "zhCN" ? (
                // For Simplified Chinese: Show whatsapp-black.jpg image
                <button
                    onClick={handleWeChatClick}
                    className="
                        fixed sm:bottom-20 bottom-16 sm:right-10 right-5 z-50
                        sm:w-14 sm:h-14 w-12 h-12 rounded-full shadow-lg
                        hover:opacity-80 transition-opacity
                        flex items-center justify-center
                        transform
                        opacity-0 scale-90
                        animate-fadeInScale
                        bg-black border-none cursor-pointer p-0
                    "
                >
                    <img 
                        src="/whatsapp-black.jpg" 
                        alt="WhatsApp" 
                        className="sm:w-9 w-8 h-auto object-contain"
                    />
                </button>
            ) : (
                // For English and Traditional Chinese: Show the 2 floating buttons
                <>
                    {config?.whatsapp ? (
                        <button
                            onClick={() => {
                                const width = 600;
                                const height = 800;
                                const left = window.screen.width - width - 20;
                                const top = window.screen.height - height - 100;
                                window.open(
                                    config.whatsapp,
                                    "whatsappWindow",
                                    `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
                                );
                            }}
                            className="
                  fixed sm:bottom-52 bottom-36 sm:right-10 right-5 z-50 
              bg-green-500 sm:p-5 p-3 rounded-full shadow-lg
              hover:bg-green-600 transition-colors
              flex items-center justify-center
              transform
              opacity-0 scale-90
              animate-fadeInScale
            "
                        >
                            <FaWhatsapp className="text-white sm:text-4xl text-3xl pl-[3px]" />
                        </button>
                    ) : undefined}

                    {config?.telegram ? (
                        <button
                            onClick={() => {
                                const width = 600;
                                const height = 800;
                                const left = window.screen.width - width - 20;
                                const top = window.screen.height - height - 20;
                                window.open(
                                    config.telegram,
                                    "telegramWindow",
                                    `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
                                );
                            }}
                            className="
                fixed sm:bottom-28 bottom-20 sm:right-10 right-5 z-50
              bg-[#229ED9] sm:p-5 p-3 rounded-full shadow-lg 
              hover:bg-[#1e4555] transition-colors 
              flex items-center justify-center
              transform 
              opacity-0 scale-90 
              animate-fadeInScale
            "
                        >
                            <FaTelegramPlane className="text-white sm:text-4xl text-3xl pr-1" />
                        </button>
                    ) : undefined}
                </>
            )}


            {/* {
                config?.message && (
                    <button
                        onClick={() => {
                            const width = 600;
                            const height = 800;
                            const left = window.screen.width - width - 20;
                            const top = window.screen.height - height - 20;
                            window.open(
                                config.message,
                                "telegramWindow",
                                `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
                            );
                        }}
                        className="
         fixed bottom-4 sm:right-10 right-5 z-50 
      bg-[#ffffff] sm:p-3 p-0 rounded-full shadow-lg 
      hover:bg-[#1e4555] transition-colors 
      flex items-center justify-center
      transform 
      opacity-0 scale-90 
      animate-fadeInScale
    "
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" height="49" width="49" viewBox="-18.15 -35.9725 157.3 215.835"><path fill="#faab07" d="M60.503 142.237c-12.533 0-24.038-4.195-31.445-10.46-3.762 1.124-8.574 2.932-11.61 5.175-2.6 1.918-2.275 3.874-1.807 4.663 2.056 3.47 35.273 2.216 44.862 1.136zm0 0c12.535 0 24.039-4.195 31.447-10.46 3.76 1.124 8.573 2.932 11.61 5.175 2.598 1.918 2.274 3.874 1.805 4.663-2.056 3.47-35.272 2.216-44.862 1.136zm0 0" /><path d="M60.576 67.119c20.698-.14 37.286-4.147 42.907-5.683 1.34-.367 2.056-1.024 2.056-1.024.005-.189.085-3.37.085-5.01C105.624 27.768 92.58.001 60.5 0 28.42.001 15.375 27.769 15.375 55.401c0 1.642.08 4.822.086 5.01 0 0 .583.615 1.65.913 5.19 1.444 22.09 5.65 43.312 5.795zm56.245 23.02c-1.283-4.129-3.034-8.944-4.808-13.568 0 0-1.02-.126-1.537.023-15.913 4.623-35.202 7.57-49.9 7.392h-.153c-14.616.175-33.774-2.737-49.634-7.315-.606-.175-1.802-.1-1.802-.1-1.774 4.624-3.525 9.44-4.808 13.568-6.119 19.69-4.136 27.838-2.627 28.02 3.239.392 12.606-14.821 12.606-14.821 0 15.459 13.957 39.195 45.918 39.413h.848c31.96-.218 45.917-23.954 45.917-39.413 0 0 9.368 15.213 12.607 14.822 1.508-.183 3.491-8.332-2.627-28.021" /><path fill="#fff" d="M49.085 40.824c-4.352.197-8.07-4.76-8.304-11.063-.236-6.305 3.098-11.576 7.45-11.773 4.347-.195 8.064 4.76 8.3 11.065.238 6.306-3.097 11.577-7.446 11.771m31.133-11.063c-.233 6.302-3.951 11.26-8.303 11.063-4.35-.195-7.684-5.465-7.446-11.77.236-6.305 3.952-11.26 8.3-11.066 4.352.197 7.686 5.468 7.449 11.773" /><path fill="#faab07" d="M87.952 49.725C86.79 47.15 75.077 44.28 60.578 44.28h-.156c-14.5 0-26.212 2.87-27.375 5.446a.863.863 0 00-.085.367.88.88 0 00.16.496c.98 1.427 13.985 8.487 27.3 8.487h.156c13.314 0 26.319-7.058 27.299-8.487a.873.873 0 00.16-.498.856.856 0 00-.085-.365" /><path d="M54.434 29.854c.199 2.49-1.167 4.702-3.046 4.943-1.883.242-3.568-1.58-3.768-4.07-.197-2.492 1.167-4.704 3.043-4.944 1.886-.244 3.574 1.58 3.771 4.07m11.956.833c.385-.689 3.004-4.312 8.427-2.993 1.425.347 2.084.857 2.223 1.057.205.296.262.718.053 1.286-.412 1.126-1.263 1.095-1.734.875-.305-.142-4.082-2.66-7.562 1.097-.24.257-.668.346-1.073.04-.407-.308-.574-.93-.334-1.362" /><path fill="#fff" d="M60.576 83.08h-.153c-9.996.12-22.116-1.204-33.854-3.518-1.004 5.818-1.61 13.132-1.09 21.853 1.316 22.043 14.407 35.9 34.614 36.1h.82c20.208-.2 33.298-14.057 34.616-36.1.52-8.723-.087-16.035-1.092-21.854-11.739 2.315-23.862 3.64-33.86 3.518" /><path fill="#eb1923" d="M32.102 81.235v21.693s9.937 2.004 19.893.616V83.535c-6.307-.357-13.109-1.152-19.893-2.3" /><path fill="#eb1923" d="M105.539 60.412s-19.33 6.102-44.963 6.275h-.153c-25.591-.172-44.896-6.255-44.962-6.275L8.987 76.57c16.193 4.882 36.261 8.028 51.436 7.845h.153c15.175.183 35.242-2.963 51.437-7.845zm0 0" /></svg>
                    </button>
                )} */}


            {admin && (
                <Dialog open={urlModalVisible} onClose={handleUrlModalClose}
                    sx={{
                        "& .MuiDialog-paper": {
                            backgroundColor: "white",
                            color: "white",
                            margin: 10,
                            borderRadius: "8px",
                        }
                    }}>
                    <DialogTitle>WhatsApp URL</DialogTitle>
                    <DialogContent>
                        <TextField
                            fullWidth
                            label="WhatsApp URL"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            margin="dense"
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleUrlModalClose} color="secondary">
                            {t("cancel")}
                        </Button>
                        <Button onClick={handleUrlSave} color="primary">
                            {t("save")}
                        </Button>
                    </DialogActions>
                </Dialog>
            )}




        </div>
    );
}
