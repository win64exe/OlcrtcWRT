#!/bin/sh

NFT_FILE="/tmp/olcrtc.nft"

if [ ! -f "$NFT_FILE" ]; then
	echo "No generated nftables file found" >&2
	exit 1
fi

if ! nft -c -f "$NFT_FILE"; then
	echo "nftables rule validation failed" >&2
	exit 1
fi

echo "nftables rules are valid"
