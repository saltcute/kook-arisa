import { client } from "init/client";
import { BaseCommand, BaseSession, Card, CommandFunction } from "kasumi.js";
import menu, { controller, getChannelStreamer } from "..";
import playlist from "../playback/lib/playlist";

class AppCommand extends BaseCommand {
    name = 'leave';
    description = '使机器人退出语音频道';
    func: CommandFunction<BaseSession, any> = async (session) => {
        if (!session.guildId) return session.reply("只能在服务器频道中使用此命令");
        getChannelStreamer(session.guildId, session.authorId).then(async (streamer) => {
            const { err, data: channelUserList } = await client.API.channel.voiceChannelUserList(session.channelId);
            if (err) {
                this.logger.error(err);
                return session.reply(new Card().addText("获取频道用户列表失败"));
            }
            const userIDList = channelUserList.map(v => v.id);
            if (streamer.INVITATION_AUTHOR_ID == session.authorId || !(userIDList.includes(streamer.INVITATION_AUTHOR_ID))) {
                playlist.user.save(streamer, streamer.INVITATION_AUTHOR_ID);
                await streamer.disconnect();
                return session.reply(new Card().addText("已停止推流"));
            } else {
                return session.reply(new Card().addText("只有开始推流的用户或ta不在这个语音频道时才能停止推流"));
            }
        }).catch((e) => {
            switch (e.err) {
                case 'network_failure':
                case 'no_streamer':
                case 'no_joinedchannel':
                    return session.sendTemp(e.msg);
                default:
                    this.logger.error(e);
            }
        });
    }
}

const command = new AppCommand();
export default command;
menu.addCommand(command);