import type { IncomingMessage, ServerResponse } from "node:http";
import { handleWorkspace } from "../src/server/cloud.js";
export default (req: IncomingMessage, res: ServerResponse) =>
  handleWorkspace(req, res);
