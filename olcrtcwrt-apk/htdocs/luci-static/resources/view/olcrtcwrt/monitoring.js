'use strict';
'require view';
'require rpc';
'require ui';

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

function value(value, fallback) {
	return value === undefined || value === null || value === '' ? fallback : value;
}

function nodeTitle(name) {
	return name.replace(/^olcrtcwrt_/, 'olcrtc: ').replace(/^wdtt_/, 'WDTT: ');
}

return view.extend({
	load: function() {
		return Promise.all([callStatus(), callPing(), callTraffic()]).catch(function(err) {
			ui.addNotification(null, E('p', _('Не удалось загрузить мониторинг: %s').format(err.message)));
			return [{ nodes: {} }, {}, {}];
		});
	},

	renderTable: function(data) {
		var status = data[0] || {};
		var ping = data[1] || {};
		var traffic = data[2] || {};
		var nodes = status.nodes || {};
		var rows = [E('div', { 'class': 'tr table-titles' }, [
			E('div', { 'class': 'th' }, _('Узел')),
			E('div', { 'class': 'th' }, _('Состояние')),
			E('div', { 'class': 'th' }, _('Задержка')),
			E('div', { 'class': 'th' }, _('Получено')),
			E('div', { 'class': 'th' }, _('Передано'))
		])];
		var names = Object.keys(nodes);

		if (!names.length) {
			rows.push(E('div', { 'class': 'tr' }, [
				E('div', { 'class': 'td', 'colspan': '5' }, _('Узлы не настроены'))
			]));
		}

		names.forEach(function(name) {
			var item = traffic[name] || {};
			var state = nodes[name] || _('неизвестно');
			var stateClass = state === 'running' ? 'cbi-value-success' : 'cbi-value-warning';
			rows.push(E('div', { 'class': 'tr' }, [
				E('div', { 'class': 'td' }, nodeTitle(name)),
				E('div', { 'class': 'td ' + stateClass }, state),
				E('div', { 'class': 'td' }, value(ping[name], '-') + (ping[name] ? ' ms' : '')),
				E('div', { 'class': 'td' }, value(item.rx, '0')),
				E('div', { 'class': 'td' }, value(item.tx, '0'))
			]));
		});

		return E('div', { 'class': 'table', 'id': 'olcrtcwrt-monitoring-table' }, rows);
	},

	render: function(data) {
		var self = this;
		var status = data[0] || {};
		var names = Object.keys(status.nodes || {});
		var running = names.filter(function(name) { return status.nodes[name] === 'running'; }).length;
		var summary = E('div', { 'class': 'cbi-section-node' }, [
			E('div', { 'class': 'table' }, [
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td' }, _('Всего узлов')),
					E('div', { 'class': 'td' }, String(names.length))
				]),
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td' }, _('Запущено')),
					E('div', { 'class': 'td cbi-value-success' }, String(running))
				])
			])
		]);

		this.pollHandle = L.Request.poll.add(L.bind(this.update, this), 5000);

		return E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, _('Мониторинг')),
			E('p', {}, _('Состояние туннелей olcrtc и WDTT, задержка и счётчики трафика. Обновление каждые 5 секунд.')),
			E('div', { 'class': 'cbi-section', 'id': 'olcrtcwrt-monitoring-summary' }, [summary]),
			E('div', { 'class': 'cbi-section' }, [
				E('div', { 'class': 'cbi-section-node' }, this.renderTable(data))
			]),
			E('div', { 'class': 'cbi-section' }, [
				E('button', {
					'class': 'btn cbi-button cbi-button-neutral',
					'click': ui.createHandlerFn(this, 'refresh')
				}, _('Обновить сейчас'))
			])
		]);
	},

	update: function() {
		var self = this;
		return Promise.all([callStatus(), callPing(), callTraffic()]).then(function(data) {
			var table = document.getElementById('olcrtcwrt-monitoring-table');
			if (table)
				table.replaceWith(self.renderTable(data));
		}).catch(function(err) {
			console.warn('olcrtcwrt monitoring update failed:', err);
		});
	},

	refresh: function() {
		return this.load().then(function(data) {
			var root = document.querySelector('.cbi-map');
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
