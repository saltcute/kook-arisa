import { client } from "init/client";
import { BaseCommand, BaseSession, Card, CommandFunction } from "kasumi.js";
import menu from "..";
import { controller } from "menu/arisa";

class AppCommand extends BaseCommand {
    name = 'reload';
    description = 'Reload streamer token pool';
    func: CommandFunction<BaseSession, any> = async (session) => {
        controller.loadStreamer();
        return session.reply("Reloaded");
    }
}

const command = new AppCommand();
export default command;
menu.addCommand(command);
menu.addAlias(command, 'next');