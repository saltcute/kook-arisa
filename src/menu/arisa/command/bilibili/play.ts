import axios from "axios";
import { client } from "init/client";
import { BaseCommand, BaseSession, Card, CommandFunction } from "kasumi.js";
import { getChannelStreamer } from "menu/arisa";
import { LocalStreamer } from "menu/arisa/playback/local/player";
import { getVideoDetail } from "./lib/index";

// @ts-ignore
import * as biliAPI from 'bili-api';

class PlayCommand extends BaseCommand<typeof client> {
    name = 'play';
    description = '播放B站视频';
    pattern = /(?:https?:\/\/(?:www|m).bilibili.com\/video\/)?(BV[0-9A-Za-z]{10})/gm;
    func: CommandFunction<BaseSession, any> = async (session) => {
        if (!session.guildId) return session.reply("只能在服务器频道中使用此命令");
        const bvid = this.pattern.exec(session.args.join(" "))?.[1]
        let video: Awaited<ReturnType<typeof getVideoDetail>>
        if (bvid) video = await getVideoDetail(bvid);
        if (bvid && video) {
            if (video.duration > 10 * 60) {
                await session.reply("视频过长，Arisa 只能播放小于 10 分钟的 Bilibili 视频！");
                return;
            }
            const streamer = await getChannelStreamer(session.guildId, session.authorId).catch((e) => {
                switch (e.err) {
                    case 'network_failure':
                    case 'no_streamer':
                    case 'no_joinedchannel':
                        session.sendTemp(e.msg);
                    default:
                        client.logger.error(e);
                }
            });
            if (!streamer) return;
            const { cids } = await biliAPI({ bvid }, ['cids']).catch((e: any) => { this.client.logger.error(e); });
            const cid = cids[0];
            if (!cid) return;
            const { data: res } = await axios({
                url: "https://api.bilibili.com/x/player/playurl",
                params: {
                    bvid,
                    cid,
                    fnval: 16
                }
            });
            const data = res.data
            session.sendTemp(new Card().addText(`已将「${video.title}」添加到播放列表！`));
            if (streamer instanceof LocalStreamer)
                streamer.playBilibili(bvid, 0, {
                    title: video.title,
                    artists: video.owner.name,
                    duration: data.timelength,
                    cover: video.pic.replace(/(i[0-9].hdslb.com)/, "hdslb.lolicon.ac.cn")
                });
        } else {
            session.sendTemp("没有找到视频的 BV 号");
        }
    }
}

const play = new PlayCommand();
export default play;