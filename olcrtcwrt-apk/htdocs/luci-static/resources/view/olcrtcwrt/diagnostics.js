'use strict';
'require view';
'require rpc';
'require ui';
'require view.olcrtcwrt.styles as styles';

var callStatus = rpc.declare({ object: 'olcrtcwrt', method: 'status', reject: true });
var callLogs = rpc.declare({ object: 'olcrtcwrt', method: 'logs', params: { type: '', lines: 50 }, reject: true });
var callNftables = rpc.declare({ object: 'olcrtcwrt', method: 'nftables', reject: true });
var callValidate = rpc.declare({ object: 'olcrtcwrt', method: 'validate', reject: true });

function alertCard(title, description, state, items) {
	var summary = (items || []).map(function(item) {
		return E('div', { 'class': 'fkp_diagnostic_alert__summary__item--' + item.state }, [
			E('b', {}, item.key + ': '),
			E('span', {}, item.value)
		]);
	});
	return E('div', { 'class': 'fkp_diagnostic_alert fkp_diagnostic_alert--' + state }, [
		E('div', { 'class': 'fkp_diagnostic_alert__icon' }, state === 'success' ? '✓' : state === 'warning' ? '!' : '×'),
		E('div', { 'class': 'fkp_diagnostic_alert__content' }, [
			E('b', { 'class': 'fkp_diagnostic_alert__title' }, title),
			E('div', { 'class': 'fkp_diagnostic_alert__description' }, description),
			E('div', { 'class': 'fkp_diagnostic_alert__summary' }, summary)
		])
	]);
}

return view.extend({
	load: function() {
		return Promise.all([
			callStatus(),
			callLogs({ type: 'olcrtcwrt', lines: 50 }),
			callLogs({ type: 'wdtt', lines: 50 }),
			callNftables(),
			callValidate()
		]).catch(function(err) {
			ui.addNotification(null, E('p', _('Не удалось загрузить диагностику: %s').format(err.message)));
			return [{ nodes: {} }, '', '', { ruleset: '' }, { valid: false, message: err.message }];
		});
	},

	render: function(data) {
		styles.inject();
		var status = data[0] || {};
		var olLogs = data[1] || '';
		var wdLogs = data[2] || '';
		var nftables = data[3] || {};
		var validation = data[4] || {};
		var nodes = status.nodes || {};
		var names = Object.keys(nodes);
		var running = names.filter(function(name) { return nodes[name] === 'running'; }).length;
		var nftState = validation.valid ? 'success' : 'warning';

		return E('div', { 'class': 'cbi-map olcrtcwrt-forkop-page fkp_diagnostic-page' }, [
			E('div', { 'class': 'fkp_diagnostic-page__left-bar' }, [
				E('button', {
					'class': 'btn cbi-button cbi-button-save',
					'click': ui.createHandlerFn(this, 'refresh')
				}, _('Запустить проверку снова')),
				E('div', { 'class': 'fkp_diagnostic-page__checks' }, [
					alertCard(_('Службы туннелей'), _('Состояние узлов olcrtc и WDTT.'), running ? 'success' : 'warning', [
						{ key: _('Всего узлов'), value: String(names.length), state: 'success' },
						{ key: _('Запущено'), value: String(running), state: running ? 'success' : 'warning' }
					]),
					alertCard(_('Проверка nftables'), validation.message || _('Проверка правил маршрутизации.'), nftState, [
						{ key: _('Состояние'), value: validation.valid ? _('Корректно') : _('Ошибка или правила отсутствуют'), state: nftState }
					]),
					E('div', { 'class': 'fkp_diagnostic-page__card' }, [
						E('b', { 'class': 'fkp_diagnostic-page__card-title' }, _('Таблица nftables')),
						E('textarea', { 'class': 'fkp_diagnostic-page__log', 'readonly': 'readonly' }, nftables.ruleset || _('Правила не созданы'))
					])
				])
			]),
			E('div', { 'class': 'fkp_diagnostic-page__right-bar' }, [
				E('div', { 'class': 'fkp_diagnostic-page__card' }, [
					E('b', { 'class': 'fkp_diagnostic-page__card-title' }, _('Сводка системы')),
					E('div', {}, _('Архитектура и версии компонентов доступны во вкладке «Компоненты».')),
					E('div', {}, _('Активных узлов: %s из %s').format(running, names.length))
				]),
				E('div', { 'class': 'fkp_diagnostic-page__card' }, [
					E('b', { 'class': 'fkp_diagnostic-page__card-title' }, _('Лог olcrtc')),
					E('textarea', { 'class': 'fkp_diagnostic-page__log', 'readonly': 'readonly' }, olLogs || _('Лог отсутствует'))
				]),
				E('div', { 'class': 'fkp_diagnostic-page__card' }, [
					E('b', { 'class': 'fkp_diagnostic-page__card-title' }, _('Лог WDTT')),
					E('textarea', { 'class': 'fkp_diagnostic-page__log', 'readonly': 'readonly' }, wdLogs || _('Лог отсутствует'))
				])
			])
		]);
	},

	refresh: function() {
		return this.load().then(function(data) {
			var root = document.querySelector('.fkp_diagnostic-page');
			if (root)
				root.parentNode.replaceChild(this.render(data), root);
		}.bind(this));
	}
});
