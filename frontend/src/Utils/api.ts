import axios from "axios"

const APIUrl = "http://localhost:5001/api/"

type apiFunction = () => any;

const _helper = async (prefix: string, callable: apiFunction) => {
    try {
        return callable();
    } catch (e: unknown) {
        if (e instanceof Error) {
            console.log(prefix, e.message);
        } else {
            console.log(prefix, e)
        }

    }
}

const apiPost = async (path: string, data: object) => {
    const prefix = "Error in axios post request: ";
    return _helper(prefix, async () => {
        const result = await axios.post(APIUrl + path, data);
        return result;
    })
}

const apiGet = async (path: string) => {
    const prefix = "Error in axios get request: ";
    return _helper(prefix, async () => {
        const result = await axios.get(APIUrl + path);
        return result;
    })
}

export default { apiPost, apiGet };
