import express from 'express';
import expressWs from 'express-ws';
import { client } from 'init/client';
import upath from 'upath';
import axios from 'axios';
import bodyParser from 'body-parser';
import { WebSocket } from 'ws';
import { controller } from 'menu/arisa';
import { playback } from 'menu/arisa/playback/type';
import { streamerDetail } from 'webapp/src/components/cards/types';
import api from './api';
import netease from './netease';
import qqmusic from './qqmusic';
import { LocalStreamer } from 'menu/arisa/playback/local/player';
import { getVideoDetail } from 'menu/arisa/command/bilibili/lib/index';
const { app } = expressWs(express());

interface payload {
    t: number,
    d: any
}

app.ws('/', (ws: WebSocket) => {
    ws.on('message', async (data) => {
        async function getUserMe(token: string): Promise<{
            code: number,
            message: string,
            data: any
        }> {
            const webuiUrl = await client.config.getOne("webuiUrl");
            return new Promise((resolve, rejects) => {
                axios({
                    baseURL: webuiUrl.toString(),
                    url: '/api/me',
                    method: 'POST',
                    data: {
                        auth: `Bearer ${token}`
                    }
                }).then(({ data }) => {
                    resolve(data);
                }).catch((e) => { rejects(e) });
            })
        }
        try {
            const raw = data.toString();
            const payload: payload = JSON.parse(raw);
            switch (payload.t) {
                case 0: // Get user ID
                    const accessToken = payload.d.access_token;
                    const user = await getUserMe(accessToken);
                    userId = user.data.id;
                    break;
                case 1: { // Pause and resume 
                    const streamer = getAllStreamers()[payload.d.streamerIndex];
                    if (streamer) {
                        if (payload.d.paused) {
                            streamer.pause();
                        } else {
                            streamer.resume();
                        }
                    }
                    break;
                }
                case 2: { // Next/Previous track in queue
                    const streamer = getAllStreamers()[payload.d.streamerIndex];
                    if (streamer) {
                        if (payload.d.next) {
                            streamer.next();
                        } else {
                            streamer.previous();
                        }
                    }
                    break;
                }
                case 3: { // Move queue items
                    const streamer = getAllStreamers()[payload.d.streamerIndex];
                    if (streamer) {
                        const queueIndex = payload.d.queueIndex;
                        switch (payload.d.action) {
                            case 'up':
                                streamer.queueMoveUp(queueIndex);
                                break;
                            case 'down':
                                streamer.queueMoveDown(queueIndex);
                                break;
                            case 'delete':
                                streamer.queueDelete(queueIndex);
                                break;
                        }
                    }
                    break;
                }
                case 4: { // Shuffle queue
                    const streamer = getAllStreamers()[payload.d.streamerIndex];
                    if (streamer) {
                        streamer.shuffle();
                    }
                    break;
                }
                case 5: { // Change cycle mode
                    const streamer = getAllStreamers()[payload.d.streamerIndex];
                    if (streamer) {
                        streamer.setCycleMode(payload.d.cycleMode)
                    }
                    break;
                }
                case 6: { // Play song
                    const streamer = getAllStreamers()[payload.d.streamerIndex];
                    if (streamer) {
                        const data = payload.d.data as playback.extra.streaming;
                        switch (data.type) {
                            case 'netease': {
                                if (streamer instanceof LocalStreamer)
                                    streamer.playNetease(data.data.songId, data.meta);
                                break;
                            }
                            case 'qqmusic': {
                                if (streamer instanceof LocalStreamer)
                                    streamer.playQQMusic(data.data.songMId, data.data.mediaId, data.meta);
                                break;
                            }
                            case 'bilibili': {
                                if (Date.now() - lastBilibiliRequest < 1 * 1000) break;
                                if (streamer instanceof LocalStreamer) {
                                    const bvid = data.data.bvid;
                                    let video: Awaited<ReturnType<typeof getVideoDetail>>
                                    if (bvid) video = await getVideoDetail(bvid);
                                    if (bvid && video) {
                                        if (video.duration > 10 * 60) return;
                                        const biliAPI = require('bili-api');
                                        lastBilibiliRequest = Date.now();
                                        const { cids } = await biliAPI({ bvid }, ['cids']).catch((e: any) => { client.logger.error(e); });
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
                                        const data = res.data;
                                        streamer.playBilibili(bvid, 0, {
                                            title: video.title,
                                            artists: video.owner.name,
                                            duration: data.timelength,
                                            cover: video.pic.replace(/(i[0-9].hdslb.com)/, "hdslb.lolicon.ac.cn")
                                        });
                                    }
                                    break;
                                }
                            }
                        }
                    }
                    break;
                }
                case 7: { // Jump to percentage
                    const streamer = getAllStreamers()[payload.d.streamerIndex];
                    if (streamer) {
                        const percent = payload.d.percent;
                        if (percent >= 0 && percent <= 1) {
                            streamer.jumpToPercentage(percent);
                        }
                    }
                    break;
                }
                case 8: { // Select guild
                    // guildId = payload.d.guildId;
                    // getChannelStreamer()
                    break;
                }
            }
        } catch (e) {
            client.logger.error(e);
        }
    })

    let lastBilibiliRequest = -1;

    let isAlive = true;
    let userId = '';
    // let guildId = '';
    ensureConnection();

    ws.on('pong', () => {
        isAlive = true;
    })

    function getAllStreamers() {
        const userStreamers = controller.getUserStreamers(userId) || [];
        const channelStreamers = getChannelStreamer()
        return [...new Set([...userStreamers, ...channelStreamers])];
    }

    async function sendStatus() {
        if (userId) {
            const streamers = getAllStreamers();
            if (streamers) {
                let payload: streamerDetail[] = [];
                for (const streamer of streamers) {
                    const me = streamer.kasumi.me;
                    let queue = [], array: playback.extra[] = [];
                    if (streamer.nowPlaying) queue.push(streamer.nowPlaying);
                    queue = queue.concat(streamer.getQueue());
                    array = (queue.filter(v => v.extra).map(v => v.extra) as playback.extra[])
                    const data: streamerDetail = {
                        name: me.username,
                        identifyNum: me.identifyNum,
                        avatar: me.avatar,
                        trackPlayedTime: streamer.playedTime,
                        trackTotalDuration: streamer.duration,
                        isPaused: streamer.isPaused(),
                        nowPlaying: streamer.nowPlaying?.extra,
                        queue: array,
                        cycleMode: streamer.getCycleMode()
                    };
                    payload.push(data)
                }
                // console.log(payload);
                ws.send(JSON.stringify(payload));
            }
        }
    }

    function ensureConnection() {
        if (!isAlive) ws.terminate();
        isAlive = false;
        ws.ping();
    }

    function getChannelStreamer() {
        return controller.activeStreamersArray.filter(v => v.audienceIds.has(userId))
    }

    sendStatus();
    let keepAlive = setInterval(() => { ensureConnection() }, 10 * 1000);
    let syncStatus = setInterval(() => { sendStatus() }, 500)
})

app.use(bodyParser.json());

app.use('/', express.static(upath.join(__dirname, '..', 'webapp', 'dist')))
app.get('/login', async (req, res) => {
    res.redirect(`https://www.kookapp.cn/app/oauth2/authorize?id=12273&client_id=${(await client.config.getOne("kookClientID"))}&redirect_uri=${encodeURIComponent((await client.config.getOne("webuiUrl")).toString())}&response_type=code&scope=get_user_info%20get_user_guilds`);
})

app.use('/api', api)
app.use('/netease', netease);
app.use('/qqmusic', qqmusic);

client.config.get("internalWebuiPort").then(({ internalWebuiPort }) => {
    app.listen(internalWebuiPort, async () => {
        client.logger.info(`Webui start listening on port ${(await client.config.getOne("internalWebuiPort"))}`);
        client.logger.info(`Access webui at ${await client.config.getOne('webuiUrl')} or http://localhost:${(await client.config.getOne("internalWebuiPort"))}`)
    })
});