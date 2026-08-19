#!/bin/sh

. /lib/functions.sh

CONFIG="olcrtcwrt"
NFT_FILE="/tmp/olcrtcwrt.nft"
TABLE="olcrtcwrt"

load_config() {
	config_load "$CONFIG"
}

get_list() {
	local section="$1"
	local key="$2"
	local item
	config_list_foreach "$section" "$key" echo_item
}

append_value() {
	values="$values $1"
}

echo_item() {
	echo "$1"
}

nft_clear() {
	nft delete table inet "$TABLE" 2>/dev/null || true
}

nft_setup() {
	local proxy_mode proxy_port bypass_local
	local proxy_ips proxy_ips6
	local bypass_ips bypass_ips6

	config_get proxy_mode "settings" proxy_mode "disabled"
	config_get proxy_port "settings" socks_port "1080"
	config_get_bool bypass_local "settings" bypass_local 1

	case "$proxy_port" in
		''|*[!0-9]*) proxy_port="1080" ;;
	esac
	[ "$proxy_port" -lt 1 ] && proxy_port="1080"
	[ "$proxy_port" -gt 65535 ] && proxy_port="1080"

	if [ "$proxy_mode" = "disabled" ]; then
		nft_clear
		return 0
	fi

	proxy_ips=$(get_list "settings" "proxy_ips")
	proxy_ips6=$(get_list "settings" "proxy_ips6")
	bypass_ips=$(get_list "settings" "bypass_ips")
	bypass_ips6=$(get_list "settings" "bypass_ips6")

	if [ "$proxy_mode" = "global" ]; then
		proxy_ips="0.0.0.0/0 $proxy_ips"
		proxy_ips6="::/0 $proxy_ips6"
	fi

	cat > "$NFT_FILE" <<EOF
table inet $TABLE {
	set proxy_ips {
		type ipv4_addr
		flags interval
		auto-merge
		elements = { $(join_elements "$proxy_ips") }
	}

	set proxy_ips6 {
		type ipv6_addr
		flags interval
		auto-merge
		elements = { $(join_elements "$proxy_ips6") }
	}

	set bypass_ips {
		type ipv4_addr
		flags interval
		auto-merge
		elements = { $(join_elements "$bypass_ips") }
	}

	set bypass_ips6 {
		type ipv6_addr
		flags interval
		auto-merge
		elements = { $(join_elements "$bypass_ips6") }
	}

	counter olcrtcwrt_rx {}
	counter olcrtcwrt_tx {}
	counter wdtt_rx {}
	counter wdtt_tx {}

	chain prerouting {
		type nat hook prerouting priority dstnat; policy accept;

		# Bypass local/private ranges
		$(bypass_rules "$bypass_local")

		# olcrtcwrt TCP redirect to SOCKS
		meta l4proto tcp ip daddr @proxy_ips counter name "olcrtcwrt_rx" redirect to :$proxy_port
		meta l4proto tcp ip6 daddr @proxy_ips6 counter name "olcrtcwrt_rx" redirect to :$proxy_port
	}

	chain output {
		type nat hook output priority -100; policy accept;

		# Bypass local/private ranges
		$(bypass_rules "$bypass_local")

		# olcrtcwrt TCP redirect to SOCKS for router-originated traffic
		meta l4proto tcp ip daddr @proxy_ips counter name "olcrtcwrt_rx" redirect to :$proxy_port
		meta l4proto tcp ip6 daddr @proxy_ips6 counter name "olcrtcwrt_rx" redirect to :$proxy_port
	}

	chain forward {
		type filter hook forward priority 0; policy accept;

		# WDTT interface counters
		iifname "wdtt*" counter name "wdtt_rx" accept
		oifname "wdtt*" counter name "wdtt_tx" accept
	}
}
EOF

	if ! nft -c -f "$NFT_FILE"; then
		logger -t olcrtcwrt "nftables rule validation failed"
		return 1
	fi

	if ! nft -f "$NFT_FILE"; then
		logger -t olcrtcwrt "nftables setup failed"
		return 1
	fi
}

join_elements() {
	local list="$1"
	local result=""
	for item in $list; do
		[ -n "$result" ] && result="$result, "
		result="$result$item"
	done
	echo "$result"
}

bypass_rules() {
	local enabled="$1"
	[ "$enabled" -eq 1 ] || return
	cat <<'EOF'
		ip daddr @bypass_ips return
		ip6 daddr @bypass_ips6 return
		ip daddr { 0.0.0.0/8, 10.0.0.0/8, 127.0.0.0/8, 169.254.0.0/16, 172.16.0.0/12, 192.168.0.0/16, 224.0.0.0/4 } return
		ip6 daddr { ::/128, ::1/128, 64:ff9b::/96, 100::/64, 2001:db8::/32, fc00::/7, fe80::/10, ff00::/8 } return
EOF
}

case "$1" in
	start|setup)
		load_config
		nft_clear
		nft_setup
	;;
	stop|teardown)
		nft_clear
	;;
	reload)
		load_config
		nft_clear
		nft_setup
	;;
	*)
		echo "Usage: $0 {start|stop|reload}"
		exit 1
	;;
esac
