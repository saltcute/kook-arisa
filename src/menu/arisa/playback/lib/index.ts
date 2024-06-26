import { client } from "init/client";
import { LocalController } from "../local/controller";

export const controller = new LocalController(client);