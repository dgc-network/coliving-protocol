#!/usr/bin/env sh

export delegateOwnerWallet=$(printenv "CN${replica}_SP_OWNER_ADDRESS")
export delegatePrivateKey=$(printenv "CN${replica}_SP_OWNER_PRIVATE_KEY")

export spOwnerWallet=$(printenv "CN${replica}_SP_OWNER_ADDRESS")

export contentNodeEndpoint="http://$(hostname -i):4000"

#cd ../coliving-libs
cd ../libs
npm link

cd ../content-node
#npm link @coliving/libs
npm link @coliving/sdk

# Run register script in background as it waits for the node to be healthy
node scripts/register.js &
