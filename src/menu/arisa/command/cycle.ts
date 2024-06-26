import { client } from "init/client";
import { BaseCommand, BaseSession, Card, CommandFunction } from "kasumi.js";
import menu, { getChannelStreamer } from "..";

class AppCommand extends BaseCommand {
    name = "cycle";
    description = "设置循环模式";
    func: CommandFunction<BaseSession, any> = async (session) => {
        if (!session.guildId)
            return session.reply("只能在服务器频道中使用此命令");
        getChannelStreamer(session.guildId, session.authorId)
            .then(async (streamer) => {
                if (streamer.INVITATION_AUTHOR_ID == session.authorId) {
                    const mode = session.args[0];
                    switch (mode) {
                        case "no_repeat":
                            streamer.setCycleMode(mode);
                            session.reply("已设置为不循环");
                            break;
                        case "repeat":
                            streamer.setCycleMode(mode);
                            session.reply("已设置为顺序循环");
                            break;
                        case "repeat_one":
                            streamer.setCycleMode(mode);
                            session.reply("已设置为单曲循环");
                            break;
                        case "random":
                            streamer.shuffle();
                            streamer.setCycleMode("repeat");
                            session.reply("已设置为随机循环");
                            break;
                        default:
                            session.reply(
                                new Card()
                                    .addText("当前模式：")
                                    .addText(streamer.getCycleMode())
                                    .addDivider()
                                    .addText("可能的模式：")
                                    .addText("　　`no_repeat`: 不循环")
                                    .addText("　　`repeat`: 顺序循环")
                                    .addText("　　`repeat_one`: 单曲循环")
                                    .addText("　　`random`: 随机循环")
                                    .addText(
                                        "发送类似这样的指令来调整循环模式\n```\n/arisa cycle repeat\n```"
                                    )
                            );
                    }
                } else {
                    return session.send(
                        new Card().addText(
                            "只有将 Arisa 邀请进入频道的用户才能恢复播放列表"
                        )
                    );
                }
            })
            .catch((e) => {
                switch (e.err) {
                    case "network_failure":
                    case "no_streamer":
                    case "no_joinedchannel":
                        return session.sendTemp(e.msg);
                    default:
                        this.logger.error(e);
                }
            });
    };
}

const command = new AppCommand();
export default command;
menu.addCommand(command);
