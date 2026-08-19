#!/bin/sh

. /lib/functions.sh

CONFIG="olcrtcwrt"
SECTION="${2:-olcrtc_server}"
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
	echo "$PID_DIR/olcrtcwrt_srv_${SECTION}.pid"
}

log_file() {
	echo "$LOG_DIR/olcrtcwrt_srv_${SECTION}.log"
}

build_args() {
	local room shared_key provider transport listen data_dir auth_url extra_args
	config_get room "$SECTION" room
	config_get shared_key "$SECTION" shared_key
	config_get provider "$SECTION" provider "jitsi"
	config_get transport "$SECTION" transport "datachannel"
	config_get listen "$SECTION" listen
	config_get data_dir "$SECTION" data_dir
	config_get auth_url "$SECTION" auth_url
	config_get extra_args "$SECTION" extra_args ""

	if [ -z "$room" ] || [ -z "$shared_key" ]; then
		echo "Missing room or shared_key" >&2
		exit 1
	fi

	ARGS="srv --room=$room --key=$shared_key --provider=$provider --transport=$transport"
	[ -n "$listen" ] && ARGS="$ARGS --listen=$listen"
	[ -n "$data_dir" ] && { mkdir -p "$data_dir"; ARGS="$ARGS --data=$data_dir"; }
	[ -n "$auth_url" ] && ARGS="$ARGS --auth-url=$auth_url"
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
		[ "$(is_enabled)" -eq 1 ] || { echo "olcrtcwrt server not enabled"; exit 0; }
		resolve_binary
		[ -x "$BIN_FILE" ] || { echo "olcrtcwrt binary not found ($BIN_FILE), run download first"; exit 1; }

		local PID_FILE LOG_FILE
		PID_FILE=$(pid_file)
		LOG_FILE=$(log_file)

		if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
			echo "olcrtcwrt server ($SECTION) already running"
			exit 0
		fi

		build_args
		if [ -n "$foreground" ]; then
			exec "$BIN_FILE" $ARGS
		else
			nohup "$BIN_FILE" $ARGS > "$LOG_FILE" 2>&1 &
			echo $! > "$PID_FILE"
			echo "olcrtcwrt server ($SECTION) started"
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
		echo "olcrtcwrt server ($SECTION) stopped"
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
