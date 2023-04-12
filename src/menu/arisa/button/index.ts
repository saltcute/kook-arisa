import { client } from "init/client";
import upath from 'upath';

client.message.on('buttonClicked', async (event) => {
    const buttonValue = JSON.parse(event.value);
    try {
        const action = buttonValue.action.split(":");
        const data = buttonValue.data;
        client.logger.debug(`ButtonClicked: From ${event.author.username}#${event.author.identify_num} (ID ${event.authorId} in (${event.guildId}/${event.channelId}), invoke ${buttonValue.action}`);
        const func: (e: typeof event, action: string[], data: any) => Promise<any> = require(upath.join(__dirname, 'action', ...action, 'index')).default;
        await func(event, action, data).catch((e) => {
            client.logger.error(e);
        });
    } catch (e) {
        client.logger.warn(`ButtonClicked: Unrecognized action ${buttonValue.action}`);
    }
})