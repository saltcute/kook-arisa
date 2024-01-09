import { BaseCommand, BaseSession, Card, CommandFunction } from "kasumi.js";
import menu from "..";
import { controller } from "menu/arisa";

class AppCommand extends BaseCommand {
    name = 'list';
    description = 'List streamers in use';
    func: CommandFunction<BaseSession, any> = async (session) => {
        const streamers = controller.allStreamerTokens;
        const inUseStreamers = streamers.filter(v => controller.getStreamerChannel(v));
        const card = new Card()
            .addTitle(`${inUseStreamers.length}/${streamers.length} Streamer(s) in Use`)
            .addContext(`${streamers.length - inUseStreamers.length} streamer(s) idle`)
            .addText(inUseStreamers.map((v) => {
                const channel = controller.getStreamerChannel(v);
                let string = '';
                if (channel) {
                    const streamer = controller.getChannelStreamer(channel);
                    if (streamer) {
                        string = `**${streamer.kasumi.me.username}** with ${Array.from(streamer.audienceIds).length} listener(s)`
                    }
                }
                return string || v.slice(26);
            }).join('\n'));
        return session.reply(card);
    }
}

const command = new AppCommand();
export default command;
menu.addCommand(command);