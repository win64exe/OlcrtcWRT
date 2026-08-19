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
			_('Настройки OlcrtcWRT — клиенты olcrtc и WDTT.'));
		m.tabbed = true;
		var s, o;

		/* ---------- Селекторы ---------- */
		s = m.section(form.GridSection, 'node', _('Селекторы'),
			_('Добавьте узел, выберите тип и откройте его параметры кнопкой «Изменить».'));
		configureGridSection(s, _('Селектор'), _('Добавить селектор'));

		s.tab('connection', _('Подключение'));
		s.tab('runtime', _('Параметры'));

		/* Название — в модальном окне редактирования (как у forkop) */
		o = s.taboption('connection', form.Value, 'label', _('Название'));
		o.placeholder = _('Например: основной olcrtc');
		o.rmempty = false;
		o.load = function(section_id) {
			return uci.get(UCI_PACKAGE, section_id, 'label') || section_id;
		};

		/* Включён — редактируемый чекбокс прямо в таблице (как Enable у forkop) */
		o = s.taboption('connection', form.Flag, 'enabled', _('Включен'));
		o.rmempty = false;
		o.editable = true;
		o.width = '6rem';

		/* Тип — колонка-отображение в таблице (как Action у forkop) */
		o = s.taboption('connection', form.DummyValue, '_type_display', _('Тип'));
		o.modalonly = false;
		o.rawhtml = true;
		o.width = '7rem';
		o.cfgvalue = function(section_id) {
			return nodeTypeDisplay(section_id);
		};
		o.textvalue = function(section_id) {
			return nodeTypeDisplay(section_id);
		};

		/* Тип — реальный список значений (только в модальном окне) */
		o = s.taboption('connection', form.ListValue, 'type', _('Тип'));
		o.value('olcrtcwrt', 'olcrtc');
		o.value('wdtt', 'WDTT');
		o.value('bypass', _('Обход'));
		o.rmempty = false;

		o = s.taboption('connection', form.ListValue, 'mode', _('Режим'));
		o.value('client', _('Клиент'));
		o.value('server', _('Сервер'));
		o.depends('type', 'olcrtcwrt');

		o = s.taboption('connection', form.Value, 'connection_uri', _('URI подключения'));
		o.placeholder = 'olcrtc://provider?transport<opts>@room#key';
		o.depends({ type: 'olcrtcwrt', mode: 'client' });
		o.validate = function(section_id, value) {
			if (!value)
				return true;
			if (!/^olcrtc:\/\/[^?@#]+(\?[^@#]+)?@[^#]+#.+$/.test(value))
				return _('Неверный формат. Ожидается olcrtc://provider?transport<opts>@room#key');
			return true;
		};

		o = s.taboption('connection', form.Value, 'server_uri', _('URI сервера / Room UUID'));
		o.depends({ type: 'olcrtcwrt', mode: 'client', connection_uri: '' });

		o = s.taboption('connection', form.Value, 'shared_key', _('Общий ключ'));
		o.password = true;
		o.depends({ type: 'olcrtcwrt', mode: 'client', connection_uri: '' });

		o = s.taboption('connection', form.ListValue, 'provider', _('Провайдер'));
		o.value('jitsi', 'Jitsi');
		o.value('telemost', 'Yandex Telemost');
		o.value('wbstream', 'WB Stream');
		o.depends({ type: 'olcrtcwrt', mode: 'client', connection_uri: '' });

		o = s.taboption('connection', form.ListValue, 'transport', _('Транспорт'));
		o.value('datachannel', 'datachannel');
		o.value('vp8channel', 'vp8channel');
		o.value('seichannel', 'seichannel');
		o.value('videochannel', 'videochannel');
		o.depends({ type: 'olcrtcwrt', mode: 'client', connection_uri: '' });

		o = s.taboption('connection', form.Value, 'local_socks_host', _('Локальный SOCKS host'));
		o.depends({ type: 'olcrtcwrt', mode: 'client' });

		o = s.taboption('connection', form.Value, 'local_socks_port', _('Локальный SOCKS порт'));
		o.datatype = 'port';
		o.depends({ type: 'olcrtcwrt', mode: 'client' });

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

		o = s.taboption('runtime', form.DynamicList, 'bypass_ips', _('IPv4 сети/IP для обхода'));
		o.datatype = 'ip4addr';
		o.depends('type', 'bypass');

		o = s.taboption('runtime', form.DynamicList, 'bypass_ips6', _('IPv6 сети/IP для обхода'));
		o.datatype = 'ip6addr';
		o.depends('type', 'bypass');

		o = s.taboption('runtime', form.Value, 'dialer_proxy', _('Прокси для подключения'));
		o.placeholder = _('Имя другого узла для SOCKS upstream');
		o.depends({ type: 'olcrtcwrt', mode: 'client' });
		o.depends('type', 'wdtt');

		o = s.taboption('runtime', form.Value, 'extra_args', _('Дополнительные аргументы'));

		/* Параметры вкладок отображаются только в модальном окне редактирования.
		 * В таблице остаются: «Включен» (editable) и «Тип» (_type_display) + действия. */
		s.children.forEach(function(opt) {
			if (opt.tab && opt.modalonly === undefined && opt.option !== 'enabled')
				opt.modalonly = true;
		});

		/* ---------- Настройки: Общие ---------- */
		s = m.section(form.NamedSection, 'global', 'global', _('Общие'));
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

		/* ---------- Настройки: Прокси и маршрутизация ---------- */
		s = m.section(form.NamedSection, 'proxy', 'proxy', _('Прокси и маршрутизация'));

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

		/* ---------- Настройки: DNS ---------- */
		s = m.section(form.NamedSection, 'dns', 'dns', _('DNS'));

		o = s.option(form.Flag, 'enabled', _('Включить DNS-маршрутизацию'));
		o = s.option(form.Value, 'proxy_dns', _('Прокси DNS-сервер'));
		o.placeholder = '127.0.0.1#5353';
		o = s.option(form.Value, 'fallback_dns', _('Резервный DNS-сервер'));
		o.placeholder = '8.8.8.8';
		o = s.option(form.DynamicList, 'direct_domains', _('Прямые домены'));
		o = s.option(form.DynamicList, 'proxy_domains', _('Прокси-домены'));

		/* ---------- Настройки: Подписка ---------- */
		s = m.section(form.NamedSection, 'main', 'subscription', _('Подписка'));
		o = s.option(form.Flag, 'enabled', _('Включить подписку'));
		o = s.option(form.Value, 'url', _('URL подписки'));
		o = s.option(form.Flag, 'auto_update', _('Автоматическое обновление'));
		o = s.option(form.Value, 'update_interval', _('Интервал обновления (часы)'));
		o.datatype = 'uinteger';

		/* ---------- Монтируемые вкладки ---------- */
		mountSection(m, 'dashboard', _('Панель'), dashboard.createDashboardContent);
		mountSection(m, 'monitoring', _('Мониторинг'), monitoring.createMonitoringContent);
		mountSection(m, 'diagnostic', _('Диагностика'), diagnostics.createDiagnosticContent);
		mountSection(m, 'updates', _('Компоненты'), components.createUpdatesContent);

		return m.render();
	}
});
