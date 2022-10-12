'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var typedoc = require('typedoc');

const getContentList = `
const contentList = await colivingSdk.contentLists.getContentList({
    contentListId: "AxRP0",
});
`;
const getContentListAgreements = `
const agreements = await colivingSdk.contentLists.getContentListAgreements({
    contentListId: "AxRP0",
});
`;
const getTrendingContentLists = `
const contentLists = await colivingSdk.contentLists.getTrendingContentLists();
`;
const searchContentLists = `
const contentLists = await colivingSdk.contentLists.searchContentLists({
    query: 'lo-fi',
});
`;

var contentLists = /*#__PURE__*/Object.freeze({
    __proto__: null,
    getContentList: getContentList,
    getContentListAgreements: getContentListAgreements,
    getTrendingContentLists: getTrendingContentLists,
    searchContentLists: searchContentLists
});

const resolve = `
const digital_content = await colivingSdk.resolve<DigitalContent>({
  url: "https://coliving.lol/camouflybeats/hypermantra-86216",
});
`;

var resolve$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    resolve: resolve
});

const getBulkAgreements = `
const agreements = await colivingSdk.agreements.getBulkAgreements();
`;
const getAgreement = `
const digital_content = await colivingSdk.agreements.getAgreement({
    agreementId: "D7KyD",
});
`;
const getTrendingAgreements = `
const agreements = await colivingSdk.agreements.getTrendingAgreements();
`;
const searchAgreements = `
const searchResult = await colivingSdk.agreements.searchAgreements({
    query: "skrillex",
});
`;
const streamAgreement = `
const url = await colivingSdk.agreements.streamAgreement({
    agreementId: "PjdWN",
});
const digitalcoin = new Audio(url);
digitalcoin.play();
`;

var agreements = /*#__PURE__*/Object.freeze({
    __proto__: null,
    getBulkAgreements: getBulkAgreements,
    getAgreement: getAgreement,
    getTrendingAgreements: getTrendingAgreements,
    searchAgreements: searchAgreements,
    streamAgreement: streamAgreement
});

const getConnectedWallets = `
const wallets = await colivingSdk.users.getConnectedWallets({
    id: "eAZl3"
})
`;
const getFavorites = `
const favorites = await colivingSdk.users.getFavorites({
    id: "eAZl3"
})
`;
const getReposts = `
const reposts = await colivingSdk.users.getReposts({
    id: "eAZl3"
})
`;
const getSupporters = `
const supporters = await colivingSdk.users.getSupporters({
    id: "eAZl3"
})
`;
const getSupportings = `
const supportings = await colivingSdk.users.getSupportings({
    id: "eAZl3"
})
`;
const getTopAgreementTags = `
const tags = await colivingSdk.users.getTopAgreementTags({
    id: "eAZl3"
})
`;
const getAgreementsByUser = `
const agreements = await colivingSdk.users.getAgreementsByUser({
    id: "eAZl3"
})
`;
const getUser = `
const user = await colivingSdk.users.getUser({
    id: "eAZl3"
})
`;
const getUserIdFromWallet = `
const id = await colivingSdk.users.getUserIDFromWallet({
    associatedWallet: '0x10c16c7B8b1DDCFE65990ec822DE4379dd8a86dE'
})
`;
const searchUsers = `
const users = await colivingSdk.users.searchUsers({
    query: 'skrillex'
})
`;

var users = /*#__PURE__*/Object.freeze({
    __proto__: null,
    getConnectedWallets: getConnectedWallets,
    getFavorites: getFavorites,
    getReposts: getReposts,
    getSupporters: getSupporters,
    getSupportings: getSupportings,
    getTopAgreementTags: getTopAgreementTags,
    getAgreementsByUser: getAgreementsByUser,
    getUser: getUser,
    getUserIdFromWallet: getUserIdFromWallet,
    searchUsers: searchUsers
});

var examples = /*#__PURE__*/Object.freeze({
    __proto__: null,
    contentLists: contentLists,
    resolve: resolve$1,
    agreements: agreements,
    users: users
});

function load(app) {
    const onRenderBegin = (event) => {
        // For each of the classes
        const classes = event.project.getReflectionsByKind(typedoc.ReflectionKind.Class);
        classes.forEach((r) => {
            var _a, _b;
            // Remove the Hierarchy display
            delete r.typeHierarchy;
            // Update the name
            r.name = r.name.replace("Api", "");
            // Hide the Kind display
            r.kindString = "";
            // Delete everything but methods
            r.groups = (_a = r.groups) === null || _a === void 0 ? void 0 : _a.filter((g) => {
                const kindsToDelete = [
                    typedoc.ReflectionKind.Property,
                    typedoc.ReflectionKind.Constructor,
                ];
                const result = !kindsToDelete.includes(g.kind);
                return result;
            });
            (_b = r.children) === null || _b === void 0 ? void 0 : _b.forEach((c) => {
                var _a, _b, _c, _d, _e, _f;
                delete r.parent;
                if (c.kind === typedoc.ReflectionKind.Method) {
                    // Find the corresponding example in the `examples` directory
                    const example = (_a = examples[r.name.toLowerCase()]) === null || _a === void 0 ? void 0 : _a[c.name];
                    // Add the example to the comment
                    if (((_b = c.signatures) === null || _b === void 0 ? void 0 : _b[0].comment) && example) {
                        c.signatures[0].comment.text = `Example:\n\n\`\`\`typescript\n${example}\n\`\`\``;
                    }
                    // Fix escaping of single quotes in short text description
                    if ((_d = (_c = c.signatures) === null || _c === void 0 ? void 0 : _c[0].comment) === null || _d === void 0 ? void 0 : _d.shortText) {
                        c.signatures[0].comment.shortText =
                            (_f = (_e = c.signatures) === null || _e === void 0 ? void 0 : _e[0].comment) === null || _f === void 0 ? void 0 : _f.shortText.replace("\\'", "'");
                    }
                }
            });
        });
    };
    const onConverterEnd = (context) => {
        const reflections = context.project.getReflectionsByKind(typedoc.ReflectionKind.All);
        reflections.forEach((r) => {
            // Remove full namespace entirely
            if (r.getFullName().startsWith('full.')) {
                context.project.removeReflection(r);
            }
        });
    };
    app.renderer.on(typedoc.RendererEvent.BEGIN, onRenderBegin);
    app.converter.on(typedoc.Converter.EVENT_END, onConverterEnd);
}

exports.load = load;
//# sourceMappingURL=index.js.map
