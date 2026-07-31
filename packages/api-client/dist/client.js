export class ApiError extends Error {
    status;
    body;
    constructor(status, message, body) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.body = body;
    }
}
async function request(path, options = {}, config = {}) {
    const base = config.baseUrl ?? "";
    const response = await fetch(`${base}${path}`, {
        ...options,
        headers: {
            Accept: "application/json",
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers,
        },
    });
    if (!response.ok) {
        let body;
        try {
            body = (await response.json());
        }
        catch {
            // non-JSON error body
        }
        const message = body?.message ?? `Request failed (${response.status})`;
        throw new ApiError(response.status, message, body);
    }
    if (response.status === 204) {
        return undefined;
    }
    return (await response.json());
}
export function createApiClient(config = {}) {
    return {
        getHealth: () => request("/api/health", {}, config),
        createProject: (body) => request("/api/projects", { method: "POST", body: JSON.stringify(body) }, config),
        getProject: (projectId) => request(`/api/projects/${projectId}`, {}, config),
        updateProject: (projectId, body) => request(`/api/projects/${projectId}`, { method: "PATCH", body: JSON.stringify(body) }, config),
        closeProject: (projectId) => request(`/api/projects/${projectId}`, { method: "DELETE" }, config),
        listFrames: (projectId) => request(`/api/projects/${projectId}/frames`, {}, config),
        getFrame: (projectId, frameIndex) => request(`/api/projects/${projectId}/frames/${frameIndex}`, {}, config),
        putFrame: (projectId, frameIndex, body) => request(`/api/projects/${projectId}/frames/${frameIndex}`, { method: "PUT", body: JSON.stringify(body) }, config),
        duplicateFrames: (projectId, body) => request(`/api/projects/${projectId}/frames/duplicate`, { method: "POST", body: JSON.stringify(body) }, config),
        getPalette: (projectId) => request(`/api/projects/${projectId}/palette`, {}, config),
        putPalette: (projectId, body) => request(`/api/projects/${projectId}/palette`, { method: "PUT", body: JSON.stringify(body) }, config),
    };
}
