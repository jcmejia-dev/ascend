import type { IncomingMessage, ServerResponse } from "node:http";
import { handleAuth } from "../../src/server/cloud.js";
export default (req: IncomingMessage, res: ServerResponse) =>
  handleAuth(req, res, "login");
