import { create } from "zustand";
import { persist } from "zustand/middleware";
import Cookies from "js-cookie";

export interface AuthState {
    isAuthenticated: boolean;
    userRole: string | null;
    login: (role: string) => void;
    logout: () => void;
    setUserRole: (role: string) => void;
    checkSession: () => void;
}

const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            isAuthenticated: !!Cookies.get("sessionId"),
            userRole: null,
            login: (role: any) => set({ isAuthenticated: true, userRole: role }),
            logout: () => {
                Cookies.remove("sessionId");
                let redirectPath = "/login";
                set({ isAuthenticated: false, userRole: null });
                window.location.href = redirectPath;
            },
            setUserRole: (role: any) => set({ userRole: role }),
            checkSession: () => {
                const sessionId = Cookies.get("sessionId");
                set({ isAuthenticated: !!sessionId });
            },
        }),
        {
            name: "auth-storage",
        }
    )
);

export default useAuthStore;
