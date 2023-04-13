import { client } from "init/client";
import { BaseSession, ButtonClickedEvent } from "kasumi.js";
import netease from "menu/arisa/command/netease/lib";
import { data } from "menu/arisa/command/netease/lib/card/searchList";
import axios, { AxiosRequestConfig } from 'axios';
import { getChannelStreamer } from "menu/arisa";

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
    let session = new BaseSession([], event, client), songId = data.songId;

    // console.log(songId, session.guildId, event.channelId, session.channelId);
    if (!session.guildId || !songId) return;
    getChannelStreamer(session.guildId, session.authorId).then(async (streamer) => {
        const songData = await netease.getSong(songId);
        const url = await netease.getSongUrl(songId);
        console.log(url);
        session.send(`已将 ${songData.name} 添加到播放列表！`);
        streamer.playBuffer(promiseGetter({
            url,
            method: 'GET',
            responseType: 'arraybuffer'
        }), {
            title: songData.name,
            artists: songData.ar.map(v => v.name).join(', '),
            duration: songData.dt
        })
    }).catch((e) => {
        switch (e.err) {
            case 'network_failure':
            case 'no_streamer':
            case 'no_joinedchannel':
                return session.sendTemp(e.msg);
            default:
                client.logger.error(e);
        }
    });
}