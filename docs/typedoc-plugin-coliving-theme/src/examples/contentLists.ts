export const getContentList = `
const contentList = await colivingSdk.contentLists.getContentList({
    contentListId: "AxRP0",
});
`;

export const getContentListAgreements = `
const agreements = await colivingSdk.contentLists.getContentListAgreements({
    contentListId: "AxRP0",
});
`;

export const getTrendingContentLists = `
const contentLists = await colivingSdk.contentLists.getTrendingContentLists();
`;

export const searchContentLists = `
const contentLists = await colivingSdk.contentLists.searchContentLists({
    query: 'lo-fi',
});
`;
