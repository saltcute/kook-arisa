import config from "config";
import Kasumi from "kasumi.js";
import { KasumiConfig } from "kasumi.js";
import upath from 'upath';

let botConifg: KasumiConfig;

if (config.useWebHook) {
    botConifg = {
        type: 'webhook',
        token: config.kookToken,
        verifyToken: config.kookVerifyToken,
        encryptKey: config.kookEncryptKey,
        port: config.kookPort,
        disableSnOrderCheck: true
    }
} else {
    botConifg = {
        type: 'websocket',
        vendor: config.useBotRootWebSocket ? 'botroot' : 'hexona',
        // vendor: 'kookts',
        token: config.kookToken,
        disableSnOrderCheck: true
    }
}


export const client = new Kasumi(botConifg);

client.config.loadConfigFile(upath.join(__dirname, '..', 'config', 'config.json'));