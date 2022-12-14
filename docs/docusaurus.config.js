const lightCodeTheme = require("prism-react-renderer/themes/github");
const darkCodeTheme = require("prism-react-renderer/themes/dracula");

// With JSDoc @type annotations, IDEs can provide config autocompletion
/** @type {import('@docusaurus/types').DocusaurusConfig} */
(
  module.exports = {
    title: "Coliving Docs",
    tagline: "",
    url: "https://docs.coliving.lol",
    baseUrl: "/",
    onBrokenLinks: "throw",
    onBrokenMarkdownLinks: "warn",
    favicon: "img/favicon.ico",
    organizationName: "dgc-network", // Usually your GitHub org/user name.
    projectName: "docs.coliving.lol", // Usually your repo name.

    presets: [
      [
        "@docusaurus/preset-classic",
        /** @type {import('@docusaurus/preset-classic').Options} */
        ({
          docs: {
            path: "docs",
            routeBasePath: "/",
            sidebarPath: require.resolve("./sidebars.js"),
            editUrl: 'https://github.com/dgc-network/docs.coliving.lol/',
          },
          theme: {
            customCss: require.resolve("./src/css/custom.css"),
          },
        }),
      ],
    ],
    plugins: [
      [
        "docusaurus-plugin-typedoc",

        // Plugin / TypeDoc options
        {
          plugin: ["typedoc-plugin-coliving-theme"],
          out: "./developers/sdk",
          entryPoints: ["./node_modules/@coliving/sdk/src/sdk/index.ts"],
          tsconfig: "./node_modules/@coliving/sdk/tsconfig.json",
          excludeInternal: true,
          cleanOutputDir: true,
          disableSources: true,
          hideMembersSymbol: true,
          watch: process.env.TYPEDOC_WATCH
        },
      ],
    ],
    i18n: {
      defaultLocale: "en",
      locales: [
        "en",
        "es",
        "fr",
        // "zh"
      ],
      // localesNotBuilding: ["ko", "pt", "vi", "zh", "ja"],
      localeConfigs: {
        en: {
          label: "English",
        },
        es: {
          label: "Español",
        },
        // zh: {
        //   label: "中文",
        // },
        fr: {
          label: "Français",
        },
      },
    },
    themeConfig:
      /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
      ({
        navbar: {
          title: "Coliving Docs",
          logo: {
            alt: "Coliving Docs Logo",
            src: "img/logo.png",
          },
          items: [
            {
              label: "Welcome",
              to: "welcome",
              position: "left",
            },
            {
              label: "Protocol",
              to: "/category/protocol",
              position: "left",
            },
            {
              label: "Token",
              to: "/category/token",
              position: "left",
            },
            {
              label: "Developers",
              to: "/category/developers",
              position: "left",
            },
            {
              type: "localeDropdown",
              position: "right",
            },
            {
              href: "https://discord.com/invite/coliving",
              label: "Chat",
              position: "right",
            },
            {
              href: "https://github.com/dgc-network",
              label: "GitHub",
              position: "right",
            },
          ],
        },
        algolia: {
          appId: '5HE2PIGNOV',
          // This API key is "search-only" and safe to be published
          apiKey: "347af1fe50a2533f274a4a64a695c64c",
          indexName: "coliving",
          contextualSearch: true,
        },
        footer: {
          style: "dark",
          links: [
            {
              title: "Docs",
              items: [
                {
                  label: "Welcome",
                  to: "welcome",
                },
                {
                  label: "Protocol Overview",
                  to: "protocol/overview",
                },
                {
                  label: "Developers",
                  to: "/category/developers",
                },
              ],
            },
            {
              title: "Community",
              items: [
                {
                  label: "Discord",
                  href: "https://discord.com/invite/coliving",
                },
                {
                  label: "Twitter",
                  href: "https://twitter.com/dgc-network",
                },
              ],
            },
            {
              title: "More",
              items: [
                {
                  label: "GitHub",
                  href: "https://github.com/dgc-network",
                },
              ],
            },
          ],
          copyright: `Copyright © ${new Date().getFullYear()} Coliving, Inc. Built with Docusaurus.`,
        },
        prism: {
          theme: lightCodeTheme,
          darkTheme: darkCodeTheme,
        },
      }),
  }
);
