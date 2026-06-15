const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://innotrack-aneshpdxd6habnd6.uaenorth-01.azurewebsites.net";

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number>;
}

class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
}

async function handleTokenRefresh(): Promise<string | null> {
  const accessToken = localStorage.getItem("accessToken");
  const refreshToken = localStorage.getItem("refreshToken");

  if (!accessToken || !refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/Auth/refresh-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accessToken, refreshToken }),
    });

    if (!response.ok) {
      throw new Error("Refresh failed");
    }

    const data = await response.json();
    if (data.accessToken && data.refreshToken) {
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      return data.accessToken;
    }
    return null;
  } catch (error) {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }
}

async function request(endpoint: string, options: RequestOptions = {}): Promise<any> {
  let url = `${BASE_URL}${endpoint}`;

  if (options.params) {
    const queryParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        queryParams.append(key, String(val));
      }
    });
    const queryStr = queryParams.toString();
    if (queryStr) {
      url += `?${queryStr}`;
    }
  }

  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
  };

  try {
    let response = await fetch(url, fetchOptions);

    if (response.status === 401 && typeof window !== "undefined" && localStorage.getItem("refreshToken")) {
      if (!isRefreshing) {
        isRefreshing = true;
        const newAccessToken = await handleTokenRefresh();
        isRefreshing = false;
        if (newAccessToken) {
          onRefreshed(newAccessToken);
        }
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            headers.set("Authorization", `Bearer ${token}`);
            resolve(request(endpoint, options));
          });
        });
      }

      // Retry original request if refresh succeeded
      const retriedToken = localStorage.getItem("accessToken");
      if (retriedToken) {
        headers.set("Authorization", `Bearer ${retriedToken}`);
        response = await fetch(url, { ...options, headers });
      }
    }

    if (response.status === 204) {
      return null;
    }

    const responseText = await response.text();
    let responseData;
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch {
      responseData = { text: responseText };
    }

    if (!response.ok) {
      let errorMessage = responseData.error || responseData.message || responseData.detail || responseData.title || `Request failed with status ${response.status}`;
      
      // Extract specific validation errors if present
      if (responseData.errors && typeof responseData.errors === 'object') {
        const errorList: string[] = [];
        for (const [key, value] of Object.entries(responseData.errors)) {
          // Format the field name to be more readable (e.g., "newPassword" -> "New Password")
          const fieldName = key.replace(/([A-Z])/g, ' $1').trim();
          const capitalizedField = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
          
          const messages = Array.isArray(value) ? value.join(' ') : String(value);
          errorList.push(`${capitalizedField}: ${messages}`);
        }
        
        if (errorList.length > 0) {
          errorMessage = errorList.join(' • ');
        }
      }
      
      // Prevent generic ASP.NET Core messages if no specific details are available
      if (errorMessage === "One or more validation errors occurred." || errorMessage.includes("An error occurred while processing your request.")) {
        errorMessage = "Please check your input and try again.";
      }

      throw new ApiError(
        errorMessage,
        response.status,
        responseData
      );
    }

    return responseData;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message || "Network error", 0, null);
  }
}

export const api = {
  get: (endpoint: string, options: RequestOptions = {}) =>
    request(endpoint, { ...options, method: "GET" }),
  post: (endpoint: string, body?: any, options: RequestOptions = {}) =>
    request(endpoint, { ...options, method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: (endpoint: string, body?: any, options: RequestOptions = {}) =>
    request(endpoint, { ...options, method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: (endpoint: string, body?: any, options: RequestOptions = {}) =>
    request(endpoint, { ...options, method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: (endpoint: string, options: RequestOptions = {}) =>
    request(endpoint, { ...options, method: "DELETE" }),
  notifications: {
    getAll: (unreadOnly: boolean = false) =>
      request(`/api/Notifications?unreadOnly=${unreadOnly}`, { method: "GET" }),
    markAsRead: (id: number | string) =>
      request(`/api/Notifications/${id}/read`, { method: "PATCH" }),
    markAllAsRead: () =>
      request(`/api/Notifications/read-all`, { method: "PATCH" }),
    clearAll: () =>
      request(`/api/Notifications/clear-all`, { method: "DELETE" }),
  },
};
