import { BaseCommand, BaseSession, CommandFunction } from "kasumi.js";

class AddCommand extends BaseCommand {
    name = 'revoke';
    description = 'Revoke a user\'s superuser rights.';
    func: CommandFunction<BaseSession, any> = async (session) => {
        const target = session.args[0];
        const targetGroup = this.client.middlewares.AccessControl.UserGroup.User;
        const match = target.match(/\(met\)(\d+)\(met\)/);
        if (match && match[1]) {
            const targetId = match[1];
            const { data: user, err } = await this.client.API.user.view(targetId, session.guildId);
            if (err) {
                session.send(`Exception getting the user detail. Message: ${err.message}`);
                return;
            }
            await session.send(`Confirm removing superuser rights from (met)${targetId}(met) (${user.username}#${user.identify_num})? (y/n)`);
            const res = await this.client.events.callback.createAsyncCallback("message.text", e => e.authorId == session.authorId, e => e.content, 10 * 1000).catch(() => 'timeout');
            if (res == "timeout") {
                await session.send("Timed out getting response. Aborted.");
            } else if (res.toLowerCase() == "n") {
                await session.send("Aborted.");
            } else if (res.toLowerCase() == "y") {
                this.client.middlewares.AccessControl.global.group.assignUser(targetId, targetGroup);
                await session.send(`Sucessfully removed superuser rights from (met)${targetId}(met) (${user.username}#${user.identify_num}). Their user group has been reset to ${targetGroup.name}.`);
            } else {
                await session.send("Operation cancelled.");
            }
        }
    }
}

const revoke = new AddCommand();
export default revoke;