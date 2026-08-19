#!/bin/sh

. /lib/functions.sh
. /usr/share/libubox/jshn.sh

CONFIG="olcrtcwrt"

ping_host() {
	local host="$1"
	local count="${2:-3}"
	[ -z "$host" ] && { echo ""; return; }
	local avg
	avg=$(ping -c "$count" -W 2 "$host" 2>/dev/null | awk '/^rtt/ { split($4,a,"/"); print a[2] }')
	[ -z "$avg" ] && avg=""
	echo "$avg"
}

extract_host_from_uri() {
	local uri="$1"
	[ -z "$uri" ] && { echo ""; return; }
	# Skip olcrtc:// connection URIs: host is not directly pingable
	case "$uri" in
		olcrtc://*) echo ""; return ;;
	esac
	# Plain host or http(s)://host... -> extract host without port/path
	local host
	host=$(echo "$uri" | sed -n 's|^[a-zA-Z]*://\([^/]*\).*||p' | cut -d':' -f1)
	[ -n "$host" ] || host="$uri"
	# Strip any trailing path or port
	echo "$host" | cut -d':' -f1
}

json_init

handle_node() {
	local cfg="$1"
	local node_type
	config_get node_type "$cfg" type ""
	[ -z "$node_type" ] && return 0

	local host=""
	local server_ref
	case "$node_type" in
		olcrtcwrt)
			local uri
			config_get server_ref "$cfg" server ""
			[ -n "$server_ref" ] || server_ref="$cfg"
			config_get uri "$server_ref" server_uri ""
			[ -z "$uri" ] && config_get uri "$cfg" connection_uri ""
			[ -z "$uri" ] || host=$(extract_host_from_uri "$uri")
			;;
		wdtt)
			config_get server_ref "$cfg" server ""
			[ -n "$server_ref" ] || server_ref="$cfg"
			config_get host "$server_ref" vps_host ""
			;;
	esac

	local node="${node_type}_${cfg}"
	local avg
	avg=$(ping_host "$host")
	json_add_string "$node" "$avg"
}

config_load "$CONFIG"
config_foreach handle_node node
json_dump
