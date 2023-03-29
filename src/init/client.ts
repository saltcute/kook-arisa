import config from "config";
import Kasumi from "kasumi.js";
import { KasumiConfig } from "kasumi.js/dist/type";

let botConifg: KasumiConfig;

if (config.useWebHook) {
    botConifg = {
        type: 'webhook',
        token: config.kookToken,
        verifyToken: config.kookVerifyToken,
        encryptKey: config.kookEncryptKey,
        port: config.kookPort
    }
} else {
    botConifg = {
        type: 'websocket',
        vendor: config.useBotRootWebSocket ? 'botroot' : 'hexona',
        token: config.kookToken
    }
}


export const client = new Kasumi(botConifg);