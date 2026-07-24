'use strict';
'require view';
'require ubus';
'require ui';

return view.extend({
	load: function() {
		return Promise.all([
			ubus.call('olcrtc', 'status', {}),
			ubus.call('olcrtc', 'logs', { type: 'olcrtc', lines: 50 }),
			ubus.call('olcrtc', 'logs', { type: 'wdtt', lines: 50 }),
			ubus.call('olcrtc', 'nftables', {}),
			ubus.call('olcrtc', 'validate', {})
		]).catch(function(err) {
			ui.addNotification(null, E('p', _('Failed to load diagnostics: %s').format(err.message)));
			return [{}, '', '', { ruleset: '' }, { valid: false, message: err.message }];
		});
	},

	render: function(data) {
		var status = data[0] || {};
		var olLogs = data[1] || '';
		var wdLogs = data[2] || '';
		var nftables = data[3] || { ruleset: '' };
		var validation = data[4] || { valid: false, message: '' };

		var validationClass = validation.valid ? 'success' : 'warning';

		var node = E('div', { 'class': 'cbi-section' }, [
			E('h2', {}, _('Diagnostics')),
			E('p', {}, _('Service status, recent logs and nftables ruleset.')),
			E('div', { 'class': 'cbi-section-node' }, [
				E('div', { 'class': 'table' }, [
					E('div', { 'class': 'tr table-titles' }, [
						E('div', { 'class': 'th' }, _('Service')),
						E('div', { 'class': 'th' }, _('Status'))
					]),
					E('div', { 'class': 'tr' }, [
						E('div', { 'class': 'td' }, 'olcrtc'),
						E('div', { 'class': 'td' }, status.olcrtc || _('unknown'))
					]),
					E('div', { 'class': 'tr' }, [
						E('div', { 'class': 'td' }, 'WDTT'),
						E('div', { 'class': 'td' }, status.wdtt || _('unknown'))
					])
				])
			]),
			E('h3', {}, _('nftables validation')),
			E('div', { 'class': 'cbi-value-' + validationClass }, validation.message || _('Unknown')),
			E('h3', {}, _('nftables ruleset')),
			E('textarea', {
				'style': 'width:100%;height:300px;font-family:monospace;',
				'readonly': 'readonly'
			}, typeof nftables.ruleset === 'string' ? nftables.ruleset : JSON.stringify(nftables.ruleset, null, 2)),
			E('h3', {}, _('olcrtc logs')),
			E('textarea', {
				'style': 'width:100%;height:200px;font-family:monospace;',
				'readonly': 'readonly'
			}, typeof olLogs === 'string' ? olLogs : JSON.stringify(olLogs, null, 2)),
			E('h3', {}, _('WDTT logs')),
			E('textarea', {
				'style': 'width:100%;height:200px;font-family:monospace;',
				'readonly': 'readonly'
			}, typeof wdLogs === 'string' ? wdLogs : JSON.stringify(wdLogs, null, 2))
		]);

		return node;
	}
});
