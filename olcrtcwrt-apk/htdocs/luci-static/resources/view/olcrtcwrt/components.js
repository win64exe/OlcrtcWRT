'use strict';
'require view';
'require rpc';
'require ui';
'require view.olcrtcwrt.styles as styles';

var callComponentsStatus = rpc.declare({
	object: 'olcrtcwrt_components',
	method: 'status',
	reject: true
});
var callComponentsInstall = rpc.declare({
	object: 'olcrtcwrt_components',
	method: 'install',
	params: { component: '', variant: '' },
	reject: true
});

function text(value) {
	return value || _('не установлено');
}

function cardState(item) {
	if (!item || !item.installed)
		return _('Не установлено');
	return item.update_available ? _('Доступно обновление') : _('Установлено');
}

function createInfoRow(label, value) {
	return E('div', { 'class': 'fkp_updates-page__component__info-row' }, [
		E('span', { 'class': 'fkp_updates-page__component__info-label' }, label),
		E('span', { 'class': 'fkp_updates-page__component__info-value' }, value)
	]);
}

return view.extend({
	load: function() {
		return callComponentsStatus().catch(function(err) {
			ui.addNotification(null, E('p', _('Не удалось проверить компоненты: %s').format(err.message)));
			return { architecture: '', components: {} };
		});
	},

	renderAction: function(component, variant, label, primary) {
		return E('button', {
			'class': 'btn cbi-button ' + (primary ? 'cbi-button-save' : ''),
			'click': ui.createHandlerFn(this, 'installComponent', component, variant)
		}, label);
	},

	renderCard: function(component, title, item, variants) {
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
			details.push(createInfoRow(_('Последняя версия'), item.latest));
		if (item && item.extended_latest)
			details.push(createInfoRow(_('Extended версия'), item.extended_latest));

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

	render: function(data) {
		styles.inject();
		var components = data.components || {};
		var columnA = [
			this.renderCard('olcrtc', 'olcrtc', components.olcrtc),
			this.renderCard('wdtt', 'WDTT', components.wdtt)
		];
		var columnB = [
			this.renderCard('sing-box', 'sing-box', components.sing_box)
		];

		return E('div', { 'class': 'cbi-map olcrtcwrt-forkop-page fkp_updates-page' }, [
			E('h2', {}, _('Компоненты')),
			E('p', {}, _('Установка компонентов в стиле forkop. APK содержит только LuCI-интерфейс, бинарники загружаются отдельно.')),
			E('p', {}, _('Архитектура: %s').format(data.architecture || _('не определена'))),
			E('div', { 'class': 'fkp_updates-page__components' }, [
				E('div', { 'class': 'fkp_updates-page__components-column' }, columnA),
				E('div', { 'class': 'fkp_updates-page__components-column' }, columnB)
			]),
			E('div', { 'class': 'cbi-section' }, [
				E('button', {
					'class': 'btn cbi-button cbi-button-neutral',
					'click': ui.createHandlerFn(this, 'refresh')
				}, _('Проверить обновления'))
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
	},

	refresh: function() {
		return this.load().then(function(data) {
			var content = document.querySelector('.fkp_updates-page');
			if (content)
				content.parentNode.replaceChild(this.render(data), content);
		}.bind(this));
	}
});
