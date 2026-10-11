import type { IncomingMessage, ServerResponse } from "node:http";
import { handleAuth } from "../../src/server/cloud";
export default (req: IncomingMessage, res: ServerResponse) =>
  handleAuth(req, res, "session");
