import { BaseMenu } from "kasumi.js";
import menu from "menu/arisa";
import search from "./search";

class AppMenu extends BaseMenu {
    name = 'netease';
    description = '点歌网易云';
}

const neteaseMenu = new AppMenu(search);
export default neteaseMenu;
menu.addCommand(neteaseMenu);