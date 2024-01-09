import { BaseCommand, BaseSession, Card, CommandFunction } from "kasumi.js";
import menu from "..";
import { isAdmin } from "../common";

class AppCommand extends BaseCommand {
    name = 'kill';
    func: CommandFunction<BaseSession, any> = async (session) => {
        process.exit(0);
    }
}

const command = new AppCommand();
export default command;
menu.addCommand(command);


