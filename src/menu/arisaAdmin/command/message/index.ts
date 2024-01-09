import { BaseMenu } from "kasumi.js";
import menu from "menu/arisaAdmin";
import broadcast from './broadcast';
import message from './single';
class AppMenu extends BaseMenu {
    name = 'message';
    description = 'Send a message';
}

const controlMenu = new AppMenu(broadcast, message);
export default controlMenu;
menu.addCommand(controlMenu);