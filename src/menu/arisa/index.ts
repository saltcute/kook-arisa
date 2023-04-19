import { client } from "init/client";
import { BaseMenu } from "kasumi.js";
import upath from 'upath';
import * as fs from 'fs';
import './event';
import './button';
import { Controller } from "./controller";
import { Streamer } from "./controller/music";

class AppMenu extends BaseMenu {
    name = 'arisa';
    prefix = './!。！';
}

const menu = new AppMenu();
export default menu;
client.plugin.load(menu);

const basicPath = upath.join(__dirname, 'command');
const commands = fs.readdirSync(basicPath);
for (const command of commands) {
    try {
        require(upath.join(basicPath, command));
    } catch (e) {
        menu.logger.error('Error loading command');
        menu.logger.error(e);
    }
}

export const controller = new Controller(client.TOKEN);


export async function getChannelStreamer(guildId: string, authorId: string): Promise<Streamer> {
    let joinedChannel;
    for await (const { err, data } of client.API.channel.user.joinedChannel(guildId, authorId)) {
        if (err) {
            throw { err: 'network_failure', msg: '获取频道失败' };
        }
        for (const channel of data.items) {
            joinedChannel = channel;
            break;
        }
        if (joinedChannel) break;
    }
    if (joinedChannel) {
        const streamer = controller.getChannelStreamer(joinedChannel.id);
        if (streamer) {
            return streamer;
        } else {
            throw { err: 'no_streamer', msg: '没有 Arisa 在当前频道！' };
        }
    } else {
        throw { err: 'no_joinedchannel', msg: '请先加入语音频道！' };
    }
}