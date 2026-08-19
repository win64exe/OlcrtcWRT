'use strict';
'require baseclass';
'require form';
'require rpc';
'require ui';

var callStatus = rpc.declare({ object: 'olcrtcwrt', method: 'status', reject: true });
var callLogs = rpc.declare({ object: 'olcrtcwrt', method: 'logs', params: { type: '', lines: 50 }, reject: true });
var callNftables = rpc.declare({ object: 'olcrtcwrt', method: 'nftables', reject: true });
var callValidate = rpc.declare({ object: 'olcrtcwrt', method: 'validate', reject: true });
var callComponents = rpc.declare({ object: 'olcrtcwrt_components', method: 'status', reject: true });

function renderCheckSummary(items) {
	var renderedItems = (items || []).map(function(item) {
		var iconWrap = E('span', { 'class': 'fkp_diagnostic_alert__summary__item__icon' }, item.state === 'success' ? '✓' : item.state === 'warning' ? '!' : '×');
		return E('div', { 'class': 'fkp_diagnostic_alert__summary__item fkp_diagnostic_alert__summary__item--' + item.state }, [
			iconWrap,
			E('b', {}, item.key),
			E('div', {}, item.value)
		]);
	});
	return E('div', { 'class': 'fkp_diagnostic_alert__summary' }, renderedItems);
}

function alertCard(state, title, description, items) {
	var icon = state === 'success' ? '✓' : state === 'warning' ? '!' : '×';
	return E('div', { 'class': 'fkp_diagnostic_alert fkp_diagnostic_alert--' + state }, [
		E('span', { 'class': 'fkp_diagnostic_alert__icon' }, icon),
		E('div', { 'class': 'fkp_diagnostic_alert__content' }, [
			E('b', { 'class': 'fkp_diagnostic_alert__title' }, title),
			E('div', { 'class': 'fkp_diagnostic_alert__description' }, description)
		]),
		E('div', {}, ''),
		renderCheckSummary(items)
	]);
}

