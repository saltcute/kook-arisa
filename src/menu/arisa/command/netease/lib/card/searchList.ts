import { client } from "init/client";
import { Card } from "kasumi.js";
import netease, { Netease } from "..";
import axios from 'axios';
import { akarin } from ".";

export type data = {
    songId: number
    meta: {
        title: string,
        artists: string
    }
}

async function processing(song: Netease.song, order: number) {
    let url;
    try {
        const album = await netease.getAlbum(song.album.id);
        const originUrl = album.album.blurPicUrl;
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
        songId: song.id,
        song,
        url
    }
}

export default async function (keyword: string) {
    const songs = await netease.search(keyword);
    const card = new Card().setTheme('info').addContext("部分 VIP 歌曲可能只能预览前 30s");
    const promises: Promise<Awaited<ReturnType<typeof processing>>>[] = [];
    let counter = 0;
    for (const song of songs) {
        counter++;
        promises.push(processing(song, counter));
        if (counter >= 5) break;
    }
    const awaiteds = (await Promise.all(promises)).sort((a, b) => { return a.order - b.order; });
    for (const { url, song, songId } of awaiteds) {
        card.addTextWithImage(`(font)${song.name}(font)[body]\n(font)${song.artists.map(v => v.name).join(", ")}(font)[secondary]`, {
            position: 'left', url
        }).addTextWithButton(`(font)添加「${song.name}」到播放列表(font)[primary]`, {
            position: 'right', buttonContent: '添加',
            value: JSON.stringify({
                action: 'netease:queue:add',
                data: {
                    songId,
                    meta: {
                        title: song.name,
                        artists: song.artists.map(v => v.name).join(", ")
                    }
                } as data
            }),
            click: 'return-val'
        })
    }
    return card;
}