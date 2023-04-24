import { BaseCommand, BaseSession, Card, CommandFunction } from "kasumi.js";
import menu, { getChannelStreamer } from "..";
import playlist from "../controller/playlist";

class AppCommand extends BaseCommand {
    name = 'load';
    description = '加载播放列表';
    func: CommandFunction<BaseSession, any> = async (session) => {
        if (!session.guildId) return session.reply("只能在服务器频道中使用此命令");
        getChannelStreamer(session.guildId, session.authorId).then(async (streamer) => {
            if (streamer.INVITATION_AUTHOR_ID == session.authorId) {
                const { err, data } = await session.send(new Card().addText("正在恢复播放列表"));
                if (err) throw err;
                const messageId = data.msg_id;
                await playlist.user.restore(streamer, session.authorId);
                return session.update(messageId, new Card().addText("已恢复播放列表"));
            } else {
                return session.send(new Card().addText("只有将 Arisa 邀请进入频道的用户才能恢复播放列表"));
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