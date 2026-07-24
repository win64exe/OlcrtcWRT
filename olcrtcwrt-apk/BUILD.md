# Сборка luci-app-olcrtcwrt для OpenWRT

В этом документе описано, как собрать пакет `luci-app-olcrtcwrt` (.apk) для OpenWRT 25+.

## Требования

- Linux или WSL с установленными: `build-essential`, `git`, `libncurses-dev`, `zlib1g-dev`, `gawk`, `flex`, `bison`, `unzip`, `wget`, `python3`, `rsync`.
- OpenWRT SDK соответствующий архитектуре вашего роутера.

## Вариант 1: Сборка через OpenWRT SDK

1. Скачайте SDK с [downloads.openwrt.org](https://downloads.openwrt.org/releases/25.10.0/targets/).
   Пример для x86_64:

   ```bash
   wget https://downloads.openwrt.org/releases/25.10.0/targets/x86/64/openwrt-sdk-25.10.0-x86-64_gcc-14.2.0_musl.Linux-x86_64.tar.zst
   tar --zstd -xvf openwrt-sdk-*.tar.zst
   cd openwrt-sdk-*
   ```

2. Скопируйте исходники пакета:

   ```bash
   cp -r /path/to/olcrtcwrt-apk package/luci-app-olcrtcwrt
   ```

3. Обновите фид и выберите пакет:

   ```bash
   ./scripts/feeds update -a
   ./scripts/feeds install -a
   make menuconfig
   ```

   В `menuconfig` выберите:  
   `LuCI -> Applications -> <*> luci-app-olcrtcwrt`

4. Соберите пакет:

   ```bash
   make package/luci-app-olcrtcwrt/{clean,compile,install} V=s -j$(nproc)
   ```

5. Готовый `.apk` находится в:

   ```bash
   ls bin/packages/*/base/luci-app-olcrtcwrt*.apk
   ```

## Вариант 2: Собственный фид

1. В каталоге SDK добавьте в `feeds.conf.default`:

   ```
   src-link olcrtcwrt /path/to/olcrtcwrt-apk
   ```

2. Обновите и установите фид:

   ```bash
   ./scripts/feeds update olcrtcwrt
   ./scripts/feeds install luci-app-olcrtcwrt
   ```

3. Соберите пакет:

   ```bash
   make package/luci-app-olcrtcwrt/compile V=s -j$(nproc)
   ```

## Вариант 3: GitHub Actions CI

Создайте файл `.github/workflows/build.yml`:

```yaml
name: Build OpenWRT package
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build package
        uses: openwrt/gh-action-sdk@main
        with:
          arch: x86_64
          packages: luci-app-olcrtcwrt
          feed_branch: main
```

Готовые артефакты будут доступны во вкладке Actions.

## Полезные команды

| Команда | Описание |
|---|---|
| `make menuconfig` | Выбрать пакеты для сборки |
| `make package/luci-app-olcrtcwrt/clean` | Очистить результаты сборки |
| `make package/luci-app-olcrtcwrt/compile V=s` | Собрать пакет с подробным выводом |
| `make package/luci-app-olcrtcwrt/install` | Установить в staging |

## Установка на роутер

Скопируйте `.apk` на роутер и установите:

```bash
scp bin/packages/*/base/luci-app-olcrtcwrt*.apk root@192.168.1.1:/tmp/
ssh root@192.168.1.1 opkg install /tmp/luci-app-olcrtcwrt*.apk
```

## Зависимости

Пакет `luci-app-olcrtcwrt` автоматически потянет следующие зависимости:

- `luci-base`
- `nftables`
- `kmod-nft-nat`
- `dnsmasq`
- `wireguard-tools`
- `jq`
- `iputils-ping`
- `curl`
- `ca-certificates`

## Устранение неполадок

- Если `make menuconfig` не видит пакет, проверьте, что каталог `package/luci-app-olcrtcwrt` содержит `Makefile`.
- Если сборка падает с ошибкой отсутствия зависимостей, включите их в `make menuconfig` или соберите SDK с включённым `CONFIG_ALL`.
- Для отладки используйте `V=s` — это покажет полный вывод компиляции.
