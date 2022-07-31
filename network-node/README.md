An Coliving Content Node (previously known as Creator Node) maintains the availability of content on Coliving's decentralized network. The information stored includes Coliving user metadata, images, and audio content. The content is backed by either aws S3 or a local directory.

To blacklist content on an already running node:
1. Export the keys `delegatePrivateKey`, `creatorNodeEndpoint`, and `discoveryProviderEndpoint` in your terminal
```
$ export delegatePrivateKey='your_private_key'
$ export creatorNodeEndpoint='http://the_creator_node_endpoint'
$ export discoveryProviderEndpoint='http://discovery_node_endpoint'
```
2. Run the script `scripts/updateContentBlacklist.sh`. Refer to the script for usage!

For detailed instructions on how to develop on the service, please see [The Wiki](https://github.com/dgc.network/audius-protocol/wiki/Creator-Node-%E2%80%90-How-to-run).