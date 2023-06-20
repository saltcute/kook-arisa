import { BaseMenu } from "kasumi.js";
import menu from "menu/arisa";
import list from "./list";
import clear from "./clear";
import save from "./save";
import load from "./load";

class AppMenu extends BaseMenu {
    name = 'queue';
    description = '播放列表操作';
}

const queueMenu = new AppMenu(list, clear, load, save);
export default queueMenu;
menu.addCommand(queueMenu);