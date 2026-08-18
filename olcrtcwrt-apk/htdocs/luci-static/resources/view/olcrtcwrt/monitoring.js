'use strict';
'require view';
'require rpc';
'require ui';
'require view.olcrtcwrt.styles as styles';

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

return view.extend({
	paused: false,
	filter: 'active',
	device: 'all',
	search: '',
	data: [{ nodes: {} }, {}, {}],

	load: function() {
		return Promise.all([callStatus(), callPing(), callTraffic()]).catch(function(err) {
			ui.addNotification(null, E('p', _('Не удалось загрузить мониторинг: %s').format(err.message)));
			return [{ nodes: {} }, {}, {}];
		});
	},

	filteredNames: function() {
		var nodes = (this.data[0] || {}).nodes || {};
		var names = Object.keys(nodes);
		return names.filter(function(name) {
			var running = nodes[name] === 'running';
			var matchesState = this.filter === 'active' ? running : !running;
			var matchesDevice = this.device === 'all' || nodeType(name) === this.device;
			var matchesSearch = !this.search || nodeLabel(name).toLowerCase().indexOf(this.search.toLowerCase()) !== -1;
			return matchesState && matchesDevice && matchesSearch;
		}.bind(this));
	},

	renderTable: function() {
		var status = this.data[0] || {};
		var ping = this.data[1] || {};
		var traffic = this.data[2] || {};
		var nodes = status.nodes || {};
		var names = this.filteredNames();
		var rows = [];
		var allNames = Object.keys(nodes);

		if (!names.length) {
			rows.push(E('tr', { 'class': 'fkp_monitoring-page__state-row' }, [
				E('td', { 'class': 'fkp_monitoring-page__state', 'colspan': '5' },
					allNames.length ? _('Нет узлов, соответствующих фильтру') : _('Узлы не настроены'))
			]));
		}

		names.forEach(function(name) {
			var item = traffic[name] || {};
			var running = nodes[name] === 'running';
			rows.push(E('tr', {}, [
				E('td', { 'data-label': _('Узел') }, E('strong', {}, nodeLabel(name))),
				E('td', { 'data-label': _('Тип') }, nodeType(name)),
				E('td', { 'data-label': _('Состояние') }, running ? _('Работает') : _('Остановлен')),
				E('td', { 'data-label': _('Ping') }, val(ping[name], '-') + (ping[name] ? ' ms' : '')),
				E('td', { 'data-label': _('Трафик RX / TX') }, val(item.rx, '0') + ' / ' + val(item.tx, '0'))
			]));
		});

		return E('div', { 'class': 'fkp_monitoring-page__table-wrap' }, [
			E('table', { 'class': 'fkp_monitoring-page__table' }, [
				E('thead', {}, [E('tr', {}, [
					E('th', {}, _('Узел')),
					E('th', {}, _('Тип')),
					E('th', {}, _('Состояние')),
					E('th', {}, _('Ping')),
					E('th', {}, _('Трафик RX / TX'))
				])]),
				E('tbody', {}, rows)
			])
		]);
	},

	updateBody: function() {
		var body = document.getElementById('olcrtcwrt-monitoring-body');
		if (body)
			body.replaceChildren(this.renderTable());
		this.updateCounters();
	},

	updateCounters: function() {
		var nodes = ((this.data[0] || {}).nodes || {});
		var names = Object.keys(nodes);
		var active = names.filter(function(name) { return nodes[name] === 'running'; }).length;
		var activeTab = document.getElementById('olcrtcwrt-monitoring-active');
		var closedTab = document.getElementById('olcrtcwrt-monitoring-closed');
		if (activeTab) activeTab.textContent = _('Активные') + ' ' + active;
		if (closedTab) closedTab.textContent = _('Остановленные') + ' ' + (names.length - active);
	},

	setFilter: function(filter) {
		this.filter = filter;
		this.updateBody();
		this.updateTabStyles();
	},

	updateTabStyles: function() {
		var active = document.getElementById('olcrtcwrt-monitoring-active');
		var closed = document.getElementById('olcrtcwrt-monitoring-closed');
		if (active) active.classList.toggle('fkp_monitoring-page__tab--active', this.filter === 'active');
		if (closed) closed.classList.toggle('fkp_monitoring-page__tab--active', this.filter === 'closed');
	},

	togglePause: function() {
		this.paused = !this.paused;
		var button = document.getElementById('olcrtcwrt-monitoring-pause');
		if (button) button.textContent = this.paused ? _('Продолжить') : _('Пауза');
	},

	render: function(data) {
		styles.inject();
		this.data = data;
		this.pollHandle = L.Request.poll.add(L.bind(this.poll, this), 5000);
		var self = this;
		var controls = E('div', { 'class': 'fkp_monitoring-page__controls' }, [
			E('div', { 'class': 'fkp_monitoring-page__tabs' }, [
				E('button', {
					'id': 'olcrtcwrt-monitoring-active',
					'class': 'btn cbi-button fkp_monitoring-page__tab fkp_monitoring-page__tab--active',
					'click': function() { self.setFilter('active'); }
				}, _('Активные')),
				E('button', {
					'id': 'olcrtcwrt-monitoring-closed',
					'class': 'btn cbi-button fkp_monitoring-page__tab',
					'click': function() { self.setFilter('closed'); }
				}, _('Остановленные'))
			]),
			E('div', { 'class': 'fkp_monitoring-page__filters' }, [
				E('select', {
					'class': 'cbi-input-select fkp_monitoring-page__device-filter',
					'change': function(ev) { self.device = ev.target.value; self.updateBody(); }
				}, [
					E('option', { 'value': 'all' }, _('Все компоненты')),
					E('option', { 'value': 'olcrtc' }, 'olcrtc'),
					E('option', { 'value': 'WDTT' }, 'WDTT')
				]),
				E('input', {
					'class': 'cbi-input-text fkp_monitoring-page__search-input',
					'type': 'search',
					'placeholder': _('Поиск'),
					'keyup': function(ev) { self.search = ev.target.value; self.updateBody(); }
				})
			]),
			E('div', { 'class': 'fkp_monitoring-page__actions' }, [
				E('button', {
					'id': 'olcrtcwrt-monitoring-pause',
					'class': 'btn cbi-button fkp_monitoring-page__icon-button',
					'click': function() { self.togglePause(); }
				}, _('Пауза')),
				E('button', {
					'class': 'btn cbi-button fkp_monitoring-page__icon-button',
					'click': ui.createHandlerFn(this, 'refresh')
				}, _('Обновить'))
			])
		]);

		return E('div', { 'class': 'cbi-map olcrtcwrt-forkop-page fkp_monitoring-page' }, [
			E('h2', {}, _('Мониторинг')),
			E('p', {}, _('Состояние туннелей olcrtc и WDTT, задержка и трафик.')),
			controls,
			E('div', { 'id': 'olcrtcwrt-monitoring-body', 'class': 'fkp_monitoring-page__body' }, this.renderTable()),
			E('div', { 'class': 'cbi-section-descr' }, _('Обновление выполняется каждые 5 секунд.'))
		]);
	},

	poll: function() {
		if (this.paused)
			return;
		return Promise.all([callStatus(), callPing(), callTraffic()]).then(function(data) {
			this.data = data;
			this.updateBody();
		}.bind(this)).catch(function(err) {
			console.warn('olcrtcwrt monitoring update failed:', err);
		});
	},

	refresh: function() {
		return this.load().then(function(data) {
			var root = document.querySelector('.fkp_monitoring-page');
			if (root)
				root.parentNode.replaceChild(this.render(data), root);
		}.bind(this));
	},

	remove: function() {
		if (this.pollHandle)
			L.Request.poll.remove(this.pollHandle);
		return this.super('remove', arguments);
	}
});
