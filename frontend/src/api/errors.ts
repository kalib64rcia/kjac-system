/** Backend error envelope: {success:false, error:{code,message,details}}. */
export interface ApiErrorDetail {
  field?: string | null;
  message: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details: ApiErrorDetail[];
}

export class ApiError extends Error {
  code: string;
  status: number;
  details: ApiErrorDetail[];

  constructor(code: string, message: string, status: number, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
