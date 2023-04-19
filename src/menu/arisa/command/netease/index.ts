import { BaseCommand, BaseSession, Card, CommandFunction } from "kasumi.js";
import menu from "menu/arisa";
import { searchList } from "./lib/card";

class AppCommand extends BaseCommand {
    name = 'netease';
    description = '点歌网易云';
    func: CommandFunction<BaseSession, any> = async (session) => {
        if (!session.guildId) return session.reply("只能在服务器频道中使用此命令");
        switch (session.args[0]) {
            case 'search': {
                const keyword = session.args.slice(1).join(' ');
                if (keyword) {
                    const { err, data } = await session.reply(new Card().addText("正在搜索…"));
                    if (err) {
                        this.logger.error(err);
                        return;
                    }
                    session.update(data.msg_id, await searchList(keyword));
                } else {
                    session.reply("Please provide a keyword");
                }
                break;
            }
        }
    }
}

const command = new AppCommand();
export default command;
menu.addCommand(command);