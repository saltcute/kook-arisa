import { client } from "init/client";
import upath from "upath";
import * as fs from "fs";

import EssentialMenu from "@saltcute/kasumi-essential";

const menu = new EssentialMenu("arisaadmin", "kook-arisa");
menu.on("ready", () => {
    menu.client.middlewares.AccessControl.global.group.setCommandLevel(
        menu,
        2333
    );
});
export default menu;
client.plugin.load(menu);

const basicPath = upath.join(__dirname, "command");
const commands = fs.readdirSync(basicPath);
for (const command of commands) {
    try {
        require(upath.join(basicPath, command));
    } catch (e) {
        menu.logger.error("Error loading command");
        menu.logger.error(e);
    }
}
