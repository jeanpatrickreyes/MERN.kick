import axios, { AxiosError, AxiosResponse } from "axios";

export const API = {


    async POST(url: string, data: any, opts?: { headers?: any; timeout?: number } | any): Promise<AxiosResponse<any, any>> {
        const isOpts = opts && typeof opts === "object" && "timeout" in opts;
        const timeoutMs = (isOpts && typeof (opts as any).timeout === "number") ? (opts as any).timeout : 15000;
        const _headers = isOpts ? ((opts as any).headers ?? {}) : (opts ?? {});
        var response: any;
        await axios.post(url, data, {
            timeout: timeoutMs,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Origin': 'https://bet.hkjc.com',
                'Referer': 'https://bet.hkjc.com/',
                ..._headers
            },
        }
        ).then((res) => {
            response = res;
        }).catch((error: AxiosError) => {
            const isTimeout = axios.isCancel(error) || (error as any).code === "ECONNABORTED" || String((error as any).message || "").includes("timeout");
            if (isTimeout) {
                console.warn("[API] Request timed out:", url);
            }
            response = error.response || {
                status: isTimeout ? 408 : (error.status ?? 500),
                data: error.message,
                headers: {},
                config: {},
            };
        });
        return response;
    },

    async GET(url: string, headers?: any): Promise<AxiosResponse<any, any>> {
        const _headers = headers ?? {};
        var response: any;
        await axios.get(url, {
            timeout: 15000, // 15 second timeout
            headers: {
                'Content-type': 'application/json; charset=UTF-8',
                ..._headers
            },
        }
        ).then((res) => {
            response = res;
        }).catch((error: AxiosError) => {
            const isTimeout = axios.isCancel(error) || (error as any).code === "ECONNABORTED" || String((error as any).message || "").includes("timeout");
            if (isTimeout) console.warn("[API] Request timed out:", url);
            response = error.response || {
                status: isTimeout ? 408 : (error.status ?? 500),
                data: error.message,
                headers: {},
                config: {},
            };
        });
        return response;
    },
};

export default API;