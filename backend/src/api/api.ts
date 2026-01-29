import axios, { AxiosError, AxiosResponse } from "axios";

export const API = {


    async POST(url: string, data: any, headers?: any): Promise<AxiosResponse<any, any>> {
        const _headers = headers ?? {};
        var response: any;
        await axios.post(url, data, {
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
            if (axios.isCancel(error)) {
                error.status = 408;
                console.log('Request timed out');
            }
            response = error.response || {
                status: error.status || 500,
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
            headers: {
                'Content-type': 'application/json; charset=UTF-8',
                ..._headers
            },
        }
        ).then((res) => {
            response = res;
        }).catch((error: AxiosError) => {
            if (axios.isCancel(error)) {
                error.status = 408;
                console.log('Request timed out');
            }
            response = error.response || {
                status: error.status || 500,
                data: error.message,
                headers: {},
                config: {},
            };
        });
        return response;
    },
};

export default API;