import { BaseCommand, BaseSession, CommandFunction } from "kasumi.js";
import menu from "..";

class AppCommand extends BaseCommand {
    name = 'kmd';
    description = '复读传入的消息';
    func: CommandFunction<BaseSession, any> = async (session) => {
        if (session.args.length) await session.send(session.args.join(' '));
    }
}

const command = new AppCommand();
export default command;
menu.addCommand(command);