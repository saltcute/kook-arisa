import { client } from "init/client";
import { BaseCommand, BaseSession, Card, CommandFunction } from "kasumi.js";
import { getChannelStreamer } from "../..";
import queueMenu from ".";

class ClearCommand extends BaseCommand {
    name = "clear";
    description = "清空播放列表";
    func: CommandFunction<BaseSession, any> = async (session) => {
        if (!session.guildId)
            return session.reply("只能在服务器频道中使用此命令");
        getChannelStreamer(session.guildId, session.authorId)
            .then(async (streamer) => {
                streamer.clearQueue();
                session.reply(new Card().addText("已清空播放列表"));
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

const clear = new ClearCommand();
export default clear;
