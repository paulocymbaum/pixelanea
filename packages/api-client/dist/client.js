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
async function requestBinary(path, options = {}, config = {}) {
    const base = config.baseUrl ?? "";
    const response = await fetch(`${base}${path}`, {
        ...options,
        headers: {
            Accept: "image/gif",
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
    return response.blob();
}
export function createApiClient(config = {}) {
    return {
        getHealth: () => request("/api/health", {}, config),
        createProject: (body) => request("/api/projects", { method: "POST", body: JSON.stringify(body) }, config),
        openProject: (body) => request("/api/projects/open", { method: "POST", body: JSON.stringify(body) }, config),
        getProject: (projectId) => request(`/api/projects/${projectId}`, {}, config),
        updateProject: (projectId, body) => request(`/api/projects/${projectId}`, { method: "PATCH", body: JSON.stringify(body) }, config),
        closeProject: (projectId) => request(`/api/projects/${projectId}`, { method: "DELETE" }, config),
        saveProject: (projectId, body) => request(`/api/projects/${projectId}/save`, { method: "POST", body: JSON.stringify(body) }, config),
        listFrames: (projectId) => request(`/api/projects/${projectId}/frames`, {}, config),
        getFrame: (projectId, frameIndex) => request(`/api/projects/${projectId}/frames/${frameIndex}`, {}, config),
        putFrame: (projectId, frameIndex, body) => request(`/api/projects/${projectId}/frames/${frameIndex}`, { method: "PUT", body: JSON.stringify(body) }, config),
        duplicateFrames: (projectId, body) => request(`/api/projects/${projectId}/frames/duplicate`, { method: "POST", body: JSON.stringify(body) }, config),
        copyFrame: (projectId, body) => request(`/api/projects/${projectId}/frames/copy`, { method: "POST", body: JSON.stringify(body) }, config),
        reorderFrames: (projectId, body) => request(`/api/projects/${projectId}/frames/reorder`, { method: "POST", body: JSON.stringify(body) }, config),
        getPalette: (projectId) => request(`/api/projects/${projectId}/palette`, {}, config),
        putPalette: (projectId, body) => request(`/api/projects/${projectId}/palette`, { method: "PUT", body: JSON.stringify(body) }, config),
        importPixelate: (projectId, body) => request(`/api/projects/${projectId}/import/pixelate`, { method: "POST", body: JSON.stringify(body) }, config),
        exportGif: (projectId, body) => requestBinary(`/api/projects/${projectId}/export/gif`, {
            method: "POST",
            ...(body ? { body: JSON.stringify(body) } : {}),
        }, config),
    };
}
