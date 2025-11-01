export interface AskRequest {
  prompt: string;
  interactive: boolean;
  confirm: boolean;
}

export interface AskResponse {
  message: string;
  data: {
    response: string;
    actions?: Array<{
      type: string;
      description: string;
      data: Record<string, unknown>;
    }>;
  };
}

export interface ErrorResponse {
  error: string;
  details?: string;
}
