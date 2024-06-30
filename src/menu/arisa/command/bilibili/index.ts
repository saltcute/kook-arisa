import { BaseMenu } from "kasumi.js";
import menu from "menu/arisa";
import search from "./play";

class AppMenu extends BaseMenu {
    name = "bilibili";
    description = "播放哔哩哔哩";
}

const neteaseMenu = new AppMenu(search);
export default neteaseMenu;
menu.addCommand(neteaseMenu);
