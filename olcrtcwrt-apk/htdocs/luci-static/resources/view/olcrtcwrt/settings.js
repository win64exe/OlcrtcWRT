'use strict';
'require view';
'require uci';
'require form';
'require ui';
'require rpc';
'require dom';

var callDownload = rpc.declare({
	object: 'olcrtcwrt',
	method: 'download',
	reject: true
});
var callFileWrite = rpc.declare({
	object: 'file',
	method: 'write',
	params: { path: '', data: '', base64: false, mode: 0 },
	reject: true
});

function arrayBufferToBase64(buffer) {
	var bytes = new Uint8Array(buffer);
	var len = bytes.length;
	var binary = '';
	for (var i = 0; i < len; i++)
		binary += String.fromCharCode(bytes[i]);
	return btoa(binary);
}

return view.extend({
	load: function() {
		return uci.load('olcrtcwrt');
	},

	render: function() {
		var m, s, o;

		m = new form.Map('olcrtcwrt', _('Settings'),
			_('Global settings and binary management.'));

		s = m.section(form.NamedSection, 'global', 'global', _('Global'));

		o = s.option(form.Flag, 'enabled', _('Enable olcrtcwrt-apk'));
		o = s.option(form.Flag, 'autostart', _('Autostart on boot'));
		o = s.option(form.ListValue, 'log_level', _('Log level'));
		o.value('debug', 'debug');
		o.value('info', 'info');
		o.value('warn', 'warn');
		o.value('error', 'error');
		o = s.option(form.Value, 'stats_interval', _('Stats interval (seconds)'));
		o.datatype = 'uinteger';
		o = s.option(form.Value, 'ping_interval', _('Ping interval (seconds)'));
		o.datatype = 'uinteger';

		s = m.section(form.NamedSection, 'proxy', 'proxy', _('Proxy & Routing'));

		o = s.option(form.Flag, 'enabled', _('Enable local proxy'));
		o = s.option(form.ListValue, 'routing_core', _('Routing core'));
		o.value('nftables', _('nftables + dnsmasq'));
		o.value('sing-box', _('sing-box TUN'));
		o.depends('enabled', '1');

		o = s.option(form.Value, 'http_host', _('HTTP proxy host'));
		o.depends('routing_core', 'nftables');
		o = s.option(form.Value, 'http_port', _('HTTP proxy port'));
		o.datatype = 'port';
		o.depends('routing_core', 'nftables');
		o = s.option(form.Value, 'socks_host', _('SOCKS proxy host'));
		o.depends('routing_core', 'nftables');
		o = s.option(form.Value, 'socks_port', _('SOCKS proxy port'));
		o.datatype = 'port';
		o.depends('routing_core', 'nftables');
		o = s.option(form.Flag, 'redirect_to_olcrtcwrt', _('Redirect proxy to olcrtcwrt'));
		o.depends('routing_core', 'nftables');

		o = s.option(form.ListValue, 'mode', _('Routing mode'));
		o.value('disabled', _('Disabled'));
		o.value('global', _('Global proxy'));
		o.value('list', _('Proxy list'));
		o = s.option(form.Flag, 'bypass_local', _('Bypass local/private networks'));
		o.depends('routing_core', 'nftables');
		o = s.option(form.DynamicList, 'proxy_ips', _('Proxy IPv4 subnets/IPs'));
		o.datatype = 'ip4addr';
		o.depends('routing_core', 'nftables');
		o = s.option(form.DynamicList, 'proxy_ips6', _('Proxy IPv6 subnets/IPs'));
		o.datatype = 'ip6addr';
		o.depends('routing_core', 'nftables');
		o = s.option(form.DynamicList, 'bypass_ips', _('Bypass IPv4 subnets/IPs'));
		o.datatype = 'ip4addr';
		o.depends('routing_core', 'nftables');
		o = s.option(form.DynamicList, 'bypass_ips6', _('Bypass IPv6 subnets/IPs'));
		o.datatype = 'ip6addr';
		o.depends('routing_core', 'nftables');

		o = s.option(form.DynamicList, 'bypass_server_domains', _('Bypass server domains/IPs'));
		o.placeholder = 'vps.example.com';
		o.depends('routing_core', 'sing-box');
		o.description = _('Auto-populated from node server_uri/vps_host. Required to prevent routing loops in TUN mode.');

		s = m.section(form.NamedSection, 'dns', 'dns', _('DNS routing'));

		o = s.option(form.Flag, 'enabled', _('Enable DNS routing'));
		o = s.option(form.Value, 'proxy_dns', _('Proxy DNS server'));
		o.placeholder = '127.0.0.1#5353';
		o = s.option(form.Value, 'fallback_dns', _('Fallback DNS server'));
		o.placeholder = '8.8.8.8';
		o = s.option(form.DynamicList, 'direct_domains', _('Direct domains'));
		o = s.option(form.DynamicList, 'proxy_domains', _('Proxy domains'));

		s = m.section(form.NamedSection, 'subscription', 'subscription', _('Subscription'));

		o = s.option(form.Flag, 'enabled', _('Enable subscription'));
		o = s.option(form.Value, 'url', _('Subscription URL'));
		o = s.option(form.Flag, 'auto_update', _('Auto update'));
		o = s.option(form.Value, 'update_interval', _('Update interval (hours)'));
		o.datatype = 'uinteger';

		var node = m.render();

		node.appendChild(E('div', { 'class': 'cbi-section' }, [
			E('h3', {}, _('Binary management')),
			E('p', {}, _('Download the latest olcrtcwrt and WDTT binaries for this architecture.')),
			E('button', {
				'class': 'btn cbi-button cbi-button-apply',
				'click': ui.createHandlerFn(this, 'handleDownload')
			}, _('Download binaries'))
		]));

		node.appendChild(E('div', { 'class': 'cbi-section' }, [
			E('h3', {}, _('Manual binary install')),
			E('p', {}, _('Upload olcrtcwrt or WDTT (proxy-turn-vk-android) binary manually. The file will be saved to /etc/olcrtcwrt/bin/ and marked executable.')),
			E('div', { 'class': 'cbi-value' }, [
				E('label', { 'class': 'cbi-value-title' }, _('olcrtcwrt binary')),
				E('div', { 'class': 'cbi-value-field' }, [
					E('input', {
						'type': 'file',
						'id': 'olcrtcwrt-binary-file'
					})
				])
			]),
			E('div', { 'class': 'cbi-value' }, [
				E('label', { 'class': 'cbi-value-title' }, _('WDTT / proxy-turn-vk-android binary')),
				E('div', { 'class': 'cbi-value-field' }, [
					E('input', {
						'type': 'file',
						'id': 'wdtt-binary-file'
					})
				])
			]),
			E('div', { 'class': 'cbi-value' }, [
				E('button', {
					'class': 'btn cbi-button cbi-button-apply',
					'click': ui.createHandlerFn(this, 'handleManualUpload')
				}, _('Install selected binaries'))
			])
		]));

		return node;
	},

	handleDownload: function(ev) {
		return callDownload().then(function() {
			ui.addNotification(null, E('p', _('Binaries downloaded successfully.')));
		}).catch(function(err) {
			ui.addNotification(null, E('p', _('Failed to download binaries: %s').format(err.message)));
		});
	},

	uploadFile: function(name, path, file, input) {
		return new Promise(function(resolve, reject) {
			var reader = new FileReader();
			reader.onload = function(e) {
				var base64 = arrayBufferToBase64(e.target.result);
				// mode 493 == octal 0755 (executable)
				return callFileWrite({
					path: path,
					data: base64,
					base64: true,
					mode: 493
				}).then(function() {
					ui.addNotification(null, E('p', _('%s installed successfully.').format(name)));
					input.value = '';
					resolve();
				}).catch(function(err) {
					ui.addNotification(null, E('p', _('Failed to install %s: %s').format(name, err.message)));
					reject(err);
				});
			};
			reader.onerror = function(e) {
				ui.addNotification(null, E('p', _('Failed to read %s: %s').format(name, e.message || 'unknown error')));
				reject(e);
			};
			reader.readAsArrayBuffer(file);
		});
	},

	handleManualUpload: function(ev) {
		var olcrtcwrtInput = document.getElementById('olcrtcwrt-binary-file');
		var wdttInput = document.getElementById('wdtt-binary-file');
		var promises = [];

	if (olcrtcwrtInput && olcrtcwrtInput.files && olcrtcwrtInput.files[0])
		promises.push(this.uploadFile('olcrtcwrt', '/etc/olcrtcwrt/bin/olcrtc', olcrtcwrtInput.files[0], olcrtcwrtInput));

	if (wdttInput && wdttInput.files && wdttInput.files[0])
		promises.push(this.uploadFile('WDTT', '/etc/olcrtcwrt/bin/wdtt-server', wdttInput.files[0], wdttInput));

		if (!promises.length) {
			ui.addNotification(null, E('p', _('No binary selected.')));
			return Promise.resolve();
		}

		return Promise.all(promises);
	}
});
