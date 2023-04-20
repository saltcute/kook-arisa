import { BaseCommand, BaseSession, Card, CommandFunction } from "kasumi.js";
import menu, { getChannelStreamer } from "..";
import playlist from "../controller/playlist";

class AppCommand extends BaseCommand {
    name = 'save';
    description = '保存当前播放列表';
    func: CommandFunction<BaseSession, any> = async (session) => {
        if (!session.guildId) return session.reply("只能在服务器频道中使用此命令");
        getChannelStreamer(session.guildId, session.authorId).then(async (streamer) => {
            const { err, data } = await session.send(new Card().addText("正在保存播放列表"));
            if (err) throw err;
            const messageId = data.msg_id;
            await playlist.user.save(streamer, session.authorId);
            return session.update(messageId, new Card().addText("已保存播放列表"));
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