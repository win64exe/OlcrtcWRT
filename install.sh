#!/bin/sh
# shellcheck shell=sh
# Interactive installer for OlcrtcWRT and sing-box
# Supports OpenWrt (apk/opkg) and generic Linux

set -e

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
PROJECT_REPO="win64exe/OlcrtcWRT"
APK_NAME_PATTERN="luci-app-olcrtcwrt_.*_all\.apk"
APK_FALLBACK_URL="https://github.com/$PROJECT_REPO/releases/download/v1.0.0/luci-app-olcrtcwrt_1.0.0-2_all.apk"
SING_BOX_OFFICIAL="SagerNet/sing-box"
SING_BOX_EXTENDED="shtorm-7/sing-box-extended"

# -----------------------------------------------------------------------------
# Colors / logging
# -----------------------------------------------------------------------------
msg()  { printf '\033[32;1m%s\033[0m\n' "$1"; }
info() { printf '\033[36;1m%s\033[0m\n' "$1"; }
warn() { printf '\033[33;1m%s\033[0m\n' "$1"; }
err()  { printf '\033[31;1m%s\033[0m\n' "$1" >&2; }

# -----------------------------------------------------------------------------
# Environment detection
# -----------------------------------------------------------------------------
if [ -f /etc/openwrt_release ]; then
    SYSTEM="openwrt"
    SING_BOX_DIR="${SING_BOX_INSTALL_DIR:-/usr/bin}"
    SING_BOX_CONFIG_DIR="${SING_BOX_CONFIG_DIR:-/etc/sing-box}"
else
    SYSTEM="linux"
    SING_BOX_DIR="${SING_BOX_INSTALL_DIR:-/usr/local/bin}"
    SING_BOX_CONFIG_DIR="${SING_BOX_CONFIG_DIR:-/etc/sing-box}"
fi
SING_BOX_BIN="${SING_BOX_DIR}/sing-box"

TMP_DIR=""
FETCHER=""

setup_tmp_dir() {
    if [ -z "$TMP_DIR" ]; then
        TMP_DIR="$(mktemp -d /tmp/olcrtcwrt.XXXXXX 2>/dev/null || echo "/tmp/olcrtcwrt.$$")"
        mkdir -p "$TMP_DIR"
    fi
}

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
            curl -fsSL --connect-timeout 10 --max-time 120 "$1"
            ;;
        wget)
            wget -T 120 -qO- "$1"
            ;;
        *)
            err "Unknown fetcher: $FETCHER"
            return 1
            ;;
    esac
}

fetch_to_file() {
    _url="$1"
    _file="$2"
    case "$FETCHER" in
        curl)
            curl -fsSL --connect-timeout 10 --max-time 120 -o "$_file" "$_url"
            ;;
        wget)
            wget -T 120 -qO "$_file" "$_url"
            ;;
        *)
            return 1
            ;;
    esac
}

detect_pkg_mgr() {
    if command -v apk >/dev/null 2>&1; then
        printf 'apk'
    elif command -v opkg >/dev/null 2>&1; then
        printf 'opkg'
    else
        printf ''
    fi
}

# -----------------------------------------------------------------------------
# sing-box helpers
# -----------------------------------------------------------------------------
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

build_sing_box_url() {
    _repo="$1"
    _tag="$2"
    _arch="$3"
    _libc="$4"
    _version="${_tag#v}"
    _name="sing-box-${_version}-linux-${_arch}"

    case "$_libc" in
        musl) _name="${_name}-musl" ;;
    esac

    printf 'https://github.com/%s/releases/download/%s/%s.tar.gz' "$1" "$_tag" "$_name"
}

download_and_verify() {
    _url="$1"
    _file="$2"
    if ! fetch_to_file "$_url" "$_file"; then
        return 1
    fi
    if [ ! -s "$_file" ]; then
        return 1
    fi
    if ! tar -tzf "$_file" >/dev/null 2>&1; then
        return 1
    fi
    return 0
}

