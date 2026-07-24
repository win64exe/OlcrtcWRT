#!/bin/sh

. /lib/functions.sh

CONFIG="olcrtcwrt"
SINGBOX_DIR="/var/etc/olcrtcwrt/sing-box"
JSON_FILE="$SINGBOX_DIR/config.json"

mkdir -p "$SINGBOX_DIR"

BYPASS_DOMAINS=""
DIRECT_DOMAINS=""
PROXIED_DOMAINS=""
PROXY_IPS=""
PROXY_IPS6=""
BYPASS_IPS=""
BYPASS_IPS6=""

append_bypass_domain() {
	case "$1" in
		*/*) append_bypass_ip "$1" ;;
		*) [ -n "$BYPASS_DOMAINS" ] && BYPASS_DOMAINS="$BYPASS_DOMAINS, "; BYPASS_DOMAINS="$BYPASS_DOMAINS\"$1\""; ;;
	esac
}
append_direct_domain() { [ -n "$DIRECT_DOMAINS" ] && DIRECT_DOMAINS="$DIRECT_DOMAINS, "; DIRECT_DOMAINS="$DIRECT_DOMAINS\"$1\""; }
append_proxied_domain() { [ -n "$PROXIED_DOMAINS" ] && PROXIED_DOMAINS="$PROXIED_DOMAINS, "; PROXIED_DOMAINS="$PROXIED_DOMAINS\"$1\""; }
append_proxy_ip() { [ -n "$PROXY_IPS" ] && PROXY_IPS="$PROXY_IPS, "; PROXY_IPS="$PROXY_IPS\"$1\""; }
append_proxy_ip6() { [ -n "$PROXY_IPS6" ] && PROXY_IPS6="$PROXY_IPS6, "; PROXY_IPS6="$PROXY_IPS6\"$1\""; }
append_bypass_ip() { [ -n "$BYPASS_IPS" ] && BYPASS_IPS="$BYPASS_IPS, "; BYPASS_IPS="$BYPASS_IPS\"$1\""; }
append_bypass_ip6() { [ -n "$BYPASS_IPS6" ] && BYPASS_IPS6="$BYPASS_IPS6, "; BYPASS_IPS6="$BYPASS_IPS6\"$1\""; }

extract_host() {
	local uri="$1"
	[ -z "$uri" ] && return
	# Strip scheme
	uri="${uri#*://}"
	# Strip path, query, fragment, userinfo, port
	uri="${uri%%/*}"
	uri="${uri%%\?*}"
	uri="${uri%%#*}"
	uri="${uri##*@}"
	uri="${uri%%:*}"
	echo "$uri"
}

add_node_bypass() {
	local cfg="$1"
	local node_type host connection_uri server_uri
	config_get node_type "$cfg" type
	case "$node_type" in
		olcrtcwrt)
			config_get connection_uri "$cfg" connection_uri ""
			config_get server_uri "$cfg" server_uri ""
			[ -n "$connection_uri" ] && host=$(extract_host "$connection_uri")
			[ -n "$host" ] || host=$(extract_host "$server_uri")
			[ -n "$host" ] && append_bypass_domain "$host"
			;;
		wdtt)
			config_get host "$cfg" vps_host ""
			[ -n "$host" ] && append_bypass_domain "$host"
			;;
	esac
}

build_json() {
	local socks_host socks_port proxy_mode fallback_dns proxy_dns routing_core bypass_local
	config_get socks_host proxy socks_host "127.0.0.1"
	config_get socks_port proxy socks_port "1080"
	config_get proxy_mode proxy mode "disabled"
	config_get routing_core proxy routing_core "nftables"
	config_get bypass_local proxy bypass_local 1
	config_get fallback_dns dns fallback_dns "8.8.8.8"
	config_get proxy_dns dns proxy_dns "127.0.0.1#5353"

	if [ "$routing_core" != "sing-box" ] || [ "$proxy_mode" = "disabled" ]; then
		rm -f "$JSON_FILE"
		return 0
	fi

	# Parse proxy_dns host#port for sing-box
	local proxy_dns_host proxy_dns_port
	proxy_dns_host="${proxy_dns%%#*}"
	proxy_dns_port="${proxy_dns##*#}"
	[ "$proxy_dns_port" = "$proxy_dns_host" ] && proxy_dns_port="53"

	# Parse fallback_dns host#port for sing-box
	local fallback_dns_host fallback_dns_port
	fallback_dns_host="${fallback_dns%%#*}"
	fallback_dns_port="${fallback_dns##*#}"
	[ "$fallback_dns_port" = "$fallback_dns_host" ] && fallback_dns_port="53"

	config_list_foreach "proxy" "bypass_server_domains" append_bypass_domain
	config_list_foreach "dns" "direct_domains" append_direct_domain
	config_list_foreach "dns" "proxy_domains" append_proxied_domain
	config_list_foreach "proxy" "proxy_ips" append_proxy_ip
	config_list_foreach "proxy" "proxy_ips6" append_proxy_ip6
	config_list_foreach "proxy" "bypass_ips" append_bypass_ip
	config_list_foreach "proxy" "bypass_ips6" append_bypass_ip6

	# Auto-bypass olcrtcwrt/wdtt server endpoints to avoid routing loops
	config_foreach add_node_bypass node

	cat > "$JSON_FILE" <<EOF
{
  "log": {
    "level": "warn",
    "timestamp": true
  },
  "dns": {
    "servers": [
      {
        "tag": "dns_direct",
        "address": "$fallback_dns_host",
        "address_port": $fallback_dns_port,
        "detour": "direct"
      },
      {
        "tag": "dns_proxy",
        "address": "$proxy_dns_host",
        "address_port": $proxy_dns_port,
        "detour": "proxy"
      }
    ],
    "rules": [
EOF

	if [ -n "$BYPASS_DOMAINS" ] || [ -n "$DIRECT_DOMAINS" ]; then
		echo "      { \"domain\": [ $BYPASS_DOMAINS $DIRECT_DOMAINS ], \"server\": \"dns_direct\" }" >> "$JSON_FILE"
	fi

	if [ -n "$PROXIED_DOMAINS" ]; then
		if [ -n "$BYPASS_DOMAINS" ] || [ -n "$DIRECT_DOMAINS" ]; then
			echo "      ,{ \"domain\": [ $PROXIED_DOMAINS ], \"server\": \"dns_proxy\" }" >> "$JSON_FILE"
		else
			echo "      { \"domain\": [ $PROXIED_DOMAINS ], \"server\": \"dns_proxy\" }" >> "$JSON_FILE"
		fi
	fi

	cat >> "$JSON_FILE" <<EOF
    ],
    "final": "dns_proxy"
  },
  "inbounds": [
    {
      "type": "tun",
      "tag": "tun-in",
      "interface_name": "tunolcrtcwrt",
      "address": [
        "172.19.0.1/30",
        "fdfe:dcba:9876::1/126"
      ],
      "mtu": 1400,
      "auto_route": true,
      "strict_route": false,
      "sniff": true,
      "sniff_override_destination": false
    }
  ],
  "outbounds": [
    {
      "type": "socks",
      "tag": "proxy",
      "server": "$socks_host",
      "server_port": $socks_port
    },
    {
      "type": "direct",
      "tag": "direct"
    },
    {
      "type": "block",
      "tag": "block"
    }
  ],
  "route": {
    "auto_detect_interface": true,
    "rules": [
      { "port": [53], "action": "hijack-dns" },
      { "process_name": ["olcrtcwrt", "wdtt-server", "sing-box"], "action": "route", "outbound": "direct" },
      { "ip_is_private": true, "action": "route", "outbound": "direct" }
EOF

	if [ -n "$BYPASS_IPS" ]; then
		echo "      ,{ \"ip_cidr\": [ $BYPASS_IPS ], \"action\": \"route\", \"outbound\": \"direct\" }" >> "$JSON_FILE"
	fi

	if [ -n "$BYPASS_IPS6" ]; then
		echo "      ,{ \"ip_cidr\": [ $BYPASS_IPS6 ], \"action\": \"route\", \"outbound\": \"direct\" }" >> "$JSON_FILE"
	fi

	if [ -n "$BYPASS_DOMAINS" ] || [ -n "$DIRECT_DOMAINS" ]; then
		echo "      ,{ \"domain\": [ $BYPASS_DOMAINS $DIRECT_DOMAINS ], \"action\": \"route\", \"outbound\": \"direct\" }" >> "$JSON_FILE"
	fi

	if [ "$proxy_mode" = "list" ]; then
		if [ -n "$PROXY_IPS" ]; then
			echo "      ,{ \"ip_cidr\": [ $PROXY_IPS ], \"action\": \"route\", \"outbound\": \"proxy\" }" >> "$JSON_FILE"
		fi
		if [ -n "$PROXY_IPS6" ]; then
			echo "      ,{ \"ip_cidr\": [ $PROXY_IPS6 ], \"action\": \"route\", \"outbound\": \"proxy\" }" >> "$JSON_FILE"
		fi
		if [ -n "$PROXIED_DOMAINS" ]; then
			echo "      ,{ \"domain\": [ $PROXIED_DOMAINS ], \"action\": \"route\", \"outbound\": \"proxy\" }" >> "$JSON_FILE"
		fi
	fi

	local final_outbound="direct"
	[ "$proxy_mode" = "global" ] && final_outbound="proxy"

	cat >> "$JSON_FILE" <<EOF
      ,
      { "action": "route", "outbound": "$final_outbound" }
    ]
  }
}
EOF

	if command -v jq >/dev/null 2>&1; then
		if ! jq -e . "$JSON_FILE" >/dev/null 2>&1; then
			echo "Generated sing-box config is invalid" >&2
			return 1
		fi
	fi
}

case "$1" in
	setup)
		config_load "$CONFIG"
		build_json
	;;
	clear)
		rm -f "$JSON_FILE"
		# Best-effort cleanup of sing-box TUN routes
		ip route flush table 52 >/dev/null 2>&1 || true
		ip rule del lookup 52 >/dev/null 2>&1 || true
	;;
	*)
		echo "Usage: $0 {setup|clear}"
		exit 1
	;;
esac
