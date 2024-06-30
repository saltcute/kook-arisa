import { client } from "init/client";
import { BaseCommand, BaseSession, CommandFunction } from "kasumi.js";
import { getChannelStreamer } from "../..";

class AddCommand extends BaseCommand {
    name = "add";
    description = "添加一个新的控制面板";
    func: CommandFunction<BaseSession, any> = async (session) => {
        if (!session.guildId)
            return session.reply("只能在服务器频道中使用此命令");
        getChannelStreamer(session.guildId, session.authorId)
            .then(async (streamer) => {
                if (streamer.panel) {
                    return streamer.panel.newPanel(session.channelId);
                } else {
                    return session.reply("当前推流机器不支持控制面板");
                }
            })
            .catch((e) => {
                switch (e.err) {
                    case "network_failure":
                    case "no_streamer":
                    case "no_joinedchannel":
                        return session.sendTemp(e.msg);
                    default:
                        client.logger.error(e);
                }
            });
    };
}

const list = new AddCommand();
export default list;
