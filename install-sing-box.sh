#!/bin/sh
# shellcheck shell=sh
# Interactive installer for sing-box and sing-box-extended
# Supports OpenWrt and generic Linux

set -e

REPO_OFFICIAL="SagerNet/sing-box"
REPO_EXTENDED="shtorm-7/sing-box-extended"

if [ -f /etc/openwrt_release ]; then
    SYSTEM="openwrt"
    INSTALL_DIR="${SING_BOX_INSTALL_DIR:-/usr/bin}"
    CONFIG_DIR="${SING_BOX_CONFIG_DIR:-/etc/sing-box}"
else
    SYSTEM="linux"
    INSTALL_DIR="${SING_BOX_INSTALL_DIR:-/usr/local/bin}"
    CONFIG_DIR="${SING_BOX_CONFIG_DIR:-/etc/sing-box}"
fi

BIN_PATH="${INSTALL_DIR}/sing-box"
TMP_DIR=""
FETCHER=""

msg()  { printf '\033[32;1m%s\033[0m\n' "$1"; }
info() { printf '\033[36;1m%s\033[0m\n' "$1"; }
warn() { printf '\033[33;1m%s\033[0m\n' "$1"; }
err()  { printf '\033[31;1m%s\033[0m\n' "$1" >&2; }

cleanup() {
    [ -n "$TMP_DIR" ] && rm -rf "$TMP_DIR"
}
trap cleanup EXIT

check_root() {
    if [ "$(id -u)" -ne 0 ]; then
        err "This script must be run as root."
        exit 1
    fi
}

detect_fetcher() {
    if command -v curl >/dev/null 2>&1; then
        FETCHER="curl"
    elif command -v wget >/dev/null 2>&1; then
        FETCHER="wget"
    else
        err "curl or wget is required."
        exit 1
    fi
}

fetch() {
    case "$FETCHER" in
        curl)
            curl -fsSL --connect-timeout 10 --max-time 90 "$1"
            ;;
        wget)
            wget -T 30 -qO- "$1"
            ;;
        *)
            err "Unknown fetcher: $FETCHER"
            return 1
            ;;
    esac
}

detect_arch() {
    _mach="$(uname -m)"
    case "$_mach" in
        x86_64|amd64)        printf 'amd64' ;;
        aarch64|arm64)       printf 'arm64' ;;
        armv7l|armv7)        printf 'armv7' ;;
        armv6l)              printf 'armv6' ;;
        armv5*|arm*)         printf 'armv5' ;;
        mips)                printf 'mips' ;;
        mipsel|mipsle)       printf 'mipsle' ;;
        mips64)              printf 'mips64' ;;
        mips64el|mips64le)   printf 'mips64le' ;;
        loong64|loongarch64) printf 'loong64' ;;
        riscv64)             printf 'riscv64' ;;
        ppc64le)             printf 'ppc64le' ;;
        s390x)               printf 's390x' ;;
        *)                   printf '%s' "$_mach" ;;
    esac
}

detect_libc() {
    # OpenWrt is musl-based
    if [ "$SYSTEM" = "openwrt" ]; then
        printf 'musl'
        return
    fi

    if ldd --version 2>&1 | grep -qi musl; then
        printf 'musl'
    else
        printf 'glibc'
    fi
}

get_latest_tag() {
    fetch "https://api.github.com/repos/$1/releases/latest" | \
        sed -n '/"tag_name":/p' | head -n1 | sed 's/.*"tag_name": *"//;s/".*//'
}

build_url() {
    _repo="$1"
    _tag="$2"
    _arch="$3"
    _libc="$4"
    _version="${_tag#v}"

    _name="sing-box-${_version}-linux-${_arch}"

    case "$_libc" in
        musl)  _name="${_name}-musl" ;;
        glibc) _name="${_name}-glibc" ;;
    esac

    printf 'https://github.com/%s/releases/download/%s/%s.tar.gz' "$1" "$_tag" "$_name"
}

download_and_verify() {
    _url="$1"
    _file="$2"
    if ! fetch "$_url" > "$_file"; then
        return 1
    fi
    if [ ! -s "$_file" ]; then
        return 1
    fi
    # Basic sanity check: tar archive magic
    if ! tar -tzf "$_file" >/dev/null 2>&1; then
        return 1
    fi
    return 0
}

install_binary() {
    _repo="$1"
    _tag="$2"
    _arch="$3"
    _libc="$4"

    info "Selected variant: ${_repo}"
    info "Release tag:    ${_tag}"
    info "Architecture:   ${_arch}"
    info "C library:      ${_libc}"

    TMP_DIR="$(mktemp -d /tmp/sing-box-installer.XXXXXX 2>/dev/null || echo "/tmp/sing-box-installer.$$")"
    mkdir -p "$TMP_DIR"

    _url="$(build_url "$1" "$_tag" "$_arch" "$_libc")"
    _archive="${TMP_DIR}/sing-box.tar.gz"

    info "Downloading archive..."
    if ! download_and_verify "$_url" "$_archive"; then
        warn "Could not download ${_libc} build. Falling back to generic build."
        _url="$(build_url "$1" "$_tag" "$_arch" "")"
        if ! download_and_verify "$_url" "$_archive"; then
            err "Failed to download sing-box. Please check your network or architecture."
            exit 1
        fi
    fi

    _extract_dir="${TMP_DIR}/extracted"
    mkdir -p "$_extract_dir"
    tar -xzf "$_archive" -C "$_extract_dir"

    _found=""
    _found="$(find "$_extract_dir" -type f -name sing-box | head -n1)"
    if [ -z "$_found" ]; then
        err "sing-box binary not found in the downloaded archive."
        exit 1
    fi

    if [ -f "$BIN_PATH" ]; then
        mv "$BIN_PATH" "${BIN_PATH}.bak.$(date +%Y%m%d%H%M%S)"
        info "Existing binary backed up."
    fi

    mkdir -p "$INSTALL_DIR"
    cp "$_found" "$BIN_PATH"
    chmod +x "$BIN_PATH"

    mkdir -p "$CONFIG_DIR"

    msg "sing-box installed to ${BIN_PATH}"
    info "Version: $(${BIN_PATH} version)"
}

