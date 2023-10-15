import { client } from "init/client";

export function isAdmin(id: string) {
    return (client.config.get("globalAdmins")).includes(id);
}