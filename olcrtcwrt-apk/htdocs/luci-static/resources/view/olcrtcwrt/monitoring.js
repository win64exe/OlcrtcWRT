'use strict';
'require baseclass';
'require form';
'require rpc';
'require ui';

var callStatus = rpc.declare({ object: 'olcrtcwrt', method: 'status', reject: true });
var callPing = rpc.declare({ object: 'olcrtcwrt', method: 'ping', reject: true });
var callTraffic = rpc.declare({ object: 'olcrtcwrt', method: 'traffic', reject: true });

function nodeType(name) {
	return name.indexOf('wdtt_') === 0 ? 'WDTT' : 'olcrtc';
}

function nodeLabel(name) {
	return name.replace(/^olcrtcwrt_/, 'olcrtc: ').replace(/^wdtt_/, 'WDTT: ');
}

function val(value, fallback) {
	return value === undefined || value === null || value === '' ? fallback : value;
}

function renderTableCell(label, children) {
	var cell = E('td', {}, children);
	cell.setAttribute('data-label', label);
	return cell;
}

function renderStateRow(text, className) {
	return E('tr', { 'class': 'fkp_monitoring-page__state-row' }, [
		E('td', { 'class': 'fkp_monitoring-page__state-cell', 'colspan': '7' }, [
			E('div', { 'class': ['fkp_monitoring-page__state', className || ''].filter(Boolean).join(' ') }, text)
		])
	]);
}

