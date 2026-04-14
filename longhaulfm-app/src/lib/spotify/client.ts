import { SpotifyApi } from "@spotify/web-api-ts-sdk";

const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const redirectUri = "https://longhaul-fm.co.za/callback";

export const spotifyClient = SpotifyApi.withUserAuthorization(
  clientId,
  redirectUri,
  [
    "streaming",
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-email", // Added scope
    "user-read-private", // Added scope
  ]
);

export const spotifyClient = SpotifyApi.withUserAuthorization(
  clientId,
  redirectUri,
  ["streaming", "user-read-playback-state", "user-modify-playback-state"]
);

export const PLAYLIST_ID = "2PizZkPjQO9k8XW1O2A50V";