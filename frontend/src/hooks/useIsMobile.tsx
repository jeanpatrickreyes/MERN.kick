import { useEffect, useState } from "react";

export default function useIsMobile() {
    const [isMobile, setIsMobile] = useState(
        window.matchMedia("(max-width: 639px)").matches
    );

    useEffect(() => {
        const mediaQuery = window.matchMedia("(max-width: 639px)");
        const handler = (e: any) => setIsMobile(e.matches);

        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
    }, []);

    return isMobile;
}
