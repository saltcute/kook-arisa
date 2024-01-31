import { client } from "init/client";
import { Card } from "kasumi.js";
import qqmusic, { QQMusic } from "..";
import axios from 'axios';
import { akarin } from ".";
import { playback } from "menu/arisa/playback/type";

export type data = {
    songId: string,
    mediaId: string
    meta: playback.meta
}

async function processing(song: QQMusic.Pattern.Song, order: number) {
    let url;
    try {
        const originUrl = `https://y.gtimg.cn/music/photo_new/T002R300x300M000${song.albummid}.jpg`;
        if (originUrl) {
            try {
                const buffer = (await axios.get(originUrl, { responseType: 'arraybuffer' })).data;
                const { err, data } = await client.API.asset.create(buffer);
                if (!err) url = data.url;
            } catch { }
        }
    } catch { }
    if (!url) url = akarin;

    return {
        order,
        songId: song.songmid,
        song,
        url
    }
}

export default async function (keyword: string) {
    const songs = await qqmusic.search(keyword);
    const card = new Card().setTheme('info').addContext("部分 VIP 歌曲可能无法播放");
    const promises: Promise<Awaited<ReturnType<typeof processing>>>[] = [];
    let counter = 0;
    if (songs) {
        for (const song of songs.list) {
            counter++;
            promises.push(processing(song, counter));
            if (counter >= 5) break;
        }
        const awaiteds = (await Promise.all(promises)).sort((a, b) => { return a.order - b.order; });
        for (const { url, song, songId } of awaiteds) {
            const sessionId = client.events.button.createSession('qq.queue.add', {
                songId,
                mediaId: song.strMediaMid,
                meta: {
                    title: song.name,
                    artists: song.singer.map(v => v.name).join(", "),
                    duration: song.interval * 1000,
                    cover: url || akarin
                }
            })
            card.addTextWithImage(`(font)${song.name}(font)[body]\n(font)${song.singer.map(v => v.name).join(", ")}(font)[secondary]`, {
                position: 'left', url
            }).addTextWithButton(`(font)添加「${song.name}」到播放列表(font)[primary]`, {
                buttonContent: '添加',
                value: JSON.stringify({
                    sessionId
                }),
                click: 'return-val'
            })
        }
    } else {
        card.addText("没有任何结果");
    }
    return card;
}