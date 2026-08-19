'use strict';
'require view';
'require form';
'require baseclass';
'require uci';
'require ui';
'require view.olcrtcwrt.styles as styles';
'require view.olcrtcwrt.dashboard as dashboard';
'require view.olcrtcwrt.monitoring as monitoring';
'require view.olcrtcwrt.diagnostics as diagnostics';
'require view.olcrtcwrt.components as components';

var UCI_PACKAGE = 'olcrtcwrt';

function nodeTypeDisplay(section_id) {
	var t = uci.get(UCI_PACKAGE, section_id, 'type');
	if (t === 'wdtt')
		return 'WDTT';
	if (t === 'bypass')
		return _('Обход');
	return 'olcrtc';
}

function renderSectionAdd(sectionRef, extra_class) {
	var el = form.GridSection.prototype.renderSectionAdd.apply(sectionRef, [ extra_class ]);
	var nameEl = el.querySelector('.cbi-section-create-name');

	ui.addValidator(nameEl, 'uciname', true, function(value) {
		var button = el.querySelector('.cbi-section-create > .cbi-button-add');
		var uciconfig = sectionRef.uciconfig || sectionRef.map.config;

		if (!value) {
			button.disabled = true;
			return true;
		}

		if (uci.get(uciconfig, value)) {
			button.disabled = true;
			return _('Ожидается: %s').format(_('уникальный идентификатор UCI'));
		}

		button.disabled = null;
		return true;
	}, 'blur', 'keyup');

	return el;
}

function configureGridSection(sectionRef, title, addTitle) {
	sectionRef.anonymous = false;
	sectionRef.addremove = true;
	sectionRef.sortable = true;
	sectionRef.rowcolors = true;
	sectionRef.nodescriptions = true;
	sectionRef.modaltitle = function(section_id) {
		var label = uci.get(UCI_PACKAGE, section_id, 'label');
		return section_id ? (title + ': ' + (label || section_id)) : addTitle;
	};
	sectionRef.sectiontitle = function(section_id) {
		return uci.get(UCI_PACKAGE, section_id, 'label') || section_id;
	};
	sectionRef.renderSectionAdd = function(extra_class) {
		return renderSectionAdd(sectionRef, extra_class);
	};
	sectionRef.renderRowActions = function(section_id) {
		return form.TableSection.prototype.renderRowActions.call(this, section_id, _('Изменить'));
	};
}

/* Пометить вкладки как modal-only: в таблице остаются только editable-опции. */
function applyModalOnly(sectionRef) {
	sectionRef.children.forEach(function(opt) {
		if (opt.tab && opt.modalonly === undefined && opt.option !== 'enabled')
			opt.modalonly = true;
	});
}

/* Общие колонки таблицы: название / включен / тип + тип как display. */
function addGridBasics(sectionRef, typeTab, types) {
	var o;

	o = sectionRef.taboption(typeTab, form.Value, 'label', _('Название'));
	o.placeholder = _('Например: основной узел');
	o.rmempty = false;
	o.load = function(section_id) {
		return uci.get(UCI_PACKAGE, section_id, 'label') || section_id;
	};

	o = sectionRef.taboption(typeTab, form.Flag, 'enabled', _('Включен'));
	o.rmempty = false;
	o.editable = true;
	o.width = '6rem';

	o = sectionRef.taboption(typeTab, form.DummyValue, '_type_display', _('Тип'));
	o.modalonly = false;
	o.rawhtml = true;
	o.width = '7rem';
	o.cfgvalue = function(section_id) {
		return nodeTypeDisplay(section_id);
	};
	o.textvalue = function(section_id) {
		return nodeTypeDisplay(section_id);
	};

	o = sectionRef.taboption(typeTab, form.ListValue, 'type', _('Протокол'));
	for (var value in types)
		o.value(value, types[value]);
	o.rmempty = false;
}

function mountSection(map, type, title, createFn) {
	var section = map.section(form.TypedSection, type, title);
	section.anonymous = true;
	section.addremove = false;
	section.cfgsections = function() { return [ type ]; };
	createFn(section);
	return section;
}