var DiagnosticTab = {
	render: function() {
		return E('div', { 'id': 'diagnostic-status', 'class': 'fkp_diagnostic-page' }, [
			E('div', { 'class': 'fkp_diagnostic-page__left-bar' }, [
				E('div', { 'id': 'fkp_diagnostic-page-run-check' }),
				E('div', { 'class': 'fkp_diagnostic-page__checks', 'id': 'fkp_diagnostic-page-checks' })
			]),
			E('div', { 'class': 'fkp_diagnostic-page__right-bar' }, [
				E('div', { 'id': 'fkp_diagnostic-page-wiki' }),
				E('div', { 'id': 'fkp_diagnostic-page-actions' }),
				E('div', { 'id': 'fkp_diagnostic-page-system-info' })
			])
		]);
	},

	initController: function() {
		var self = this;
		var runBtn = document.getElementById('fkp_diagnostic-page-run-check');
		if (runBtn) {
			runBtn.replaceChildren(E('div', { 'class': 'fkp_diagnostic-page__run_check_wrapper' }, [
				E('button', {
					'class': 'btn cbi-button cbi-button-save',
					'click': L.bind(function() { self.runChecks(); }, this)
				}, _('Запустить проверку'))
			]));
		}
		this.runChecks();
	},

	runChecks: function() {
		var self = this;
		var checks = document.getElementById('fkp_diagnostic-page-checks');
		if (checks)
			checks.replaceChildren(alertCard('loading', _('Проверка...'), _('Выполняется проверка служб.'), []));

		return Promise.all([callStatus(), callLogs({ type: 'olcrtcwrt', lines: 50 }), callLogs({ type: 'wdtt', lines: 50 }),
			callNftables(), callValidate(), callComponents()]).then(function(data) {
			var status = data[0] || {};
			var olLogs = (data[1] && data[1].log) || '';
			var wdLogs = (data[2] && data[2].log) || '';
			var nftables = data[3] || {};
			var validation = data[4] || {};
			var components = (data[5] && data[5].components) || {};
			var nodes = status.nodes || {};
			var names = Object.keys(nodes);
			var running = names.filter(function(name) { return nodes[name] === 'running'; }).length;
			var nftState = validation.valid ? 'success' : 'warning';

			if (checks) {
				checks.replaceChildren(
					alertCard(running ? 'success' : 'warning', _('Службы туннелей'), _('Состояние узлов olcrtc и WDTT.'), [
						{ key: _('Всего узлов'), value: String(names.length), state: 'success' },
						{ key: _('Запущено'), value: String(running), state: running ? 'success' : 'warning' }
					]),
					alertCard(nftState, _('Проверка nftables'), validation.message || _('Проверка правил маршрутизации.'), [
						{ key: _('Состояние'), value: validation.valid ? _('Корректно') : _('Ошибка или правила отсутствуют'), state: nftState }
					]),
					alertCard('success', _('Таблица nftables'), _('Текущие правила маршрутизации.'), [
						{ key: _('Правила'), value: nftables.ruleset ? _('Созданы') : _('Правила не созданы'), state: nftables.ruleset ? 'success' : 'warning' }
					])
				);
			}

			var systemInfo = document.getElementById('fkp_diagnostic-page-system-info');
			if (systemInfo) {
				systemInfo.replaceChildren(E('div', { 'class': 'fkp_diagnostic-page__right-bar__system-info' }, [
					E('b', { 'class': 'fkp_diagnostic-page__right-bar__system-info__title' }, _('Системная информация')),
					E('div', { 'class': 'fkp_diagnostic-page__right-bar__system-info__row' }, [
						E('span', {}, _('olcrtc') + ':'),
						E('span', { 'class': 'fkp_diagnostic-page__right-bar__system-info__row__tag ' +
							(components.olcrtc && components.olcrtc.installed ? '--success' : '--warning') },
							(components.olcrtc && components.olcrtc.version) || _('не установлен'))
					]),
					E('div', { 'class': 'fkp_diagnostic-page__right-bar__system-info__row' }, [
						E('span', {}, _('WDTT') + ':'),
						E('span', { 'class': 'fkp_diagnostic-page__right-bar__system-info__row__tag ' +
							(components.wdtt && components.wdtt.installed ? '--success' : '--warning') },
							(components.wdtt && components.wdtt.version) || _('не установлен'))
					]),
					E('div', { 'class': 'fkp_diagnostic-page__right-bar__system-info__row' }, [
						E('span', {}, _('sing-box') + ':'),
						E('span', { 'class': 'fkp_diagnostic-page__right-bar__system-info__row__tag ' +
							(components.sing_box && components.sing_box.installed ? '--success' : '--warning') },
							(components.sing_box && components.sing_box.version) || _('не установлен'))
					])
				]));
			}

			var actions = document.getElementById('fkp_diagnostic-page-actions');
			if (actions) {
				actions.replaceChildren(
					alertCard('success', _('Лог olcrtc'), _('Последние строки лога.'), [
						{ key: _('Строки'), value: olLogs ? String(olLogs.split('\n').length) : _('Лог отсутствует'), state: 'success' }
					]),
					alertCard('success', _('Лог WDTT'), _('Последние строки лога.'), [
						{ key: _('Строки'), value: wdLogs ? String(wdLogs.split('\n').length) : _('Лог отсутствует'), state: 'success' }
					])
				);
			}
		}).catch(function(err) {
			if (checks)
				checks.replaceChildren(alertCard('error', _('Ошибка диагностики'), err.message, []));
		});
	}
};

function createDiagnosticContent(section) {
	var o = section.option(form.DummyValue, '_mount_node');
	o.rawhtml = true;
	o.cfgvalue = function() {
		var node = DiagnosticTab.render();
		window.setTimeout(function() { DiagnosticTab.initController(); }, 0);
		return node;
	};
}

return baseclass.extend({
	DiagnosticTab: DiagnosticTab,
	createDiagnosticContent: createDiagnosticContent
});
