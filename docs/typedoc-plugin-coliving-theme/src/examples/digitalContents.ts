export const getBulkDigitalContents = `
const digitalContents = await colivingSdk.digitalContents.getBulkDigitalContents();
`;

export const getDigitalContent = `
const digital_content = await colivingSdk.digitalContents.getDigitalContent({
    digitalContentId: "D7KyD",
});
`;

export const getTrendingDigitalContents = `
const digitalContents = await colivingSdk.digitalContents.getTrendingDigitalContents();
`;

export const searchDigitalContents = `
const searchResult = await colivingSdk.digitalContents.searchDigitalContents({
    query: "skrillex",
});
`;

export const streamDigitalContent = `
const url = await colivingSdk.digitalContents.streamDigitalContent({
    digitalContentId: "PjdWN",
});
const digitalcoin = new Audio(url);
digitalcoin.play();
`;
