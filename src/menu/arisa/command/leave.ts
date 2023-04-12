import { client } from "init/client";
import { BaseCommand, BaseSession, Card, CommandFunction } from "kasumi.js";
import menu, { controller } from "..";

class AppCommand extends BaseCommand {
    name = 'leave';
    description = '使机器人退出语音频道';
    func: CommandFunction<BaseSession, any> = async (session) => {
        if (!session.guildId) return session.reply("只能在服务器频道中使用此命令");
        let joinedChannel;
        for await (const { err, data } of client.API.channel.user.joinedChannel(session.guildId, session.authorId)) {
            if (err) {
                this.logger.error(err);
                return session.reply("获取加入频道失败");
            }
            for (const channel of data.items) {
                joinedChannel = channel;
                break;
            }
            if (joinedChannel) break;
        }
        if (joinedChannel) {
            const streamer = controller.getChannelStreamer(joinedChannel.id);
            if (streamer) {
                await streamer.disconnect();
                return session.reply("已停止推流");
            } else {
                return session.reply("没有在此频道推流");
            }
        } else {
            return session.reply("只能停止自己所在频道的推流");
        }
    }
}

const command = new AppCommand();
export default command;
menu.addCommand(command);