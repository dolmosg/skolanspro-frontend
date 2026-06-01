/**
 * Official SkolansPro API response envelope.
 *
 * Backend contract:
 * {
 *   success: boolean;
 *   data: mixed;
 *   message: string;
 * }
 *
 * `data` is intentionally flexible. It can contain records, collections,
 * validation details, operation metadata, or an empty object/array depending
 * on the endpoint and screen requirements.
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message: string;
}

/**
 * Failed logical response using the same API envelope.
 *
 * The error payload is intentionally generic because backend failures may
 * return validation errors, business rule details, operation metadata, or
 * any other screen-specific payload.
 */
export interface ApiFailResponse<E = unknown> {
  success: false;
  data: E;
  message: string;
}

export type ApiResponse<T = unknown, E = unknown> =
  | ApiSuccessResponse<T>
  | ApiFailResponse<E>;

/**
 * Optional helper type for screens that expect validation-style errors.
 */
export interface ApiValidationErrorData {
  errors?: Record<string, string[] | string | null | unknown>;
}