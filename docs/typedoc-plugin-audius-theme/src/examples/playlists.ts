export const getPlaylist = `
const playlist = await colivingSdk.playlists.getPlaylist({
    playlistId: "AxRP0",
});
`;

export const getPlaylistTracks = `
const tracks = await colivingSdk.playlists.getPlaylistTracks({
    playlistId: "AxRP0",
});
`;

export const getTrendingPlaylists = `
const playlists = await colivingSdk.playlists.getTrendingPlaylists();
`;

export const searchPlaylists = `
const playlists = await colivingSdk.playlists.searchPlaylists({
    query: 'lo-fi',
});
`;
