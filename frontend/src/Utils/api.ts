import axios, { type AxiosResponse } from "axios";

const APIUrl = "http://localhost:8000/api/";

type ApiFunction<T> = () => Promise<AxiosResponse<T>>;

export type ScanVaultTagsResponse = {
    modules: { module: string; topics: string[] }[];
};

export type UntaggedFilesResponse = {
    files: { name: string; path: string }[];
};

export type ApplyTagsRequest = {
    path: string;
    module: string;
    topic: string;
};

export type ApplyTagsResponse = {
    path: string;
    tag: string;
    updated: boolean;
};

export type ApplyTagsBulkRequest = {
    paths: string[];
    module: string;
    topic: string;
};

export type ApplyTagsBulkResponse = {
    tag: string;
    applied_count: number;
    failed_count: number;
    results: { path: string; updated: boolean; error?: string }[];
};

export type MatchTagsRequest = {
    tags: string[];
};

export type MatchTagsResponse = {
    files: string[];
};

export type CategoryMembershipRequest = {
    module: string;
    topic: string;
};

export type CategoryMembershipFile = {
    name: string;
    path: string;
};

export type CategoryMembershipResponse = {
    in_category: CategoryMembershipFile[];
    not_in_category: CategoryMembershipFile[];
};

export type RemoveTagsBulkRequest = {
    paths: string[];
    module: string;
    topic: string;
};

export type RemoveTagsBulkResponse = {
    tag: string;
    removed_count: number;
    failed_count: number;
    results: { path: string; updated: boolean; error?: string }[];
};

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

const del = async <T>(path: string): Promise<AxiosResponse<T> | undefined> => {
    const prefix = "Error in axios delete request: ";
    return _helper(prefix, async () => axios.delete<T>(APIUrl + path));
};

// ---------------------------------------------------------------------------
// RAG types
// ---------------------------------------------------------------------------
export type RAGCitation = {
    file_path: string;
    file_name: string;
    relative_path: string;
    heading: string;
    snippet: string;
    line_start: number;
    line_end: number;
    relevance_score: number;
};

export type RAGQueryRequest = {
    query: string;
    scope_module?: string;
    scope_category?: string;
    force_notes?: string[];
    top_k?: number;
};

export type RAGQueryResponse = {
    answer: string;
    citations: RAGCitation[];
    model_used: string;
    chunks_retrieved: number;
    chunks_after_rerank: number;
};

export type RAGIndexStatusResponse = {
    status: string;
    total_files: number;
    processed_files: number;
    skipped_files: number;
    total_chunks: number;
    current_file?: string;
    errors: string[];
};

export type RAGStatsResponse = {
    total_chunks: number;
    collection: string;
};

export type RAGHealthResponse = {
    healthy: boolean;
    provider?: string;
    base_url?: string;
    models_available?: string[];
    generation_model_ready?: boolean;
    embedding_model_ready?: boolean;
    error?: string;
};

export type RAGFilesResponse = {
    files: string[];
};

const rag = {
    query: async (payload: RAGQueryRequest): Promise<AxiosResponse<RAGQueryResponse> | undefined> => {
        return post<RAGQueryResponse>("rag/query/", payload);
    },
    startIndex: async (force = false): Promise<AxiosResponse<{ status: string }> | undefined> => {
        return post<{ status: string }>("rag/index/start/", { force });
    },
    getIndexStatus: async (): Promise<AxiosResponse<RAGIndexStatusResponse> | undefined> => {
        return get<RAGIndexStatusResponse>("rag/index/status/");
    },
    clearIndex: async (): Promise<AxiosResponse<{ cleared: boolean }> | undefined> => {
        return del<{ cleared: boolean }>("rag/index/");
    },
    getStats: async (): Promise<AxiosResponse<RAGStatsResponse> | undefined> => {
        return get<RAGStatsResponse>("rag/stats/");
    },
    getHealth: async (): Promise<AxiosResponse<RAGHealthResponse> | undefined> => {
        return get<RAGHealthResponse>("rag/health/");
    },
    getFiles: async (query = "", limit = 20): Promise<AxiosResponse<RAGFilesResponse> | undefined> => {
        const q = encodeURIComponent(query);
        return get<RAGFilesResponse>(`rag/files/?q=${q}&limit=${limit}`);
    },
};

const organisation = {
    scanVaultTags: async (): Promise<AxiosResponse<ScanVaultTagsResponse> | undefined> => {
        return get<ScanVaultTagsResponse>("scan-vault-tags/");
    },
    getUntaggedFiles: async (): Promise<AxiosResponse<UntaggedFilesResponse> | undefined> => {
        return get<UntaggedFilesResponse>("untagged-files/");
    },
    applyTags: async (payload: ApplyTagsRequest): Promise<AxiosResponse<ApplyTagsResponse> | undefined> => {
        return post<ApplyTagsResponse>("apply-tags/", payload);
    },
    applyTagsBulk: async (payload: ApplyTagsBulkRequest): Promise<AxiosResponse<ApplyTagsBulkResponse> | undefined> => {
        return post<ApplyTagsBulkResponse>("apply-tags-bulk/", payload);
    },
    getCategoryMembership: async (payload: CategoryMembershipRequest): Promise<AxiosResponse<CategoryMembershipResponse> | undefined> => {
        return post<CategoryMembershipResponse>("category-membership/", payload);
    },
    removeTagsBulk: async (payload: RemoveTagsBulkRequest): Promise<AxiosResponse<RemoveTagsBulkResponse> | undefined> => {
        return post<RemoveTagsBulkResponse>("remove-tags-bulk/", payload);
    },
    matchTags: async (payload: MatchTagsRequest): Promise<AxiosResponse<MatchTagsResponse> | undefined> => {
        return post<MatchTagsResponse>("match-tags/", payload);
    },
};

export default { post, get, put, del, organisation, rag };
