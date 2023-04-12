import { client } from "init/client";
import { BaseSession, ButtonClickedEvent } from "kasumi.js";
import { controller } from "menu/arisa";
import netease from "menu/arisa/command/netease/lib";
import { data } from "menu/arisa/command/netease/lib/card/searchList";
import axios, { AxiosRequestConfig } from 'axios';

async function promiseGetter(config: AxiosRequestConfig): Promise<any> {
    return new Promise((resolve, reject) => {
        axios(config).then((res) => {
            resolve(res.data);
        }).catch((e) => {
            reject(e);
        })
    })
}

export default async function (event: ButtonClickedEvent, action: string[], data: data) {
    event.guildId = event.rawEvent.extra.body.guild_id;
    // console.log(event.rawEvent);
    let joinedChannel, session = new BaseSession([], event, client), songId = data.songId;

    console.log(songId, session.guildId, event.channelId, session.channelId);
    if (!session.guildId || !songId) return;
    for await (const { err, data } of client.API.channel.user.joinedChannel(session.guildId, session.authorId)) {
        if (err) {
            client.logger.error(err);
            return session.reply("获取加入频道失败");
        }
        console.log(data.meta.page)
        for (const channel of data.items) {
            joinedChannel = channel;
            break;
        }
        if (joinedChannel) break;
    }
    if (joinedChannel) {
        const streamer = controller.getChannelStreamer(joinedChannel.id);
        if (streamer) {
            const url = await netease.getSongUrl(songId);
            console.log(url);
            streamer.playBuffer(promiseGetter({
                url,
                method: 'GET',
                responseType: 'arraybuffer'
            }))
        } else {
            session.reply("没有推流姬在当前频道！");
        }
    } else {
        session.reply("请先加入语音频道！");
    }
}