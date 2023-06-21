import { BaseCommand, BaseSession, Card, CommandFunction } from "kasumi.js";
import menu from "..";
import { controller } from "menu/arisa";
import { isAdmin } from "../common";

class AppCommand extends BaseCommand {
    name = 'list';
    description = 'List all streamers';
    func: CommandFunction<BaseSession, any> = async (session) => {
        if (!isAdmin(session.authorId)) {
            return session.reply("You do not have the permission to use this command")
        }
        const streamers = controller.allStreamerTokens;
        const card = new Card().addText(streamers.map((v) => {
            return v.slice(0, 11) +
                '###############' +
                v.slice(26) +
                (controller.getStreamerChannel(v) ? '(in use)' : '');
        }).join('\n'));
        return session.reply(card);
    }
}

const command = new AppCommand();
export default command;
menu.addCommand(command);