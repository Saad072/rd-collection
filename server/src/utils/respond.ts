/** API response envelope helpers: { ok:true, data } / { ok:false, error:{code,message} } */

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: { code: string; message: string };
}

export function ok<T>(data: T): ApiSuccess<T> {
  return { ok: true, data };
}

export function fail(code: string, message: string): ApiFailure {
  return { ok: false, error: { code, message } };
}

/** Error thrown inside handlers to produce a shaped API error response. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
