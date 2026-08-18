'use strict';
'require view';
'require rpc';
'require ui';
'require view.olcrtcwrt.styles as styles';

var callStatus = rpc.declare({
	object: 'olcrtcwrt',
	method: 'status',
	reject: true
});
var callPing = rpc.declare({
	object: 'olcrtcwrt',
	method: 'ping',
	reject: true
});
var callTraffic = rpc.declare({
	object: 'olcrtcwrt',
	method: 'traffic',
	reject: true
});
var callNodeAction = {
	start: rpc.declare({
		object: 'olcrtcwrt',
		method: 'start',
		params: { type: '', section: '' },
		reject: true
	}),
	stop: rpc.declare({
		object: 'olcrtcwrt',
		method: 'stop',
		params: { type: '', section: '' },
		reject: true
	}),
	restart: rpc.declare({
		object: 'olcrtcwrt',
		method: 'restart',
		params: { type: '', section: '' },
		reject: true
	})
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

return view.extend({
	load: function() {
		return Promise.all([
			callStatus(),
			callPing(),
			callTraffic()
		]).catch(function(err) {
			ui.addNotification(null, E('p', _('Не удалось загрузить данные панели: %s').format(err.message)));
			return [{ nodes: {} }, {}, {}];
		});
	},

	pollStatus: function() {
		var self = this;
		return Promise.all([
			callStatus(),
			callPing(),
			callTraffic()
		]).then(function(data) {
			var status = data[0] || {};
			var ping = data[1] || {};
			var traffic = data[2] || {};
			var nodes = status.nodes || {};

			var tbody = document.getElementById('olcrtcwrt-nodes-body');
			if (!tbody) return;

			Object.keys(nodes).forEach(function(nodeName) {
				var state = nodes[nodeName] || 'unknown';
				var nodePing = (ping || {})[nodeName] || '-';
				var nodeTraffic = (traffic || {})[nodeName] || {};
				var rx = nodeTraffic.rx || '0';
				var tx = nodeTraffic.tx || '0';

				var row = document.getElementById('node-row-' + nodeName);
				if (!row) {
					row = self.createNodeRow(nodeName);
					tbody.appendChild(row);
				}

				var statusEl = document.getElementById('node-status-' + nodeName);
				var pingEl = document.getElementById('node-ping-' + nodeName);
				var trafficEl = document.getElementById('node-traffic-' + nodeName);

				if (statusEl) {
					statusEl.textContent = state === 'running' ? _('Работает') : _('Остановлен');
					statusEl.style.color = state === 'running' ? 'var(--success-color-medium)' : 'var(--warn-color-medium)';
				}
				if (pingEl) pingEl.textContent = val(nodePing, '-') + (nodePing ? ' ms' : '');
				if (trafficEl) trafficEl.textContent = rx + ' / ' + tx;
			});
		}).catch(function(err) {
			console.error('olcrtcwrt dashboard poll error:', err);
		});
	},

	createNodeRow: function(nodeName) {
		var self = this;
		return E('tr', { 'id': 'node-row-' + nodeName }, [
			E('td', { 'data-label': _('Узел') }, E('strong', {}, nodeLabel(nodeName))),
			E('td', { 'data-label': _('Тип') }, nodeType(nodeName)),
			E('td', { 'id': 'node-status-' + nodeName, 'class': 'cbi-value-warning', 'data-label': _('Состояние') }, _('Неизвестно')),
			E('td', { 'id': 'node-ping-' + nodeName, 'data-label': _('Ping') }, '-'),
			E('td', { 'id': 'node-traffic-' + nodeName, 'data-label': _('Трафик RX / TX') }, '0 / 0'),
			E('td', { 'data-label': _('Действия') }, [
				E('button', {
					'class': 'btn cbi-button cbi-button-apply',
					'click': ui.createHandlerFn(self, 'handleStartStop', nodeName, 'start')
				}, _('Запустить')),
				' ',
				E('button', {
					'class': 'btn cbi-button cbi-button-reset',
					'click': ui.createHandlerFn(self, 'handleStartStop', nodeName, 'stop')
				}, _('Остановить')),
				' ',
				E('button', {
					'class': 'btn cbi-button cbi-button-neutral',
					'click': ui.createHandlerFn(self, 'handleStartStop', nodeName, 'restart')
				}, _('Перезапустить'))
			])
		]);
	},

	render: function(data) {
		styles.inject();
		var self = this;
		var status = data[0] || {};
		var nodes = status.nodes || {};

		this.pollFn = L.bind(this.pollStatus, this);
		L.Request.poll.add(this.pollFn, 5000);

		var tbody = E('tbody', { 'id': 'olcrtcwrt-nodes-body' });

		Object.keys(nodes).forEach(function(nodeName) {
			tbody.appendChild(self.createNodeRow(nodeName));
		});

		return E('div', { 'class': 'cbi-map olcrtcwrt-forkop-page fkp_monitoring-page' }, [
			E('h2', {}, _('Панель')),
			E('p', {}, _('Состояние, ping и трафик узлов olcrtc и WDTT в реальном времени.')),
			E('div', { 'class': 'fkp_monitoring-page__controls' }, [
				E('div', { 'class': 'fkp_monitoring-page__actions' }, [
					E('button', {
						'class': 'btn cbi-button cbi-button-apply',
						'click': ui.createHandlerFn(this, 'handleRefresh')
					}, _('Обновить'))
				])
			]),
			E('div', { 'class': 'fkp_monitoring-page__table-wrap' }, [
				E('table', { 'class': 'fkp_monitoring-page__table' }, [
					E('thead', {}, [E('tr', {}, [
						E('th', {}, _('Узел')),
						E('th', {}, _('Тип')),
						E('th', {}, _('Состояние')),
						E('th', {}, _('Ping')),
						E('th', {}, _('Трафик RX / TX')),
						E('th', {}, _('Действия'))
					])]),
					tbody
				])
			]),
			E('div', { 'class': 'cbi-section-descr' }, _('Обновление выполняется каждые 5 секунд.'))
		]);
	},

	handleStartStop: function(nodeName, action, ev) {
		var type = nodeName.indexOf('wdtt') === 0 ? 'wdtt' : 'olcrtcwrt';
		var section = nodeName.replace(/^(olcrtcwrt|wdtt)_/, '');
		return callNodeAction[action]({ type: type, section: section }).then(function() {
			ui.addNotification(null, E('p', _('%s: %s выполнено').format(nodeLabel(nodeName), action)));
		}).catch(function(err) {
			ui.addNotification(null, E('p', _('Не удалось выполнить %s для %s: %s').format(action, nodeName, err.message)));
		});
	},

	handleRefresh: function() {
		return this.pollStatus();
	},

	remove: function() {
		if (this.pollFn)
			L.Request.poll.remove(this.pollFn);
		return this.super('remove', arguments);
	}
});
