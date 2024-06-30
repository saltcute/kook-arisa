import { client } from "init/client";
import { BaseCommand, BaseSession, Card, CommandFunction } from "kasumi.js";
import { getChannelStreamer } from "../..";
import { Time } from "../../playback/lib/time";
import queueMenu from ".";
import { queueItem } from "menu/arisa/playback/type";

class ListCommand extends BaseCommand {
    name = "list";
    description = "查看当前播放列表";

    private getIcon(item?: queueItem) {
        if (!item) return "";
        let icon = "";
        switch (item.extra.type) {
            case "bilibili":
                icon = this.client.config.getSync(
                    "arisa::config.assets.logo.bilibili"
                );
                break;
            case "qqmusic":
                icon = this.client.config.getSync(
                    "arisa::config.assets.logo.qqmusic"
                );
                break;
            case "netease":
                icon = this.client.config.getSync(
                    "arisa::config.assets.logo.neteasecloud"
                );
                break;
            case "spotify":
                icon = this.client.config.getSync(
                    "arisa::config.assets.logo.spotify"
                );
                break;
        }
        return icon;
    }

    private getTitle(item?: queueItem, isWithIcon = true) {
        if (!item) return "无";
        const icon = this.getIcon(item);
        if (isWithIcon && icon) return `${icon} ${item.meta.title}`;
        else return item.meta.title;
    }
    func: CommandFunction<BaseSession, any> = async (session) => {
        if (!session.guildId)
            return session.reply("只能在服务器频道中使用此命令");
        getChannelStreamer(session.guildId, session.authorId)
            .then(async (streamer) => {
                const card = new Card().addTitle("Now Playing");
                const queue = streamer.getQueue();
                if (streamer.nowPlaying) {
                    card.addText(
                        `${this.getTitle(streamer.nowPlaying)} ${
                            streamer.playbackStart
                                ? `(font)${Time.timeToString(
                                      (Date.now() - streamer.playbackStart) /
                                          1000
                                  )} / (font)[secondary]`
                                : ""
                        }(font)${Time.timeToString(
                            streamer.nowPlaying.meta.duration / 1000
                        )}(font)[secondary]`
                    ).addContext(streamer.nowPlaying.meta.artists);
                } else {
                    card.addText("None");
                }
                let flg = true;

                if (queue.length) {
                    let count = 0;
                    for (const song of queue) {
                        count++;
                        if (count > 6) break;
                        if (flg) {
                            card.addDivider()
                                .addText("**Up Next**")
                                .addText(
                                    `${this.getTitle(
                                        song
                                    )} (font)${Time.timeToString(
                                        song.meta.duration / 1000
                                    )} (font)[secondary]`
                                )
                                .addContext(song.meta.artists);
                            flg = false;
                        } else {
                            card.addDivider()
                                .addText(
                                    `${this.getTitle(
                                        song
                                    )} (font)${Time.timeToString(
                                        song.meta.duration / 1000
                                    )} (font)[secondary]`
                                )
                                .addContext(song.meta.artists);
                        }
                    }
                    if (count < queue.length) {
                        card.addDivider().addText(
                            `...And ${queue.length - count} more`
                        );
                    }
                } else {
                    card.addText("**播放列表为空**");
                }
                session.reply(card);
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

const list = new ListCommand();
export default list;
