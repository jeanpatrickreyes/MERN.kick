import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import Cookies from 'js-cookie';
import useAuthStore from "../store/userAuthStore";

const { logout } = useAuthStore.getState();

// Configure default timeout (30 seconds)
axios.defaults.timeout = 30000;

// Add request interceptor for timeout handling
axios.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // Ensure timeout is set
        if (!config.timeout) {
            config.timeout = 30000;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

axios.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        // Handle 401 unauthorized - redirect to login
        if (error.response?.status === 401) {
            try {
                Cookies.remove("sessionId");
                logout();
                // Only redirect if we're not already on the login page
                if (window.location.pathname !== '/login') {
                    window.location.href = "/";
                }
            } catch (e) {
                console.error('Error handling 401:', e);
            }
        }
        // Handle timeout errors
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            console.error('Request timeout - server may be slow or unreachable');
        }
        // Handle network errors
        if (!error.response && error.request) {
            console.error('Network error - please check your connection');
        }
        // Always return a rejected promise to allow error handling upstream
        // But ensure the error is properly formatted
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
            timeout: 60000, // 60 seconds for file uploads
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
            timeout: 30000, // 30 seconds timeout
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
            timeout: 30000, // 30 seconds timeout
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
            timeout: 30000, // 30 seconds timeout
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
            timeout: 30000, // 30 seconds timeout
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