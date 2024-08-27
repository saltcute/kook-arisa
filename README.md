# kook-arisa

Yet another KOOK music bot, with a web dashboard.

## Self Host

1. Clone the repo and install dependencies

```bash
git clone https://github.com/saltcute/kook-arisa
cd kook-arisa
npm i
```

2. Create a config file from template

```bash
cp src/config/template-config.json5 src/config/config.json5
```

3. Edit the config file

-   Here are some config entries that you have to fill out.

```json5
{
    // KOOK connection settings. See https://kasumi.js.org/introduction/getting-started.html.
    "kasumi::config.token": "1/CR4Zyt=/thUr5d4YVme50pLSq5Ee9MA==",
    "kasumi::config.connection": "kookts",
    "kasumi::config.webhookVerifyToken": "",
    "kasumi::config.webhookEncryptKey": "",
    "kasumi::config.webhookPort": 11451,

    // MongoDB connection URI. kook-arisa requires a running mongodb to work at the moment.
    "kasumi::config.mongoConnectionString": "mongodb://localhost:27017",

    // Users whose id is in this array will have Admin group.
    // Use /arisaadmin to see admin commands.
    globalAdmins: ["1854484583"],

    // This is the actual bot that will join a voice channel.
    // It could be the same as kasumi::config.token, but just to be safe a different one is recommended.
    // You need at least one token.
    streamers: [
        "1/CR4Zyt=/thUr5d4YVme50pLSq5Ee9MA==",
        "1/SU1SeI=/H4N3MuaN4taN0rENdEzV0us==",
    ],
}
```

-   These setting are optional.

```json5
{
    // Client ID and Client Secret is required for webui to work.
    kookClientID: "",
    // You need to have access to KOOK's oauth2 to get this.
    kookClientSecret: "",

    // Optionally use other ports.
    internalWebuiPort: 80,
    // This URL will be in cards and logs where it needs to link to the webui.
    webuiUrl: "http://localhost",

    // Set this to true to play VIP-exclusive tracks on Netease Cloud Music.
    neteaseVIP: false,
    // Your credentials are only sent to Netease's servers.
    neteaseEmail: "nayutalien@love.you",
    neteasePassword: "up!side@down#side$up%and^down",

    // This is a random string that you will need if you want to update the cookie of QQ Music.
    QQCookieCode: "11.86 mata aeru",
}
```

## Update QQ Music Cookie

Most (90%) of the tracks on QQ Music needs a valid cookie to play. You can use [saltcute/QQMusicCookieRefresh](https://github.com/saltcute/QQMusicCookieRefresh) to refresh the cookie automatically. You need to login the QQ account to a normal QQ client on the server to use this.

Or you can also send a POST request to `${webuiUrl}/qqmusic/updateCookie` with the body:

```json5
{
    code: "The string you put in config",
    cookie: "The cookie string",
}
```

## ~~Streamer Middleman?~~

After the latest update, multiple streamer tokens and streamer middleman is no longer required.

~~Due to limitation on KOOK's side, one single bot can only stream to one voice channel. `kook-arisa` get around with that limitation by using separate bots for each play session. This was originally done by using `/v3/guild/join` endpoint. However, this was soon patched by KOOK (reasonably), so that bots can no longer join an arbitary server on its own.~~

~~As a workaround, streamer middleman is implemented by using a normal user account to invite the bot to the server. The middleman will first join the server with `/v2/guilds/join` and then invite the bot using oauth2 (Yes you hear it right lol and see details [here](./src/menu/arisa/playback/local/controller.ts#L128-L161)).~~

~~With that, the config entries become obvious:~~

```json5
{
    // KOOK user ID of the middleman.
    streamerMiddlemanID: "",
    // KOOK user token of the middleman.
    // You can get this at `localStorage.authorization` in DevTools
    streamerMiddlemanToken: "",
}
```

~~The middleman should not be the same user as the one you want to listen to the stream. So you will need a alt account.~~

~~However, if you are willing to manually invite all the streamer to your server when self hosting, it should be fine to leave it empty (not fully tested).~~
