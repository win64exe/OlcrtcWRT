'use strict';
'require baseclass';
'require form';
'require rpc';
'require ui';

var callComponentsStatus = rpc.declare({ object: 'olcrtcwrt_components', method: 'status', reject: true });
var callComponentsInstall = rpc.declare({ object: 'olcrtcwrt_components', method: 'install', params: { component: '', variant: '' }, reject: true });

function text(value) {
	return value || _('не установлено');
}

function cardState(item) {
	if (!item || !item.installed)
		return _('Не установлено');
	return item.update_available ? _('Доступно обновление') : _('Установлено');
}

function createInfoRow(label, value, extraClass) {
	return E('div', { 'class': 'fkp_updates-page__component__info-row' }, [
		E('span', { 'class': 'fkp_updates-page__component__info-label' }, label),
		E('span', { 'class': 'fkp_updates-page__component__info-value ' + (extraClass || '') }, value)
	]);
}

var UpdatesTab = {
	render: function() {
		return E('div', { 'id': 'updates-status', 'class': 'fkp_updates-page' }, [
			E('div', { 'id': 'fkp_updates-components', 'class': 'fkp_updates-page__components' })
		]);
	},

	initController: function() {
		var self = this;
		this.refresh();
	},

	refresh: function() {
		var self = this;
		var container = document.getElementById('fkp_updates-components');
		if (container)
			container.replaceChildren(E('div', { 'class': 'fkp_updates-page__component skeleton', 'style': 'height: 130px' }));
		return callComponentsStatus().then(function(data) {
			var components = (data && data.components) || {};
			var columnA = [
				self.renderCard('olcrtc', 'olcrtc', components.olcrtc),
				self.renderCard('wdtt', 'WDTT', components.wdtt)
			];
			var columnB = [
				self.renderCard('sing-box', 'sing-box', components.sing_box)
			];
			if (container) {
				container.replaceChildren(
					E('div', { 'class': 'fkp_updates-page__components-column' }, columnA),
					E('div', { 'class': 'fkp_updates-page__components-column' }, columnB)
				);
			}
		}).catch(function(err) {
			if (container)
				container.replaceChildren(E('div', { 'class': 'fkp_updates-page__component centered' }, err.message));
		});
	},

	renderAction: function(component, variant, label, primary) {
		return E('button', {
			'class': 'btn cbi-button ' + (primary ? 'cbi-button-save' : ''),
			'click': L.bind(function() { this.installComponent(component, variant); }, this)
		}, label);
	},

	renderCard: function(component, title, item) {
		var installed = item && item.installed;
		var actions = [];
		if (component !== 'sing-box') {
			actions.push(this.renderAction(component, 'official', installed ? _('Обновить') : _('Установить'), true));
		} else {
			actions.push(this.renderAction('sing-box', 'official', _('Официальный'), true));
			actions.push(this.renderAction('sing-box', 'extended', _('Extended'), false));
		}

		var details = [
			createInfoRow(_('Версия'), text(item && item.version)),
			createInfoRow(_('Состояние'), cardState(item))
		];
		if (item && item.latest)
			details.push(createInfoRow(_('Последняя версия'), item.latest, 'fkp_updates-page__component__info-value--latest'));
		if (item && item.extended_latest)
			details.push(createInfoRow(_('Extended версия'), item.extended_latest, 'fkp_updates-page__component__info-value--latest'));

		return E('div', { 'class': 'fkp_updates-page__component' }, [
			E('div', { 'class': 'fkp_updates-page__component__header' }, [
				E('b', { 'class': 'fkp_updates-page__component__title' }, title),
				E('span', { 'class': 'fkp_updates-page__component__header-version' },
					item && item.path ? item.path : '')
			]),
			E('div', { 'class': 'fkp_updates-page__component__details' }, details),
			E('div', { 'class': 'fkp_updates-page__component__actions fkp_updates-page__component__actions--with-details' }, [
				E('div', { 'class': 'fkp_updates-page__component__actions-main' }, actions)
			])
		]);
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
	}
};

function createUpdatesContent(section) {
	var o = section.option(form.DummyValue, '_mount_node');
	o.rawhtml = true;
	o.cfgvalue = function() {
		var node = UpdatesTab.render();
		window.setTimeout(function() { UpdatesTab.initController(); }, 0);
		return node;
	};
}

return baseclass.extend({
	UpdatesTab: UpdatesTab,
	createUpdatesContent: createUpdatesContent
});
