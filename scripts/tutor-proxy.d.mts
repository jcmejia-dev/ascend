import type { IncomingMessage, ServerResponse } from "node:http";
export function tutorRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void>;
