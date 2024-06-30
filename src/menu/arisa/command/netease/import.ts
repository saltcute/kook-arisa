import { BaseSession, BaseCommand, CommandFunction } from "kasumi.js";
import { requireStreamer, getChannelStreamer } from "menu/arisa";
import netease, { Netease } from "./lib/index";
import { akarin } from "../lib";
import { LocalStreamer } from "menu/arisa/playback/local/player";

class ImportCommand extends BaseCommand {
    name = "import";
    description = "导入网易云歌单";
    pattern = /https:\/\/music\.163\.com.*\/playlist\?id=(\d+)/;
    async processing(song: Netease.songDetail, order: number) {
        let url = song.al.picUrl;
        // try {
        //     const album = await netease.getAlbum(song.al.id);
        //     const originUrl = album.album.blurPicUrl;
        //     if (originUrl) {
        //         try {
        //             const buffer = (await axios.get(originUrl, { responseType: 'arraybuffer' })).data;
        //             const { err, data } = await client.API.asset.create(buffer);
        //             if (!err) url = data.url;
        //         } catch { }
        //     }
        // } catch { }
        if (!url) url = akarin;

        return {
            order,
            songId: song.id,
            song,
            url,
        };
    }
    async replaceQueue(streamer: LocalStreamer, playlist: Netease.playlist) {
        streamer.clearQueue();
        await this.addToEndOfList(streamer, playlist);
        await streamer.next();
        streamer.queueDelete(streamer.getQueue().length + 1 - 1);
    }
    async addToEndOfList(streamer: LocalStreamer, playlist: Netease.playlist) {
        let counter = 0;
        const promises: Promise<Awaited<ReturnType<typeof this.processing>>>[] =
            [];
        for (const track of playlist) {
            counter++;
            promises.push(this.processing(track, counter));
        }
        const awaiteds = (await Promise.all(promises)).sort((a, b) => {
            return a.order - b.order;
        });
        for (let { url, song, songId } of awaiteds) {
            await streamer.playNetease(songId, {
                title: song.name,
                cover: url || akarin,
                duration: song.dt,
                artists: song.ar.map((v) => v.name).join(", "),
            });
        }
    }
    func: CommandFunction<BaseSession, any> = async (session) => {
        if (!session.guildId) return;
        const streamer = await getChannelStreamer(
            session.guildId,
            session.authorId
        );
        if (!(streamer instanceof LocalStreamer)) return;
        const playlistId = this.pattern.exec(session.args[0])?.[1];
        if (playlistId) {
            let mode: "replace" | "add" = "replace";
            if (session.args[1] == "add") mode = "add";
            const playlist = await netease
                .getPlaylist(playlistId)
                .catch(async (e) => {
                    await session.send(
                        `获取歌单出错，请稍后再试或换一个歌单再试。\n错误信息：${e.body.message}`
                    );
                    return;
                });
            if (!(playlist instanceof Array)) return;
            switch (mode) {
                case "replace": {
                    if (streamer.getQueue().length) {
                        await session.send(
                            `当前播放列表不为空，如果继续，现在的播放列表将被转入的播放列表替换。要继续吗？\n（发送 "y" 确认、"n" 取消、"a" 将传入的播放列表添加到当前列表末尾）`
                        );
                        const response =
                            await this.client.events.callback.createAsyncCallback(
                                "message.text",
                                (e) => e.authorId == session.authorId,
                                (e) => e.content
                            );
                        switch (response) {
                            case "y": {
                                await session.send("正在添加…");
                                await this.replaceQueue(streamer, playlist);
                                await session.send(
                                    `添加完成。当前列表共 ${streamer.getQueue().length + 1} 首歌。`
                                );
                                break;
                            }
                            case "a": {
                                await session.send("正在添加…");
                                await this.addToEndOfList(streamer, playlist);
                                await session.send(
                                    `添加完成。当前列表共 ${streamer.getQueue().length + 1} 首歌。`
                                );
                                break;
                            }
                            case "n":
                            default: {
                                await session.send("已取消操作。");
                                return;
                            }
                        }
                    } else {
                        await session.send("正在添加…");
                        await this.addToEndOfList(streamer, playlist);
                        await session.send(
                            `添加完成。当前列表共 ${streamer.getQueue().length + 1} 首歌。`
                        );
                        break;
                    }
                    break;
                }
                case "add": {
                    await session.send("正在添加…");
                    await this.addToEndOfList(streamer, playlist);
                    await session.send(
                        `添加完成。当前列表共 ${streamer.getQueue().length + 1} 首歌。`
                    );
                    break;
                }
            }
        } else {
            await session.reply("没有检测到合法的网易云链接");
        }
    };
}

const importPlaylist = new ImportCommand();
importPlaylist.use(requireStreamer);
export default importPlaylist;
