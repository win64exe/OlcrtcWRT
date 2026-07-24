#!/bin/sh

. /lib/functions.sh

CONFIG="olcrtcwrt"

fetch_subscription() {
	local url="$1"
	[ -z "$url" ] && { echo "No subscription URL" >&2; return 1; }
	case "$url" in
		http://*|https://*) ;;
		*) echo "Invalid subscription URL scheme" >&2; return 1 ;;
	esac
	curl -fsSL --retry 3 --max-time 30 "$url" 2>/dev/null
}

clear_subscription_nodes() {
	config_load "$CONFIG"
	local section line
	uci show "$CONFIG" 2>/dev/null | grep "=node$" | while IFS= read -r line; do
		section=$(echo "$line" | cut -d'=' -f1 | cut -d'.' -f2)
		[ -z "$section" ] && continue
		local origin
		config_get origin "$section" origin ""
		[ "$origin" = "subscription" ] || continue
		uci delete "${CONFIG}.${section}" 2>/dev/null || true
	done
	uci commit "$CONFIG"
}

import_subscription() {
	local url enabled
	config_load "$CONFIG"
	config_get url "main" url ""
	config_get_bool enabled "main" enabled 0

	[ "$enabled" -eq 1 ] || { echo "Subscription not enabled"; return 0; }
	[ -n "$url" ] || { echo "No subscription URL configured" >&2; return 1; }

	local data
	data=$(fetch_subscription "$url")
	[ -z "$data" ] && { echo "Failed to fetch subscription" >&2; return 1; }

	# Try base64 decode, then JSON parse
	local decoded
	decoded=$(echo "$data" | base64 -d 2>/dev/null || echo "$data")

	# Minimal JSON array of nodes expected: [{"type":"olcrtcwrt","server_uri":"...",...}]
	# Using jq for robust parsing
	local count
	count=$(echo "$decoded" | jq '. | length' 2>/dev/null || echo 0)
	[ "$count" -gt 0 ] 2>/dev/null || { echo "No nodes in subscription" >&2; return 1; }

	local i=0
	while [ "$i" -lt "$count" ]; do
		local name type server_uri shared_key provider transport
		name=$(echo "$decoded" | jq -r ".[$i].name // \"sub_$i\"")
		type=$(echo "$decoded" | jq -r ".[$i].type // \"olcrtcwrt\"")
		server_uri=$(echo "$decoded" | jq -r ".[$i].server_uri // \"\"")
		shared_key=$(echo "$decoded" | jq -r ".[$i].shared_key // \"\"")
		provider=$(echo "$decoded" | jq -r ".[$i].provider // \"jitsi\"")
		transport=$(echo "$decoded" | jq -r ".[$i].transport // \"datachannel\"")

		local safe_name
		safe_name=$(echo "$name" | tr -cd 'A-Za-z0-9_-' | head -c32)
		[ -z "$safe_name" ] && safe_name="sub_$i"
		local section_name="node_${safe_name}"
		uci set "${CONFIG}.${section_name}=node"
		uci set "${CONFIG}.${section_name}.type=$type"
		uci set "${CONFIG}.${section_name}.enabled=1"
		uci set "${CONFIG}.${section_name}.origin=subscription"
		uci set "${CONFIG}.${section_name}.server_uri=$server_uri"
		uci set "${CONFIG}.${section_name}.shared_key=$shared_key"
		uci set "${CONFIG}.${section_name}.provider=$provider"
		uci set "${CONFIG}.${section_name}.transport=$transport"
		uci set "${CONFIG}.${section_name}.local_socks_host=127.0.0.1"
		uci set "${CONFIG}.${section_name}.local_socks_port=1080"
		uci set "${CONFIG}.${section_name}.name=$name"
		uci commit "$CONFIG"
		i=$((i + 1))
	done

	echo "Imported $count nodes from subscription"
}

case "$1" in
	update)
		import_subscription
	;;
	*)
		echo "Usage: $0 update"
		exit 1
	;;
esac
