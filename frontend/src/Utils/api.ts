import axios, { type AxiosResponse } from "axios";

const APIUrl = "http://localhost:5001/api/";

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

const get = async <T>(path: string): Promise<AxiosResponse<T> | undefined> => {
    const prefix = "Error in axios get request: ";
    return _helper(prefix, async () => axios.get<T>(APIUrl + path));
};

export default { post, get };
