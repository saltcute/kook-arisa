import express from 'express';
import config from '../config';
import { client } from 'init/client';
import upath from 'upath';
import axios, { isAxiosError } from 'axios';
import bodyParser from 'body-parser';
import { WebSocket } from 'ws';
import http from 'http';
import { controller } from 'menu/arisa';
import { playback } from 'menu/arisa/controller/music';
import webui from 'config/webui';
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

interface payload {
    t: number,
    d: any
}

wss.on('connection', (ws: WebSocket) => {

    ws.on('message', (data) => {
        try {
            const raw = data.toString();
            const payload: payload = JSON.parse(raw);
            switch (payload.t) {
                case 0:
                    userId = payload.d.userId;
                    break;
            }
        } catch (e) {
            client.logger.error(e);
        }
    })

    let isAlive = true;
    let userId = '';
    ensureConnection();

    ws.on('pong', () => {
        isAlive = true;
    })

    async function sendStatus() {
        if (userId) {
            const streamers = controller.getUserStreamers(userId);
            if (streamers) {
                let payload = [];
                for (const streamer of streamers) {
                    const me = streamer.kasumi.me;
                    let queue = [], array: playback.extra[] = [];
                    if (streamer.nowPlaying) queue.push(streamer.nowPlaying);
                    queue = queue.concat(streamer.getQueue());
                    array = (queue.filter(v => v.extra).map(v => v.extra) as playback.extra[])
                    payload.push({
                        name: me.username,
                        identifyNum: me.identifyNum,
                        avatar: me.avatar,
                        startTimestamp: streamer.playbackStart,
                        nowPlaying: streamer.nowPlaying?.extra,
                        queue: array
                    })
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

    sendStatus();
    let keepAlive = setInterval(() => { ensureConnection() }, 10 * 1000);
    let syncStatus = setInterval(() => { sendStatus() }, 5 * 1000)
})

app.use(bodyParser.json());

app.use('/assets', express.static(upath.join(__dirname, '..', 'webapp', 'dist', 'assets')))
app.get('/', (req, res) => {
    res.sendFile(upath.join(__dirname, '..', 'webapp', 'dist', 'index.html'));
})

app.post('/api/me', (req, res) => {
    const auth = req.body.auth
    if (auth) {
        axios({
            url: 'https://www.kookapp.cn/api/v3/user/me',
            method: 'GET',
            headers: {
                Authorization: auth
            }
        }).then(({ data }) => {
            res.send(data)
        }).catch((e) => {
            if (isAxiosError(e)) {
                res.status(e.status || 400).send({
                    code: e.status || 400,
                    message: e.message,
                    data: e.response?.data
                })
            } else if (e instanceof Error) {
                res.status(500).send({
                    code: 500,
                    message: e.message
                })
            } else {
                res.status(500).send({
                    code: 500,
                    message: 'unknown'
                })
            }
        })
    } else {
        res.status(400).send({
            code: 400,
            message: 'no auth'
        })
    }
})

app.get('/api/login', (req, res) => {
    const code = req.query.code;
    if (code) {
        axios({
            url: 'https://www.kookapp.cn/api/oauth2/token',
            method: 'POST',
            data: {
                grant_type: 'authorization_code',
                client_id: webui.kookClientID,
                client_secret: config.kookClientSecret,
                code,
                redirect_uri: webui.oauth2Url
            }
        }).then(({ data }) => {
            res.send({
                code: 200,
                message: 'success',
                data
            })
        }).catch((e) => {
            if (isAxiosError(e)) {
                res.status(e.status || 400).send({
                    code: e.status || 400,
                    message: e.message,
                    data: e.response?.data
                })
            } else if (e instanceof Error) {
                res.status(500).send({
                    code: 500,
                    message: e.message
                })
            } else {
                res.status(500).send({
                    code: 500,
                    message: 'unknown'
                })
            }
        })
    } else {
        res.status(400).send({
            code: 400,
            message: 'no code'
        })
    }
})

app.listen(config.webDashboardPort, () => {
    client.logger.info(`Webui start listening on port ${config.webDashboardPort}`);
    client.logger.info(`Access webui at http://localhost:${config.webDashboardPort}`)
})

server.listen(config.webSocketPort, () => {
    client.logger.info(`WebSocket start listening on port ${config.webSocketPort}`);
    client.logger.info(`Connect to WebSocket at ws://localhost:${config.webSocketPort}`);
})