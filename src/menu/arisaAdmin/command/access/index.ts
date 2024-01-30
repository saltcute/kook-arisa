import { BaseMenu } from "kasumi.js";
import menu from "menu/arisaAdmin";
import grant from './grant';
import revoke from "./revoke";
class AppMenu extends BaseMenu {
    name = 'access';
    description = 'Admin access controls';
}

const controlMenu = new AppMenu(grant, revoke);

controlMenu.on('ready', () => {
    controlMenu.client.middlewares.AccessControl.global.group.setCommandLevel(menu, 9999);
})
export default controlMenu;
menu.addCommand(controlMenu);