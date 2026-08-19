#!/bin/sh

. /lib/functions.sh

CONFIG="olcrtcwrt"
SECTION="${2:-wdtt_server}"
BIN_DIR="/etc/olcrtcwrt/bin"
PID_DIR="/var/run/olcrtcwrt"
LOG_DIR="/var/log/olcrtcwrt"

mkdir -p "$PID_DIR" "$LOG_DIR"

BIN_FILE=""

resolve_binary() {
	local arch=$(uname -m)
	case "$arch" in
		aarch64) [ -x "$BIN_DIR/server-arm64" ] && BIN_FILE="$BIN_DIR/server-arm64" ;;
		x86_64)  [ -x "$BIN_DIR/server-amd64" ] && BIN_FILE="$BIN_DIR/server-amd64" ;;
	esac
	[ -z "$BIN_FILE" ] && BIN_FILE="$BIN_DIR/wdtt-server-bin"
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
	echo "$PID_DIR/wdtt_srv_${SECTION}.pid"
}

log_file() {
	echo "$LOG_DIR/wdtt_srv_${SECTION}.log"
}

build_args() {
	local server_address listen connect mode obf_key obf_profile obf_timing clients_file extra_args
	config_get server_address "$SECTION" server_address
	config_get listen "$SECTION" listen "0.0.0.0:56000"
	config_get connect "$SECTION" connect
	config_get mode "$SECTION" mode "udp"
	config_get obf_key "$SECTION" obf_key
	config_get obf_profile "$SECTION" obf_profile "none"
	config_get obf_timing "$SECTION" obf_timing
	config_get clients_file "$SECTION" clients_file
	config_get extra_args "$SECTION" extra_args ""

	if [ -z "$server_address" ]; then
		echo "Missing server_address" >&2
		exit 1
	fi

	ARGS="$server_address -listen $listen"
	[ -n "$connect" ] && ARGS="$ARGS -connect $connect"
	[ -n "$mode" ] && ARGS="$ARGS -mode $mode"
	[ -n "$obf_key" ] && ARGS="$ARGS -obf-key $obf_key"
	[ -n "$obf_profile" ] && ARGS="$ARGS -obf-profile $obf_profile"
	[ -n "$obf_timing" ] && ARGS="$ARGS -obf-timing $obf_timing"
	[ -n "$clients_file" ] && ARGS="$ARGS -clients-file $clients_file"
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
		[ "$(is_enabled)" -eq 1 ] || { echo "wdtt server not enabled"; exit 0; }
		resolve_binary
		[ -x "$BIN_FILE" ] || { echo "wdtt server binary not found ($BIN_FILE), run download first"; exit 1; }

		local PID_FILE LOG_FILE
		PID_FILE=$(pid_file)
		LOG_FILE=$(log_file)

		if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
			echo "wdtt server ($SECTION) already running"
			exit 0
		fi

		build_args
		if [ -n "$foreground" ]; then
			exec "$BIN_FILE" $ARGS
		else
			nohup "$BIN_FILE" $ARGS > "$LOG_FILE" 2>&1 &
			echo $! > "$PID_FILE"
			echo "wdtt server ($SECTION) started"
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
		echo "wdtt server ($SECTION) stopped"
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
