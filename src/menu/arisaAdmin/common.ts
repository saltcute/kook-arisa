import config from "config";

export function isAdmin(id: string) {
    return (config.globalAdmins as string[]).includes(id);
}