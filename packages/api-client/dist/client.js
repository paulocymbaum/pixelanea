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
    const hasOctetStreamBody = options.headers &&
        typeof options.headers === "object" &&
        !Array.isArray(options.headers) &&
        "Content-Type" in options.headers &&
        String(options.headers["Content-Type"]).startsWith("application/octet-stream");
    const response = await fetch(`${base}${path}`, {
        ...options,
        headers: {
            Accept: "application/json",
            ...(options.body && !hasOctetStreamBody ? { "Content-Type": "application/json" } : {}),
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
async function requestOctetStream(path, options = {}, config = {}) {
    const base = config.baseUrl ?? "";
    const response = await fetch(`${base}${path}`, {
        ...options,
        headers: {
            Accept: "application/octet-stream",
            ...(options.body ? { "Content-Type": "application/octet-stream" } : {}),
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
    const bytes = new Uint8Array(await response.arrayBuffer());
    return { body: bytes, headers: response.headers };
}
export function createApiClient(config = {}) {
    return {
        getHealth: () => request("/api/health", {}, config),
        computeSelection: (body) => request("/api/compute/selection", { method: "POST", body: JSON.stringify(body) }, config),
        pickProjectPath: (body) => request("/api/dialog/pick-project-path", { method: "POST", body: JSON.stringify(body) }, config),
        createProject: (body) => request("/api/projects", { method: "POST", body: JSON.stringify(body) }, config),
        openProject: (body) => request("/api/projects/open", { method: "POST", body: JSON.stringify(body) }, config),
        getProject: (projectId) => request(`/api/projects/${projectId}`, {}, config),
        updateProject: (projectId, body) => request(`/api/projects/${projectId}`, { method: "PATCH", body: JSON.stringify(body) }, config),
        closeProject: (projectId) => request(`/api/projects/${projectId}`, { method: "DELETE" }, config),
        saveProject: (projectId, body) => request(`/api/projects/${projectId}/save`, { method: "POST", body: JSON.stringify(body) }, config),
        listFrames: (projectId) => request(`/api/projects/${projectId}/frames`, {}, config),
        getFrame: (projectId, frameIndex) => request(`/api/projects/${projectId}/frames/${frameIndex}`, {}, config),
        putFrame: (projectId, frameIndex, body) => request(`/api/projects/${projectId}/frames/${frameIndex}`, { method: "PUT", body: JSON.stringify(body) }, config),
        putFrameBinary: (projectId, frameIndex, pixels) => request(`/api/projects/${projectId}/frames/${frameIndex}`, {
            method: "PUT",
            body: new Blob([Uint8Array.from(pixels)]),
            headers: { "Content-Type": "application/octet-stream" },
        }, config),
        getFrameBinary: async (projectId, frameIndex) => {
            const { body, headers } = await requestOctetStream(`/api/projects/${projectId}/frames/${frameIndex}`, {}, config);
            const index = Number(headers.get("X-Frame-Index") ?? frameIndex);
            const width = Number(headers.get("X-Frame-Width") ?? 0);
            const height = Number(headers.get("X-Frame-Height") ?? 0);
            const updatedAt = headers.get("X-Frame-Updated-At") ?? "";
            return { index, width, height, updatedAt, pixels: body };
        },
        patchFrameCells: (projectId, frameIndex, changes) => request(`/api/projects/${projectId}/frames/${frameIndex}/cells`, { method: "PATCH", body: JSON.stringify(changes) }, config),
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
