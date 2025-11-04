export interface AskRequest {
  prompt: string;
  interactive?: boolean;
  confirm?: boolean;
  context?: Record<string, unknown>;
  session_id?: string;
  confirmation_token?: string;
}

export interface AskResponse {
  status:
    | "pending"
    | "confirmation_required"
    | "interactive_response"
    | "completed"
    | "error";
  session_id?: string;
  message: string;
  data?: unknown;
  confirmation_token?: string;
  requires_confirmation?: boolean;
  interactive?: boolean;
}

export interface ConfirmationRequest {
  confirmation_token: string;
  approved: boolean;
}

export interface ErrorResponse {
  error?: string;
  message?: string;
  details?: string;
}
