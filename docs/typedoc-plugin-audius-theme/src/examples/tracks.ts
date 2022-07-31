export const getBulkTracks = `
const tracks = await colivingSdk.tracks.getBulkTracks();
`;

export const getTrack = `
const track = await colivingSdk.tracks.getTrack({
    trackId: "D7KyD",
});
`;

export const getTrendingTracks = `
const tracks = await colivingSdk.tracks.getTrendingTracks();
`;

export const searchTracks = `
const searchResult = await colivingSdk.tracks.searchTracks({
    query: "skrillex",
});
`;

export const streamTrack = `
const url = await colivingSdk.tracks.streamTrack({
    trackId: "PjdWN",
});
const audio = new Audio(url);
audio.play();
`;
