const API_BASE_URL = "http://localhost:8000";

type ApiErrorResponse = {
  detail?: string;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = "Request failed";

    try {
      const errorBody =
        (await response.json()) as ApiErrorResponse;

      if (errorBody.detail) {
        message = errorBody.detail;
      }
    } catch {
      // Keep the generic error when the response isn't JSON.
    }

    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export type CurrentUser = {
  id: string;
  username: string;
  account_type: "A" | "U";
  is_active: boolean;
  must_change_password: boolean;
};

export type LoginRequest = {
  username: string;
  password: string;
};

export type CompletePasswordChangeRequest = {
  new_password: string;
  confirm_password: string;
};

export const api = {
  login(data: LoginRequest) {
    return request<CurrentUser>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  logout() {
    return request<void>("/api/v1/auth/logout", {
      method: "POST",
    });
  },

  me() {
    return request<CurrentUser>("/api/v1/auth/me");
  },

  completePasswordChange(
    data: CompletePasswordChangeRequest,
  ) {
    return request<CurrentUser>(
      "/api/v1/auth/complete-password-change",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  },
};