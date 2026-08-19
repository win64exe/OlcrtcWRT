'use strict';
'require baseclass';
'require form';
'require poll';
'require rpc';
'require ui';

var callStatus = rpc.declare({ object: 'olcrtcwrt', method: 'status', reject: true });
var callPing = rpc.declare({ object: 'olcrtcwrt', method: 'ping', reject: true });
var callTraffic = rpc.declare({ object: 'olcrtcwrt', method: 'traffic', reject: true });
var callNodeAction = {
	start: rpc.declare({ object: 'olcrtcwrt', method: 'start', params: { type: '', section: '' }, reject: true }),
	stop: rpc.declare({ object: 'olcrtcwrt', method: 'stop', params: { type: '', section: '' }, reject: true }),
	restart: rpc.declare({ object: 'olcrtcwrt', method: 'restart', params: { type: '', section: '' }, reject: true })
};

function nodeType(name) {
	return name.indexOf('wdtt_') === 0 ? 'WDTT' : 'olcrtc';
}

function nodeLabel(name) {
	return name.replace(/^olcrtcwrt_/, 'olcrtc: ').replace(/^wdtt_/, 'WDTT: ');
}

function val(value, fallback) {
	return value === undefined || value === null || value === '' ? fallback : value;
}

function renderWidget(title, items) {
	return E('div', { 'class': 'fkp_dashboard-page__widgets-section__item' }, [
		E('b', { 'class': 'fkp_dashboard-page__widgets-section__item__title' }, title),
		(items || []).map(function(item) {
			return E('div', { 'class': 'fkp_dashboard-page__widgets-section__item__row ' + (item['class'] || '') }, [
				E('span', { 'class': 'fkp_dashboard-page__widgets-section__item__row__key' }, item.key + ': '),
				E('span', { 'class': 'fkp_dashboard-page__widgets-section__item__row__value' }, item.value)
			]);
		})
	]);
}

function renderLatencyClass(latency) {
	if (!latency)
		return 'fkp_dashboard-page__outbound-grid__item__latency--empty';
	if (latency < 800)
		return 'fkp_dashboard-page__outbound-grid__item__latency--green';
	if (latency < 1500)
		return 'fkp_dashboard-page__outbound-grid__item__latency--yellow';
	return 'fkp_dashboard-page__outbound-grid__item__latency--red';
}

