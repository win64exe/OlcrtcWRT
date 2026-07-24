# OlcrtcWRT

OpenWrt LuCI application for managing olcrtcwrt (TCP-over-WebRTC) and WDTT (WireGuard-over-TURN-Tunnel) clients.

## Structure

- `olcrtcwrt-apk/` — OpenWrt package source
- `olcrtcwrt-bin/` — prebuilt olcrtcwrt binaries
- `free-turn-proxy-bin/` — prebuilt free-turn-proxy binaries
- `install.sh` — interactive installer for OlcrtcWRT + sing-box

## Quick install

Run as root on OpenWrt or a generic Linux system:

```bash
sh install.sh
```

`install.sh` will download the latest `luci-app-olcrtcwrt` .apk from GitHub Releases and ask which sing-box variant you want:

1. **Official sing-box** (SagerNet/sing-box)
2. **sing-box-extended** (shtorm-7/sing-box-extended)
3. **Skip sing-box**

You can also run `sh install.sh install` or `sh install.sh sing-box` for non-interactive usage.
