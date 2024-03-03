import { BaseCommand, BaseSession, Card, CommandFunction } from "kasumi.js";
import { getChannelStreamer } from "menu/arisa/index";
import { LocalStreamer } from "menu/arisa/playback/local/player";
import neteaseInstance from "./lib/index";

class PlayCommand extends BaseCommand {
    name = 'play';
    description = '播放网易云歌曲 ID';
    pattern = /https:\/\/music\.163\.com.*\/song\?id=(\d+)/
    func: CommandFunction<BaseSession, any> = async (session) => {
        if (!session.guildId) return session.reply("只能在服务器频道中使用此命令");
        const streamer = await getChannelStreamer(session.guildId, session.authorId) as LocalStreamer;
        if (!(streamer instanceof LocalStreamer)) return;
        const match = this.pattern.exec(session.args[0])?.[1];
        const trackId = match ? parseInt(match) : -1;
        if (trackId < 0) return session.reply("没有找到歌曲 ID");
        const song = await neteaseInstance.getSong(trackId).catch(async (e) => {
            await session.reply(`或取歌曲信息出错。\n错误信息：${e.body.message}`)
            return;
        })
        if (!song) return;
        await streamer.playNetease(song.id, {
            title: song.name,
            cover: song.al.picUrl,
            duration: song.dt,
            artists: song.ar.map(v => v.name).join(", ")
        });
        await session.reply(`已将「${song.name}」添加到播放列表！`);
    }
}
const play = new PlayCommand();
export default play;