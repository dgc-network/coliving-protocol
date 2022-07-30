#!/usr/bin/env bash

set -ex

cd $PROTOCOL_DIR
git fetch origin
git checkout $1
git pull

if [[ -d $PROTOCOL_DIR/../coliving-client ]]; then
	cd $PROTOCOL_DIR/../coliving-client
	git fetch origin
	git checkout $2
	git pull
fi