create_openwrt_init() {
    _init="/etc/init.d/sing-box"
    if [ -f "$_init" ]; then
        info "OpenWrt init script already exists, skipping."
        return
    fi
    info "Creating OpenWrt procd init script..."
    cat > "$_init" <<'EOF'
#!/bin/sh /etc/rc.common

START=99
USE_PROCD=1

PROG=/usr/bin/sing-box
CONF=/etc/sing-box/config.json

start_service() {
    [ -f "$CONF" ] || return 0
    procd_open_instance
    procd_set_param command "$PROG" run -c "$CONF"
    procd_set_param respawn
    procd_set_param stderr 1
    procd_set_param stdout 1
    procd_close_instance
}
EOF
    chmod +x "$_init"
    "$_init" enable 2>/dev/null || true
    msg "OpenWrt init script created and enabled."
}

create_systemd_service() {
    _svc="/etc/systemd/system/sing-box.service"
    if [ -f "$_svc" ]; then
        info "systemd service already exists, skipping."
        return
    fi
    info "Creating systemd service..."
    cat > "$_svc" <<'EOF'
[Unit]
Description=sing-box service
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/sing-box run -c /etc/sing-box/config.json
Restart=on-failure
RestartSec=10s

[Install]
WantedBy=multi-user.target
EOF
    systemctl daemon-reload 2>/dev/null || true
    systemctl enable sing-box.service 2>/dev/null || true
    msg "systemd service created and enabled."
}

install_variant() {
    _choice="$1"
    check_root
    detect_fetcher

    case "$_choice" in
        official) _repo="$REPO_OFFICIAL" ;;
        extended) _repo="$REPO_EXTENDED" ;;
        *)        err "Unknown variant: $_choice"; exit 1 ;;
    esac

    _arch="$(detect_arch)"
    if [ -z "$_arch" ]; then
        err "Unable to detect system architecture."
        exit 1
    fi

    _libc="$(detect_libc)"

    info "Fetching latest release..."
    _tag="$(get_latest_tag "$_repo")"
    if [ -z "$_tag" ]; then
        err "Could not determine latest release tag."
        exit 1
    fi

    install_binary "$_repo" "$_tag" "$_arch" "$_libc"

    case "$SYSTEM" in
        openwrt) create_openwrt_init ;;
        *)       create_systemd_service ;;
    esac

    if [ ! -f "${CONFIG_DIR}/config.json" ]; then
        info "Create your configuration at ${CONFIG_DIR}/config.json"
    fi
}

uninstall() {
    check_root
    if [ -f "$BIN_PATH" ]; then
        rm -f "$BIN_PATH"
        msg "Removed ${BIN_PATH}"
    else
        warn "No sing-box binary found at ${BIN_PATH}."
    fi

    if [ "$SYSTEM" = "openwrt" ] && [ -f /etc/init.d/sing-box ]; then
        /etc/init.d/sing-box disable 2>/dev/null || true
        rm -f /etc/init.d/sing-box
        msg "Removed OpenWrt init script."
    fi

    if [ "$SYSTEM" = "linux" ] && [ -f /etc/systemd/system/sing-box.service ]; then
        systemctl disable sing-box.service 2>/dev/null || true
        rm -f /etc/systemd/system/sing-box.service
        systemctl daemon-reload 2>/dev/null || true
        msg "Removed systemd service."
    fi

    warn "Configuration directory left intact: ${CONFIG_DIR}"
}

print_menu() {
    printf '\n'
    info "========================================"
    info "   sing-box interactive installer"
    info "========================================"
    printf '\n'
    echo "  1) Install / Update official sing-box (${REPO_OFFICIAL})"
    echo "  2) Install / Update sing-box-extended (${REPO_EXTENDED})"
    echo "  3) Uninstall sing-box"
    echo "  4) Exit"
    printf '\n'
}

usage() {
    cat <<EOF
Usage: $0 [command]

Commands:
  official   Install latest official sing-box
  extended   Install latest sing-box-extended
  uninstall  Remove sing-box binary and service
  menu       Show interactive menu (default)

Environment:
  SING_BOX_INSTALL_DIR   Override binary install directory
  SING_BOX_CONFIG_DIR    Override configuration directory
EOF
}

main() {
    _cmd="${1:-}"

    case "$_cmd" in
        official|extended)
            install_variant "$_cmd"
            return
            ;;
        uninstall)
            uninstall
            return
            ;;
        -h|--help|help)
            usage
            return
            ;;
    esac

    while true; do
        print_menu
        printf 'Choose an option [1-4]: '
        read -r _choice
        case "$_choice" in
            1) install_variant official ;;
            2) install_variant extended ;;
            3) uninstall ;;
            4) info "Bye!"; break ;;
            *) warn "Invalid option, please try again." ;;
        esac
        printf '\nPress Enter to continue...'
        read -r _
    done
}

main "$@"
