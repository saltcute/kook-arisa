import { BaseCommand, BaseSession, CommandFunction } from "kasumi.js";
import menu from "..";
import broadcast from "./message/broadcast";

class AppCommand extends BaseCommand {
    name = 'kill';
    description = '(font)Danger(font)[danger] (Somewhat) gracefully terminate the main process.';
    func: CommandFunction<BaseSession, any> = async (session) => {
        await session.send("Shutting down...");
        await broadcast.broadcast("机器人被管理员关闭（重启），机器人重新启动后会自动重新连接语音。如果机器人上线后没有重连请手动重试。");
        process.exit(0);
    }
}

const command = new AppCommand();
export default command;
menu.addCommand(command);


