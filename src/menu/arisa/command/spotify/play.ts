import { BaseCommand, BaseSession, Card, CommandFunction } from "kasumi.js";
import { getChannelStreamer } from "menu/arisa/index";
import { LocalStreamer } from "menu/arisa/playback/local/player";
import { searchQQ } from "../lib";
import spotify from "./lib/index";

class SearchCommand extends BaseCommand {
    name = "play";
    description = "播放 Spotify 歌曲";

    private tutorialCard(hasInput: boolean) {
        return new Card()
            .addTitle(
                hasInput ? "Spotify 歌曲链接错误" : "请输入 Spotify 歌曲链接"
            )
            .addDivider().addText(`请输入 Spotify 歌曲链接，例如：
\`\`\`plain
${this.hierarchyName} https://open.spotify.com/track/1kbvJ9ovjKzoibiWzeBkaB
\`\`\`
或
\`\`\`plain
${this.hierarchyName} spotify:track:1kbvJ9ovjKzoibiWzeBkaB
\`\`\``);
    }

    func: CommandFunction<BaseSession, any> = async (session) => {
        if (!session.guildId)
            return session.reply("只能在服务器频道中使用此命令");
        const input = session.args[0];
        let uri = "";
        if (!input) return session.reply(this.tutorialCard(false));
        if (input.startsWith("spotify:track:")) {
            uri = input.replace("spotify:track:", "").substring(0, 22);
        } else {
            uri =
                /open\.spotify\.com\/track\/([0-9a-zA-Z]{22})/.exec(
                    input
                )?.[1] || "";
        }
        if (!uri) return session.reply(this.tutorialCard(true));

        const streamer = (await getChannelStreamer(
            session.guildId,
            session.authorId
        )) as LocalStreamer;
        if (!(streamer instanceof LocalStreamer)) return;

        const metadata = await spotify.getTrackMetadata(uri);
        if (!spotify.isSuccessData(metadata)) return this.tutorialCard(true);
        await streamer.playSpotify(uri, {
            title: metadata.title,
            cover: metadata.cover,
            duration: -1,
            artists: metadata.artists,
        });
        await session.reply(`已将「${metadata.title}」添加到播放列表！`);
    };
}

const play = new SearchCommand();
export default play;
