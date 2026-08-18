'use strict';

var injected = false;

var css = `
.olcrtcwrt-forkop-page,
.olcrtcwrt-forkop-settings,
.fkp_updates-page,
.fkp_monitoring-page,
.fkp_diagnostic-page {
	width: 100%;
	min-width: 0;
}

.olcrtcwrt-forkop-selectors .cbi-section-table {
	width: 100%;
	border: 2px var(--background-color-low, lightgray) solid;
	border-radius: 4px;
	overflow: hidden;
}

.olcrtcwrt-forkop-selectors .cbi-section-table .tr {
	min-height: 44px;
	align-items: center;
}

.olcrtcwrt-forkop-selectors .cbi-section-table .tr:not(.table-titles):hover {
	background: rgba(127,127,127,.08);
}

.olcrtcwrt-forkop-selectors .cbi-section-table .th {
	font-size: 11px;
	font-weight: 600;
	text-transform: uppercase;
}

.olcrtcwrt-forkop-selectors .cbi-section-create {
	margin-top: 10px;
	padding: 10px;
	border: 2px var(--background-color-low, lightgray) solid;
	border-radius: 4px;
}

.olcrtcwrt-forkop-selectors .cbi-section-create-name {
	min-height: 34px;
}

.olcrtcwrt-forkop-selectors .cbi-section-actions {
	white-space: nowrap;
}

.olcrtcwrt-forkop-selectors .cbi-section-descr {
	margin-bottom: 10px;
}

.fkp_updates-page__components {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	width: 100%;
	flex-wrap: wrap;
}

.fkp_updates-page__components-column {
	display: flex;
	flex: 1 1 360px;
	flex-direction: column;
	gap: 10px;
	min-width: 0;
}

.fkp_updates-page__component {
	border: 2px var(--background-color-low, lightgray) solid;
	border-radius: 4px;
	padding: 10px;
	display: flex;
	flex-direction: column;
	gap: 10px;
	min-width: 0;
}

.fkp_updates-page__component__header {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8px;
	border-bottom: 1px var(--background-color-low, lightgray) solid;
	padding-bottom: 8px;
}

.fkp_updates-page__component__title {
	color: var(--text-color-high);
	font-size: 16px;
	font-weight: bold;
	line-height: 1.2;
}

.fkp_updates-page__component__header-version {
	color: var(--text-color-medium, #888);
	font-size: 13px;
}

.fkp_updates-page__component__details {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.fkp_updates-page__component__info-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 8px;
	min-height: 24px;
}

.fkp_updates-page__component__info-label {
	color: var(--text-color-medium, #888);
	font-size: 12px;
}

.fkp_updates-page__component__info-value {
	color: var(--text-color-high, #000);
	font-weight: 500;
	font-size: 13px;
	text-align: right;
	overflow-wrap: anywhere;
}

.fkp_updates-page__component__actions {
	display: flex;
	flex-direction: column;
	gap: 10px;
	margin-top: auto;
}

.fkp_updates-page__component__actions--with-details {
	border-top: 1px var(--background-color-low, lightgray) solid;
	padding-top: 10px;
}

.fkp_updates-page__component__actions-main,
.fkp_updates-page__component__variants-buttons {
	display: flex;
	justify-content: flex-start;
	align-items: center;
	flex-wrap: wrap;
	gap: 6px;
}

.fkp_updates-page__component__variants {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.fkp_updates-page__component__variants-title {
	font-size: 11px;
	font-weight: bold;
	color: var(--text-color-medium, gray);
}

.fkp_monitoring-page__panel {
	width: 100%;
}

.fkp_monitoring-page__controls {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 12px;
}

.fkp_monitoring-page__tabs,
.fkp_monitoring-page__actions,
.fkp_monitoring-page__filters {
	display: flex;
	align-items: center;
	gap: 8px;
}

.fkp_monitoring-page__tabs {
	padding: 2px;
	border: 1px solid rgba(127,127,127,.22);
	border-radius: 6px;
	background: rgba(127,127,127,.08);
}

.fkp_monitoring-page__tab {
	margin: 0;
	border: 0 !important;
	border-radius: 4px;
	background: transparent !important;
	box-shadow: none;
	font-weight: 600;
}

.fkp_monitoring-page__tab--active {
	background: rgba(25,118,210,.16) !important;
	color: var(--primary-color-high, #1976d2) !important;
}

.fkp_monitoring-page__device-filter,
.fkp_monitoring-page__search-input {
	min-height: 34px !important;
	height: 34px !important;
	box-sizing: border-box;
}

.fkp_monitoring-page__search-input {
	min-width: 180px;
}

.fkp_monitoring-page__icon-button {
	min-width: 34px;
	min-height: 34px;
	padding: 0 10px;
	border: 1px solid rgba(127,127,127,.22) !important;
	border-radius: 6px;
	background: rgba(127,127,127,.08) !important;
}

.fkp_monitoring-page__table-wrap {
	width: 100%;
	overflow-x: auto;
}

.fkp_monitoring-page__table {
	width: 100%;
	border-collapse: collapse;
	border-spacing: 0;
}

.fkp_monitoring-page__table th,
.fkp_monitoring-page__table td {
	padding: 8px 6px;
	border-bottom: 1px solid rgba(127,127,127,.22);
	text-align: left;
	vertical-align: middle;
}

.fkp_monitoring-page__table th {
	color: var(--text-color-medium);
	font-size: 11px;
	font-weight: 600;
	text-transform: uppercase;
}

.fkp_monitoring-page__table td:nth-child(n+3) {
	text-align: right;
}

.fkp_monitoring-page__state {
	padding: 32px 10px;
	color: var(--text-color-medium);
	text-align: center;
}

.fkp_monitoring-page__state--error {
	color: var(--error-color-medium, #d32f2f);
}

.fkp_diagnostic-page {
	display: grid;
	grid-template-columns: 2fr 1fr;
	gap: 10px;
	align-items: start;
}

.fkp_diagnostic-page__left-bar,
.fkp_diagnostic-page__right-bar,
.fkp_diagnostic-page__checks {
	display: grid;
	grid-template-columns: 1fr;
	gap: 10px;
}

.fkp_diagnostic-page__card,
.fkp_diagnostic_alert {
	border: 2px var(--background-color-low, lightgray) solid;
	border-radius: 4px;
	padding: 10px;
}

.fkp_diagnostic_alert {
	display: grid;
	grid-template-columns: 24px 1fr;
	gap: 10px;
	align-items: start;
}

.fkp_diagnostic_alert--warning {
	border-color: var(--warn-color-medium, orange);
}

.fkp_diagnostic_alert--error {
	border-color: var(--error-color-medium, red);
}

.fkp_diagnostic_alert--success {
	border-color: var(--success-color-medium, green);
}

.fkp_diagnostic_alert__title {
	display: block;
	font-weight: 700;
}

.fkp_diagnostic_alert__summary {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
	gap: 4px 12px;
	margin-top: 8px;
	font-size: 12px;
}

.fkp_diagnostic_alert__summary__item--success {
	color: var(--success-color-medium, #2e7d32);
}

.fkp_diagnostic_alert__summary__item--warning {
	color: var(--warn-color-medium, #ed6c02);
}

.fkp_diagnostic_alert__summary__item--error {
	color: var(--error-color-medium, #d32f2f);
}

.fkp_diagnostic_alert__description,
.fkp_diagnostic-page__card-description {
	color: var(--text-color-medium);
	font-size: 13px;
}

.fkp_diagnostic-page__card-title {
	display: block;
	margin-bottom: 8px;
	font-weight: 700;
}

.fkp_diagnostic-page__log {
	width: 100%;
	min-height: 180px;
	box-sizing: border-box;
	font-family: monospace;
	resize: vertical;
}

@media (max-width: 800px) {
	.fkp_diagnostic-page {
		grid-template-columns: 1fr;
	}
}

@media (max-width: 600px) {
	.fkp_monitoring-page__controls,
	.fkp_monitoring-page__filters {
		align-items: stretch;
		flex-direction: column;
	}
	.fkp_monitoring-page__tabs,
	.fkp_monitoring-page__device-filter,
	.fkp_monitoring-page__search-input {
		width: 100%;
	}
	.fkp_monitoring-page__table thead {
		display: none;
	}
	.fkp_monitoring-page__table,
	.fkp_monitoring-page__table tbody,
	.fkp_monitoring-page__table tr,
	.fkp_monitoring-page__table td {
		display: block;
		width: 100%;
	}
	.fkp_monitoring-page__table tr {
		margin-bottom: 8px;
		padding: 8px;
		border: 1px var(--background-color-low, lightgray) solid;
		border-radius: 4px;
	}
	.fkp_monitoring-page__table td {
		border: 0;
		padding: 4px 0;
		text-align: left !important;
	}
	.fkp_monitoring-page__table td::before {
		content: attr(data-label);
		display: inline-block;
		width: 42%;
		color: var(--text-color-medium);
		font-weight: 700;
	}
}
`;

return {
	inject: function() {
		if (injected || !document.head)
			return;
		var style = E('style', { 'id': 'olcrtcwrt-forkop-styles', 'type': 'text/css' }, css);
		document.head.appendChild(style);
		injected = true;
	}
};
