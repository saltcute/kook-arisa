import { BaseCommand, BaseSession, CommandFunction } from "kasumi.js";
import menu from "..";
import { controller } from "menu/arisa";

class AppCommand extends BaseCommand {
    name = 'kill';
    description = '(font)Danger(font)[danger] (Somewhat) gracefully terminate the main process.';
    func: CommandFunction<BaseSession, any> = async (session) => {
        await session.send("Shutting down...");
        for (const streamer of controller.activeStreamersArray) {
            await streamer.disconnect("机器人被管理员关闭（重启），请稍后再试");
        }
        process.exit(0);
    }
}

const command = new AppCommand();
export default command;
menu.addCommand(command);


