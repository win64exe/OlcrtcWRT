'use strict';
'require view';
'require ubus';
'require ui';
'require form';
'require dom';
'require request';

return view.extend({
	load: function() {
		return Promise.all([
			ubus.call('olcrtc', 'status', {}),
			ubus.call('olcrtc', 'ping', {}),
			ubus.call('olcrtc', 'traffic', {})
		]).catch(function(err) {
			ui.addNotification(null, E('p', _('Failed to load dashboard data: %s').format(err.message)));
			return [{}, {}, {}];
		});
	},

	pollStatus: function() {
		var self = this;
		return Promise.all([
			ubus.call('olcrtc', 'status', {}),
			ubus.call('olcrtc', 'ping', {}),
			ubus.call('olcrtc', 'traffic', {})
		]).then(function(data) {
			var status = data[0] || {};
			var ping = data[1] || {};
			var traffic = data[2] || {};
			var nodes = status.nodes || {};

			var tbody = document.getElementById('olcrtc-nodes-body');
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
					statusEl.textContent = state;
					statusEl.className = 'td cbi-value-' + (state === 'running' ? 'success' : 'warning');
				}
				if (pingEl) pingEl.textContent = nodePing + ' ms';
				if (trafficEl) trafficEl.textContent = rx + ' / ' + tx;
			});
		}).catch(function(err) {
			console.error('olcrtc dashboard poll error:', err);
		});
	},

	createNodeRow: function(nodeName) {
		var self = this;
		var row = E('div', { 'class': 'tr', 'id': 'node-row-' + nodeName }, [
			E('div', { 'class': 'td' }, nodeName),
			E('div', { 'id': 'node-status-' + nodeName, 'class': 'td cbi-value-warning' }, _('unknown')),
			E('div', { 'id': 'node-ping-' + nodeName, 'class': 'td' }, '-'),
			E('div', { 'id': 'node-traffic-' + nodeName, 'class': 'td' }, '0 / 0'),
			E('div', { 'class': 'td cbi-section' }, [
				E('button', {
					'class': 'btn cbi-button cbi-button-apply',
					'click': ui.createHandlerFn(self, 'handleStartStop', nodeName, 'start')
				}, _('Start')),
				' ',
				E('button', {
					'class': 'btn cbi-button cbi-button-reset',
					'click': ui.createHandlerFn(self, 'handleStartStop', nodeName, 'stop')
				}, _('Stop')),
				' ',
				E('button', {
					'class': 'btn cbi-button cbi-button-neutral',
					'click': ui.createHandlerFn(self, 'handleStartStop', nodeName, 'restart')
				}, _('Restart'))
			])
		]);
		return row;
	},

	render: function(data) {
		var self = this;
		var status = data[0] || {};
		var nodes = status.nodes || {};

		this.pollHandle = L.Request.poll.add(L.bind(this.pollStatus, this), 5000);

		var tbody = E('div', { 'id': 'olcrtc-nodes-body' });

		Object.keys(nodes).forEach(function(nodeName) {
			tbody.appendChild(self.createNodeRow(nodeName));
		});

		var node = E('div', { 'class': 'cbi-section' }, [
			E('h2', {}, _('Dashboard')),
			E('p', {}, _('Real-time status, ping and traffic counters for olcrtc and WDTT nodes.')),
			E('div', { 'class': 'cbi-section-node' }, [
				E('div', { 'class': 'table' }, [
					E('div', { 'class': 'tr table-titles' }, [
						E('div', { 'class': 'th' }, _('Node')),
						E('div', { 'class': 'th' }, _('Status')),
						E('div', { 'class': 'th' }, _('Ping')),
						E('div', { 'class': 'th' }, _('Traffic (RX / TX)')),
						E('div', { 'class': 'th' }, _('Actions'))
					]),
					tbody
				])
			]),
			E('div', { 'class': 'cbi-section' }, [
				E('button', {
					'class': 'btn cbi-button cbi-button-apply',
					'click': ui.createHandlerFn(this, 'handleRefresh')
				}, _('Refresh'))
			])
		]);

		return node;
	},

	handleStartStop: function(nodeName, action, ev) {
		var type = nodeName.indexOf('wdtt') === 0 ? 'wdtt' : 'olcrtc';
		var section = nodeName.replace(/^(olcrtc|wdtt)_/, '');
		return ubus.call('olcrtc', action, { type: type, section: section }).then(function() {
			ui.addNotification(null, E('p', _('%s %sed').format(nodeName, action)));
		}).catch(function(err) {
			ui.addNotification(null, E('p', _('Failed to %s %s: %s').format(action, nodeName, err.message)));
		});
	},

	handleRefresh: function() {
		window.location.reload();
	},

	remove: function() {
		if (this.pollHandle) {
			L.Request.poll.remove(this.pollHandle);
		}
		return this.super('remove', arguments);
	}
});
