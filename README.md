# OlcrtcWRT

OpenWrt LuCI приложение для управления клиентами **olcrtcwrt** (TCP-over-WebRTC) и **WDTT** (WireGuard-over-TURN-Tunnel).

## Структура

- `olcrtcwrt-apk/` — исходники OpenWrt-пакета
- `olcrtcwrt-bin/` — предсобранные бинарники olcrtcwrt
- `free-turn-proxy-bin/` — предсобранные бинарники free-turn-proxy
- `install.sh` — интерактивный установщик OlcrtcWRT + sing-box

## Быстрая установка

Запустите от **root** на OpenWrt или на обычном Linux:

```bash
sh -c "$(wget -O - https://raw.githubusercontent.com/win64exe/OlcrtcWRT/refs/heads/dev/install.sh)"
```

> **Примечание:** форма `sh <(wget -O - …)` (process substitution) может нарушать работу интерактивного ввода в некоторых шеллах, поэтому мы рекомендуем именно `sh -c "$(wget -O - …)"`.

`install.sh` скачает последний `luci-app-olcrtcwrt` .apk из GitHub Releases и предложит выбрать вариант sing-box:

1. **Official sing-box** (SagerNet/sing-box)
2. **sing-box-extended** (shtorm-7/sing-box-extended)
3. **Пропустить sing-box**

## Неинтерактивный режим

```bash
# Установить OlcrtcWRT + sing-box
sh install.sh install

# Установить/обновить только sing-box
sh install.sh sing-box

# Удалить sing-box
sh install.sh uninstall
```

## Альтернативная установка (POSIX + проверка чек-суммы)

Если оболочка не поддерживает конструкцию `<(...)`, или вы хотите проверить чек-сумму перед запуском, запустите от **root**:

```bash
BASE="https://raw.githubusercontent.com/win64exe/OlcrtcWRT/refs/heads/dev"
mkdir -p /tmp/olcrtcwrt-install && cd /tmp/olcrtcwrt-install
wget -qO install.sh "$BASE/install.sh"
wget -qO install.sh.sha256 "$BASE/install.sh.sha256"
sha256sum -c install.sh.sha256 && sh install.sh
```

Если в системе нет `wget`, замените `wget -qO файл URL` на `curl -fsSL -o файл URL`.


## Важное примечание

Если вы устанавливаете `.apk` вручную на минимальный образ OpenWrt, убедитесь, что в системе уже есть модули ядра `kmod-wireguard` и `kmod-tun` (или установите их отдельно через `apk`/`opkg`). При использовании `install.sh` это не требуется — он скачивает и устанавливает всё необходимое.
