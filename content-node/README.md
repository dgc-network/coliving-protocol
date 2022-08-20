# Content Node
An Coliving Content Node maintains the availability of content on Coliving's decentralized network. The information stored includes Coliving user metadata, and files content. The content is backed by either aws S3 or a local directory.

To blacklist content on an already running node:
1. Export the keys `delegatePrivateKey`, `contentNodeEndpoint`, and `discoveryNodeEndpoint` in your terminal
```
$ export delegatePrivateKey='your_private_key'
$ export contentNodeEndpoint='http://content_node_endpoint'
$ export discoveryNodeEndpoint='http://discovery_node_endpoint'
```
2. Run the script `scripts/updateContentBlacklist.sh`. Refer to the script for usage!

For detailed instructions on how to develop on the service, please see [The Wiki](https://github.com/dgc-network/coliving-protocol/wiki/Content-Node-How-to-run).
