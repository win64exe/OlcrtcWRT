#
# Copyright (C) 2025 OpenLibreCommunity
#
# This is free software, licensed under the WTFPL.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-olcrtc
PKG_VERSION:=1.0.0
PKG_RELEASE:=2

PKG_MAINTAINER:=OpenLibreCommunity
PKG_LICENSE:=WTFPL

PKG_BUILD_DIR:=$(BUILD_DIR)/$(PKG_NAME)-$(PKG_VERSION)

include $(INCLUDE_DIR)/package.mk

define Package/$(PKG_NAME)
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=olcrtc and WDTT client management
  URL:=https://github.com/openlibrecommunity/olcrtc
  DEPENDS:=+luci-base +uhttpd +curl +ca-bundle +ca-certificates +libustream-wolfssl \
	+coreutils +nftables +kmod-nft-nat +dnsmasq +kmod-wireguard +wireguard-tools \
	+jq +iputils-ping +sing-box +kmod-tun +rpcd-mod-ucode +rpcd-mod-file +ucode +ucode-mod-fs +ucode-mod-uci
  PKGARCH:=all
endef

define Package/$(PKG_NAME)/description
  LuCI application for managing olcrtc (TCP-over-WebRTC) and WDTT
  (WireGuard-over-TURN-Tunnel) clients on OpenWRT 25+.
  Uses modern JavaScript LuCI views and a ucode rpcd backend.
  Provides sections, settings, diagnostics and a dashboard with
  per-section ping and traffic counters.
endef

define Build/Prepare
	$(Build/Prepare/Default)
	mkdir -p $(PKG_BUILD_DIR)/bin
	$(CP) $(CURDIR)/../olrct-bin/olcrtc-linux-arm64 $(PKG_BUILD_DIR)/bin/
	$(CP) $(CURDIR)/../free-turn-proxy-bin/client-arm64 $(PKG_BUILD_DIR)/bin/
	$(CP) $(CURDIR)/../free-turn-proxy-bin/server-amd64 $(PKG_BUILD_DIR)/bin/
endef

define Build/Compile
endef

define Package/$(PKG_NAME)/conffiles
/etc/config/olcrtc
endef

define Package/$(PKG_NAME)/install
	$(CP) ./root/. $(1)/
	$(CP) ./htdocs/. $(1)/
	$(INSTALL_DIR) $(1)/etc/olcrtc/bin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/bin/olcrtc-linux-arm64 $(1)/etc/olcrtc/bin/olcrtc-linux-arm64
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/bin/client-arm64 $(1)/etc/olcrtc/bin/client-arm64
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/bin/server-amd64 $(1)/etc/olcrtc/bin/server-amd64
	find $(1)/etc/init.d -type f -exec chmod +x {} \;
	find $(1)/etc/olcrtc -type f -name '*.sh' -exec chmod +x {} \;
	find $(1)/etc/uci-defaults -type f -exec chmod +x {} \;
	find $(1)/usr/share/rpcd/ucode -type f -name '*.uc' -exec chmod +x {} \;
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
