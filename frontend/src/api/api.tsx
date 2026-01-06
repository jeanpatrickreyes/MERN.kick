import axios, { AxiosError, AxiosResponse } from "axios";
import Cookies from 'js-cookie';
import useAuthStore from "../store/userAuthStore";

const { logout } = useAuthStore.getState();

axios.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            Cookies.remove("sessionId");
            logout();
            window.location.href = "/";
        }
        return Promise.reject(error);
    }
);

export const API = {
    async getToken() {
        var token = '';
        try {
            const result = Cookies.get("sessionId");
            if (result != null) {
                token = result;
            }
        } catch (error) {
        }
        return token;
    },

    async POSTFORMDATA(url: string, data: any, headers?: any): Promise<AxiosResponse<any, any>> {
        const token = await this.getToken();
        const _headers = headers ?? {};
        var response: any;
        await axios.post(url, data, {
            withCredentials: true,
            headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': 'Bearer ' + token,
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

    async POST(url: string, data: any, headers?: any): Promise<AxiosResponse<any, any>> {
        const token = await this.getToken();
        const _headers = headers ?? {};
        var response: any;
        await axios.post(url, data, {
            withCredentials: true,
            headers: {
                'Content-type': 'application/json; charset=UTF-8',
                'Authorization': 'Bearer ' + token,
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

    async PUT(url: string, data: any, headers?: any): Promise<AxiosResponse<any, any>> {
        const token = await this.getToken();
        const _headers = headers ?? {};
        var response: any;
        await axios.put(url, data, {
            headers: {
                'Content-type': 'application/json; charset=UTF-8',
                'Authorization': 'Bearer ' + token,
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

    async DELETE(url: string, headers?: any): Promise<AxiosResponse<any, any>> {
        const token = await this.getToken();
        const _headers = headers ?? {};
        var response: any;
        await axios.delete(url, {
            headers: {
                'Content-type': 'application/json; charset=UTF-8',
                'Authorization': 'Bearer ' + token,
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
        const token = await this.getToken()
        const _headers = headers ?? {};
        var response: any;
        await axios.get(url, {
            headers: {
                'Content-type': 'application/json; charset=UTF-8',
                'Authorization': 'Bearer ' + token,
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