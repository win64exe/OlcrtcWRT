# luci-app-olcrtcwrt

LuCI application for managing **olcrtcwrt** (TCP-over-WebRTC tunnel) and **WDTT**
(WireGuard-over-TURN-Tunnel) clients on OpenWRT 25+.

## Features

- Интерфейс LuCI в стиле forkop с отдельными вкладками:
  - **Панель** — сводка состояния узлов, ping и трафик
  - **Селекторы** — настройка нескольких узлов olcrtc и WDTT
  - **Настройки** — глобальные параметры, автозапуск и маршрутизация
  - **Диагностика** — статусы служб, логи и проверка nftables
  - **Мониторинг** — периодическое обновление состояния и счётчиков
  - **Компоненты** — проверка обновлений и установка olcrtc, WDTT и выбранного sing-box
- APK содержит только интерфейс LuCI и backend; бинарные файлы в него не входят и загружаются отдельно под архитектуру роутера
- Modern **JavaScript** LuCI views (no Lua controller)
- **ucode** `rpcd` backend (`/usr/share/rpcd/ucode/olcrtcwrt.uc`)
- Menu defined in JSON (`/usr/share/luci/menu.d/luci-app-olcrtcwrt.json`)
- Client mode for both protocols
- Установка компонентов из GitHub-релизов для архитектуры роутера
- Выбор между официальным и extended-вариантом sing-box
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
olcrtcwrt-apk/
├── Makefile
├── root/
│   ├── etc/config/olcrtcwrt
│   ├── etc/init.d/olcrtcwrt
│   ├── etc/olcrtcwrt/*.sh
│   ├── etc/uci-defaults/99_olcrtcwrt
│   └── usr/share/luci/menu.d/luci-app-olcrtcwrt.json
│   └── usr/share/rpcd/acl.d/luci-app-olcrtcwrt.json
│   └── usr/share/rpcd/ucode/olcrtcwrt.uc
└── htdocs/luci-static/resources/view/olcrtcwrt/
    ├── sections.js
    ├── settings.js
    ├── diagnostics.js
    ├── dashboard.js
    ├── monitoring.js
    └── components.js
```

## Build

Add this package to your OpenWRT build tree, e.g. under `package/luci-app-olcrtcwrt`,
then build:

```bash
make menuconfig
# Select LuCI -> 3. Applications -> luci-app-olcrtcwrt
make package/luci-app-olcrtcwrt/compile V=s
```

The resulting `.apk` will be in `bin/packages/`.

## Install on router

```bash
apk add --allow-untrusted luci-app-olcrtcwrt_1.0.0-7_all.apk
```

After installation, open LuCI at `Services -> Topkop`.

## Первый запуск

1. Откройте **Компоненты**, нажмите «Проверить обновления» и установите olcrtc, WDTT и нужный вариант sing-box.
2. В разделе **Селекторы** настройте хотя бы один узел и его параметры подключения.
3. Включите узел и глобальный автозапуск в разделе **Настройки**.
4. Используйте **Панель** или **Мониторинг** для контроля состояния, ping и трафика.

Для olcrtc используется отдельный asset GitHub-релиза `olcrtc-linux-<архитектура>`. Если asset для архитектуры отсутствует, вкладка «Компоненты» сообщит об этом явно; текущий релиз содержит asset для `arm64`, а для других архитектур нужны соответствующие assets.

## Configuration files

- `/etc/config/olcrtcwrt` — UCI configuration
- `/etc/olcrtcwrt/bin/` — загруженные компоненты (olcrtc, WDTT)
- `/usr/bin/sing-box` — выбранный компонент sing-box
- `/var/log/olcrtcwrt/` — service logs
- `/var/run/olcrtcwrt/` — PID files
- `/usr/share/rpcd/ucode/olcrtcwrt.uc` — ucode RPC backend

## Known limitations

- The exact command-line flags of the upstream `olcrtcwrt` and WDTT binaries
  must be verified against the downloaded release assets. The scripts use
  sensible defaults, but upstream changes may require adjustments.
- The WDTT binary name (`wdtt-server`) and release asset URL are guesses.
  Verify the correct client binary name in the WDTT repository.
- SHA256 checksums in `download-binaries.sh` are empty placeholders. Fill them
  in when pinning a specific upstream release.

## nftables routing

The package creates a dedicated `inet olcrtcwrt` table with `prerouting`,
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
proxy/SOCKSifier (e.g. `tun2socks`, `redsocks`) in front of `olcrtcwrt`, or use
olcrtcwrt directly as a SOCKS5 proxy in client applications.

The package depends on `nftables` and `kmod-nft-nat` for the `redirect`
NAT target.

## License

WTFPL
