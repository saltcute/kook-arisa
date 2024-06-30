import { BaseCommand, BaseSession, Card, CommandFunction } from "kasumi.js";
import { getChannelStreamer } from "menu/arisa/index";
import { LocalStreamer } from "menu/arisa/playback/local/player";
import { akarin } from "../lib/searchList";
import spotify, {
    ISpotifyAlbumContent,
    ISpotifyPlaylistContent,
} from "./lib/index";

class ImportCommand extends BaseCommand {
    name = "import";
    description = "导入 Spotify 歌单";
    private albumPattren = /open\.spotify\.com\/album\/([0-9a-zA-Z]{22})/;
    private playlistPattren = /open\.spotify\.com\/playlist\/([0-9a-zA-Z]{22})/;
    async replaceQueue(
        streamer: LocalStreamer,
        playlist: ISpotifyAlbumContent | ISpotifyPlaylistContent
    ) {
        streamer.clearQueue();
        await this.addToEndOfList(streamer, playlist);
        await streamer.next();
        streamer.queueDelete(streamer.getQueue().length + 1 - 1);
    }
    async addToEndOfList(
        streamer: LocalStreamer,
        playlist: ISpotifyAlbumContent | ISpotifyPlaylistContent
    ) {
        for (const track of playlist.trackList) {
            await streamer.playSpotify(track.id, {
                title: track.title,
                artists: track.artists,
                duration: -1,
                cover: track.cover || akarin,
            });
        }
    }
    private tutorialCard(hasInput: boolean) {
        return new Card()
            .addTitle(
                hasInput
                    ? "Spotify 专辑或歌单链接错误"
                    : "请输入 Spotify 专辑或歌单链接"
            )
            .addDivider().addText(`请输入 Spotify 专辑或歌单链接，例如：
歌单：
\`\`\`plain
${this.hierarchyName} https://open.spotify.com/playlist/1K1LWUji9mPpPzFN1DMawA
\`\`\`
或
\`\`\`plain
${this.hierarchyName} spotify:playlist:1K1LWUji9mPpPzFN1DMawA
\`\`\`

专辑：
\`\`\`plain
${this.hierarchyName} https://open.spotify.com/album/1ntfyuln6tVqXY8RTqb3MQ
\`\`\`
或
\`\`\`plain
${this.hierarchyName} spotify:album:1ntfyuln6tVqXY8RTqb3MQ
\`\`\``);
    }
    func: CommandFunction<BaseSession, any> = async (session) => {
        if (!session.guildId) return;
        const streamer = await getChannelStreamer(
            session.guildId,
            session.authorId
        );
        if (!(streamer instanceof LocalStreamer)) return;
        let input = session.args[0],
            uri: string | undefined,
            list: ISpotifyAlbumContent | ISpotifyPlaylistContent | undefined;
        if (!input) return session.reply(this.tutorialCard(false));

        if (input.startsWith("spotify:playlist:")) {
            uri = input.replace("spotify:playlist:", "").substring(0, 22);
            const res = await spotify.getPlaylistContent(uri);
            if (spotify.isSuccessData(res)) list = res;
        } else if (input.startsWith("spotify:album:")) {
            uri = input.replace("spotify:album:", "").substring(0, 22);
            const res = await spotify.getAlbumContent(uri);
            if (spotify.isSuccessData(res)) list = res;
        } else if ((uri = this.albumPattren.exec(input)?.[1])) {
            const res = await spotify.getAlbumContent(uri);
            if (spotify.isSuccessData(res)) list = res;
        } else if ((uri = this.playlistPattren.exec(input)?.[1])) {
            const res = await spotify.getPlaylistContent(uri);
            if (spotify.isSuccessData(res)) list = res;
        }
        if (list && spotify.isSuccessData(list)) {
            let mode: "replace" | "add" = "replace";
            if (session.args[1] == "add") mode = "add";
            if (!(list.trackList instanceof Array)) return;
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
                                await this.replaceQueue(streamer, list);
                                await session.send(
                                    `添加完成。当前列表共 ${streamer.getQueue().length + 1} 首歌。`
                                );
                                break;
                            }
                            case "a": {
                                await session.send("正在添加…");
                                await this.addToEndOfList(streamer, list);
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
                        await this.addToEndOfList(streamer, list);
                        await session.send(
                            `添加完成。当前列表共 ${streamer.getQueue().length + 1} 首歌。`
                        );
                        break;
                    }
                    break;
                }
                case "add": {
                    await session.send("正在添加…");
                    await this.addToEndOfList(streamer, list);
                    await session.send(
                        `添加完成。当前列表共 ${streamer.getQueue().length + 1} 首歌。`
                    );
                    break;
                }
            }
        } else {
            return session.reply(this.tutorialCard(true));
        }
    };
}

const importCommand = new ImportCommand();
export default importCommand;
