#!/bin/sh
# Migrate pre-r21 config layout (global/proxy/dns/subscription sections and
# server params stored on nodes) to the consolidated settings section and the
# separate server/client node layout. Idempotent: no-op once migrated.

CONFIG=olcrtcwrt

[ -n "$(uci -q get "${CONFIG}.settings")" ] && exit 0

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
	uci -q show "$CONFIG" 2>/dev/null | sed -n "s/^.*\\.\\([^=]*\\)=$1\$/\\1/p"
}

uci -q set "${CONFIG}.settings=settings"

# global
copy_opt global enabled
copy_opt global autostart
copy_opt global log_level
copy_opt global stats_interval
copy_opt global ping_interval

# proxy (enabled -> proxy_enabled, mode -> proxy_mode)
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

# dns (enabled -> dns_enabled)
val=$(uci -q get "${CONFIG}.dns.enabled"); [ -n "$val" ] && uci -q set "${CONFIG}.settings.dns_enabled=$val"
copy_opt dns proxy_dns
copy_opt dns fallback_dns
copy_list dns direct_domains
copy_list dns proxy_domains

# subscription (section "main")
val=$(uci -q get "${CONFIG}.main.enabled"); [ -n "$val" ] && uci -q set "${CONFIG}.settings.subscription_enabled=$val"
val=$(uci -q get "${CONFIG}.main.url"); [ -n "$val" ] && uci -q set "${CONFIG}.settings.subscription_url=$val"
val=$(uci -q get "${CONFIG}.main.auto_update"); [ -n "$val" ] && uci -q set "${CONFIG}.settings.subscription_auto_update=$val"
val=$(uci -q get "${CONFIG}.main.update_interval"); [ -n "$val" ] && uci -q set "${CONFIG}.settings.subscription_update_interval=$val"

# nodes -> move server params into server sections and reference them
for sec in $(sections_of_type node); do
	type=$(uci -q get "${CONFIG}.${sec}.type")
	[ -n "$type" ] || continue

	srv=""
	for s in $(sections_of_type server); do
		[ "$(uci -q get "${CONFIG}.${s}.type")" = "$type" ] && { srv="$s"; break; }
	done
	[ -n "$srv" ] || srv="${sec}_server"

	uci -q set "${CONFIG}.${srv}=server"
	uci -q set "${CONFIG}.${srv}.type=$type"
	uci -q set "${CONFIG}.${srv}.enabled=1"

	case "$type" in
		olcrtcwrt)
			for o in server_uri shared_key provider transport; do
				val=$(uci -q get "${CONFIG}.${sec}.${o}")
				[ -n "$val" ] && uci -q set "${CONFIG}.${srv}.${o}=$val"
				uci -q delete "${CONFIG}.${sec}.${o}" 2>/dev/null
			done
			uci -q delete "${CONFIG}.${sec}.mode" 2>/dev/null
			;;
		wdtt)
			for o in vps_host vps_port vk_hash password wireguard_config wireguard_iface; do
				val=$(uci -q get "${CONFIG}.${sec}.${o}")
				[ -n "$val" ] && uci -q set "${CONFIG}.${srv}.${o}=$val"
				uci -q delete "${CONFIG}.${sec}.${o}" 2>/dev/null
			done
			;;
	esac

	uci -q set "${CONFIG}.${sec}.server=$srv"
done

# remove old sections
uci -q delete "${CONFIG}.global" 2>/dev/null
uci -q delete "${CONFIG}.proxy" 2>/dev/null
uci -q delete "${CONFIG}.dns" 2>/dev/null
uci -q delete "${CONFIG}.main" 2>/dev/null

uci commit "$CONFIG"
exit 0
