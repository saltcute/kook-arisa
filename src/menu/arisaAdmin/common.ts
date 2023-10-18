import { client } from "init/client";

type adminList = Array<string>
export async function isAdmin(id: string) {
    return ((await client.config.get("globalAdmins")).globalAdmins as adminList).includes(id);
}