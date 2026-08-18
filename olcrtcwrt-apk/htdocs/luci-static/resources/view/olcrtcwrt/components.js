'use strict';
'require view';
'require rpc';
'require ui';

var callComponentsStatus = rpc.declare({
	object: 'olcrtcwrt',
	method: 'components_status',
	reject: true
});
var callComponentsInstall = rpc.declare({
	object: 'olcrtcwrt',
	method: 'components_install',
	params: { component: '', variant: '' },
	reject: true
});

function text(value) {
	return value || _('не установлено');
}

function statusText(item) {
	if (!item || !item.installed)
		return _('Не установлено');
	if (item.update_available)
		return _('Доступно обновление');
	return _('Установлено');
}

function statusClass(item) {
	if (!item || !item.installed)
		return 'cbi-value-warning';
	return item.update_available ? 'cbi-value-warning' : 'cbi-value-success';
}

function latestText(item) {
	if (!item)
		return _('неизвестно');
	if (item.extended_latest)
		return _('официальный: %s; extended: %s').format(text(item.latest), text(item.extended_latest));
	return text(item.latest);
}

return view.extend({
	load: function() {
		return callComponentsStatus().catch(function(err) {
			ui.addNotification(null, E('p', _('Не удалось проверить компоненты: %s').format(err.message)));
			return { architecture: '', components: {} };
		});
	},

	renderComponentRow: function(key, item, title, installVariant) {
		var self = this;
		var action = installVariant ? 'sing-box' : key;
		var button = E('button', {
			'class': 'btn cbi-button cbi-button-apply',
			'click': ui.createHandlerFn(self, 'installComponent', action, installVariant || 'official')
		}, item && item.installed ? _('Обновить') : _('Установить'));

		return E('div', { 'class': 'tr' }, [
			E('div', { 'class': 'td' }, title),
			E('div', { 'class': 'td' }, text(item && item.version)),
			E('div', { 'class': 'td' }, latestText(item)),
			E('div', { 'class': 'td ' + statusClass(item) }, statusText(item)),
			E('div', { 'class': 'td' }, button)
		]);
	},

	render: function(data) {
		var self = this;
		var components = data.components || {};
		var variant = E('select', { 'id': 'olcrtcwrt-singbox-variant', 'class': 'cbi-input-select' }, [
			E('option', { 'value': 'official' }, _('Официальный sing-box')),
			E('option', { 'value': 'extended' }, _('sing-box extended'))
		]);
		var singbox = components.sing_box || {};

		var table = E('div', { 'class': 'table' }, [
			E('div', { 'class': 'tr table-titles' }, [
				E('div', { 'class': 'th' }, _('Компонент')),
				E('div', { 'class': 'th' }, _('Установленная версия')),
				E('div', { 'class': 'th' }, _('Последняя версия')),
				E('div', { 'class': 'th' }, _('Состояние')),
				E('div', { 'class': 'th' }, _('Действие'))
			]),
			this.renderComponentRow('olcrtc', components.olcrtc, 'olcrtc'),
			this.renderComponentRow('wdtt', components.wdtt, 'WDTT'),
			E('div', { 'class': 'tr' }, [
				E('div', { 'class': 'td' }, 'sing-box'),
				E('div', { 'class': 'td' }, text(singbox.version)),
				E('div', { 'class': 'td' }, latestText(singbox)),
				E('div', { 'class': 'td ' + statusClass(singbox) }, statusText(singbox)),
				E('div', { 'class': 'td' }, [
					variant,
					' ',
					E('button', {
						'class': 'btn cbi-button cbi-button-apply',
						'click': ui.createHandlerFn(this, 'installSelectedSingBox')
					}, singbox.installed ? _('Обновить') : _('Установить'))
				])
			])
		]);

		return E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, _('Компоненты')),
			E('p', {}, _('Управление компонентами OlcrtcWRT. APK содержит только интерфейс; бинарные файлы загружаются отдельно под архитектуру роутера.')),
			E('p', {}, _('Архитектура: %s').format(data.architecture || _('не определена'))),
			E('div', { 'class': 'cbi-section' }, [
				E('div', { 'class': 'cbi-section-node' }, table)
			]),
			E('div', { 'class': 'cbi-section' }, [
				E('button', {
					'class': 'btn cbi-button cbi-button-neutral',
					'click': ui.createHandlerFn(this, 'refresh')
				}, _('Проверить обновления'))
			])
		]);
	},

	installSelectedSingBox: function() {
		var select = document.getElementById('olcrtcwrt-singbox-variant');
		return this.installComponent('sing-box', select ? select.value : 'official');
	},

	installComponent: function(component, variant) {
		var self = this;
		ui.showModal(_('Установка компонента'), [
			E('p', { 'class': 'spinning' }, _('Загрузка и установка, подождите...'))
		]);
		return callComponentsInstall({ component: component, variant: variant }).then(function(result) {
			ui.hideModal();
			if (!result || !result.success)
				throw new Error(result && result.message ? result.message : _('Компонент не установлен'));
			ui.addNotification(null, E('p', _('Компонент установлен.')));
			return self.refresh();
		}).catch(function(err) {
			ui.hideModal();
			ui.addNotification(null, E('p', _('Ошибка установки: %s').format(err.message)));
		});
	},

	refresh: function() {
		return this.load().then(function(data) {
			var content = document.querySelector('.cbi-map');
			if (content)
				content.parentNode.replaceChild(this.render(data), content);
		}.bind(this));
	}
});