var DashboardTab = {
	pollFn: null,

	render: function() {
		return E('div', { 'id': 'dashboard-status', 'class': 'fkp_dashboard-page' }, [
			E('div', { 'class': 'fkp_dashboard-page__service-stopped', 'role': 'status' },
				_('Служба OlcrtcWRT остановлена. Запустите службу, чтобы отобразить панель.')),
			E('div', { 'class': 'fkp_dashboard-page__content' }, [
				E('div', { 'class': 'fkp_dashboard-page__widgets-section' }, [
					E('div', { 'id': 'dashboard-widget-traffic' },
						renderWidget(_('Трафик'), [])),
					E('div', { 'id': 'dashboard-widget-traffic-total' },
						renderWidget(_('Трафик (всего)'), [])),
					E('div', { 'id': 'dashboard-widget-system-info' },
						renderWidget(_('Система'), [])),
					E('div', { 'id': 'dashboard-widget-service-info' },
						renderWidget(_('Службы'), []))
				]),
				E('div', { 'id': 'dashboard-sections-grid' }, [
					E('div', { 'id': 'dashboard-sections-grid-skeleton',
						'class': 'fkp_dashboard-page__outbound-section skeleton', 'style': 'height: 127px' })
				])
			])
		]);
	},

	initController: function() {
		var self = this;
		if (!this.pollFn) {
			this.pollFn = L.bind(this.refresh, this);
			poll.add(this.pollFn, 5);
			this.refresh();
		}
	},

	refresh: function() {
		var self = this;
		return Promise.all([callStatus(), callPing(), callTraffic()]).then(function(data) {
			var status = data[0] || {};
			var ping = data[1] || {};
			var traffic = data[2] || {};
			var nodes = status.nodes || {};
			var names = Object.keys(nodes);
			var running = names.filter(function(name) { return nodes[name] === 'running'; });

			var serviceStopped = document.querySelector('.fkp_dashboard-page__service-stopped');
			if (serviceStopped)
				serviceStopped.style.display = running.length ? 'none' : '';

			var trafficWidget = document.getElementById('dashboard-widget-traffic');
			if (trafficWidget) {
				var items = names.map(function(name) {
					var t = traffic[name] || {};
					return { key: nodeLabel(name), value: val(t.rx, '0') + ' / ' + val(t.tx, '0') };
				});
				trafficWidget.replaceChildren(renderWidget(_('Трафик'), items));
			}

			var trafficTotalWidget = document.getElementById('dashboard-widget-traffic-total');
			if (trafficTotalWidget) {
				var rxTotal = 0, txTotal = 0;
				names.forEach(function(name) {
					var t = traffic[name] || {};
					rxTotal += parseInt(t.rx, 10) || 0;
					txTotal += parseInt(t.tx, 10) || 0;
				});
				trafficTotalWidget.replaceChildren(renderWidget(_('Трафик (всего)'), [
					{ key: _('RX'), value: String(rxTotal) },
					{ key: _('TX'), value: String(txTotal) }
				]));
			}

			var systemWidget = document.getElementById('dashboard-widget-system-info');
			if (systemWidget) {
				systemWidget.replaceChildren(renderWidget(_('Система'), [
					{ key: _('Узлов'), value: String(names.length) },
					{ key: _('Активных'), value: String(running.length) }
				]));
			}

			var serviceWidget = document.getElementById('dashboard-widget-service-info');
			if (serviceWidget) {
				serviceWidget.replaceChildren(renderWidget(_('Службы'), [
					{ key: _('olcrtc'), value: String(running.filter(function(n) { return nodeType(n) === 'olcrtc'; }).length) },
					{ key: _('WDTT'), value: String(running.filter(function(n) { return nodeType(n) === 'WDTT'; }).length) }
				]));
			}

			var nodesGrid = document.getElementById('dashboard-sections-grid');
			if (nodesGrid)
				nodesGrid.replaceChildren(self.renderNodeSection(names, nodes, ping, traffic));
		}).catch(function(err) {
			console.error('olcrtcwrt dashboard refresh error:', err);
		});
	},

	renderNodeSection: function(names, nodes, ping, traffic) {
		var self = this;
		var items = names.map(function(name) {
			var running = nodes[name] === 'running';
			var p = ping[name] || '';
			var t = traffic[name] || {};
			return E('div', {
				'class': 'fkp_dashboard-page__outbound-grid__item' + (running ? ' fkp_dashboard-page__outbound-grid__item--active' : '')
			}, [
				E('div', { 'class': 'fkp_dashboard-page__outbound-grid__item__header' }, [
					E('b', {}, nodeLabel(name)),
					E('span', { 'class': 'fkp_dashboard-page__outbound-grid__item__type' }, nodeType(name))
				]),
				E('div', { 'class': 'fkp_dashboard-page__outbound-grid__item__footer' }, [
					E('span', { 'class': 'fkp_dashboard-page__outbound-grid__item__latency ' + renderLatencyClass(p) },
						p ? (p + ' ms') : _('нет ping')),
					E('span', {}, _('RX/TX') + ': ' + val(t.rx, '0') + ' / ' + val(t.tx, '0'))
				]),
				E('div', { 'class': 'fkp_dashboard-page__outbound-grid__item__actions' }, [
					E('button', {
						'class': 'btn cbi-button cbi-button-apply',
						'click': ui.createHandlerFn(self, 'nodeAction', name, 'start')
					}, _('Запустить')),
					E('button', {
						'class': 'btn cbi-button cbi-button-reset',
						'click': ui.createHandlerFn(self, 'nodeAction', name, 'stop')
					}, _('Остановить')),
					E('button', {
						'class': 'btn cbi-button cbi-button-neutral',
						'click': ui.createHandlerFn(self, 'nodeAction', name, 'restart')
					}, _('Перезапустить'))
				])
			]);
		});
		return E('div', { 'class': 'fkp_dashboard-page__outbound-section' }, [
			E('div', { 'class': 'fkp_dashboard-page__outbound-section__title-section' }, [
				E('b', { 'class': 'fkp_dashboard-page__outbound-section__title-section__title' }, _('Узлы'))
			]),
			E('div', { 'class': 'fkp_dashboard-page__outbound-grid' }, items.length ? items :
				E('div', { 'class': 'fkp_dashboard-page__outbound-section centered', 'style': 'height: 60px' },
					E('span', {}, _('Узлы не настроены'))))
		]);
	},

	nodeAction: function(name, action) {
		var type = name.indexOf('wdtt') === 0 ? 'wdtt' : 'olcrtcwrt';
		var section = name.replace(/^(olcrtcwrt|wdtt)_/, '');
		return callNodeAction[action]({ type: type, section: section }).then(function() {
			ui.addNotification(null, E('p', _('%s: %s выполнено').format(nodeLabel(name), action)));
			return DashboardTab.refresh();
		}).catch(function(err) {
			ui.addNotification(null, E('p', _('Не удалось выполнить %s для %s: %s').format(action, name, err.message)));
		});
	}
};

function createDashboardContent(section) {
	var o = section.option(form.DummyValue, '_mount_node');
	o.rawhtml = true;
	o.cfgvalue = function() {
		var node = DashboardTab.render();
		window.setTimeout(function() { DashboardTab.initController(); }, 0);
		return node;
	};
}

return baseclass.extend({
	DashboardTab: DashboardTab,
	createDashboardContent: createDashboardContent
});
