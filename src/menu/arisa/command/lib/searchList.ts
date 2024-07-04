import { client } from "init/client";
import { ButtonClickedEvent, Card } from "kasumi.js";
import netease, { Netease } from "../netease/lib";
import axios from "axios";
import crypto from "crypto";
import qqmusic, { QQMusic } from "../qq/lib";

export const akarin =
    "https://img.kookapp.cn/assets/2022-07/vlOSxPNReJ0dw0dw.jpg";

/**
 * Reference: https://greasyfork.org/zh-CN/scripts/10582-网易云音乐高音质支持:
 * `getTrackURL` 源码来自 Chrome 扩展程序 网易云音乐增强器(Netease Music Enhancement) by wanmingtom@gmail.com
 * 菊苣这个加密算法你是怎么知道的 _(:3
 *
 * ↑ TRUUUUUUE
 * @param resourceId Netease resource ID.
 * @param extension File extension for the resource. Defaults to `png`.
 * @returns Resource URL.
 */
function getResourceURL(resourceId: string, extension = "png") {
    const key = "3go8&$8*3*3h0k(2)2";
    let encodedString = "";
    for (let i = 0; i < resourceId.length; ++i) {
        const code = resourceId.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        encodedString += String.fromCharCode(code);
    }
    const resultString = crypto
        .createHash("md5")
        .update(encodedString)
        .digest("base64")
        .replace(/\//g, "_")
        .replace(/\+/g, "-");
    return `https://p2.music.126.net/${resultString}/${resourceId}.${extension}`;
}

function getCJKLength(str: string, weight: number = 2) {
    str = str.replace(
        /[^\u3000-\u30ff\uff00-\uffef\u4e00-\u9fff\u3400-\u4db5\uf900-\ufad9]/g,
        ""
    );
    return str.length * weight;
}

function getCJKLatinLength(str: string) {
    return str.length + getCJKLength(str, 1);
}

function cropCJKLatinString(str: string, maxLength: number = 30) {
    return getCJKLatinLength(str) > maxLength
        ? str.slice(0, maxLength - getCJKLength(str)) + "…"
        : str;
}

async function processNetease(
    song: Netease.songDetail,
    order: number
): Promise<ProcessedNeteaseTrack> {
    let url;
    try {
        const originUrl =
            song.al.picUrl ||
            (typeof song.al.pic_str == "string"
                ? getResourceURL(song.al.pic_str)
                : getResourceURL(song.al.pic.toString()));
        if (originUrl) {
            try {
                const buffer = (
                    await axios.get(originUrl, { responseType: "arraybuffer" })
                ).data;
                const { err, data } = await client.API.asset.create(buffer);
                if (!err) url = data.url;
            } catch {}
        }
    } catch {}
    if (!url) url = akarin;

    return new ProcessedNeteaseTrack(
        order,
        url,
        song.ar.map((v) => v.name),
        song.dt,
        song,
        song.id
    );
}

async function processQQ(
    song: QQMusic.Pattern.Song,
    order: number
): Promise<ProcessedQQTrack> {
    let url;
    try {
        const originUrl = `https://y.gtimg.cn/music/photo_new/T002R300x300M000${song.albummid}.jpg`;
        if (originUrl) {
            try {
                const buffer = (
                    await axios.get(originUrl, { responseType: "arraybuffer" })
                ).data;
                const { err, data } = await client.API.asset.create(buffer);
                if (!err) url = data.url;
            } catch {}
        }
    } catch {}
    if (!url) url = akarin;

    return new ProcessedQQTrack(
        order,
        url,
        song.singer.map((v) => v.name),
        song.interval * 1000,
        song,
        song.songmid,
        song.strMediaMid
    );
}

abstract class ProcessedTrack {
    constructor(
        public order: number,
        public coverUrl: string,
        public artists: string[],
        public duration: number
    ) {}
}
class ProcessedNeteaseTrack implements ProcessedTrack {
    constructor(
        public order: number,
        public coverUrl: string,
        public artists: string[],
        public duration: number,
        public song: Netease.songDetail,
        public songId: number
    ) {}
}

class ProcessedQQTrack implements ProcessedTrack {
    constructor(
        public order: number,
        public coverUrl: string,
        public artists: string[],
        public duration: number,
        public song: QQMusic.Pattern.Song,
        public songId: string,
        public songMediaId: string
    ) {}
}

export async function searchNetease(keyword: string, page: number = 1) {
    const songs = await netease.cloudsearch(keyword, page);
    return searchList(keyword, "netease", songs, page);
}

export async function searchQQ(keyword: string, page: number = 1) {
    const songs = await qqmusic.search(keyword, page);
    return searchList(keyword, "qq", songs.list, page);
}

function isNeteaseSong(
    song: Netease.songDetail | QQMusic.Pattern.Song
): song is Netease.songDetail {
    return (song as Netease.songDetail).id !== undefined;
}

async function searchList(
    keyword: string,
    provider: string,
    songs: (Netease.songDetail | QQMusic.Pattern.Song)[],
    page: number = 1
) {
    const card = new Card()
        .setTheme(Card.Theme.INFO)
        .addContext("部分 VIP 歌曲可能只能预览前 30s");
    const promises: Promise<ProcessedNeteaseTrack | ProcessedQQTrack>[] = [];
    let counter = 0;
    if (songs) {
        for (const song of songs) {
            counter++;
            if (isNeteaseSong(song))
                promises.push(processNetease(song, counter));
            else promises.push(processQQ(song, counter));
            if (counter >= 5) break;
        }
        const awaiteds = (await Promise.all(promises)).sort((a, b) => {
            return a.order - b.order;
        });
        for (const processed of awaiteds) {
            const { coverUrl, songId, artists, duration, song } = processed;
            card.addTextWithImage(
                `(font)${song.name}(font)[body]\n(font)${artists.join(", ")}(font)[secondary]`,
                {
                    position: Card.Modules.AccessoryModes.LEFT,
                    url: coverUrl,
                }
            );
            let sessionId;
            if (processed instanceof ProcessedNeteaseTrack) {
                sessionId = client.events.button.createSession(
                    "netease.queue.add",
                    {
                        songId,
                        meta: {
                            title: song.name,
                            artists: artists.join(", "),
                            duration,
                            cover: coverUrl,
                        },
                    }
                );
            } else {
                sessionId = client.events.button.createSession("qq.queue.add", {
                    songId,
                    mediaId: processed.songMediaId,
                    meta: {
                        title: song.name,
                        artists: artists.join(", "),
                        duration,
                        cover: coverUrl,
                    },
                });
            }
            card.addTextWithButton(
                `(font)添加「${cropCJKLatinString(song.name)}」到播放列表(font)[primary]`,
                {
                    buttonContent: "添加",
                    value: JSON.stringify({
                        sessionId,
                    }),
                    click: Card.Parts.ButtonClickType.RETURN_VALUE,
                }
            );
        }
    } else {
        card.addText("没有任何结果");
    }
    card.addModule({
        type: Card.Modules.Types.ACTION_GROUP,
        elements: [
            {
                type: Card.Parts.AccessoryType.BUTTON,
                theme: page > 1 ? Card.Theme.WARNING : Card.Theme.SECONDARY,
                text: {
                    type: Card.Parts.TextType.KMARKDOWN,
                    content: "上一页",
                },
                value:
                    page > 1
                        ? JSON.stringify({
                              sessionId: client.events.button.createSession(
                                  "search.nextPage",
                                  {
                                      currentPage: page - 1,
                                      keyword,
                                      provider,
                                  },
                                  true
                              ),
                          })
                        : undefined,
                click:
                    page > 1
                        ? Card.Parts.ButtonClickType.RETURN_VALUE
                        : undefined,
            },
            {
                type: Card.Parts.AccessoryType.BUTTON,
                theme: Card.Theme.PRIMARY,
                text: {
                    type: Card.Parts.TextType.KMARKDOWN,
                    content: "下一页",
                },
                value: JSON.stringify({
                    sessionId: client.events.button.createSession(
                        "search.nextPage",
                        {
                            currentPage: page + 1,
                            keyword,
                            provider,
                        },
                        true
                    ),
                }),
                click: Card.Parts.ButtonClickType.RETURN_VALUE,
            },
            {
                type: Card.Parts.AccessoryType.BUTTON,
                theme: Card.Theme.SECONDARY,
                text: {
                    type: Card.Parts.TextType.KMARKDOWN,
                    content: `第 ${page} 页`,
                },
            },
        ],
    });
    return card;
}

client.events.button.registerActivator(
    "search.nextPage",
    async (
        event: ButtonClickedEvent,
        data: {
            currentPage: number;
            keyword: string;
            provider: string;
        }
    ) => {
        if (data.currentPage < 1) return;
        await client.API.message.update(
            event.targetMsgId,
            new Card().addText("正在搜索…")
        );
        if (data.provider == "netease")
            await client.API.message.update(
                event.targetMsgId,
                await searchNetease(data.keyword, data.currentPage)
            );
        else if (data.provider == "qq")
            await client.API.message.update(
                event.targetMsgId,
                await searchQQ(data.keyword, data.currentPage)
            );
    }
);