var MonitoringTab = {
	pollFn: null,
	paused: false,
	activeTab: 'active',
	device: 'all',
	search: '',
	data: [{ nodes: {} }, {}, {}],

	render: function() {
		return E('div', { 'id': 'monitoring-status', 'class': 'fkp_monitoring-page' }, [
			E('div', { 'class': 'fkp_monitoring-page__panel' }, [
				E('div', { 'class': 'fkp_monitoring-page__controls' }, [
					E('div', { 'class': 'fkp_monitoring-page__tabs' }, [
						E('button', {
							'id': 'monitoring-tab-active',
							'class': 'btn cbi-button fkp_monitoring-page__tab fkp_monitoring-page__tab--active',
							'type': 'button',
							'click': L.bind(function() { this.setTab('active'); }, this)
						}, E('span', { 'class': 'fkp_monitoring-page__tab-label' }, _('Активные'))),
						E('button', {
							'id': 'monitoring-tab-closed',
							'class': 'btn cbi-button fkp_monitoring-page__tab',
							'type': 'button',
							'click': L.bind(function() { this.setTab('closed'); }, this)
						}, E('span', { 'class': 'fkp_monitoring-page__tab-label' }, _('Остановленные')))
					]),
					E('div', { 'class': 'fkp_monitoring-page__filters' }, [
						E('select', {
							'id': 'monitoring-device-filter',
							'class': 'cbi-input-select fkp_monitoring-page__device-filter',
							'change': L.bind(function(ev) { this.device = ev.target.value; this.renderTable(); }, this)
						}, [
							E('option', { 'value': 'all' }, _('Все')),
							E('option', { 'value': 'olcrtc' }, 'olcrtc'),
							E('option', { 'value': 'WDTT' }, 'WDTT')
						]),
						E('label', { 'class': 'fkp_monitoring-page__search' }, [
							E('span', { 'class': 'fkp_monitoring-page__search-icon' }, []),
							E('input', {
								'id': 'monitoring-search',
								'class': 'cbi-input-text fkp_monitoring-page__search-input',
								'type': 'search',
								'placeholder': _('Поиск'),
								'autocomplete': 'off',
								'keyup': L.bind(function(ev) { this.search = ev.target.value; this.renderTable(); }, this)
							})
						])
					]),
					E('div', { 'class': 'fkp_monitoring-page__actions' }, [
						E('button', {
							'id': 'monitoring-pause-toggle',
							'class': 'btn cbi-button fkp_monitoring-page__icon-button',
							'title': _('Пауза обновления'),
							'aria-label': _('Пауза обновления'),
							'type': 'button',
							'click': L.bind(function() { this.togglePause(); }, this)
						}, _('⏸'))
					])
				]),
				E('div', { 'id': 'monitoring-connections', 'class': 'fkp_monitoring-page__body' }, [
					E('div', { 'class': 'fkp_monitoring-page__state fkp_monitoring-page__state--loading' },
						_('Загрузка...'))
				])
			])
		]);
	},

	initController: function() {
		var self = this;
		if (!this.pollFn) {
			this.pollFn = L.bind(this.refresh, this);
			L.poll.add(this.pollFn, 5);
			this.refresh();
		}
	},

	togglePause: function() {
		this.paused = !this.paused;
		var button = document.getElementById('monitoring-pause-toggle');
		if (button)
			button.classList.toggle('fkp_monitoring-page__icon-button--active', this.paused);
	},

	setTab: function(tab) {
		this.activeTab = tab;
		var active = document.getElementById('monitoring-tab-active');
		var closed = document.getElementById('monitoring-tab-closed');
		if (active) active.classList.toggle('fkp_monitoring-page__tab--active', tab === 'active');
		if (closed) closed.classList.toggle('fkp_monitoring-page__tab--active', tab === 'closed');
		this.renderTable();
	},

	filteredNames: function() {
		var nodes = (this.data[0] || {}).nodes || {};
		var names = Object.keys(nodes);
		return names.filter(function(name) {
			var running = nodes[name] === 'running';
			var matchesState = this.activeTab === 'active' ? running : !running;
			var matchesDevice = this.device === 'all' || nodeType(name) === this.device;
			var matchesSearch = !this.search || nodeLabel(name).toLowerCase().indexOf(this.search.toLowerCase()) !== -1;
			return matchesState && matchesDevice && matchesSearch;
		}.bind(this));
	},

	renderTable: function() {
		var body = document.getElementById('monitoring-connections');
		if (!body)
			return;
		var status = this.data[0] || {};
		var ping = this.data[1] || {};
		var traffic = this.data[2] || {};
		var nodes = status.nodes || {};
		var names = this.filteredNames();
		var allNames = Object.keys(nodes);
		var rows = [];

		if (!names.length) {
			rows.push(renderStateRow(
				allNames.length ? _('Нет узлов, соответствующих фильтру') : _('Узлы не настроены'),
				''));
		}

		names.forEach(function(name) {
			var running = nodes[name] === 'running';
			var p = ping[name] || '';
			var t = traffic[name] || {};
			rows.push(E('tr', {}, [
				renderTableCell(_('Узел'), E('b', {}, nodeLabel(name))),
				renderTableCell(_('Тип'), E('span', { 'class': 'fkp_monitoring-page__network' }, nodeType(name))),
				renderTableCell(_('Состояние'), E('span', { 'class': 'fkp_monitoring-page__route' },
					running ? _('Работает') : _('Остановлен'))),
				renderTableCell(_('Ping'), E('span', { 'class': 'fkp_monitoring-page__value' },
					p ? (p + ' ms') : '-')),
				renderTableCell(_('RX'), E('span', { 'class': 'fkp_monitoring-page__value' }, val(t.rx, '0'))),
				renderTableCell(_('TX'), E('span', { 'class': 'fkp_monitoring-page__value' }, val(t.tx, '0'))),
				renderTableCell(_('Тип узла'), E('span', { 'class': 'fkp_monitoring-page__value' }, name))
			]));
		});

		body.replaceChildren(E('div', { 'class': 'fkp_monitoring-page__table-wrap' }, [
			E('table', { 'class': 'table cbi-section-table fkp_monitoring-page__table' }, [
				E('thead', {}, [E('tr', {}, [
					E('th', {}, _('Узел')),
					E('th', {}, _('Тип')),
					E('th', {}, _('Состояние')),
					E('th', {}, _('Ping')),
					E('th', {}, _('RX')),
					E('th', {}, _('TX')),
					E('th', {}, _('Секция'))
				])]),
				E('tbody', {}, rows)
			])
		]));
		this.updateCounters();
	},

	updateCounters: function() {
		var nodes = ((this.data[0] || {}).nodes || {});
		var names = Object.keys(nodes);
		var active = names.filter(function(name) { return nodes[name] === 'running'; }).length;
		var activeTab = document.getElementById('monitoring-tab-active');
		var closedTab = document.getElementById('monitoring-tab-closed');
		if (activeTab) activeTab.replaceChildren(E('span', { 'class': 'fkp_monitoring-page__tab-label' },
			_('Активные') + ' ' + active));
		if (closedTab) closedTab.replaceChildren(E('span', { 'class': 'fkp_monitoring-page__tab-label' },
			_('Остановленные') + ' ' + (names.length - active)));
	},

	refresh: function() {
		var self = this;
		if (this.paused)
			return Promise.resolve();
		return Promise.all([callStatus(), callPing(), callTraffic()]).then(function(data) {
			self.data = data;
			self.renderTable();
		}).catch(function(err) {
			console.error('olcrtcwrt monitoring refresh error:', err);
		});
	}
};

function createMonitoringContent(section) {
	var o = section.option(form.DummyValue, '_mount_node');
	o.rawhtml = true;
	o.cfgvalue = function() {
		MonitoringTab.initController();
		return MonitoringTab.render();
	};
}

return baseclass.extend({
	MonitoringTab: MonitoringTab,
	createMonitoringContent: createMonitoringContent
});
