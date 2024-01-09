import { BaseMenu } from "kasumi.js";
import menu from "menu/arisaAdmin";
import kill from './kill';
class AppMenu extends BaseMenu {
    name = 'control';
    description = '全局播放控制';
}

const controlMenu = new AppMenu(kill);
export default controlMenu;
menu.addCommand(controlMenu);