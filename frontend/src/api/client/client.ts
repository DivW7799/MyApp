// const API_BASE_URL = "http://localhost:8000";
// const API_BASE_URL = "http://192.168.0.100:8000";
//const API_BASE_URL = `http://${window.location.hostname}:8000`;
const API_BASE_URL = import.meta.env.DEV
  ? `http://${window.location.hostname}:8000`
  : window.location.origin;

type ApiValidationError = {
  type?: string;
  loc?: Array<string | number>;
  msg?: string;
  input?: unknown;
};

type ApiErrorResponse = {
  detail?: string | ApiValidationError[];
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseApiError(response: Response): Promise<string> {
  let message = "Request failed";

  try {
    const errorBody = (await response.json()) as ApiErrorResponse;

    if (typeof errorBody.detail === "string") {
      message = errorBody.detail;
    } else if (Array.isArray(errorBody.detail)) {
      message = errorBody.detail
        .map((error) => error.msg)
        .filter((msg): msg is string => Boolean(msg))
        .join(" ");
    }
  } catch {}

  return message;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    const message = await parseApiError(response);
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function requestBlob(
  path: string,
  options: RequestInit = {},
): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
  });

  if (!response.ok) {
    const message = await parseApiError(response);
    throw new ApiError(response.status, message);
  }

  return await response.blob();
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

export type AccountType = "A" | "U";

export type CreateUserRequest = {
  username: string;
  password: string;
  account_type: AccountType;
};

export type CreatedUser = {
  id: string;
  username: string;
  account_type: AccountType;
  is_active: boolean;
  must_change_password: boolean;
};

export type AdminUser = {
  id: string;
  username: string;
  account_type: AccountType;
  is_active: boolean;
  must_change_password: boolean;
};

export type UpdateUserRequest = {
  username?: string;
  account_type?: AccountType;
  is_active?: boolean;
};

export type ResetUserPasswordRequest = {
  new_password: string;
  confirm_password: string;
};

export type ResetUserPasswordResponse = void;

export type UpdateOwnProfileRequest = {
  username: string;
};

export type ChangeOwnPasswordRequest = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

export type ImageRecord = {
  id: string;
  text: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
};

export type ImageSearchFilters = {
  search?: string;
  description?: string;
  filename?: string;
  fromDate?: string;
  toDate?: string;
};

export type TableFormNeedleRowInput = {
  row_number: number;
  needle_1: string;
  needle_2: string;
  needle_3: string;
  needle_4: string;
  needle_5: string;
  needle_6: string;
};

export type CreateTableFormRequest = {
  party_name: string;
  description: string;
  stitches: string;
  d_no: string;
  piece: string;
  form_date: string;
  source_image_record_id?: string | null;
  needle_rows: TableFormNeedleRowInput[];
};

export type CardStatus = "y" | "n";
export type CardWorkflow = "design" | "delivery";

export type TableFormRecord = {
  id: string;
  party_name: string;
  description: string;
  stitches: string;
  d_no: string;
  piece: string;
  form_date: string;
  source_image_record_id: string | null;
  design_status: CardStatus;
  delivery_status: CardStatus;
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

  completePasswordChange(data: CompletePasswordChangeRequest) {
    return request<CurrentUser>("/api/v1/auth/complete-password-change", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  changeOwnPassword(data: ChangeOwnPasswordRequest) {
    return request<CurrentUser>("/api/v1/auth/change-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  createUser(data: CreateUserRequest) {
    return request<CreatedUser>("/api/v1/admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getUsers() {
    return request<AdminUser[]>("/api/v1/admin/users");
  },

  getUser(userId: string) {
    return request<AdminUser>(`/api/v1/admin/users/${userId}`);
  },

  updateUser(userId: string, data: UpdateUserRequest) {
    return request<AdminUser>(`/api/v1/admin/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  resetUserPassword(userId: string, data: ResetUserPasswordRequest) {
    return request<ResetUserPasswordResponse>(
      `/api/v1/admin/users/${userId}/password`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  },

  updateOwnProfile(data: UpdateOwnProfileRequest) {
    return request<CurrentUser>("/api/v1/auth/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  getImageRecords(filters: ImageSearchFilters = {}) {
    const params = new URLSearchParams();

    if (filters.search?.trim()) {
      params.set("search", filters.search.trim());
    }

    if (filters.description?.trim()) {
      params.set("description", filters.description.trim());
    }

    if (filters.filename?.trim()) {
      params.set("filename", filters.filename.trim());
    }

    if (filters.fromDate) {
      params.set("from_date", filters.fromDate);
    }

    if (filters.toDate) {
      params.set("to_date", filters.toDate);
    }

    const query = params.toString();

    return request<ImageRecord[]>(
      `/api/v1/image-library${query ? `?${query}` : ""}`,
    );
  },

  createImageRecord(text: string, image: File) {
    const formData = new FormData();

    formData.append("text", text);
    formData.append("image", image);

    return request<ImageRecord>("/api/v1/image-library", {
      method: "POST",
      body: formData,
    });
  },

  getImageRecordImage(recordId: string) {
    return requestBlob(`/api/v1/image-library/${recordId}/image`);
  },

  readImageText(image: File, signal?: AbortSignal) {
    const formData = new FormData();
    formData.append("image", image);

    return request<unknown>("/api/v1/ocr/read", {
      method: "POST",
      body: formData,
      signal,
    });
  },

  createTableForm(data: CreateTableFormRequest) {
    return request<TableFormRecord>("/api/v1/table-forms", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getTableForms() {
    return request<TableFormRecord[]>("/api/v1/table-forms");
  },

  updateTableFormStatus(
    recordId: string,
    workflow: CardWorkflow,
    status: CardStatus,
  ) {
    return request<TableFormRecord>(`/api/v1/table-forms/${recordId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ workflow, status }),
    });
  },
};
