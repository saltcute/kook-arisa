import { client } from "init/client";
import { BaseCommand, BaseSession, Card, CommandFunction } from "kasumi.js";
import menu, { getChannelStreamer } from "..";
import queue from "./queue";

class AppCommand extends BaseCommand {
    name = 'shuffle';
    description = '随机打乱播放列表';
    func: CommandFunction<BaseSession, any> = async (session) => {
        if (!session.guildId) return session.reply("只能在服务器频道中使用此命令");
        getChannelStreamer(session.guildId, session.authorId).then(async (streamer) => {
            streamer.shuffle();
            session.reply("已打乱播放列表");
            queue.exec(session);
        }).catch((e) => {
            switch (e.err) {
                case 'network_failure':
                case 'no_streamer':
                case 'no_joinedchannel':
                    return session.sendTemp(e.msg);
                default:
                    client.logger.error(e);
            }
        });
    }
}

const command = new AppCommand();
export default command;
menu.addCommand(command);
menu.addAlias(command, 'next');