import axios from "axios"

const APIUrl = "http://localhost:5001/api/"

const _helper = async (prefix: string, callable: Function) => {
    try {
        callable();
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
    _helper(prefix, async () => {
        await axios.post(APIUrl + path, data);
    })
}

const apiGet = async (path: string) => {
    const prefix = "Error in axios get request: ";
    _helper(prefix, async () => {
        await axios.get(APIUrl + path);
    })
}

export default { apiPost, apiGet };
