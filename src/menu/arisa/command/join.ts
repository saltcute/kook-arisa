import { client } from "init/client";
import { BaseCommand, BaseSession, Card, CommandFunction } from "kasumi.js";
import menu, { controller } from "..";
import playlist from "../playback/lib/playlist";

class AppCommand extends BaseCommand {
    name = 'join';
    description = '使机器人加入当前所在语音频道';
    func: CommandFunction<BaseSession, any> = async (session) => {
        if (!session.guildId) return session.reply("只能在服务器频道中使用此命令");
        const { err, data: msg } = await session.reply(new Card().addText("正在分配一只 Arisa 到当前所在语音频道"));
        if (err) {
            this.logger.error(err);
            return;
        }
        let previousStreamers, joinedChannel;
        let guildLimit = 4;
        if (previousStreamers = controller.getGuildStreamers(session.guildId)) {
            if (previousStreamers.length >= guildLimit) {
                return session.update(msg.msg_id, new Card().addText(`一个服务器中只能同时有 ${guildLimit} 只 Arisa 推流`));
            }
        }
        for await (const { err, data } of client.API.channel.user.joinedChannel(session.guildId, session.authorId)) {
            if (err) {
                this.logger.error(err);
                return session.update(msg.msg_id, new Card().addText("获取加入频道失败"));
            }
            for (const channel of data.items) {
                joinedChannel = channel;
                break;
            }
            if (joinedChannel) break;
        }
        if (joinedChannel) {
            if (!controller.getChannelStreamer(joinedChannel.id)) {
                let streamer;
                if (streamer = await controller.joinChannel(session.guildId, joinedChannel.id, session.authorId, session.channelId)) {
                    const { err, data } = await streamer.kasumi.API.user.me();
                    if (err) {
                        this.logger.error(err);
                        streamer.disconnect();
                        return session.update(msg.msg_id, new Card().addText("查询推流机器人资料失败"));
                    }
                    await session.update(msg.msg_id, new Card().addText("正在同步播放列表"));
                    await playlist.user.restore(streamer, streamer.INVITATION_AUTHOR_ID).catch((e) => { this.logger.error(e) });
                    return session.update(msg.msg_id, new Card().addText(`(met)${data.id}(met) 已开始在 #${joinedChannel.name} 推流`));
                } else {
                    return session.update(msg.msg_id, new Card().addText("没有更多可用推流机器人，请稍后再试"));
                }
            } else {
                return session.update(msg.msg_id, new Card().addText('一个频道只能有一只 Arisa'));
            }
        } else {
            return session.update(msg.msg_id, new Card().addText('请先加入语音频道'));
        }
    }
}

const command = new AppCommand();
export default command;
menu.addCommand(command);