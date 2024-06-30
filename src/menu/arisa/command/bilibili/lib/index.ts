import axios from "axios";

interface VideoDetailData {
    title: string;
    bvid: string;
    aid: number;
    videos: number;
    pic: string;
    desc: string;
    desc_v2: string;
    cid: number;
    duration: number;
    owner: {
        mid: number;
        name: string;
        face: string;
    };
    [key: string]: any;
}

export async function getVideoDetail(
    bvid: string
): Promise<VideoDetailData | undefined> {
    const res = (
        await axios({
            url: "https://api.bilibili.com/x/web-interface/view",
            params: { bvid },
        })
    ).data;
    if (res.code == 0) {
        return res.data;
    } else return undefined;
}
