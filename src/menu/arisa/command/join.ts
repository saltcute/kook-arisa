import { client } from "init/client";
import { BaseCommand, BaseSession, Card, CommandFunction } from "kasumi.js";
import menu, { controller } from "..";

class AppCommand extends BaseCommand {
    name = 'join';
    description = '使机器人加入当前所在语音频道';
    func: CommandFunction<BaseSession, any> = async (session) => {
        if (!session.guildId) return session.reply("只能在服务器频道中使用此命令");
        let previousChannel, joinedChannel;
        if (previousChannel = controller.getGuildChannel(session.guildId)) {
            if (session.args.includes('\\-\\-force')) await controller.abortStream(previousChannel);
            else return session.reply("一个服务器中只能同时有一只 Arisa 推流，使用 `/arisa join --force` 来强制取消另一频道的推流");
        }
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
            let streamer;
            if (streamer = await controller.joinChannel(session.guildId, joinedChannel.id)) {
                const { err, data } = await streamer.kasumi.API.user.me();
                if (err) {
                    this.logger.error(err);
                    streamer.disconnect();
                    return session.reply("查询推流机器人资料失败");
                }
                return session.reply(`(met)${data.id}(met) 已开始在 #${joinedChannel.name} 推流`);
            } else {
                return session.reply("没有更多可用推流机器人，请稍后再试");
            }
        } else {
            return session.reply('请先加入语音频道');
        }
    }
}

const command = new AppCommand();
export default command;
menu.addCommand(command);