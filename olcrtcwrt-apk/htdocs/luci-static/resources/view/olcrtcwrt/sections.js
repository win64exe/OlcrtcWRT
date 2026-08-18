'use strict';
'require view';
'require uci';
'require form';
'require ui';
'require view.olcrtcwrt.styles as styles';

return view.extend({
	load: function() {
		return uci.load('olcrtcwrt');
	},

	render: function() {
		var m, s, o;

		styles.inject();
		m = new form.Map('olcrtcwrt', _('Селекторы'),
			_('Настройка узлов olcrtc и WDTT в стиле forkop. Перетаскивайте строки для изменения приоритета.'));
		m.tabbed = true;

		s = m.section(form.GridSection, 'node', _('Селекторы'),
			_('Добавьте узел, выберите тип и откройте его параметры кнопкой «Изменить».'));
		s.anonymous = false;
		s.addremove = true;
		s.sortable = true;
		s.rowcolors = true;
		s.nodescriptions = true;
		s.tab('nodes', _('Селекторы'));
		s.tab('connection', _('Подключение'), _('Параметры подключения и локального прокси.'));
		s.tab('runtime', _('Параметры'), _('Параметры WDTT, обхода и дополнительные аргументы.'));
		s.modaltitle = function(section_id) {
			var label = uci.get('olcrtcwrt', section_id, 'label');
			return section_id ? _('Селектор: %s').format(label || section_id) : _('Добавить селектор');
		};
		s.sectiontitle = function(section_id) {
			return uci.get('olcrtcwrt', section_id, 'label') || section_id;
		};
		s.renderRowActions = function(section_id) {
			return form.TableSection.prototype.renderRowActions.call(this, section_id, _('Изменить'));
		};

		o = s.option(form.Value, 'label', _('Название'));
		o.placeholder = _('Например: основной olcrtc');
		o.rmempty = false;

		o = s.option(form.Flag, 'enabled', _('Включен'));

		o = s.option(form.ListValue, 'type', _('Тип'));
		o.value('olcrtcwrt', 'olcrtc');
		o.value('wdtt', 'WDTT');
		o.value('bypass', _('Обход'));

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

		s = m.section(form.NamedSection, 'main', 'subscription', _('Подписка'));
		s.tab('subscription', _('Подписка'));
		o = s.option(form.Flag, 'enabled', _('Включить подписку'));
		o = s.option(form.Value, 'url', _('URL подписки'));
		o = s.option(form.Flag, 'auto_update', _('Автоматическое обновление'));
		o = s.option(form.Value, 'update_interval', _('Интервал обновления (часы)'));
		o.datatype = 'uinteger';

		return m.render().then(function(node) {
			node.classList.add('olcrtcwrt-forkop-selectors');
			return node;
		});
	}
});
