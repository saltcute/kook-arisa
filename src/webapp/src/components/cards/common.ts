import webui from "../../../../config/webui";
export let ws: WebSocket;

const userDataRaw = localStorage.getItem('user');
if (userDataRaw) {
    const userData = JSON.parse(userDataRaw);
    ws = new WebSocket(webui.websocketUrl);
    ws.addEventListener('open', () => {
        ws.send(JSON.stringify({
            t: 0,
            d: {
                userId: userData.id
            }
        }));
    })
}

export function setPlayback(index: number, paused: boolean) {
    ws.send(JSON.stringify({
        t: 1,
        d: {
            streamerIndex: index,
            paused,
        }
    }))
}

export function changeTrack(index: number, next: boolean) {
    ws.send(JSON.stringify({
        t: 2,
        d: {
            streamerIndex: index,
            next
        }
    }))
}