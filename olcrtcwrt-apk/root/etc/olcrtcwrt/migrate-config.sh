#!/bin/sh
# Migrate older config layouts to the consolidated settings section plus
# self-contained client (node) and server (server) sections. Idempotent.

CONFIG=olcrtcwrt

has_section() {
	[ -n "$(uci -q get "${CONFIG}.$1")" ]
}

copy_opt() {
	local src="$1" dst="$2" val
	val=$(uci -q get "${CONFIG}.${src}.${dst}")
	[ -n "$val" ] && uci -q set "${CONFIG}.settings.${dst}=$val"
}

copy_list() {
	local src="$1" dst="$2" val
	for val in $(uci -q get "${CONFIG}.${src}.${dst}" 2>/dev/null); do
		uci -q add_list "${CONFIG}.settings.${dst}=$val"
	done
}

sections_of_type() {
	uci -q show "$CONFIG" 2>/dev/null | sed -n "s/^.*\\.\\([^=]*\\)=$1\\$/\\1/p"
}

# --- 1. pre-r21: consolidate global/proxy/dns/subscription into settings ---
if ! has_section settings; then
	uci -q set "${CONFIG}.settings=settings"

	copy_opt global enabled
	copy_opt global autostart
	copy_opt global log_level
	copy_opt global stats_interval
	copy_opt global ping_interval

	val=$(uci -q get "${CONFIG}.proxy.enabled"); [ -n "$val" ] && uci -q set "${CONFIG}.settings.proxy_enabled=$val"
	copy_opt proxy routing_core
	copy_opt proxy http_host
	copy_opt proxy http_port
	copy_opt proxy socks_host
	copy_opt proxy socks_port
	copy_opt proxy redirect_to_olcrtcwrt
	val=$(uci -q get "${CONFIG}.proxy.mode"); [ -n "$val" ] && uci -q set "${CONFIG}.settings.proxy_mode=$val"
	copy_opt proxy bypass_local
	copy_list proxy proxy_ips
	copy_list proxy proxy_ips6
	copy_list proxy bypass_ips
	copy_list proxy bypass_ips6
	copy_list proxy bypass_server_domains

	val=$(uci -q get "${CONFIG}.dns.enabled"); [ -n "$val" ] && uci -q set "${CONFIG}.settings.dns_enabled=$val"
	copy_opt dns proxy_dns
	copy_opt dns fallback_dns
	copy_list dns direct_domains
	copy_list dns proxy_domains

	val=$(uci -q get "${CONFIG}.main.enabled"); [ -n "$val" ] && uci -q set "${CONFIG}.settings.subscription_enabled=$val"
	val=$(uci -q get "${CONFIG}.main.url"); [ -n "$val" ] && uci -q set "${CONFIG}.settings.subscription_url=$val"
	val=$(uci -q get "${CONFIG}.main.auto_update"); [ -n "$val" ] && uci -q set "${CONFIG}.settings.subscription_auto_update=$val"
	val=$(uci -q get "${CONFIG}.main.update_interval"); [ -n "$val" ] && uci -q set "${CONFIG}.settings.subscription_update_interval=$val"

	uci -q delete "${CONFIG}.global" 2>/dev/null
	uci -q delete "${CONFIG}.proxy" 2>/dev/null
	uci -q delete "${CONFIG}.dns" 2>/dev/null
	uci -q delete "${CONFIG}.main" 2>/dev/null
fi

# --- 2. Normalize node type name (olcrtc -> olcrtcwrt) ---
for sec in $(sections_of_type node); do
	[ "$(uci -q get "${CONFIG}.${sec}.type")" = "olcrtc" ] && uci -q set "${CONFIG}.${sec}.type=olcrtcwrt"
done

# --- 3. r21 layout: nodes referenced a server section holding client params.
#        Move those params back into the node and drop the reference. ---
for sec in $(sections_of_type node); do
	srv=$(uci -q get "${CONFIG}.${sec}.server")
	[ -n "$srv" ] || continue
	type=$(uci -q get "${CONFIG}.${sec}.type")

	case "$type" in
		olcrtcwrt)
			for o in server_uri shared_key provider transport; do
				val=$(uci -q get "${CONFIG}.${srv}.${o}")
				[ -n "$val" ] && uci -q set "${CONFIG}.${sec}.${o}=$val"
			done
			;;
		wdtt)
			for o in vps_host vps_port vk_hash password wireguard_config wireguard_iface; do
				val=$(uci -q get "${CONFIG}.${srv}.${o}")
				[ -n "$val" ] && uci -q set "${CONFIG}.${sec}.${o}=$val"
			done
			;;
	esac

	uci -q delete "${CONFIG}.${sec}.server" 2>/dev/null
	uci -q delete "${CONFIG}.${srv}" 2>/dev/null
done

# --- 4. Ensure default server sections exist (server params, not client) ---
ensure_server_defaults() {
	local sec="$1" type="$2"
	if ! has_section "$sec"; then
		uci -q set "${CONFIG}.${sec}=server"
		uci -q set "${CONFIG}.${sec}.type=$type"
		uci -q set "${CONFIG}.${sec}.enabled=0"
	fi
}

if [ -z "$(sections_of_type server)" ]; then
	ensure_server_defaults olcrtc_server olcrtcwrt
	ensure_server_defaults wdtt_server wdtt

	uci -q set "${CONFIG}.olcrtc_server.room="
	uci -q set "${CONFIG}.olcrtc_server.shared_key="
	uci -q set "${CONFIG}.olcrtc_server.provider=jitsi"
	uci -q set "${CONFIG}.olcrtc_server.transport=datachannel"
	uci -q set "${CONFIG}.olcrtc_server.listen=0.0.0.0:56001"
	uci -q set "${CONFIG}.olcrtc_server.data_dir=/etc/olcrtcwrt/data"

	uci -q set "${CONFIG}.wdtt_server.server_address="
	uci -q set "${CONFIG}.wdtt_server.listen=0.0.0.0:56000"
	uci -q set "${CONFIG}.wdtt_server.connect=127.0.0.1:51820"
	uci -q set "${CONFIG}.wdtt_server.mode=udp"
	uci -q set "${CONFIG}.wdtt_server.obf_profile=none"
fi

uci commit "$CONFIG"
exit 0
