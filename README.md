# OlcrtcWRT

OpenWrt LuCI приложение для управления клиентами **olcrtcwrt** (TCP-over-WebRTC) и **WDTT** (WireGuard-over-TURN-Tunnel).

## Структура

- `olcrtcwrt-apk/` — исходники OpenWrt-пакета
- `olcrtcwrt-bin/` — предсобранные бинарники olcrtcwrt
- `free-turn-proxy-bin/` — предсобранные бинарники free-turn-proxy
- `install.sh` — интерактивный установщик OlcrtcWRT + sing-box

Пакет LuCI содержит только интерфейс и backend. Бинарники olcrtc, WDTT и sing-box устанавливаются отдельно из вкладки **Компоненты** под архитектуру роутера.

## Быстрая установка

Запустите от **root** на OpenWrt или на обычном Linux:

```bash
sh -c "$(wget -O - https://raw.githubusercontent.com/win64exe/OlcrtcWRT/refs/heads/dev/install.sh)"
```

> **Примечание:** форма `sh <(wget -O - …)` (process substitution) может нарушать работу интерактивного ввода в некоторых шеллах, поэтому мы рекомендуем именно `sh -c "$(wget -O - …)"`.

`install.sh` скачает последний `luci-app-olcrtcwrt` .apk из GitHub Releases и предложит выбрать вариант sing-box. В меню APK можно устанавливать отдельно, без установки sing-box:

1. **OlcrtcWRT + sing-box**
2. **Только OlcrtcWRT APK**
3. **Только sing-box**
4. **Удалить sing-box**
5. **Выход**

## Неинтерактивный режим

```bash
# Установить OlcrtcWRT + sing-box
sh install.sh install

# Установить или обновить только OlcrtcWRT APK
sh install.sh apk
# Также доступны команды install-apk и package
# При конфликте старой локальной APK-записи установщик явно сохраняет зависимости, удаляет только старый пакет и повторяет установку.
# Если в /etc/apk/arch отсутствует архитектура all, установщик добавит её для LuCI APK.

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

Для запуска удалённого скрипта только с установкой APK используйте:

```bash
sh -c "$(wget -O - https://raw.githubusercontent.com/win64exe/OlcrtcWRT/refs/heads/dev/install.sh)" _ apk
```

После установки откройте LuCI: **Сервисы → Topkop**. Доступны разделы **Селекторы**, **Настройки**, **Диагностика**, **Панель**, **Мониторинг** и **Компоненты**. В «Компонентах» можно проверить версии и установить olcrtc, WDTT, официальный sing-box или sing-box extended.


## Важное примечание

Если вы устанавливаете `.apk` вручную на минимальный образ OpenWrt, убедитесь, что в системе уже есть модули ядра `kmod-wireguard` и `kmod-tun` (или установите их отдельно через `apk`/`opkg`). При использовании `install.sh` это не требуется — он скачивает и устанавливает всё необходимое.
