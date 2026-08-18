#
# Copyright (C) 2025 OlcrtcWRT
#
# This is free software, licensed under the WTFPL.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-olcrtcwrt
PKG_VERSION:=1.0.0
PKG_RELEASE:=5

PKG_MAINTAINER:=OlcrtcWRT
PKG_LICENSE:=WTFPL

PKG_BUILD_DIR:=$(BUILD_DIR)/$(PKG_NAME)-$(PKG_VERSION)

include $(INCLUDE_DIR)/package.mk

define Package/$(PKG_NAME)
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=olcrtcwrt and WDTT client management
  URL:=https://github.com/win64exe/OlcrtcWRT
  DEPENDS:=+luci-base +curl +ca-bundle +ca-certificates +dnsmasq +wireguard-tools +jq +rpcd-mod-ucode +rpcd-mod-file +ucode +ucode-mod-fs +ucode-mod-uci
  PKGARCH:=all
endef

define Package/$(PKG_NAME)/description
  LuCI application for managing olcrtcwrt (TCP-over-WebRTC) and WDTT
  (WireGuard-over-TURN-Tunnel) clients on OpenWRT 25+.
  Uses modern JavaScript LuCI views and a ucode rpcd backend.
  Provides sections, settings, diagnostics and a dashboard with
  per-section ping and traffic counters.
endef

define Build/Prepare
	$(Build/Prepare/Default)
	mkdir -p $(PKG_BUILD_DIR)/bin
	$(CP) $(CURDIR)/../olcrtcwrt-bin/olcrtc-linux-arm64 $(PKG_BUILD_DIR)/bin/
	$(CP) $(CURDIR)/../free-turn-proxy-bin/client-arm64 $(PKG_BUILD_DIR)/bin/
	$(CP) $(CURDIR)/../free-turn-proxy-bin/server-amd64 $(PKG_BUILD_DIR)/bin/
endef

define Build/Compile
endef

define Package/$(PKG_NAME)/conffiles
/etc/config/olcrtcwrt
endef

define Package/$(PKG_NAME)/postinst
#!/bin/sh
[ -x /etc/init.d/olcrtcwrt ] && /etc/init.d/olcrtcwrt enable
exit 0
endef

define Package/$(PKG_NAME)/postrm
#!/bin/sh
[ -x /etc/init.d/olcrtcwrt ] && /etc/init.d/olcrtcwrt disable
exit 0
endef

define Package/$(PKG_NAME)/install
	$(CP) ./root/. $(1)/
	$(CP) ./htdocs/. $(1)/www/
	$(INSTALL_DIR) $(1)/etc/olcrtcwrt/bin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/bin/olcrtc-linux-arm64 $(1)/etc/olcrtcwrt/bin/olcrtc-linux-arm64
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/bin/client-arm64 $(1)/etc/olcrtcwrt/bin/client-arm64
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/bin/server-amd64 $(1)/etc/olcrtcwrt/bin/server-amd64
	find $(1)/etc/init.d -type f -exec chmod +x {} \;
	find $(1)/etc/olcrtcwrt -type f -name '*.sh' -exec chmod +x {} \;
	find $(1)/etc/uci-defaults -type f -exec chmod +x {} \;
	find $(1)/usr/share/rpcd/ucode -type f -name '*.uc' -exec chmod +x {} \;
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
