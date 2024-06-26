import { BaseMenu } from "kasumi.js";
import menu from "menu/arisa";
import importCommand from "./import";
import play from "./play";

class AppMenu extends BaseMenu {
    name = 'spotify';
    description = '播放 Spotify';
}

const spotifyMenu = new AppMenu(play, importCommand);

spotifyMenu.on('ready', () => {
    spotifyMenu.client.middlewares.AccessControl.global.group.setCommandLevel(spotifyMenu, 2333);
})

export default spotifyMenu;
menu.addCommand(spotifyMenu);
