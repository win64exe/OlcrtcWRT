'use strict';
'require view';
'require rpc';
'require ui';

var callStatus = rpc.declare({
	object: 'olcrtcwrt',
	method: 'status',
	reject: true
});
var callLogs = rpc.declare({
	object: 'olcrtcwrt',
	method: 'logs',
	params: { type: '', lines: 50 },
	reject: true
});
var callNftables = rpc.declare({
	object: 'olcrtcwrt',
	method: 'nftables',
	reject: true
});
var callValidate = rpc.declare({
	object: 'olcrtcwrt',
	method: 'validate',
	reject: true
});

return view.extend({
	load: function() {
		return Promise.all([
			callStatus(),
			callLogs({ type: 'olcrtcwrt', lines: 50 }),
			callLogs({ type: 'wdtt', lines: 50 }),
			callNftables(),
			callValidate()
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
						E('div', { 'class': 'td' }, 'olcrtcwrt'),
						E('div', { 'class': 'td' }, status.olcrtcwrt || _('unknown'))
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
			E('h3', {}, _('olcrtcwrt logs')),
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
