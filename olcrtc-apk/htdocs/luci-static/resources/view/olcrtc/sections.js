'use strict';
'require view';
'require uci';
'require form';
'require ui';

return view.extend({
	load: function() {
		return uci.load('olcrtc');
	},

	render: function() {
		var m, s, o;

		m = new form.Map('olcrtc', _('Sections'),
			_('Manage tunnel nodes. Each node can be an olcrtc client/server, a WDTT tunnel, or a bypass rule.'));

		s = m.section(form.TypedSection, 'node', _('Nodes'));
		s.addremove = true;
		s.anonymous = false;

		o = s.option(form.Flag, 'enabled', _('Enabled'));

		o = s.option(form.ListValue, 'type', _('Node type'));
		o.value('olcrtc', 'olcrtc');
		o.value('wdtt', 'WDTT');
		o.value('bypass', _('Bypass'));

		o = s.option(form.ListValue, 'mode', _('Mode'));
		o.value('client', _('Client'));
		o.value('server', _('Server'));
		o.depends('type', 'olcrtc');

		o = s.option(form.Value, 'connection_uri', _('Connection URI'));
		o.placeholder = 'olcrtc://provider?transport<opts>@room#key';
		o.depends({ type: 'olcrtc', mode: 'client' });
		o.validate = function(section_id, value) {
			if (!value) return true;
			if (!/^olcrtc:\/\/[^?@#]+(\?[^@#]+)?@[^#]+#.+$/.test(value)) {
				return _('Invalid URI format. Expected olcrtc://provider?transport<opts>@room#key');
			}
			return true;
		};

		o = s.option(form.Value, 'server_uri', _('Server URI / Room UUID'));
		o.depends({ type: 'olcrtc', mode: 'client', connection_uri: '' });

		o = s.option(form.Value, 'shared_key', _('Shared key'));
		o.password = true;
		o.depends({ type: 'olcrtc', mode: 'client', connection_uri: '' });

		o = s.option(form.ListValue, 'provider', _('Provider'));
		o.value('jitsi', 'Jitsi');
		o.value('telemost', 'Yandex Telemost');
		o.value('wbstream', 'WB Stream');
		o.depends({ type: 'olcrtc', mode: 'client', connection_uri: '' });

		o = s.option(form.ListValue, 'transport', _('Transport'));
		o.value('datachannel', 'datachannel');
		o.value('vp8channel', 'vp8channel');
		o.value('seichannel', 'seichannel');
		o.value('videochannel', 'videochannel');
		o.depends({ type: 'olcrtc', mode: 'client', connection_uri: '' });

		o = s.option(form.Value, 'local_socks_host', _('Local SOCKS host'));
		o.depends({ type: 'olcrtc', mode: 'client' });

		o = s.option(form.Value, 'local_socks_port', _('Local SOCKS port'));
		o.datatype = 'port';
		o.depends({ type: 'olcrtc', mode: 'client' });

		o = s.option(form.Value, 'vps_host', _('VPS host'));
		o.depends('type', 'wdtt');

		o = s.option(form.Value, 'vps_port', _('VPS port'));
		o.datatype = 'port';
		o.depends('type', 'wdtt');

		o = s.option(form.Value, 'vk_hash', _('VK hash'));
		o.depends('type', 'wdtt');

		o = s.option(form.Value, 'password', _('Password'));
		o.password = true;
		o.depends('type', 'wdtt');

		o = s.option(form.Value, 'threads', _('Threads'));
		o.datatype = 'uinteger';
		o.depends('type', 'wdtt');

		o = s.option(form.Value, 'local_udp_port', _('Local UDP port'));
		o.datatype = 'port';
		o.depends('type', 'wdtt');

		o = s.option(form.Value, 'wireguard_config', _('WireGuard config path'));
		o.depends('type', 'wdtt');

		o = s.option(form.Value, 'wireguard_iface', _('WireGuard interface name'));
		o.depends('type', 'wdtt');

		o = s.option(form.Flag, 'auto_captcha', _('Auto captcha'));
		o.depends('type', 'wdtt');

		o = s.option(form.DynamicList, 'bypass_ips', _('Bypass IPv4 subnets/IPs'));
		o.datatype = 'ip4addr';
		o.depends('type', 'bypass');

		o = s.option(form.DynamicList, 'bypass_ips6', _('Bypass IPv6 subnets/IPs'));
		o.datatype = 'ip6addr';
		o.depends('type', 'bypass');

		o = s.option(form.Value, 'dialer_proxy', _('Dialer proxy (node name)'));
		o.placeholder = _('Name of another node to use as SOCKS upstream');
		o.depends({ type: 'olcrtc', mode: 'client' });
		o.depends('type', 'wdtt');

		o = s.option(form.Value, 'extra_args', _('Extra arguments'));

		s = m.section(form.NamedSection, 'subscription', 'subscription', _('Subscription'));
		o = s.option(form.Flag, 'enabled', _('Enable subscription'));
		o = s.option(form.Value, 'url', _('Subscription URL'));
		o = s.option(form.Flag, 'auto_update', _('Auto update'));
		o = s.option(form.Value, 'update_interval', _('Update interval (hours)'));
		o.datatype = 'uinteger';

		return m.render();
	}
});