install_sing_box_binary() {
    _repo="$1"
    _tag="$2"
    _arch="$3"
    _libc="$4"

    info "sing-box variant: ${_repo}"
    info "Release tag:      ${_tag}"
    info "Architecture:     ${_arch}"
    info "C library:        ${_libc}"

    setup_tmp_dir

    _url="$(build_sing_box_url "$1" "$_tag" "$_arch" "$_libc")"
    _archive="${TMP_DIR}/sing-box.tar.gz"

    info "Downloading sing-box archive..."
    if ! download_and_verify "$_url" "$_archive"; then
        warn "Could not download ${_libc} build. Falling back to generic (glibc) build."
        _url="$(build_sing_box_url "$1" "$_tag" "$_arch" "")"
        if ! download_and_verify "$_url" "$_archive"; then
            err "Failed to download sing-box. Please check your network or architecture."
            exit 1
        fi
    fi

    _extract_dir="${TMP_DIR}/extracted"
    mkdir -p "$_extract_dir"
    tar -xzf "$_archive" -C "$_extract_dir"

    _found="$(find "$_extract_dir" -type f -name sing-box | head -n1)"
    if [ -z "$_found" ]; then
        err "sing-box binary not found in the downloaded archive."
        exit 1
    fi

    if [ -f "$SING_BOX_BIN" ]; then
        mv "$SING_BOX_BIN" "${SING_BOX_BIN}.bak.$(date +%Y%m%d%H%M%S)"
        info "Existing sing-box binary backed up."
    fi

    mkdir -p "$SING_BOX_DIR"
    cp "$_found" "$SING_BOX_BIN"
    chmod +x "$SING_BOX_BIN"
    mkdir -p "$SING_BOX_CONFIG_DIR"

    msg "sing-box installed to ${SING_BOX_BIN}"
    info "Version: $(${SING_BOX_BIN} version)"
}

create_openwrt_sing_box_init() {
    _init="/etc/init.d/sing-box"
    if [ -f "$_init" ]; then
        info "OpenWrt init script already exists, skipping."
        return
    fi
    info "Creating OpenWrt procd init script for sing-box..."
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

create_systemd_sing_box_service() {
    _svc="/etc/systemd/system/sing-box.service"
    if [ -f "$_svc" ]; then
        info "systemd service already exists, skipping."
        return
    fi
    info "Creating systemd service for sing-box..."
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

install_sing_box() {
    _choice="$1"
    check_root
    detect_fetcher

    case "$_choice" in
        official) _repo="$SING_BOX_OFFICIAL" ;;
        extended) _repo="$SING_BOX_EXTENDED" ;;
        *)        err "Unknown sing-box variant: $_choice"; exit 1 ;;
    esac

    _arch="$(detect_arch)"
    if [ -z "$_arch" ]; then
        err "Unable to detect system architecture."
        exit 1
    fi

    _libc="$(detect_libc)"

    info "Fetching latest sing-box release..."
    _tag="$(get_latest_tag "$_repo")"
    if [ -z "$_tag" ]; then
        err "Could not determine latest sing-box release tag."
        exit 1
    fi

    install_sing_box_binary "$_repo" "$_tag" "$_arch" "$_libc"

    case "$SYSTEM" in
        openwrt) create_openwrt_sing_box_init ;;
        *)       create_systemd_sing_box_service ;;
    esac

    if [ ! -f "${SING_BOX_CONFIG_DIR}/config.json" ]; then
        info "Create your sing-box configuration at ${SING_BOX_CONFIG_DIR}/config.json"
    fi
}

uninstall_sing_box() {
    check_root
    if [ -f "$SING_BOX_BIN" ]; then
        rm -f "$SING_BOX_BIN"
        msg "Removed ${SING_BOX_BIN}"
    else
        warn "No sing-box binary found at ${SING_BOX_BIN}."
    fi

    if [ "$SYSTEM" = "openwrt" ] && [ -f /etc/init.d/sing-box ]; then
        /etc/init.d/sing-box disable 2>/dev/null || true
        rm -f /etc/init.d/sing-box
        msg "Removed OpenWrt sing-box init script."
    fi

    if [ "$SYSTEM" = "linux" ] && [ -f /etc/systemd/system/sing-box.service ]; then
        systemctl disable sing-box.service 2>/dev/null || true
        rm -f /etc/systemd/system/sing-box.service
        systemctl daemon-reload 2>/dev/null || true
        msg "Removed systemd sing-box service."
    fi

    warn "sing-box configuration left intact: ${SING_BOX_CONFIG_DIR}"
}

