import { BaseCommand, BaseSession, Card, CommandFunction } from "kasumi.js";
import menu from "..";
import { getChannelStreamer } from "menu/arisa";
import util from 'util';

class AppCommand extends BaseCommand {
    name = 'printQueue';
    description = 'Print out the current playlist in the channel.'
    func: CommandFunction<BaseSession, any> = async (session) => {
        if (!session.guildId) return session.reply("只能在服务器频道中使用此命令");
        getChannelStreamer(session.guildId, session.authorId).then(async (streamer) => {
            const card = new Card();
            let text = `\`\`\`typescript
${JSON.stringify({
                meta: streamer.nowPlaying?.meta,
                extra: streamer.nowPlaying?.extra,
                source: util.inspect(streamer.nowPlaying?.source)
            }, null, 4)}
\`\`\``;
            for (let i = 0; i < streamer['queue'].length && i <= 6; ++i) {
                text += `
\`\`\`typescript
${JSON.stringify({
                    meta: streamer['queue'][i].meta,
                    extra: streamer['queue'][i].extra,
                    source: util.inspect(streamer['queue'][i].source)
                }, null, 4)}
\`\`\``;
                if (!(i % 2)) {
                    card.addText(text);
                    text = "";
                }
            }
            if (text) card.addText(text);
            const fs = require('fs');
            fs.writeFileSync("./test.json", JSON.stringify(card.toJSON()));
            const { err, data } = await session.send(card);
            if (err) this.logger.error(err);
        }).catch((e) => {
            switch (e.err) {
                case 'network_failure':
                case 'no_streamer':
                case 'no_joinedchannel':
                    return session.sendTemp(e.msg);
                default:
                    this.logger.error(e);
            }
        });
    }
}

const command = new AppCommand();
export default command;
menu.addCommand(command);


