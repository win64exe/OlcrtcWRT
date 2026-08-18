'use strict';
'require view';
'require uci';
'require form';
'require ui';
'require rpc';
'require view.olcrtcwrt.styles as styles';

var callDownload = rpc.declare({
	object: 'olcrtcwrt',
	method: 'download',
	reject: true
});
var callFileWrite = rpc.declare({
	object: 'file',
	method: 'write',
	params: { path: '', data: '', base64: false, mode: 0 },
	reject: true
});

function arrayBufferToBase64(buffer) {
	var bytes = new Uint8Array(buffer);
	var len = bytes.length;
	var binary = '';
	for (var i = 0; i < len; i++)
		binary += String.fromCharCode(bytes[i]);
	return btoa(binary);
}

return view.extend({
	load: function() {
		return uci.load('olcrtcwrt');
	},

	render: function() {
		styles.inject();
		var self = this;
		var m, s, o;

		m = new form.Map('olcrtcwrt', _('Настройки'),
			_('Настройки OlcrtcWRT в стиле вкладок forkop.'));
		m.tabbed = true;

		s = m.section(form.NamedSection, 'global', 'global', _('Общие'));
		s.tab('global', _('Общие'));

		o = s.option(form.Flag, 'enabled', _('Включить OlcrtcWRT'));
		o = s.option(form.Flag, 'autostart', _('Автозапуск при загрузке'));
		o = s.option(form.ListValue, 'log_level', _('Уровень логирования'));
		o.value('debug', 'debug');
		o.value('info', 'info');
		o.value('warn', 'warn');
		o.value('error', 'error');
		o = s.option(form.Value, 'stats_interval', _('Интервал статистики (сек)'));
		o.datatype = 'uinteger';
		o = s.option(form.Value, 'ping_interval', _('Интервал ping (сек)'));
		o.datatype = 'uinteger';

		s = m.section(form.NamedSection, 'proxy', 'proxy', _('Прокси и маршрутизация'));
		s.tab('proxy', _('Прокси и маршрутизация'));

		o = s.option(form.Flag, 'enabled', _('Включить локальный прокси'));
		o = s.option(form.ListValue, 'routing_core', _('Ядро маршрутизации'));
		o.value('nftables', _('nftables + dnsmasq'));
		o.value('sing-box', _('sing-box TUN'));
		o.depends('enabled', '1');

		o = s.option(form.Value, 'http_host', _('HTTP proxy host'));
		o.depends('routing_core', 'nftables');
		o = s.option(form.Value, 'http_port', _('HTTP proxy порт'));
		o.datatype = 'port';
		o.depends('routing_core', 'nftables');
		o = s.option(form.Value, 'socks_host', _('SOCKS proxy host'));
		o.depends('routing_core', 'nftables');
		o = s.option(form.Value, 'socks_port', _('SOCKS proxy порт'));
		o.datatype = 'port';
		o.depends('routing_core', 'nftables');
		o = s.option(form.Flag, 'redirect_to_olcrtcwrt', _('Перенаправлять прокси на olcrtcwrt'));
		o.depends('routing_core', 'nftables');

		o = s.option(form.ListValue, 'mode', _('Режим маршрутизации'));
		o.value('disabled', _('Отключено'));
		o.value('global', _('Глобальный прокси'));
		o.value('list', _('Список прокси'));
		o = s.option(form.Flag, 'bypass_local', _('Обходить локальные/частные сети'));
		o.depends('routing_core', 'nftables');
		o = s.option(form.DynamicList, 'proxy_ips', _('Прокси IPv4 подсети/IP'));
		o.datatype = 'ip4addr';
		o.depends('routing_core', 'nftables');
		o = s.option(form.DynamicList, 'proxy_ips6', _('Прокси IPv6 подсети/IP'));
		o.datatype = 'ip6addr';
		o.depends('routing_core', 'nftables');
		o = s.option(form.DynamicList, 'bypass_ips', _('Обход IPv4 подсети/IP'));
		o.datatype = 'ip4addr';
		o.depends('routing_core', 'nftables');
		o = s.option(form.DynamicList, 'bypass_ips6', _('Обход IPv6 подсети/IP'));
		o.datatype = 'ip6addr';
		o.depends('routing_core', 'nftables');

		o = s.option(form.DynamicList, 'bypass_server_domains', _('Домены/IP серверов для обхода'));
		o.placeholder = 'vps.example.com';
		o.depends('routing_core', 'sing-box');
		o.description = _('Заполняется автоматически из server_uri/vps_host узлов. Нужно для предотвращения петель маршрутизации в режиме TUN.');

		s = m.section(form.NamedSection, 'dns', 'dns', _('DNS'));
		s.tab('dns', _('DNS'));

		o = s.option(form.Flag, 'enabled', _('Включить DNS-маршрутизацию'));
		o = s.option(form.Value, 'proxy_dns', _('Прокси DNS-сервер'));
		o.placeholder = '127.0.0.1#5353';
		o = s.option(form.Value, 'fallback_dns', _('Резервный DNS-сервер'));
		o.placeholder = '8.8.8.8';
		o = s.option(form.DynamicList, 'direct_domains', _('Прямые домены'));
		o = s.option(form.DynamicList, 'proxy_domains', _('Прокси-домены'));

		s = m.section(form.NamedSection, 'main', 'subscription', _('Подписка'));
		s.tab('subscription', _('Подписка'));

		o = s.option(form.Flag, 'enabled', _('Включить подписку'));
		o = s.option(form.Value, 'url', _('URL подписки'));
		o = s.option(form.Flag, 'auto_update', _('Автоматическое обновление'));
		o = s.option(form.Value, 'update_interval', _('Интервал обновления (часы)'));
		o.datatype = 'uinteger';

		return m.render().then(function(node) {
			node.appendChild(E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, _('Управление бинарниками')),
				E('p', {}, _('Скачать последние бинарники olcrtcwrt и WDTT для этой архитектуры.')),
				E('button', {
					'class': 'btn cbi-button cbi-button-apply',
					'click': ui.createHandlerFn(self, 'handleDownload')
				}, _('Скачать бинарники'))
			]));

			node.appendChild(E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, _('Ручная установка бинарников')),
				E('p', {}, _('Загрузите olcrtcwrt или WDTT (proxy-turn-vk-android) вручную. Файл будет сохранён в /etc/olcrtcwrt/bin/ и помечен исполняемым.')),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title' }, _('Бинарник olcrtcwrt')),
					E('div', { 'class': 'cbi-value-field' }, [
						E('input', {
							'type': 'file',
							'id': 'olcrtcwrt-binary-file'
						})
					])
				]),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title' }, _('Бинарник WDTT / proxy-turn-vk-android')),
					E('div', { 'class': 'cbi-value-field' }, [
						E('input', {
							'type': 'file',
							'id': 'wdtt-binary-file'
						})
					])
				]),
				E('div', { 'class': 'cbi-value' }, [
					E('button', {
						'class': 'btn cbi-button cbi-button-apply',
						'click': ui.createHandlerFn(self, 'handleManualUpload')
					}, _('Установить выбранные бинарники'))
				])
			]));

			return node;
		});
	},

	handleDownload: function(ev) {
		return callDownload().then(function() {
			ui.addNotification(null, E('p', _('Бинарники успешно скачаны.')));
		}).catch(function(err) {
			ui.addNotification(null, E('p', _('Не удалось скачать бинарники: %s').format(err.message)));
		});
	},

	uploadFile: function(name, path, file, input) {
		return new Promise(function(resolve, reject) {
			var reader = new FileReader();
			reader.onload = function(e) {
				var base64 = arrayBufferToBase64(e.target.result);
				// mode 493 == octal 0755 (executable)
				return callFileWrite({
					path: path,
					data: base64,
					base64: true,
					mode: 493
				}).then(function() {
					ui.addNotification(null, E('p', _('%s успешно установлен.').format(name)));
					input.value = '';
					resolve();
				}).catch(function(err) {
					ui.addNotification(null, E('p', _('Не удалось установить %s: %s').format(name, err.message)));
					reject(err);
				});
			};
			reader.onerror = function(e) {
				ui.addNotification(null, E('p', _('Не удалось прочитать %s: %s').format(name, e.message || 'unknown error')));
				reject(e);
			};
			reader.readAsArrayBuffer(file);
		});
	},

	handleManualUpload: function(ev) {
		var olcrtcwrtInput = document.getElementById('olcrtcwrt-binary-file');
		var wdttInput = document.getElementById('wdtt-binary-file');
		var promises = [];

		if (olcrtcwrtInput && olcrtcwrtInput.files && olcrtcwrtInput.files[0])
			promises.push(this.uploadFile('olcrtcwrt', '/etc/olcrtcwrt/bin/olcrtc', olcrtcwrtInput.files[0], olcrtcwrtInput));

		if (wdttInput && wdttInput.files && wdttInput.files[0])
			promises.push(this.uploadFile('WDTT', '/etc/olcrtcwrt/bin/wdtt-server', wdttInput.files[0], wdttInput));

		if (!promises.length) {
			ui.addNotification(null, E('p', _('Бинарник не выбран.')));
			return Promise.resolve();
		}

		return Promise.all(promises);
	}
});