# -----------------------------------------------------------------------------
# OlcrtcWRT .apk helpers
# -----------------------------------------------------------------------------
get_apk_download_url() {
    _api="https://api.github.com/repos/$PROJECT_REPO/releases/latest"
    _url="$(fetch "$_api" | grep -o '"browser_download_url": *"[^"]*' | sed 's/.*"browser_download_url": *"//;s/"$//' | grep -E "$APK_NAME_PATTERN" | head -n1)"
    if [ -z "$_url" ]; then
        warn "Could not find .apk via GitHub API; using fallback URL."
        _url="$APK_FALLBACK_URL"
    fi
    printf '%s' "$_url"
}

install_apk_package() {
    check_root
    detect_fetcher

    _pkg_mgr="$(detect_pkg_mgr)"
    if [ -z "$_pkg_mgr" ]; then
        err "No package manager found (apk or opkg required)."
        exit 1
    fi

    info "Fetching latest OlcrtcWRT .apk URL..."
    _apk_url="$(get_apk_download_url)"
    if [ -z "$_apk_url" ]; then
        err "Could not find the OlcrtcWRT .apk download URL."
        err "Make sure a release exists at https://github.com/$PROJECT_REPO/releases"
        exit 1
    fi
    info "Found: $_apk_url"

    setup_tmp_dir
    _apk_file="${TMP_DIR}/luci-app-olcrtcwrt.apk"

    info "Downloading .apk..."
    if ! fetch_to_file "$_apk_url" "$_apk_file"; then
        err "Failed to download the .apk package."
        exit 1
    fi

    if [ "$_pkg_mgr" = "apk" ]; then
        info "Installing with apk..."
        apk add --allow-untrusted "$_apk_file"
    else
        info "Installing with opkg..."
        opkg install "$_apk_file"
    fi

    msg "OlcrtcWRT package installed."
}

# -----------------------------------------------------------------------------
# Main interactive flow
# -----------------------------------------------------------------------------
print_menu() {
    printf '\n'
    info "========================================"
    info "      OlcrtcWRT installer"
    info "========================================"
    printf '\n'
    echo "  1) Install / Update OlcrtcWRT + sing-box"
    echo "  2) Install / Update sing-box only"
    echo "  3) Uninstall sing-box"
    echo "  4) Exit"
    printf '\n'
}

usage() {
    cat <<EOF
Usage: $0 [command]

Commands:
  install    Install / Update OlcrtcWRT and sing-box
  sing-box   Install / Update sing-box only
  uninstall  Remove sing-box binary and service

Interactive menu is shown when no command is given.
EOF
}

prompt_sing_box_choice() {
    printf '\nChoose sing-box variant:\n'
    echo "  1) Official sing-box ($SING_BOX_OFFICIAL)"
    echo "  2) sing-box-extended ($SING_BOX_EXTENDED)"
    echo "  3) Skip sing-box"
    printf 'Choice [1-3]: '
    read -r _choice
    case "$_choice" in
        1) printf 'official' ;;
        2) printf 'extended' ;;
        3) printf 'skip' ;;
        *) warn "Invalid choice, skipping sing-box."; printf 'skip' ;;
    esac
}

run_install() {
    _sb="$(prompt_sing_box_choice)"

    if [ "$_sb" != "skip" ]; then
        install_sing_box "$_sb"
    else
        info "Skipping sing-box installation."
    fi

    install_apk_package
    info "Installation complete."
    info "Open LuCI and navigate to Services -> OlcrtcWRT to configure."
}

main() {
    _cmd="${1:-}"

    case "$_cmd" in
        install)
            run_install
            return
            ;;
        sing-box)
            print_menu
            _sb="$(prompt_sing_box_choice)"
            if [ "$_sb" != "skip" ]; then
                install_sing_box "$_sb"
            else
                info "Skipping sing-box installation."
            fi
            return
            ;;
        uninstall)
            uninstall_sing_box
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
            1) run_install ;;
            2)
                _sb="$(prompt_sing_box_choice)"
                if [ "$_sb" != "skip" ]; then
                    install_sing_box "$_sb"
                else
                    info "Skipping sing-box installation."
                fi
                ;;
            3) uninstall_sing_box ;;
            4) info "Bye!"; break ;;
            *) warn "Invalid option, please try again." ;;
        esac
        printf '\nPress Enter to continue...'
        read -r _
    done
}

main "$@"
