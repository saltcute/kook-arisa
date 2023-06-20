import { BaseCommand, BaseSession, Card, CommandFunction } from "kasumi.js";
import menu from "..";
import { isAdmin } from "../common";

class AppCommand extends BaseCommand {
    name = 'kill';
    func: CommandFunction<BaseSession, any> = async (session) => {
        if (!isAdmin(session.authorId)) {
            return session.reply("You do not have the permission to use this command")
        }
        process.exit(0);
    }
}

const command = new AppCommand();
export default command;
menu.addCommand(command);


