export interface ChatRequest {
  message?: string;
  messages?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

export interface ChatResponse {
  response: string;
}

export interface ErrorResponse {
  error?: string;
  message?: string;
}
