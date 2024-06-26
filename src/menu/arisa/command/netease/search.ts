import { BaseCommand, BaseSession, Card, CommandFunction } from "kasumi.js";
import { searchNetease } from "../lib";
import neteaseMenu from ".";

class SearchCommand extends BaseCommand {
    name = "search";
    description = "在网易云搜索";

    func: CommandFunction<BaseSession, any> = async (session) => {
        if (!session.guildId)
            return session.reply("只能在服务器频道中使用此命令");
        const keyword = session.args.join(" ");
        if (keyword) {
            const { err, data } = await session.reply(
                new Card().addText("正在搜索…")
            );
            if (err) {
                this.logger.error(err);
                return;
            }
            session.update(data.msg_id, await searchNetease(keyword));
        } else {
            session.reply("Please provide a keyword");
        }
    };
}

const search = new SearchCommand();
export default search;
