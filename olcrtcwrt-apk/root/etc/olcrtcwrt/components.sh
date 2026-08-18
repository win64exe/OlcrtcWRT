#!/bin/sh
# Download runtime components on the router. The LuCI APK contains no binaries.

set -eu

TMP_DIR="/tmp/olcrtcwrt-components.$$"
BIN_DIR="/etc/olcrtcwrt/bin"
SING_BOX_BIN="/usr/bin/sing-box"
OLCRTC_REPO="win64exe/OlcrtcWRT"
WDTT_REPO="samosvalishe/free-turn-proxy"
SING_BOX_OFFICIAL="SagerNet/sing-box"
SING_BOX_EXTENDED="shtorm-7/sing-box-extended"

cleanup() {
	rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM

command -v curl >/dev/null 2>&1 || {
	echo "curl is required" >&2
	exit 1
}
command -v jq >/dev/null 2>&1 || {
	echo "jq is required" >&2
	exit 1
}

mkdir -p "$TMP_DIR" "$BIN_DIR" "$(dirname "$SING_BOX_BIN")"

arch_name() {
	case "$(uname -m)" in
		x86_64|amd64) printf 'amd64' ;;
		aarch64|arm64) printf 'arm64' ;;
		armv7l|armv7) printf 'armv7' ;;
		armv6l) printf 'armv6' ;;
		mips) printf 'mips' ;;
		mipsel|mipsle) printf 'mipsle' ;;
		riscv64) printf 'riscv64' ;;
		*) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
	esac
}

libc_name() {
	if [ -f /etc/openwrt_release ]; then
		printf 'musl'
	elif ldd --version 2>&1 | grep -qi musl; then
		printf 'musl'
	else
		printf 'glibc'
	fi
}

api_latest() {
	curl -fsSL --connect-timeout 10 --max-time 60 \
		-H 'Accept: application/vnd.github+json' \
		"https://api.github.com/repos/$1/releases/latest"
}

latest_tag() {
	api_latest "$1" | jq -r '.tag_name // empty'
}

asset_url() {
	_repo="$1"
	_pattern="$2"
	api_latest "$_repo" | jq -r --arg pattern "$_pattern" \
		'.assets[] | select(.name | test($pattern)) | .browser_download_url' | head -n1
}

install_file() {
	_url="$1"
	_dest="$2"
	_tmp="${_dest}.download.$$"
	printf 'Загрузка %s\n' "$_url"
	curl -fL --retry 3 --connect-timeout 10 --max-time 300 -o "$_tmp" "$_url"
	[ -s "$_tmp" ] || { rm -f "$_tmp"; echo "Empty download" >&2; exit 1; }
	chmod 0755 "$_tmp"
	mv -f "$_tmp" "$_dest"
}

install_olcrtc() {
	_arch="$(arch_name)"
	_url="$(asset_url "$OLCRTC_REPO" "^(olcrtc|olcrtcwrt)-linux-${_arch}(\.gz)?$")"
	[ -n "$_url" ] || {
		echo "В релизе $OLCRTC_REPO нет бинарника olcrtc для архитектуры $_arch" >&2
		echo "Добавьте asset с именем olcrtc-linux-${_arch} и повторите установку." >&2
		exit 1
	}
	_dest="$BIN_DIR/olcrtcwrt"
	if printf '%s' "$_url" | grep -q '\.gz$'; then
		_tmp="${TMP_DIR}/olcrtc.gz"
		curl -fL --retry 3 --connect-timeout 10 --max-time 300 -o "$_tmp" "$_url"
		gzip -dc "$_tmp" > "${_dest}.download.$$"
		chmod 0755 "${_dest}.download.$$"
		mv -f "${_dest}.download.$$" "$_dest"
	else
		install_file "$_url" "$_dest"
	fi
	"$_dest" version 2>/dev/null | head -n1 || true
}

install_wdtt() {
	_arch="$(arch_name)"
	_url="$(asset_url "$WDTT_REPO" "^client-linux-${_arch}$")"
	[ -n "$_url" ] || {
		echo "В релизе $WDTT_REPO нет клиента WDTT для архитектуры $_arch" >&2
		exit 1
	}
	install_file "$_url" "$BIN_DIR/wdtt-server"
}

install_sing_box() {
	_variant="${1:-official}"
	_arch="$(arch_name)"
	_libc="$(libc_name)"
	case "$_variant" in
		official) _repo="$SING_BOX_OFFICIAL" ;;
		extended) _repo="$SING_BOX_EXTENDED" ;;
		*) echo "Unknown sing-box variant: $_variant" >&2; exit 1 ;;
	esac

	_pattern="^sing-box-[^/]+-linux-${_arch}-${_libc}\.tar\.gz$"
	_url="$(asset_url "$_repo" "$_pattern")"
	if [ -z "$_url" ]; then
		_pattern="^sing-box-[^/]+-linux-${_arch}\.tar\.gz$"
		_url="$(asset_url "$_repo" "$_pattern")"
	fi
	[ -n "$_url" ] || {
		echo "В релизе $_repo нет sing-box для ${_arch}/${_libc}" >&2
		exit 1
	}

	_archive="${TMP_DIR}/sing-box.tar.gz"
	curl -fL --retry 3 --connect-timeout 10 --max-time 300 -o "$_archive" "$_url"
	tar -xzf "$_archive" -C "$TMP_DIR"
	_found="$(find "$TMP_DIR" -type f -name sing-box | head -n1)"
	[ -n "$_found" ] || { echo "sing-box binary is missing in archive" >&2; exit 1; }
	chmod 0755 "$_found"
	mv -f "$_found" "$SING_BOX_BIN"
	mkdir -p /etc/sing-box
	"$SING_BOX_BIN" version 2>/dev/null | head -n1 || true
}

case "${1:-}" in
	olcrtc) install_olcrtc ;;
	wdtt) install_wdtt ;;
	sing-box) install_sing_box "${2:-official}" ;;
	all)
		install_olcrtc
		install_wdtt
		install_sing_box "${2:-official}"
		;;
	*)
		echo "Usage: $0 {olcrtc|wdtt|sing-box|all} [official|extended]" >&2
		exit 2
		;;
esac

printf 'Готово: компонент установлен.\n'
