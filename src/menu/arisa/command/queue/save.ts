import { BaseCommand, BaseSession, Card, CommandFunction } from "kasumi.js";
import { getChannelStreamer } from "../..";
import playlist from "../../playback/lib/playlist";
import queueMenu from ".";

class SaveCommand extends BaseCommand {
    name = 'save';
    description = '保存当前播放列表';
    func: CommandFunction<BaseSession, any> = async (session) => {
        if (!session.guildId) return session.reply("只能在服务器频道中使用此命令");
        getChannelStreamer(session.guildId, session.authorId).then(async (streamer) => {
            if (streamer.INVITATION_AUTHOR_ID == session.authorId) {
                const { err, data } = await session.send(new Card().addText("正在保存播放列表"));
                if (err) throw err;
                const messageId = data.msg_id;
                await playlist.user.save(streamer, session.authorId);
                return session.update(messageId, new Card().addText("已保存播放列表"));
            } else {
                return session.send(new Card().addText("只有将 Arisa 邀请进入频道的用户才能保存播放列表"));
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

const save = new SaveCommand();
export default save;