import { client } from "init/client";
import { BaseCommand, BaseMenu, BaseSession } from "kasumi.js";
import upath from 'upath';
import * as fs from 'fs';
import { LocalController } from "./playback/local/controller";
import { Streamer } from "./playback/type";
import './naturalCommands';

class AppMenu extends BaseMenu {
    name = 'arisa';
}

const menu = new AppMenu();
export default menu;
client.plugin.load(menu);

import './event';

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
export const controller = new LocalController(client);


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

export async function requireStreamer(session: BaseSession, commands: BaseCommand[]) {
    if (!session.guildId) {
        await session.reply("只能在服务器频道中使用此命令")
        return false;
    }
    const streamer = await getChannelStreamer(session.guildId, session.authorId).catch((e) => {
        switch (e.err) {
            case 'network_failure':
            case 'no_streamer':
            case 'no_joinedchannel':
                session.reply(e.msg);
            default:
                client.logger.error(e);
        }
    });
    if (streamer) return true;
    else return false;
}