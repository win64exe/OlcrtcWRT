# luci-app-olcrtc

LuCI application for managing **olcrtc** (TCP-over-WebRTC tunnel) and **WDTT**
(WireGuard-over-TURN-Tunnel) clients on OpenWRT 25+.

## Features

- 4 tabs in LuCI:
  - **Dashboard** — real-time status, per-section ping and traffic counters
  - **Sections** — manage multiple olcrtc and WDTT sections
  - **Settings** — global options, autostart, proxy and binary download
  - **Diagnostics** — service status, recent logs, nftables ruleset validation
- Modern **JavaScript** LuCI views (no Lua controller)
- **ucode** `rpcd` backend (`/usr/share/rpcd/ucode/olcrtc.uc`)
- Menu defined in JSON (`/usr/share/luci/menu.d/luci-app-olcrtc.json`)
- Client mode for both protocols
- Automatic binary download for the target architecture
- Manual binary upload (olcrtc and WDTT/proxy-turn-vk-android) via LuCI
- `procd`-based init script with autostart support
- `rpcd`/`ubus` backend for the modern LuCI JS frontend

## Requirements

- OpenWRT 25+ (APK package manager)
- LuCI base
- `ucode`, `rpcd-mod-ucode`, `ucode-mod-fs`, `ucode-mod-uci`
- `curl`, `jq`, `iputils-ping`, `wireguard-tools`

## Package layout

Following the upstream `luci-app-example` pattern:

```
olcrtc-apk/
├── Makefile
├── root/
│   ├── etc/config/olcrtc
│   ├── etc/init.d/olcrtc
│   ├── etc/olcrtc/*.sh
│   ├── etc/uci-defaults/99_olcrtc
│   └── usr/share/luci/menu.d/luci-app-olcrtc.json
│   └── usr/share/rpcd/acl.d/luci-app-olcrtc.json
│   └── usr/share/rpcd/ucode/olcrtc.uc
└── htdocs/luci-static/resources/view/olcrtc/
    ├── sections.js
    ├── settings.js
    ├── diagnostics.js
    └── dashboard.js
```

## Build

Add this package to your OpenWRT build tree, e.g. under `package/luci-app-olcrtc`,
then build:

```bash
make menuconfig
# Select LuCI -> 3. Applications -> luci-app-olcrtc
make package/luci-app-olcrtc/compile V=s
```

The resulting `.apk` will be in `bin/packages/`.

## Install on router

```bash
opkg install luci-app-olcrtc_1.0.0-2_all.apk
```

After installation, open LuCI at `Services -> olcrtc / WDTT`.

## First run

1. Go to **Settings** and click **Download binaries**, or upload olcrtc / WDTT binaries manually in the **Manual binary install** section.
2. Configure at least one section in **Sections**.
3. Enable the desired section and global autostart in **Settings**.
4. Use the **Dashboard** to start/stop services and monitor ping/traffic.

## Configuration files

- `/etc/config/olcrtc` — UCI configuration
- `/etc/olcrtc/bin/` — downloaded binaries
- `/var/log/olcrtc/` — service logs
- `/var/run/olcrtc/` — PID files
- `/usr/share/rpcd/ucode/olcrtc.uc` — ucode RPC backend

## Known limitations

- The exact command-line flags of the upstream `olcrtc` and WDTT binaries
  must be verified against the downloaded release assets. The scripts use
  sensible defaults, but upstream changes may require adjustments.
- The WDTT binary name (`wdtt-server`) and release asset URL are guesses.
  Verify the correct client binary name in the WDTT repository.
- SHA256 checksums in `download-binaries.sh` are empty placeholders. Fill them
  in when pinning a specific upstream release.

## nftables routing

The package creates a dedicated `inet olcrtc` table with `prerouting`,
`output` and `forward` chains. TCP traffic matching the configured proxy
subnets is redirected to the local SOCKS port. WDTT traffic is counted on the
WireGuard interface. Local/private ranges can be bypassed automatically.

Configure routing in LuCI under **Settings -> Routing**:
- **Routing mode**: disabled / global proxy / proxy list
- **Bypass local/private networks**: skip RFC1918 and local ranges
- **Proxy IPv4/IPv6 subnets/IPs**: destinations to redirect
- **Bypass IPv4/IPv6 subnets/IPs**: destinations excluded from redirection

**Note:** Redirecting raw TCP to a SOCKS5 port via `nftables` does not
automatically make it SOCKS5 traffic. You need an additional transparent
proxy/SOCKSifier (e.g. `tun2socks`, `redsocks`) in front of `olcrtc`, or use
olcrtc directly as a SOCKS5 proxy in client applications.

The package depends on `nftables` and `kmod-nft-nat` for the `redirect`
NAT target.

## License

WTFPL
