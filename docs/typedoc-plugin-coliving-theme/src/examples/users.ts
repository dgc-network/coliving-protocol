export const getConnectedWallets = `
const wallets = await colivingSdk.users.getConnectedWallets({
    id: "eAZl3"
})
`;

export const getFavorites = `
const favorites = await colivingSdk.users.getFavorites({
    id: "eAZl3"
})
`;

export const getReposts = `
const reposts = await colivingSdk.users.getReposts({
    id: "eAZl3"
})
`;

export const getSupporters = `
const supporters = await colivingSdk.users.getSupporters({
    id: "eAZl3"
})
`;

export const getSupportings = `
const supportings = await colivingSdk.users.getSupportings({
    id: "eAZl3"
})
`;

export const getTopDigitalContentTags = `
const tags = await colivingSdk.users.getTopDigitalContentTags({
    id: "eAZl3"
})
`;

export const getDigitalContentsByUser = `
const digitalContents = await colivingSdk.users.getDigitalContentsByUser({
    id: "eAZl3"
})
`;

export const getUser = `
const user = await colivingSdk.users.getUser({
    id: "eAZl3"
})
`;

export const getUserIdFromWallet = `
const id = await colivingSdk.users.getUserIDFromWallet({
    associatedWallet: '0x10c16c7B8b1DDCFE65990ec822DE4379dd8a86dE'
})
`;

export const searchUsers = `
const users = await colivingSdk.users.searchUsers({
    query: 'skrillex'
})
`;
