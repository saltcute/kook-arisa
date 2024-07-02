import { Axios } from "axios";
import { client } from "init/client";

class Spotify {
    private API_ENDPOINT =
        client.config.getSync("arisa::config.spotify.apiEndpoint") ||
        "https://api.spotifydown.com/";
    private axios = new Axios({
        baseURL: this.API_ENDPOINT,
        responseType: "json",
        transformResponse: (data) => {
            try {
                return JSON.parse(data);
            } catch {
                return data;
            }
        },
        headers: {
            Origin: "https://spotifydown.com",
            Referer: "https://spotifydown.com/",
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        },
    });

    public isSuccessData<T extends ISpotifyResponse>(
        payload: T
    ): payload is Exclude<T, ISpotifyNotFound> {
        return payload.success;
    }
    public async getAlbumContent(
        uri: string
    ): Promise<ISpotifyAlbumContent | ISpotifyNotFound> {
        const metadata = await this.getAlbumMetadata(uri);
        const album = (await this.axios.get(`/trackList/album/${uri}`)).data;
        if (!this.isSuccessData(metadata)) return album;
        for (const track of album.trackList) {
            track.cover = metadata.cover;
            track.releaseDate = metadata.releaseDate;
        }
        return album;
    }

    public async getPlaylistContent(
        uri: string
    ): Promise<ISpotifyPlaylistContent | ISpotifyNotFound> {
        return (await this.axios.get(`/trackList/playlist/${uri}`)).data;
    }

    public async getAlbumMetadata(
        uri: string
    ): Promise<ISpotifyAlbumMetadata | ISpotifyNotFound> {
        return (await this.axios.get(`/metadata/album/${uri}`)).data;
    }

    public async getPlaylistMetadata(
        uri: string
    ): Promise<ISpotifyPlaylistMetadata | ISpotifyNotFound> {
        return (await this.axios.get(`/metadata/playlist/${uri}`)).data;
    }

    public async getTrackMetadata(
        uri: string
    ): Promise<ISpotifyTrackMetadata | ISpotifyNotFound> {
        return (await this.axios.get(`/metadata/track/${uri}`)).data;
    }

    public async getTrackDownloadInfo(
        uri: string
    ): Promise<ISpotifyDownloadInfo | ISpotifyNotFound> {
        return (await this.axios.get(`/download/${uri}`)).data;
    }
}
interface ISpotifyResponse {
    success: boolean;
}

interface ISpotifyData extends ISpotifyResponse {
    success: true;
}

export interface ISpotifyNotFound extends ISpotifyResponse {
    success: false;
    message: string;
}

export interface ISpotifyDownloadInfo extends ISpotifyData {
    link: string;
    metadata: ISpotifyTrackMetadata;
}

export interface ISpotifyTrackMetadata extends ISpotifyData {
    album: string;
    artists: string;
    // cache: boolean,
    cover: string;
    id: string;
    // isrc: string,
    releaseDate: string;
    title: string;
}

export interface ISpotifyAlbumMetadata extends ISpotifyData {
    artists: string;
    title: string;
    cover: string | null;
    releaseDate: string | null;
}

export interface ISpotifyPlaylistMetadata extends ISpotifyData {
    artists: string;
    title: string;
    cover: string;
    releaseDate: null;
}

export interface ISpotifyAlbumTrack {
    id: string;
    title: string;
    artists: string;
    cover: string;
    releaseDate: string;
}

export interface ISpotifyAlbumContent extends ISpotifyData {
    nextOffset: number | null;
    trackList: ISpotifyAlbumTrack[];
}

export interface ISpotifyPlaylistContent extends ISpotifyData {
    nextOffset: number | null;
    trackList: Exclude<ISpotifyTrackMetadata, ISpotifyData>[];
}

const spotify = new Spotify();

export default spotify;
