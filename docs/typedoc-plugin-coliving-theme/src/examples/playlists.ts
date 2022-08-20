export const getContentList = `
const content list = await colivingSdk.content lists.getContentList({
    content listId: "AxRP0",
});
`;

export const getContentListAgreements = `
const agreements = await colivingSdk.content lists.getContentListAgreements({
    content listId: "AxRP0",
});
`;

export const getTrendingContentLists = `
const content lists = await colivingSdk.content lists.getTrendingContentLists();
`;

export const searchContentLists = `
const content lists = await colivingSdk.content lists.searchContentLists({
    query: 'lo-fi',
});
`;
