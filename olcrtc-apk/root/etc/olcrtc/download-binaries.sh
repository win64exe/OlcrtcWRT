#!/bin/sh

set -e

BASE_DIR="/etc/olcrtc"
BIN_DIR="$BASE_DIR/bin"
OLCRTC_REPO="openlibrecommunity/olcrtc"
WDTT_REPO="samosvalishe/free-turn-proxy"

# Update these hashes when releasing a new package version.
# Leave empty to skip verification (not recommended).
OLCRTC_SHA256=""
WDTT_SHA256=""

ARCH=$(uname -m)
case "$ARCH" in
	x86_64) GOARCH="amd64" ;;
	aarch64) GOARCH="arm64" ;;
	armv7l|armhf) GOARCH="arm" ;;
	mips) GOARCH="mips" ;;
	mipsel) GOARCH="mipsle" ;;
	*) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

# free-turn-proxy (samosvalishe/free-turn-proxy) names its assets as
# client-linux-<arch>. The downloaded client replaces the old wdtt-server
# binary, so we save it as wdtt-server to keep the rest of the scripts and
# procd service files unchanged.
case "$ARCH" in
	x86_64) GOARCH_FTP="amd64" ;;
	aarch64) GOARCH_FTP="arm64" ;;
	armv7l|armhf) GOARCH_FTP="armv7" ;;
	mips) GOARCH_FTP="mips-softfloat" ;;
	mipsel) GOARCH_FTP="mipsle-softfloat" ;;
	*) GOARCH_FTP="" ;;
esac

mkdir -p "$BIN_DIR"

verify_sha256() {
	local file="$1"
	local expected="$2"
	[ -z "$expected" ] && return 0
	local actual=$(sha256sum "$file" | awk '{print $1}')
	if [ "$actual" != "$expected" ]; then
		echo "SHA256 mismatch for $file" >&2
		echo "Expected: $expected" >&2
		echo "Actual:   $actual" >&2
		return 1
	fi
}

download_olcrtc() {
	local tag="latest"
	local url="https://github.com/$OLCRTC_REPO/releases/$tag/download/olcrtc-linux-$GOARCH"
	local dest="$BIN_DIR/olcrtc"
	echo "Downloading olcrtc ($GOARCH)..."
	curl -fsSL --retry 3 -o "$dest" "$url"
	verify_sha256 "$dest" "$OLCRTC_SHA256"
	chmod +x "$dest"
	$dest -version 2>/dev/null || true
}

download_wdtt() {
	local tag="latest"
	local dest="$BIN_DIR/wdtt-server"
	if [ -z "$GOARCH_FTP" ]; then
		echo "Unsupported architecture for free-turn-proxy: $ARCH" >&2
		return 1
	fi
	local url="https://github.com/$WDTT_REPO/releases/$tag/download/client-linux-$GOARCH_FTP"
	echo "Downloading WDTT client ($GOARCH_FTP)..."
	curl -fsSL --retry 3 -o "$dest" "$url"
	verify_sha256 "$dest" "$WDTT_SHA256"
	chmod +x "$dest"
}

case "$1" in
	olcrtc) download_olcrtc ;;
	wdtt) download_wdtt ;;
	*)
		download_olcrtc
		download_wdtt
	;;
esac

echo "Done. Binaries installed to $BIN_DIR"
