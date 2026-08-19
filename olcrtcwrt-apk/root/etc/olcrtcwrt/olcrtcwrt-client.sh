#!/bin/sh

. /lib/functions.sh

CONFIG="olcrtcwrt"
SECTION="${2:-olcrtcwrt_main}"
BIN_DIR="/etc/olcrtcwrt/bin"
PID_DIR="/var/run/olcrtcwrt"
LOG_DIR="/var/log/olcrtcwrt"

mkdir -p "$PID_DIR" "$LOG_DIR"

BIN_FILE=""

resolve_binary() {
	local arch=$(uname -m)
	case "$arch" in
		aarch64) [ -x "$BIN_DIR/olcrtc-linux-arm64" ] && BIN_FILE="$BIN_DIR/olcrtc-linux-arm64" ;;
		x86_64)  [ -x "$BIN_DIR/olcrtcwrt" ] && BIN_FILE="$BIN_DIR/olcrtcwrt" ;;
	esac
	[ -z "$BIN_FILE" ] && BIN_FILE="$BIN_DIR/olcrtcwrt"
}

load_config() {
	config_load "$CONFIG"
}

is_enabled() {
	local enabled
	config_get_bool enabled "$SECTION" enabled 0
	echo "$enabled"
}

pid_file() {
	echo "$PID_DIR/olcrtcwrt_${SECTION}.pid"
}

log_file() {
	echo "$LOG_DIR/olcrtcwrt_${SECTION}.log"
}

parse_connection_uri() {
	local uri="$1"
	local content rest trans_opt
	local out_server_uri out_shared_key out_provider out_transport out_extra

	content="${uri#olcrtc://}"

	out_shared_key="${content##*#}"
	rest="${content%#*}"

	out_server_uri="${rest##*@}"
	rest="${rest%@*}"

	if [ "$rest" != "${rest#*\?}" ]; then
		out_provider="${rest%%\?*}"
		trans_opt="${rest#*\?}"
		out_transport="${trans_opt%%<*}"
		# Extract transport options like vp8-fps=60&vp8-batch=64
		if [ "$trans_opt" != "${trans_opt%%<*}" ]; then
			local t_opts="${trans_opt#*<}"
			t_opts="${t_opts%>}"
			out_extra=$(echo "$t_opts" | tr '&' ' ' | sed 's/\([^=]*\)=\([^ ]*\)/--\1=\2/g')
		fi
	else
		out_provider="$rest"
		out_transport="datachannel"
	fi

	printf '%s\n%s\n%s\n%s\n%s\n' "$out_server_uri" "$out_shared_key" "$out_provider" "$out_transport" "$out_extra"
}

build_args() {
	local server_uri shared_key provider transport local_socks_host local_socks_port extra_args connection_uri
	config_get connection_uri "$SECTION" connection_uri

	if [ -n "$connection_uri" ]; then
		case "$connection_uri" in
			olcrtc://*@*#*) ;;
			*)
				echo "Invalid connection_uri format" >&2
				exit 1
			;;
		esac
		local parsed
		parsed=$(parse_connection_uri "$connection_uri")
		server_uri=$(echo "$parsed" | sed -n '1p')
		shared_key=$(echo "$parsed" | sed -n '2p')
		provider=$(echo "$parsed" | sed -n '3p')
		transport=$(echo "$parsed" | sed -n '4p')
		extra_args=$(echo "$parsed" | sed -n '5p')
	else
		local server_ref
		config_get server_ref "$SECTION" server ""
		[ -n "$server_ref" ] || server_ref="$SECTION"
		config_get server_uri "$server_ref" server_uri
		config_get shared_key "$server_ref" shared_key
		config_get provider "$server_ref" provider "jitsi"
		config_get transport "$server_ref" transport "datachannel"
		config_get extra_args "$SECTION" extra_args ""
	fi

	config_get local_socks_host "$SECTION" local_socks_host "127.0.0.1"
	config_get local_socks_port "$SECTION" local_socks_port "1080"
	[ -z "$extra_args" ] && config_get extra_args "$SECTION" extra_args ""

	if [ -z "$server_uri" ] || [ -z "$shared_key" ]; then
		echo "Missing server_uri or shared_key" >&2
		exit 1
	fi

	ARGS="cnc --uri=$server_uri --key=$shared_key --provider=$provider --transport=$transport --socks=$local_socks_host:$local_socks_port"
	[ -n "$extra_args" ] && ARGS="$ARGS $extra_args"
}

case "$1" in
	start)
		local foreground=""
		while [ "${2#--}" != "$2" ]; do
			case "$2" in
				--foreground) foreground=1 ;;
				*) break ;;
			esac
			shift
		done
		[ -n "$2" ] && SECTION="$2"
		load_config
		[ "$(is_enabled)" -eq 1 ] || { echo "olcrtcwrt not enabled"; exit 0; }
		resolve_binary
		[ -x "$BIN_FILE" ] || { echo "olcrtcwrt binary not found ($BIN_FILE), run download first"; exit 1; }

		local PID_FILE LOG_FILE
		PID_FILE=$(pid_file)
		LOG_FILE=$(log_file)

		if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
			echo "olcrtcwrt ($SECTION) already running"
			exit 0
		fi

		build_args
		if [ -n "$foreground" ]; then
			exec "$BIN_FILE" $ARGS
		else
			nohup "$BIN_FILE" $ARGS > "$LOG_FILE" 2>&1 &
			echo $! > "$PID_FILE"
			echo "olcrtcwrt ($SECTION) started"
		fi
	;;
	stop)
		[ -n "$2" ] && SECTION="$2"
		local PID_FILE
		PID_FILE=$(pid_file)
		if [ -f "$PID_FILE" ]; then
			kill "$(cat "$PID_FILE")" 2>/dev/null || true
			rm -f "$PID_FILE"
		fi
		echo "olcrtcwrt ($SECTION) stopped"
	;;
	restart)
		$0 stop "$2"
		sleep 1
		$0 start "$2"
	;;
	status)
		[ -n "$2" ] && SECTION="$2"
		local PID_FILE
		PID_FILE=$(pid_file)
		if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
			echo "running"
		else
			echo "stopped"
		fi
	;;
	logs)
		local lines="${2:-50}"
		local LOG_FILE
		LOG_FILE=$(log_file)
		tail -n "$lines" "$LOG_FILE" 2>/dev/null || echo "No logs"
	;;
	*)
		echo "Usage: $0 {start|stop|restart|status|logs}"
		exit 1
	;;
esac