return view.extend({
	render: function() {
		styles.injectGlobalStyles();

		var m = new form.Map(UCI_PACKAGE, _('Topkop'),
			_('Настройки OlcrtcWRT — клиенты olcrtc и WDTT, серверы и маршрутизация.'));
		m.tabbed = true;
		var s, o;

		/* ---------- Секции (клиентские узлы) ---------- */
		s = m.section(form.GridSection, 'node', _('Секции'),
			_('Клиентские узлы: olcrtc, WDTT и обход. Перетаскивайте строки для приоритета.'));
		configureGridSection(s, _('Секция'), _('Добавить секцию'));

		s.tab('connection', _('Подключение'));
		s.tab('runtime', _('Параметры'));

		addGridBasics(s, 'connection', {
			'olcrtcwrt': 'olcrtc',
			'wdtt': 'WDTT',
			'bypass': _('Обход')
		});

		/* olcrtc client */
		o = s.taboption('connection', form.Value, 'connection_uri', _('URI подключения'));
		o.placeholder = 'olcrtc://provider?transport<opts>@room#key';
		o.depends('type', 'olcrtcwrt');
		o.validate = function(section_id, value) {
			if (!value)
				return true;
			if (!/^olcrtc:\/\/[^?@#]+(\?[^@#]+)?@[^#]+#.+$/.test(value))
				return _('Неверный формат. Ожидается olcrtc://provider?transport<opts>@room#key');
			return true;
		};

		o = s.taboption('connection', form.Value, 'server_uri', _('URI сервера / Room UUID'));
		o.depends('type', 'olcrtcwrt');

		o = s.taboption('connection', form.Value, 'shared_key', _('Общий ключ'));
		o.password = true;
		o.depends('type', 'olcrtcwrt');

		o = s.taboption('connection', form.ListValue, 'provider', _('Провайдер'));
		o.value('jitsi', 'Jitsi');
		o.value('telemost', 'Yandex Telemost');
		o.value('wbstream', 'WB Stream');
		o.depends('type', 'olcrtcwrt');

		o = s.taboption('connection', form.ListValue, 'transport', _('Транспорт'));
		o.value('datachannel', 'datachannel');
		o.value('vp8channel', 'vp8channel');
		o.value('seichannel', 'seichannel');
		o.value('videochannel', 'videochannel');
		o.depends('type', 'olcrtcwrt');

		o = s.taboption('connection', form.Value, 'local_socks_host', _('Локальный SOCKS host'));
		o.depends('type', 'olcrtcwrt');

		o = s.taboption('connection', form.Value, 'local_socks_port', _('Локальный SOCKS порт'));
		o.datatype = 'port';
		o.depends('type', 'olcrtcwrt');

		o = s.taboption('connection', form.Value, 'extra_args', _('Дополнительные аргументы'));
		o.depends('type', 'olcrtcwrt');

		o = s.taboption('connection', form.Value, 'dialer_proxy', _('Прокси для подключения'));
		o.placeholder = _('Имя другого узла для SOCKS upstream');
		o.depends('type', 'olcrtcwrt');
		o.depends('type', 'wdtt');

		/* WDTT client */
		o = s.taboption('runtime', form.Value, 'vps_host', _('VPS host'));
		o.depends('type', 'wdtt');

		o = s.taboption('runtime', form.Value, 'vps_port', _('VPS порт'));
		o.datatype = 'port';
		o.depends('type', 'wdtt');

		o = s.taboption('runtime', form.Value, 'vk_hash', _('VK hash'));
		o.depends('type', 'wdtt');

		o = s.taboption('runtime', form.Value, 'password', _('Пароль'));
		o.password = true;
		o.depends('type', 'wdtt');

		o = s.taboption('runtime', form.Value, 'threads', _('Потоки'));
		o.datatype = 'uinteger';
		o.depends('type', 'wdtt');

		o = s.taboption('runtime', form.Value, 'local_udp_port', _('Локальный UDP порт'));
		o.datatype = 'port';
		o.depends('type', 'wdtt');

		o = s.taboption('runtime', form.Value, 'wireguard_config', _('Путь к WireGuard конфигурации'));
		o.depends('type', 'wdtt');

		o = s.taboption('runtime', form.Value, 'wireguard_iface', _('Имя WireGuard интерфейса'));
		o.depends('type', 'wdtt');

		o = s.taboption('runtime', form.Flag, 'auto_captcha', _('Автоматическая captcha'));
		o.depends('type', 'wdtt');

		/* bypass */
		o = s.taboption('runtime', form.DynamicList, 'bypass_ips', _('IPv4 сети/IP для обхода'));
		o.datatype = 'ip4addr';
		o.depends('type', 'bypass');

		o = s.taboption('runtime', form.DynamicList, 'bypass_ips6', _('IPv6 сети/IP для обхода'));
		o.datatype = 'ip6addr';
		o.depends('type', 'bypass');

		applyModalOnly(s);

		/* ---------- Серверы (локальные серверы) ---------- */
		s = m.section(form.GridSection, 'server', _('Серверы'),
			_('Серверы, запускаемые на этом роутере: olcrtc-комната и WDTT TURN-сервер.'));
		configureGridSection(s, _('Сервер'), _('Добавить сервер'));

		s.tab('connection', _('Подключение'));
		s.tab('runtime', _('Параметры'));

		addGridBasics(s, 'connection', {
			'olcrtcwrt': 'olcrtc',
			'wdtt': 'WDTT'
		});

		/* olcrtc server (srv mode) */
		o = s.taboption('connection', form.Value, 'room', _('Room UUID / ID'));
		o.depends('type', 'olcrtcwrt');

		o = s.taboption('connection', form.Value, 'shared_key', _('Общий ключ'));
		o.password = true;
		o.depends('type', 'olcrtcwrt');

		o = s.taboption('connection', form.ListValue, 'provider', _('Провайдер'));
		o.value('jitsi', 'Jitsi');
		o.value('telemost', 'Yandex Telemost');
		o.value('wbstream', 'WB Stream');
		o.depends('type', 'olcrtcwrt');

		o = s.taboption('connection', form.ListValue, 'transport', _('Транспорт'));
		o.value('datachannel', 'datachannel');
		o.value('vp8channel', 'vp8channel');
		o.value('seichannel', 'seichannel');
		o.value('videochannel', 'videochannel');
		o.depends('type', 'olcrtcwrt');

		o = s.taboption('connection', form.Value, 'listen', _('Адрес прослушивания'));
		o.placeholder = '0.0.0.0:56001';
		o.depends('type', 'olcrtcwrt');

		o = s.taboption('connection', form.Value, 'data_dir', _('Каталог данных'));
		o.depends('type', 'olcrtcwrt');

		o = s.taboption('connection', form.Value, 'auth_url', _('Auth URL'));
		o.depends('type', 'olcrtcwrt');

		o = s.taboption('connection', form.Value, 'extra_args', _('Дополнительные аргументы'));
		o.depends('type', 'olcrtcwrt');

		/* WDTT server (free-turn-proxy) */
		o = s.taboption('runtime', form.Value, 'server_address', _('Публичный адрес сервера'));
		o.placeholder = 'vps.example.com:56000';
		o.depends('type', 'wdtt');

		o = s.taboption('runtime', form.Value, 'listen', _('Адрес прослушивания'));
		o.placeholder = '0.0.0.0:56000';
		o.depends('type', 'wdtt');

		o = s.taboption('runtime', form.Value, 'connect', _('Локальный бэкенд (WG/Xray)'));
		o.placeholder = '127.0.0.1:51820';
		o.depends('type', 'wdtt');

		o = s.taboption('runtime', form.ListValue, 'mode', _('Режим туннеля'));
		o.value('udp', 'udp (WireGuard)');
		o.value('tcp', 'tcp (Xray/sing-box)');
		o.depends('type', 'wdtt');

		o = s.taboption('runtime', form.Value, 'obf_key', _('Ключ обфускации (hex)'));
		o.depends('type', 'wdtt');

		o = s.taboption('runtime', form.ListValue, 'obf_profile', _('Профиль обфускации'));
		o.value('none', 'none');
		o.value('rtpopus', 'rtpopus');
		o.value('rtpopus2', 'rtpopus2');
		o.value('rtpopus3', 'rtpopus3');
		o.depends('type', 'wdtt');

		o = s.taboption('runtime', form.Value, 'obf_timing', _('Межпакетная задержка (например 10ms)'));
		o.depends('type', 'wdtt');

		o = s.taboption('runtime', form.Value, 'clients_file', _('Путь к clients.json'));
		o.depends('type', 'wdtt');

		o = s.taboption('runtime', form.Value, 'extra_args', _('Дополнительные аргументы'));
		o.depends('type', 'wdtt');

		applyModalOnly(s);

		/* ---------- Настройки ---------- */
		s = m.section(form.NamedSection, 'settings', 'settings', _('Настройки'));

		s.tab('general', _('Общие'));
		s.tab('proxy', _('Прокси и маршрутизация'));
		s.tab('dns', _('DNS'));
		s.tab('subscription', _('Подписка'));

		o = s.taboption('general', form.Flag, 'enabled', _('Включить OlcrtcWRT'));
		o = s.taboption('general', form.Flag, 'autostart', _('Автозапуск при загрузке'));
		o = s.taboption('general', form.ListValue, 'log_level', _('Уровень логирования'));
		o.value('debug', 'debug');
		o.value('info', 'info');
		o.value('warn', 'warn');
		o.value('error', 'error');
		o = s.taboption('general', form.Value, 'stats_interval', _('Интервал статистики (сек)'));
		o.datatype = 'uinteger';
		o = s.taboption('general', form.Value, 'ping_interval', _('Интервал ping (сек)'));
		o.datatype = 'uinteger';

		o = s.taboption('proxy', form.Flag, 'proxy_enabled', _('Включить локальный прокси'));
		o = s.taboption('proxy', form.ListValue, 'routing_core', _('Ядро маршрутизации'));
		o.value('nftables', _('nftables + dnsmasq'));
		o.value('sing-box', _('sing-box TUN'));
		o.depends('proxy_enabled', '1');

		o = s.taboption('proxy', form.Value, 'http_host', _('HTTP proxy host'));
		o.depends('routing_core', 'nftables');
		o = s.taboption('proxy', form.Value, 'http_port', _('HTTP proxy порт'));
		o.datatype = 'port';
		o.depends('routing_core', 'nftables');
		o = s.taboption('proxy', form.Value, 'socks_host', _('SOCKS proxy host'));
		o.depends('routing_core', 'nftables');
		o = s.taboption('proxy', form.Value, 'socks_port', _('SOCKS proxy порт'));
		o.datatype = 'port';
		o.depends('routing_core', 'nftables');
		o = s.taboption('proxy', form.Flag, 'redirect_to_olcrtcwrt', _('Перенаправлять прокси на olcrtcwrt'));
		o.depends('routing_core', 'nftables');

		o = s.taboption('proxy', form.ListValue, 'proxy_mode', _('Режим маршрутизации'));
		o.value('disabled', _('Отключено'));
		o.value('global', _('Глобальный прокси'));
		o.value('list', _('Список прокси'));
		o = s.taboption('proxy', form.Flag, 'bypass_local', _('Обходить локальные/частные сети'));
		o.depends('routing_core', 'nftables');
		o = s.taboption('proxy', form.DynamicList, 'proxy_ips', _('Прокси IPv4 подсети/IP'));
		o.datatype = 'ip4addr';
		o.depends('routing_core', 'nftables');
		o = s.taboption('proxy', form.DynamicList, 'proxy_ips6', _('Прокси IPv6 подсети/IP'));
		o.datatype = 'ip6addr';
		o.depends('routing_core', 'nftables');
		o = s.taboption('proxy', form.DynamicList, 'bypass_ips', _('Обход IPv4 подсети/IP'));
		o.datatype = 'ip4addr';
		o.depends('routing_core', 'nftables');
		o = s.taboption('proxy', form.DynamicList, 'bypass_ips6', _('Обход IPv6 подсети/IP'));
		o.datatype = 'ip6addr';
		o.depends('routing_core', 'nftables');

		o = s.taboption('proxy', form.DynamicList, 'bypass_server_domains', _('Домены/IP серверов для обхода'));
		o.placeholder = 'vps.example.com';
		o.depends('routing_core', 'sing-box');
		o.description = _('Заполняется автоматически из server_uri/vps_host серверов. Нужно для предотвращения петель маршрутизации в режиме TUN.');

		o = s.taboption('dns', form.Flag, 'dns_enabled', _('Включить DNS-маршрутизацию'));
		o = s.taboption('dns', form.Value, 'proxy_dns', _('Прокси DNS-сервер'));
		o.placeholder = '127.0.0.1#5353';
		o = s.taboption('dns', form.Value, 'fallback_dns', _('Резервный DNS-сервер'));
		o.placeholder = '8.8.8.8';
		o = s.taboption('dns', form.DynamicList, 'direct_domains', _('Прямые домены'));
		o = s.taboption('dns', form.DynamicList, 'proxy_domains', _('Прокси-домены'));

		o = s.taboption('subscription', form.Flag, 'subscription_enabled', _('Включить подписку'));
		o = s.taboption('subscription', form.Value, 'subscription_url', _('URL подписки'));
		o = s.taboption('subscription', form.Flag, 'subscription_auto_update', _('Автоматическое обновление'));
		o = s.taboption('subscription', form.Value, 'subscription_update_interval', _('Интервал обновления (часы)'));
		o.datatype = 'uinteger';

		/* ---------- Монтируемые вкладки ---------- */
		mountSection(m, 'dashboard', _('Панель'), dashboard.createDashboardContent);
		mountSection(m, 'monitoring', _('Мониторинг'), monitoring.createMonitoringContent);
		mountSection(m, 'diagnostic', _('Диагностика'), diagnostics.createDiagnosticContent);
		mountSection(m, 'updates', _('Компоненты'), components.createUpdatesContent);

		return m.render();
	}
});
