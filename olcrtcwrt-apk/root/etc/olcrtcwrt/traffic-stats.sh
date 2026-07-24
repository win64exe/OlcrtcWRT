#!/bin/sh

. /lib/functions.sh
. /usr/share/libubox/jshn.sh

CONFIG="olcrtcwrt"

NFT_DATA=$(nft list table inet olcrtcwrt 2>/dev/null)

counter_bytes_nft() {
	local name="$1"
	echo "$NFT_DATA" | awk -v name="$name" '
		$1 == "counter" && $2 == name {
			while (getline) {
				if ($1 == "packets" && $3 == "bytes") { print $4; exit }
				if ($1 == "}") exit
			}
		}
	' | grep -v '^[[:space:]]*$' || echo "0"
}

interface_bytes() {
	local iface="$1"
	local dir="$2"
	local file="/sys/class/net/$iface/statistics/${dir}_bytes"
	[ -r "$file" ] && cat "$file" 2>/dev/null || echo "0"
}

json_init

ol_rx=$(counter_bytes_nft "olcrtcwrt_rx")
ol_tx=$(counter_bytes_nft "olcrtcwrt_tx")
wd_rx=$(counter_bytes_nft "wdtt_rx")
wd_tx=$(counter_bytes_nft "wdtt_tx")

# In sing-box TUN mode the olcrtcwrt counter comes from the TUN interface
local routing_core proxy_mode
config_load "$CONFIG"
config_get routing_core proxy routing_core "nftables"
config_get proxy_mode proxy mode "disabled"

if [ "$routing_core" = "sing-box" ] && [ "$proxy_mode" != "disabled" ]; then
	ol_rx=$(interface_bytes "tunolcrtcwrt" "rx")
	ol_tx=$(interface_bytes "tunolcrtcwrt" "tx")
fi

handle_node() {
	local cfg="$1"
	local node_type
	config_get node_type "$cfg" type ""
	[ -z "$node_type" ] && return 0

	local node="${node_type}_${cfg}"
	local rx tx

	case "$node_type" in
		olcrtcwrt)
			rx="$ol_rx"
			tx="$ol_tx"
			;;
		wdtt)
			rx="$wd_rx"
			tx="$wd_tx"
			;;
		*)
			rx="0"
			tx="0"
			;;
	esac

	json_add_object "$node"
	json_add_string "rx" "$rx"
	json_add_string "tx" "$tx"
	json_close_object
}

config_foreach handle_node node
json_dump
