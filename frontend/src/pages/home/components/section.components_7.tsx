import { FaThreads } from "react-icons/fa6";
import { FaInstagram, FaTelegramPlane, FaWhatsapp } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
} from "@mui/material";
import useAuthStore from "../../../store/userAuthStore";
import { Config } from "../../../models/config";
import AppGlobal from "../../../ultis/global";
import API from "../../../api/api";
import { useNavigate } from "react-router-dom";
import i18n from "../../../i18n";
import { useQueryClient } from "@tanstack/react-query";

export type Props = {
    config: Config | undefined
};

export default function SectionComponent7({
    config
}: Props) {
    const { t } = useTranslation();
    const { userRole } = useAuthStore();
    const queryClient = useQueryClient();

    const navigate = useNavigate();
    const [modalVisible, setModalVisible] = useState(false);
    const [editedURL, setEditedURL] = useState("");
    const [field, setField] = useState("");
    const [urlModalVisible, setUrlModalVisible] = useState(false);
    const [urlInput, setUrlInput] = useState("");

    const handleIconClick = (url: string, field: string) => {
        setField(field);
        setEditedURL(url);
        setModalVisible(true);
    };

    const handleCancel = () => {
        setModalVisible(false);
    };

    const handleEdit = async () => {
        const data = {
            instagram: field == 'instagram' ? editedURL : config?.instagram ?? "",
            threads: field == 'threads' ? editedURL : config?.threads ?? "",
            telegram: field == 'telegram' ? editedURL : config?.telegram ?? "",
            whatsapp: field == 'whatsapp' ? editedURL : config?.whatsapp ?? "",
            message: field === "message" ? editedURL : config?.message ?? ""
        };
        const res = await API.POST(`${AppGlobal.baseURL}config`, data);
        if (res.status == 200 || res.status == 201) {
            navigate("/success");
        }
        setModalVisible(false);
    };

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

    const admin = userRole && (userRole === "admin" || userRole === "subadmin");

    const languages = [
        { code: "zh", label: "繁體中文", flag: "🇭🇰" },
        { code: "zhCN", label: "简体中文", flag: "🇨🇳" },
        { code: "en", label: "English", flag: "🇺🇸" },
    ];
    const currentLang =
        languages.find(l => l.code === i18n.language) || languages[0];

    return (
        <section id="contact-us"
            className="flex items-center justify-center sm:mt-0 p-3 pb-14 flex-col bg-[#fc3a45]  w-screen">



            <div className="relative z-10 w-full flex items-center flex-col pl-10 pb-20">
                <div className="relative z-10 w-full flex items-end sm:h-[15vh] h-[18vh]">
                    <div className="flex flex-1 items-center pl-5">
                        <div className="w-5 bg-white mr-4 self-stretch" />
                        <div className="flex flex-col justify-center space-y-2 text-white">
                            <p className="sm:text-5xl text-3xl font-semibold leading-tight">
                                {t("Contact_Us").toUpperCase()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>


            {currentLang.code === "zhCN" ? (
                // For Simplified Chinese: Show whatsapp-blue.jpg image
                <div className="flex gap-6 text-3xl text-gray-700">
                    <img 
                        src="/whatsapp-blue.jpg" 
                        alt="WhatsApp" 
                        className="w-12 h-12 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={handleWeChatClick}
                        style={{ borderRadius: '10px' }}
                    />
                </div>
            ) : (
                // For English and Traditional Chinese: Show the 4 icons
                <div className="flex gap-6 text-3xl text-gray-700">
                    <a onClick={admin ? () => handleIconClick(config?.instagram ?? "", "instagram") : () => {
                        const url = config?.instagram ?? "/";
                        const width = 1000;
                        const height = 1000;
                        const left = window.screen.width - width - 20;
                        const top = window.screen.height - height - 20;
                        window.open(url, "instagramWindow", `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`);
                    }} rel="noopener noreferrer">
                        <FaInstagram className="hover:text-red-900 text-5xl text-white transition duration-300" />
                    </a>
                    <a onClick={admin ? () => handleIconClick(config?.threads ?? "", "threads") : () => {
                        const url = config?.threads ?? "/";
                        const width = 1000;
                        const height = 1000;
                        const left = window.screen.width - width - 20;
                        const top = window.screen.height - height - 20;
                        window.open(url, "threadsWindow", `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`);
                    }} rel="noopener noreferrer">
                        <FaThreads className="hover:text-red-900 text-5xl text-white transition duration-300" />
                    </a>
                    <a onClick={admin ? () => handleIconClick(config?.telegram ?? "", "telegram") : () => {
                        const url = config?.telegram ?? "/";
                        const width = 1000;
                        const height = 1000;
                        const left = window.screen.width - width - 20;
                        const top = window.screen.height - height - 20;
                        window.open(url, "telegramWindow", `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`);
                    }} rel="noopener noreferrer">
                        <FaTelegramPlane className="hover:text-red-900 text-5xl text-white transition duration-300" />
                    </a>
                    <a
                        onClick={admin ? () => handleIconClick(config?.whatsapp ?? "", "whatsapp") : () => {
                            const url = config?.whatsapp ?? "/";
                            const width = 1000;
                            const height = 1000;
                            const left = window.screen.width - width - 20;
                            const top = window.screen.height - height - 20;
                            window.open(url, "whatsappWindow", `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`);
                        }}
                        rel="noopener noreferrer"
                    >
                        <FaWhatsapp className="hover:text-green-600 text-5xl text-white transition duration-300" />
                    </a>
                </div>
            )}


                {/* <a onClick={admin ? () => handleIconClick(config?.message ?? "", "message") : () => {
                    const url = config?.message ?? "/";
                    const width = 1000;
                    const height = 1000;
                    const left = window.screen.width - width - 20;
                    const top = window.screen.height - height - 20;
                    window.open(url, "messageWindow", `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`);
                }} rel="noopener noreferrer" style={{ cursor: "pointer" }}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        height="56"
                        width="64"
                        viewBox="-18.15 -35.9725 157.3 215.835"
                        className="hover:drop-shadow-lg transition duration-300"
                    >
                        <g fill="white">
                            <path fill="#faab07" d="M60.503 142.237c-12.533 0-24.038-4.195-31.445-10.46-3.762 1.124-8.574 2.932-11.61 5.175-2.6 1.918-2.275 3.874-1.807 4.663 2.056 3.47 35.273 2.216 44.862 1.136zm0 0c12.535 0 24.039-4.195 31.447-10.46 3.76 1.124 8.573 2.932 11.61 5.175 2.598 1.918 2.274 3.874 1.805 4.663-2.056 3.47-35.272 2.216-44.862 1.136zm0 0" />
                            <path d="M60.576 67.119c20.698-.14 37.286-4.147 42.907-5.683 1.34-.367 2.056-1.024 2.056-1.024.005-.189.085-3.37.085-5.01C105.624 27.768 92.58.001 60.5 0 28.42.001 15.375 27.769 15.375 55.401c0 1.642.08 4.822.086 5.01 0 0 .583.615 1.65.913 5.19 1.444 22.09 5.65 43.312 5.795zm56.245 23.02c-1.283-4.129-3.034-8.944-4.808-13.568 0 0-1.02-.126-1.537.023-15.913 4.623-35.202 7.57-49.9 7.392h-.153c-14.616.175-33.774-2.737-49.634-7.315-.606-.175-1.802-.1-1.802-.1-1.774 4.624-3.525 9.44-4.808 13.568-6.119 19.69-4.136 27.838-2.627 28.02 3.239.392 12.606-14.821 12.606-14.821 0 15.459 13.957 39.195 45.918 39.413h.848c31.96-.218 45.917-23.954 45.917-39.413 0 0 9.368 15.213 12.607 14.822 1.508-.183 3.491-8.332-2.627-28.021" />
                            <path fill="#fff" d="M49.085 40.824c-4.352.197-8.07-4.76-8.304-11.063-.236-6.305 3.098-11.576 7.45-11.773 4.347-.195 8.064 4.76 8.3 11.065.238 6.306-3.097 11.577-7.446 11.771m31.133-11.063c-.233 6.302-3.951 11.26-8.303 11.063-4.35-.195-7.684-5.465-7.446-11.77.236-6.305 3.952-11.26 8.3-11.066 4.352.197 7.686 5.468 7.449 11.773" />
                            <path fill="#faab07" d="M87.952 49.725C86.79 47.15 75.077 44.28 60.578 44.28h-.156c-14.5 0-26.212 2.87-27.375 5.446a.863.863 0 00-.085.367.88.88 0 00.16.496c.98 1.427 13.985 8.487 27.3 8.487h.156c13.314 0 26.319-7.058 27.299-8.487a.873.873 0 00.16-.498.856.856 0 00-.085-.365" />
                            <path d="M54.434 29.854c.199 2.49-1.167 4.702-3.046 4.943-1.883.242-3.568-1.58-3.768-4.07-.197-2.492 1.167-4.704 3.043-4.944 1.886-.244 3.574 1.58 3.771 4.07m11.956.833c.385-.689 3.004-4.312 8.427-2.993 1.425.347 2.084.857 2.223 1.057.205.296.262.718.053 1.286-.412 1.126-1.263 1.095-1.734.875-.305-.142-4.082-2.66-7.562 1.097-.24.257-.668.346-1.073.04-.407-.308-.574-.93-.334-1.362" />
                            <path fill="#fff" d="M60.576 83.08h-.153c-9.996.12-22.116-1.204-33.854-3.518-1.004 5.818-1.61 13.132-1.09 21.853 1.316 22.043 14.407 35.9 34.614 36.1h.82c20.208-.2 33.298-14.057 34.616-36.1.52-8.723-.087-16.035-1.092-21.854-11.739 2.315-23.862 3.64-33.86 3.518" />
                            <path fill="#eb1923" d="M32.102 81.235v21.693s9.937 2.004 19.893.616V83.535c-6.307-.357-13.109-1.152-19.893-2.3" />
                            <path fill="#eb1923" d="M105.539 60.412s-19.33 6.102-44.963 6.275h-.153c-25.591-.172-44.896-6.255-44.962-6.275L8.987 76.57c16.193 4.882 36.261 8.028 51.436 7.845h.153c15.175.183 35.242-2.963 51.437-7.845zm0 0" />
                        </g>
                        <g fill="#1E88E5" className="hover-fill">
                        </g>
                    </svg>   </a> */}




            <p className="mt-10 text-center max-w-md text-gray-200">
                {t("Contact_com").toUpperCase()}
            </p>

            <Dialog open={modalVisible} onClose={handleCancel}
                sx={{
                    "& .MuiDialog-paper": {
                        backgroundColor: "white",
                        color: "white",
                        margin: 10,
                        borderRadius: "8px",
                    }
                }}>
                <DialogTitle> URL</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="URL"
                        value={editedURL}
                        onChange={(e) => setEditedURL(e.target.value)}
                        margin="dense"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancel} color="secondary">
                        {t("cancel")}
                    </Button>
                    <Button onClick={handleEdit} color="primary">
                        {t("save")}
                    </Button>
                </DialogActions>
            </Dialog>

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

        </section>
    );
}