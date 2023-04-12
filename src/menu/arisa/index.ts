import { client } from "init/client";
import { BaseMenu } from "kasumi.js";
import upath from 'upath';
import * as fs from 'fs';
import './event';
import './button';
import { Controller } from "./controller";

class AppMenu extends BaseMenu {
    name = 'arisa';
    prefix = './!。！';
}

const menu = new AppMenu();
export default menu;
client.plugin.load(menu);

const basicPath = upath.join(__dirname, 'command');
const commands = fs.readdirSync(basicPath);
for (const command of commands) {
    try {
        require(upath.join(basicPath, command));
    } catch (e) {
        menu.logger.error('Error loading command');
        menu.logger.error(e);
    }
}

export const controller = new Controller(client.TOKEN);