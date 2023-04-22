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