#!/bin/sh

. /lib/functions.sh

CONFIG="olcrtcwrt"
SECTION="${2:-wdtt_main}"
BIN_DIR="/etc/olcrtcwrt/bin"
PID_DIR="/var/run/olcrtcwrt"
LOG_DIR="/var/log/olcrtcwrt"

mkdir -p "$PID_DIR" "$LOG_DIR"

BIN_FILE=""

resolve_binary() {
	local arch=$(uname -m)
	case "$arch" in
		aarch64) [ -x "$BIN_DIR/client-arm64" ] && BIN_FILE="$BIN_DIR/client-arm64" ;;
		x86_64)  [ -x "$BIN_DIR/server-amd64" ] && BIN_FILE="$BIN_DIR/server-amd64" ;;
	esac
	[ -z "$BIN_FILE" ] && BIN_FILE="$BIN_DIR/wdtt-server"
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
	echo "$PID_DIR/wdtt_${SECTION}.pid"
}

log_file() {
	echo "$LOG_DIR/wdtt_${SECTION}.log"
}

build_args() {
	local vps_host vps_port vk_hash password threads local_udp_port auto_captcha server_ref
	config_get server_ref "$SECTION" server ""
	[ -n "$server_ref" ] || server_ref="$SECTION"
	config_get vps_host "$server_ref" vps_host
	config_get vps_port "$server_ref" vps_port "56000"
	config_get vk_hash "$server_ref" vk_hash
	config_get password "$server_ref" password
	config_get threads "$SECTION" threads "4"
	config_get local_udp_port "$SECTION" local_udp_port "9000"
	config_get_bool auto_captcha "$SECTION" auto_captcha 1

	if [ -z "$vps_host" ] || [ -z "$vk_hash" ] || [ -z "$password" ]; then
		echo "Missing vps_host, vk_hash or password" >&2
		exit 1
	fi

	ARGS="--server=$vps_host:$vps_port --hash=$vk_hash --password=$password --threads=$threads --local-port=$local_udp_port --auto-captcha=$auto_captcha"
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
		[ "$(is_enabled)" -eq 1 ] || { echo "wdtt not enabled"; exit 0; }
		resolve_binary
		[ -x "$BIN_FILE" ] || { echo "wdtt binary not found ($BIN_FILE), run download first"; exit 1; }

		local PID_FILE LOG_FILE
		PID_FILE=$(pid_file)
		LOG_FILE=$(log_file)

		if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
			echo "wdtt ($SECTION) already running"
			exit 0
		fi

		build_args
		if [ -n "$foreground" ]; then
			exec "$BIN_FILE" $ARGS
		else
			nohup "$BIN_FILE" $ARGS > "$LOG_FILE" 2>&1 &
			echo $! > "$PID_FILE"
			echo "wdtt ($SECTION) started"
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
		echo "wdtt ($SECTION) stopped"
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
