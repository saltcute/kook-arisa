import { BaseCommand, BaseSession, Card, CommandFunction } from "kasumi.js";
import menu from "..";
import { controller } from "menu/arisa/playback/lib/index";
import { Time } from "menu/arisa/playback/lib/time";

class AppCommand extends BaseCommand {
    name = "list";
    description = "List all streamers in use.";
    func: CommandFunction<BaseSession, any> = async (session) => {
        const inUseStreamers = controller.activeStreamersArray;
        const card = new Card()
            .addTitle(
                `Streaming to ${inUseStreamers.length}/${controller.MAX_CONCURRENT_STREAMS} channels`
            )
            .addContext(
                `${controller.MAX_CONCURRENT_STREAMS - inUseStreamers.length} streamer(s) idle`
            );
        for (const streamer of inUseStreamers) {
            card.addText(`**${streamer.kasumi.me.username}#${streamer.kasumi.me.identifyNum}** By: (met)${streamer.INVITATION_AUTHOR_ID}(met)
In ${streamer.TARGET_GUILD_ID}/${streamer.TARGET_CHANNEL_ID}
Audiences: ${streamer.audienceIds.size}
Streaming started at: ${new Date(streamer.streamStart).toLocaleString()}
Lasted: ${Time.timeToShortString((Date.now() - streamer.streamStart) / 1000)}`);
        }
        return session.reply(card);
    };
}

const command = new AppCommand();
export default command;
menu.addCommand(command);
