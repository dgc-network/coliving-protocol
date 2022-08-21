export const getBulkAgreements = `
const agreements = await colivingSdk.agreements.getBulkAgreements();
`;

export const getAgreement = `
const agreement = await colivingSdk.agreements.getAgreement({
    agreementId: "D7KyD",
});
`;

export const getTrendingAgreements = `
const agreements = await colivingSdk.agreements.getTrendingAgreements();
`;

export const searchAgreements = `
const searchResult = await colivingSdk.agreements.searchAgreements({
    query: "skrillex",
});
`;

export const streamAgreement = `
const url = await colivingSdk.agreements.streamAgreement({
    agreementId: "PjdWN",
});
const live = new Audio(url);
live.play();
`;
