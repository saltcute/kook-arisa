import { BaseMenu } from "kasumi.js";
import menu from "menu/arisa";
import add from "./add";
class AppMenu extends BaseMenu {
    name = 'panel';
    description = '控制面板操作';
}

const queueMenu = new AppMenu(add);
export default queueMenu;
menu.addCommand(queueMenu);