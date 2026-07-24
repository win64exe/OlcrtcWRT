#!/bin/sh

. /lib/functions.sh

CONFIG="olcrtc"
DNSMASQ_DIR="/tmp/dnsmasq.d"
DNS_FILE="$DNSMASQ_DIR/olcrtc.conf"

clear_dns() {
	rm -f "$DNS_FILE"
}

setup_dns() {
	local enabled proxy_dns fallback_dns
	config_get_bool enabled "dns" enabled 0
	[ "$enabled" -eq 1 ] || { clear_dns; return 0; }

	config_get proxy_dns "dns" proxy_dns "127.0.0.1#5353"
	config_get fallback_dns "dns" fallback_dns "8.8.8.8"

	clear_dns

	add_direct() { echo "server=/$1/$fallback_dns" >> "$DNS_FILE"; }
	add_proxy()  { echo "server=/$1/$proxy_dns"  >> "$DNS_FILE"; }

	config_list_foreach "dns" "direct_domains" add_direct
	config_list_foreach "dns" "proxy_domains"  add_proxy

	/etc/init.d/dnsmasq restart >/dev/null 2>&1 || true
}

case "$1" in
	setup)
		config_load "$CONFIG"
		setup_dns
	;;
	clear)
		clear_dns
		/etc/init.d/dnsmasq restart >/dev/null 2>&1 || true
	;;
	*)
		echo "Usage: $0 {setup|clear}"
		exit 1
	;;
esac
