#!/usr/bin/env ucode
'use strict';

import { readfile, popen, glob, stat } from 'fs';
import { cursor } from 'uci';

const CONFIG = 'olcrtcwrt';
const PID_DIR = '/var/run/olcrtcwrt';
const JSON = require('json');

function exec(cmd) {
	let f = popen(cmd);
	if (!f)
		return '';
	let out = f.read('all');
	if (out == null)
		out = '';
	f.close();
	return out;
}

function exec_json(cmd) {
	let str = exec(cmd);
	if (!str)
		return {};
	try {
		return JSON.parse(str) || {};
	} catch (e) {
		return {};
	}
}

function component_version(path) {
	if (stat(path) == null)
		return '';
	return trim(exec(path + ' version 2>/dev/null | head -n1 || ' + path + ' -version 2>/dev/null | head -n1'));
}

function latest_component_tag(repo) {
	return trim(exec('curl -fsSL --connect-timeout 10 --max-time 30 ' +
		'https://api.github.com/repos/' + repo + '/releases/latest 2>/dev/null' +
		' | jq -r ".tag_name // empty" 2>/dev/null'));
}

function component_info(name, repo, path) {
	let installed = (stat(path) != null);
	let version = installed ? component_version(path) : '';
	let latest = latest_component_tag(repo);
	return {
		name: name,
		installed: installed,
		path: path,
		version: version,
		latest: latest,
		update_available: (latest != '' && version != '' && version != latest)
	};
}

function components_status() {
	let sing_box = component_info('sing-box', 'SagerNet/sing-box', '/usr/bin/sing-box');
	sing_box.extended_latest = latest_component_tag('shtorm-7/sing-box-extended');
	return {
		architecture: trim(exec('uname -m')),
		components: {
			olcrtc: component_info('olcrtc', 'win64exe/OlcrtcWRT', '/etc/olcrtcwrt/bin/olcrtcwrt'),
			wdtt: component_info('WDTT', 'samosvalishe/free-turn-proxy', '/etc/olcrtcwrt/bin/wdtt-server'),
			sing_box: sing_box
		}
	};
}

function install_component(component, variant) {
	let command = '';
	if (component == 'olcrtc')
		command = '/etc/olcrtcwrt/components.sh olcrtc';
	else if (component == 'wdtt')
		command = '/etc/olcrtcwrt/components.sh wdtt';
	else if (component == 'sing-box' && (variant == 'official' || variant == 'extended'))
		command = '/etc/olcrtcwrt/components.sh sing-box ' + variant;
	else
		return { success: false, message: 'unknown component or variant' };

	let log_path = '/tmp/olcrtcwrt-component-install.log';
	let rv = system(command + ' >' + log_path + ' 2>&1');
	let output = trim(readfile(log_path) || '');
	if (length(output) > 1000)
		output = substr(output, length(output) - 1000, 1000);
	return {
		success: (rv == 0),
		message: (rv == 0) ? 'Component installed' : (output || 'Component installation failed')
	};
}

function pid_running(pid) {
	if (!pid || pid <= 0)
		return false;
	return stat('/proc/' + pid) != null;
}

function pid_basename(path) {
	let parts = split(path, '/');
	let name = parts[length(parts) - 1];
	let len = length(name);
	if (len > 4 && substr(name, len - 4, 4) == '.pid')
		return substr(name, 0, len - 4);
	return name;
}

function get_nodes() {
	let nodes = {};
	let files = glob(PID_DIR + '/*.pid') || [];
	for (let i = 0; i < length(files); i++) {
		let path = files[i];
		let name = pid_basename(path);
		let pid = 0;
		let raw = readfile(path);
		if (raw != null) {
			let trimmed = trim(raw);
			if (trimmed != '')
				pid = int(trimmed);
		}
		if (pid_running(pid))
			nodes[name] = 'running';
		else
			nodes[name] = 'stopped';
	}
	return nodes;
}

function section_type(section) {
	let u = cursor();
	let type = u.get(CONFIG, section, 'type') || '';
	u.unload();
	return type;
}

function call_script(script, action, section) {
	return system('/etc/olcrtcwrt/' + script + '-client.sh ' + action + " '" + section + "'");
}

function call_node_script(type, action, section) {
	let expected = section_type(section);
	if (expected != type)
		return { success: false, message: 'section type mismatch or missing' };

	if (type == 'olcrtcwrt' || type == 'wdtt') {
		call_script(type, action, section);
		return { success: true };
	}

	return { success: false, message: 'unknown type' };
}

return {
	olcrtcwrt: {
		status: {
			call: function(req) {
				return { nodes: get_nodes() };
			}
		},

		nodes: {
			call: function(req) {
				return { nodes: get_nodes() };
			}
		},

		start: {
			args: { type: '', section: '' },
			call: function(req) {
				return call_node_script(req.args.type, 'start', req.args.section);
			}
		},

		stop: {
			args: { type: '', section: '' },
			call: function(req) {
				return call_node_script(req.args.type, 'stop', req.args.section);
			}
		},

		restart: {
			args: { type: '', section: '' },
			call: function(req) {
				return call_node_script(req.args.type, 'restart', req.args.section);
			}
		},

		logs: {
			args: { type: '', lines: 50 },
			call: function(req) {
				let type = req.args.type;
				let lines = req.args.lines || 50;
				let out = '';
				if (type == 'olcrtcwrt')
					out = exec('/etc/olcrtcwrt/olcrtcwrt-client.sh logs ' + lines);
				else if (type == 'wdtt')
					out = exec('/etc/olcrtcwrt/wdtt-client.sh logs ' + lines);
				return out;
			}
		},

		ping: {
			call: function(req) {
				return exec_json('/etc/olcrtcwrt/ping-monitor.sh');
			}
		},

		traffic: {
			call: function(req) {
				return exec_json('/etc/olcrtcwrt/traffic-stats.sh');
			}
		},

		download: {
			call: function(req) {
				let rv = system('/etc/olcrtcwrt/download-binaries.sh');
				return { success: (rv == 0) };
			}
		},

		nftables: {
			call: function(req) {
				let out = exec('nft list table inet olcrtcwrt 2>/dev/null');
				return { ruleset: out };
			}
		},

		validate: {
			call: function(req) {
				let rv = system('/etc/olcrtcwrt/nft-validate.sh >/dev/null 2>&1');
				return {
					valid: (rv == 0),
					message: (rv == 0) ? 'nftables rules are valid' : 'nftables rules are invalid or not generated'
				};
			}
		},

		update_subscription: {
			call: function(req) {
				let rv = system('/etc/olcrtcwrt/subscription.sh update >/dev/null 2>&1');
				return {
					success: (rv == 0),
					message: (rv == 0) ? 'Subscription updated' : 'Subscription update failed'
				};
			}
		},

		components_status: {
			call: function(req) {
				return components_status();
			}
		},

		components_install: {
			args: { component: '', variant: 'official' },
			call: function(req) {
				return install_component(req.args.component, req.args.variant || 'official');
			}
		}
	}
};
