import axios, { type AxiosResponse } from "axios";

const APIUrl = "http://localhost:8000/api/";

type ApiFunction<T> = () => Promise<AxiosResponse<T>>;

const _helper = async <T>(prefix: string, callable: ApiFunction<T>): Promise<AxiosResponse<T> | undefined> => {
    try {
        return await callable();
    } catch (e: unknown) {
        if (e instanceof Error) {
            console.log(prefix, e.message);
        } else {
            console.log(prefix, e);
        }
    }
};

const post = async <T>(path: string, data: object): Promise<AxiosResponse<T> | undefined> => {
    const prefix = "Error in axios post request: ";
    return _helper(prefix, async () => axios.post<T>(APIUrl + path, data));
};

const get = async <T>(path: string, data: object | null = null): Promise<AxiosResponse<T> | undefined> => {
    const prefix = "Error in axios get request: ";

    if (data == null) {
        return _helper(prefix, async () => axios.get<T>(APIUrl + path));
    } else {
        return _helper(prefix, async () => axios.post<T>(APIUrl + path, data));
    }
};

const put = async <T>(path: string, data: object): Promise<AxiosResponse<T> | undefined> => {
    const prefix = "Error in axios put request: ";
    return _helper(prefix, async () => axios.put<T>(APIUrl + path, data));
};

export default { post, get, put };
