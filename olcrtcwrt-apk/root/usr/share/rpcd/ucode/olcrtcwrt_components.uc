#!/usr/bin/env ucode
'use strict';

import { readfile, popen, stat } from 'fs';

function exec(command) {
	let pipe = popen(command);
	if (!pipe)
		return '';
	let output = pipe.read('all');
	pipe.close();
	return output || '';
}

function version(path) {
	if (stat(path) == null)
		return '';
	return trim(exec(path + ' version 2>/dev/null | head -n1'));
}

function latest(repo) {
	return trim(exec("curl -fsSL --connect-timeout 10 --max-time 30 " +
		"https://api.github.com/repos/" + repo + "/releases/latest 2>/dev/null " +
		"| jq -r '.tag_name // empty' 2>/dev/null"));
}

function info(name, repo, path) {
	let installed = (stat(path) != null);
	let current = installed ? version(path) : '';
	let release = latest(repo);
	return {
		name: name,
		installed: installed,
		path: path,
		version: current,
		latest: release,
		update_available: (installed && release != '' && current != '' && current != release)
	};
}

function get_status() {
	let sing_box = info('sing-box', 'SagerNet/sing-box', '/usr/bin/sing-box');
	sing_box.extended_latest = latest('shtorm-7/sing-box-extended');
	return {
		architecture: trim(exec('uname -m')),
		components: {
			olcrtc: info('olcrtc', 'win64exe/OlcrtcWRT', '/etc/olcrtcwrt/bin/olcrtcwrt'),
			wdtt: info('WDTT', 'samosvalishe/free-turn-proxy', '/etc/olcrtcwrt/bin/wdtt-server'),
			sing_box: sing_box
		}
	};
}

function run_install(component, variant) {
	let command = '';
	if (component == 'olcrtc')
		command = '/etc/olcrtcwrt/components.sh olcrtc';
	else if (component == 'wdtt')
		command = '/etc/olcrtcwrt/components.sh wdtt';
	else if (component == 'sing-box' && (variant == 'official' || variant == 'extended'))
		command = '/etc/olcrtcwrt/components.sh sing-box ' + variant;
	else
		return { success: false, message: 'unknown component or variant' };

	let result = system(command + ' >/tmp/olcrtcwrt-component-install.log 2>&1');
	return {
		success: (result == 0),
		message: (result == 0) ? 'Component installed' : trim(readfile('/tmp/olcrtcwrt-component-install.log') || 'Component installation failed')
	};
}

return {
	olcrtcwrt_components: {
		status: {
			call: function(req) {
				return get_status();
			}
		},

		install: {
			args: { component: '', variant: 'official' },
			call: function(req) {
				return run_install(req.args.component, req.args.variant || 'official');
			}
		}
	}
};
