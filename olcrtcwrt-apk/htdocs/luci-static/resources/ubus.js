'use strict';
'require rpc';

/*
 * Compatibility layer for older LuCI views using ubus.call().
 * OpenWrt 25 LuCI exposes the JSON-RPC client as rpc.js instead.
 */
return {
	call: function(object, method, args) {
		var params = {};
		args = args || {};

		Object.keys(args).forEach(function(name) {
			params[name] = '';
		});

		return rpc.declare({
			object: object,
			method: method,
			params: params,
			reject: true
		})(args);
	}
};
