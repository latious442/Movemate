import serverless from "serverless-http";
import { app } from "../../client/server/src/app";

export const handler = serverless(app);
