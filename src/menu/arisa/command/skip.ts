import { client } from "init/client";
import { BaseCommand, BaseSession, Card, CommandFunction } from "kasumi.js";
import menu, { getChannelStreamer } from "..";
import { Time } from "../playback/lib/time";

class AppCommand extends BaseCommand {
    name = "skip";
    description = "跳过这首歌";
    func: CommandFunction<BaseSession, any> = async (session) => {
        if (!session.guildId)
            return session.reply("只能在服务器频道中使用此命令");
        const { err, data } = await session.reply(
            new Card().addText("正在加载下一首歌...")
        );
        if (err) throw err;
        const messageId = data.msg_id;
        getChannelStreamer(session.guildId, session.authorId)
            .then(async (streamer) => {
                const upnext = await streamer.next();
                if (upnext) {
                    session.update(
                        messageId,
                        new Card()
                            .addTitle("Up Next")
                            .addText(
                                `${upnext.meta.title} (font)${Time.timeToString(upnext.meta.duration / 1000)}(font)[secondary]`
                            )
                            .addContext(upnext.meta.artists)
                    );
                } else {
                    session.update(
                        messageId,
                        new Card().addText("播放列表为空！")
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
                        client.logger.error(e);
                }
            });
    };
}

const command = new AppCommand();
export default command;
menu.addCommand(command);
menu.addAlias(command, "next");
