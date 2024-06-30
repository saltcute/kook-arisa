import { BaseMenu } from "kasumi.js";
import menu from "menu/arisaAdmin";
import kill from "./kill";
class AppMenu extends BaseMenu {
    name = "control";
    description = "Admin playback controls.";
}

const controlMenu = new AppMenu(kill);
export default controlMenu;
menu.addCommand(controlMenu);
