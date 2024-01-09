import { BaseCommand, BaseSession, CommandFunction } from "kasumi.js";
import menu from "..";

class AppCommand extends BaseCommand {
    name = 'kill';
    func: CommandFunction<BaseSession, any> = async (session) => {
        await session.send("Shutting down...");
        process.exit(0);
    }
}

const command = new AppCommand();
export default command;
menu.addCommand(command);


