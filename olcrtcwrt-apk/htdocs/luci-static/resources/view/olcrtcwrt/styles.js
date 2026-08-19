'use strict';
'require baseclass';

var injected = false;

var css = `/* Hide extra H3 for settings tab */
#cbi-olcrtcwrt-settings > h3 {
    display: none;
}
/* Hide extra H3 for rules tab */
#cbi-olcrtcwrt-section > h3:nth-child(1) {
    display: none;
}
/* Vertical align for remove rule action button */
#cbi-olcrtcwrt-section > .cbi-section-remove {
    margin-bottom: -32px;
}

#cbi-olcrtcwrt-section .cbi-section-actions > div {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

#cbi-olcrtcwrt-section .cbi-section-actions {
    text-align: right;
}
/* Rule reorder visuals */
#cbi-olcrtcwrt-section {
    position: relative;
}

#cbi-olcrtcwrt-section .cbi-section-table-row {
    position: relative;
}

#cbi-olcrtcwrt-section .cbi-section-table-row.placeholder {
    opacity: 1;
}

#cbi-olcrtcwrt-section .cbi-section-table-row.placeholder em {
    font-style: italic;
}

#cbi-olcrtcwrt-section .cbi-section-table-row.drag-over-above::after,
#cbi-olcrtcwrt-section .cbi-section-table-row.drag-over-below::after {
    content: '';
    position: absolute;
    left: 10px;
    right: 10px;
    height: 2px;
    border-radius: 2px;
    background: var(--primary-color-high, #1976d2);
    pointer-events: none;
    z-index: 2;
}

#cbi-olcrtcwrt-section .cbi-section-table-row.drag-over-above::after {
    top: -1px;
}

#cbi-olcrtcwrt-section .cbi-section-table-row.drag-over-below::after {
    bottom: -1px;
}
/* Centered class helper */
.centered {
    display: flex;
    align-items: center;
    justify-content: center;
}
/* Rotate class helper */
.rotate {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
/* Skeleton styles*/
.skeleton {
    background-color: var(--background-color-low, #e0e0e0);
    border-radius: 4px;
    position: relative;
    overflow: hidden;
}

.skeleton::after {
    content: '';
    position: absolute;
    top: 0;
    left: -150%;
    width: 150%;
    height: 100%;
    background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.4),
            transparent
    );
    animation: skeleton-shimmer 1.6s infinite;
}

@keyframes skeleton-shimmer {
    100% {
        left: 150%;
    }
}
/* Toast */
.toast-container {
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    z-index: 9999;
    font-family: system-ui, sans-serif;
}

.toast {
    opacity: 0;
    transform: translateY(10px);
    transition: opacity 0.3s ease, transform 0.3s ease;
    padding: 10px 16px;
    border-radius: 6px;
    color: #fff;
    font-size: 14px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    min-width: 220px;
    max-width: 340px;
    text-align: center;
}

.toast-success {
    background-color: #28a745;
}

.toast-error {
    background-color: #dc3545;
}

.toast.visible {
    opacity: 1;
    transform: translateY(0);
}


@font-face {
    font-family: "Twemoji Country Flags";
    src: url("/luci-static/resources/view/forkop/fonts/TwemojiCountryFlags.woff2") format("woff2");
    font-display: swap;
    font-style: normal;
    font-weight: normal;
    unicode-range: U+1F1E6-1F1FF, U+1F3F4, U+E0062-E0063, U+E0065, U+E0067, U+E006C, U+E006E, U+E0073-E0074, U+E0077, U+E007F;
}

#cbi-olcrtcwrt-dashboard-_mount_node > .cbi-value-title {
    display: none;
}

#cbi-olcrtcwrt-dashboard-_mount_node > .cbi-value-field {
    margin-left: 0;
    width: 100%;
}

#cbi-olcrtcwrt-dashboard-_mount_node > div {
    width: 100%;
}

#cbi-olcrtcwrt-dashboard > h3 {
    display: none;
}

.fkp_dashboard-page {
    width: 100%;
    --dashboard-grid-columns: 4;
    --dashboard-grid-min-width: 180px;
}

.fkp_dashboard-page__service-stopped {
    display: none;
    width: 100%;
    min-height: 180px;
    margin-top: 10px;
    align-items: center;
    justify-content: center;
    padding: 20px;
    box-sizing: border-box;
    border: 1px dashed var(--border-color-high, #555);
    border-radius: 6px;
    color: var(--text-color-medium, #888);
    background: transparent;
    font-family: inherit;
    font-size: inherit;
    font-weight: inherit;
    line-height: inherit;
    font-style: italic;
    text-align: center;
}

.fkp_dashboard-page--service-stopped {
    display: grid;
    grid-template-columns: repeat(var(--dashboard-grid-columns), minmax(var(--dashboard-grid-min-width), 1fr));
    gap: 10px;
}

.fkp_dashboard-page--service-stopped .fkp_dashboard-page__service-stopped {
    display: flex;
    grid-column: 1 / -1;
}

.fkp_dashboard-page--service-stopped .fkp_dashboard-page__content {
    display: none;
}

@media (max-width: 900px) {
    .fkp_dashboard-page {
        --dashboard-grid-columns: 2;
    }
}

@media (max-width: 560px) {
    .fkp_dashboard-page {
        --dashboard-grid-columns: 1;
        --dashboard-grid-min-width: 0;
    }
}

.fkp_dashboard-page__widgets-section {
    margin-top: 10px;
    display: grid;
    grid-template-columns: repeat(var(--dashboard-grid-columns), minmax(var(--dashboard-grid-min-width), 1fr));
    grid-gap: 10px;
}

.fkp_dashboard-page__widgets-section__item {
    border: 2px var(--background-color-low, lightgray) solid;
    border-radius: 4px;
    padding: 10px;
    min-width: 0;
}

.fkp_dashboard-page__widgets-section__item__title {}

.fkp_dashboard-page__widgets-section__item__row {}

.fkp_dashboard-page__widgets-section__item__row--success .fkp_dashboard-page__widgets-section__item__row__value {
    color: var(--success-color-medium, green);
}

.fkp_dashboard-page__widgets-section__item__row--error .fkp_dashboard-page__widgets-section__item__row__value {
    color: var(--error-color-medium, red);
}

.fkp_dashboard-page__widgets-section__item__row__key {}

.fkp_dashboard-page__widgets-section__item__row__value {}

.fkp_dashboard-page__outbound-section {
    margin-top: 10px;
    border: 2px var(--background-color-low, lightgray) solid;
    border-radius: 4px;
    padding: 10px;
}

.fkp_dashboard-page__outbound-section__title-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px 10px;
    min-width: 0;
}

.fkp_dashboard-page__outbound-section__title-section__title {
    color: var(--text-color-high);
    font-weight: 700;
    min-width: 0;
    overflow-wrap: anywhere;
}

.fkp_dashboard-page__outbound-section__title-section__actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    flex: 0 0 auto;
}

.fkp_dashboard-page .btn.fkp_dashboard-page__outbound-section__subscription-update {
    min-width: 130px;
    min-height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
}

.fkp_dashboard-page__outbound-section__subscription-update svg {
    width: 15px;
    height: 15px;
    display: block;
    flex: 0 0 auto;
}

.fkp_dashboard-page__outbound-section__subscription-update[disabled] {
    cursor: not-allowed;
    opacity: 0.65;
}

.fkp_dashboard-page .btn.dashboard-sections-grid-item-test-latency {
    min-width: 99px;
    min-height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
}

.fkp_dashboard-page .btn.dashboard-sections-grid-item-test-latency svg {
    width: 15px;
    height: 15px;
    display: block;
    flex: 0 0 auto;
}

.fkp_dashboard-page .btn.dashboard-sections-grid-item-test-latency[disabled] {
    cursor: not-allowed;
    opacity: 0.65;
}

.fkp_dashboard-page__outbound-grid {
    margin-top: 5px;
    display: grid;
    grid-template-columns: repeat(var(--dashboard-grid-columns), minmax(var(--dashboard-grid-min-width), 1fr));
    grid-gap: 10px;
}

.fkp_dashboard-page__subscription-meta {
    --subscription-meta-action-size: 28px;
    --subscription-meta-action-gap: 6px;
    grid-column: 1 / -1;
    border: 2px var(--background-color-low, lightgray) solid;
    border-radius: 4px;
    padding: 8px 10px;
    background: var(--background-color-high, transparent);
}

.fkp_dashboard-page__subscription-meta__main {
    display: flex;
    align-items: center;
    gap: 6px 10px;
    min-width: 0;
}

.fkp_dashboard-page__subscription-meta__heading {
    flex: 0 0 auto;
    color: var(--text-color-high);
    font-weight: 700;
    line-height: 1.25;
    white-space: nowrap;
}

.fkp_dashboard-page__subscription-meta__title {
    flex: 0 1 auto;
    width: max-content;
    max-width: min(28ch, 30%);
    min-width: min-content;
    color: var(--text-color-high);
    font-weight: 700;
    line-height: 1.25;
    overflow-wrap: anywhere;
}

.fkp_dashboard-page__subscription-meta__facts {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px 12px;
}

.fkp_dashboard-page__subscription-meta__fact {
    display: flex;
    align-items: baseline;
    gap: 4px;
    min-width: 0;
    line-height: 1.25;
}

.fkp_dashboard-page__subscription-meta__fact-key {
    color: var(--text-color-medium);
    font-size: 12px;
    white-space: nowrap;
}

.fkp_dashboard-page__subscription-meta__fact-value {
    color: var(--text-color-high);
    font-weight: 600;
    overflow-wrap: anywhere;
}

.fkp_dashboard-page__subscription-meta__actions {
    flex: 0 0 auto;
    margin-left: auto;
    display: flex;
    justify-content: flex-end;
    gap: var(--subscription-meta-action-gap);
}

.fkp_dashboard-page .btn.fkp_dashboard-page__subscription-meta__action {
    width: var(--subscription-meta-action-size);
    height: var(--subscription-meta-action-size);
    min-width: var(--subscription-meta-action-size);
    min-height: var(--subscription-meta-action-size);
    padding: 2px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    line-height: 1;
    margin: 0;
}

.fkp_dashboard-page__subscription-meta__action svg {
    width: 15px;
    height: 15px;
    display: block;
    flex: 0 0 auto;
}

.fkp_dashboard-page__subscription-meta__announce {
    margin: 6px 0 0;
    border-left: 3px solid var(--primary-color-medium, dodgerblue);
    padding: 4px 8px;
    background: var(--background-color-low, rgba(0, 0, 0, 0.04));
    color: var(--text-color-medium);
    font-style: italic;
    line-height: 1.25;
    overflow-wrap: anywhere;
}

@media (max-width: 700px) {
    .fkp_dashboard-page__subscription-meta__main {
        align-items: flex-start;
        flex-wrap: wrap;
    }

    .fkp_dashboard-page__subscription-meta__heading,
    .fkp_dashboard-page__subscription-meta__title {
        order: 1;
    }

    .fkp_dashboard-page__subscription-meta__actions {
        order: 2;
    }

    .fkp_dashboard-page__subscription-meta__facts {
        order: 3;
        flex-basis: 100%;
    }

    .fkp_dashboard-page__subscription-meta__title {
        max-width: calc(100% - 42px);
    }
}

.fkp_dashboard-page__outbound-grid__item {
    border: 2px var(--background-color-low, lightgray) solid;
    border-radius: 4px;
    padding: 10px;
    transition: border 0.2s ease;
    min-width: 0;
    position: relative;
}

.fkp_dashboard-page__outbound-grid__item--selectable {
    cursor: pointer;
}

.fkp_dashboard-page__outbound-grid__item--selectable:hover {
    border-color: var(--primary-color-high, dodgerblue);
}

.fkp_dashboard-page__outbound-grid__item--active {
    border-color: var(--success-color-medium, green);
}

.fkp_dashboard-page__outbound-grid__item--disabled {
    cursor: default;
}

.fkp_dashboard-page__outbound-grid__item--switching {
    border-color: transparent !important;
    overflow: hidden;
    cursor: wait;
}

.fkp_dashboard-page__outbound-grid__item__snake {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
    box-sizing: border-box;
}

.fkp_dashboard-page__outbound-grid__item__snake rect {
    stroke: var(--primary-color-high, dodgerblue);
    stroke-width: 4;
    animation: fkp-dashboard-selector-snake-svg 1.2s linear infinite;
}

@keyframes fkp-dashboard-selector-snake-svg {
    0% {
        stroke-dasharray: 30 70;
        stroke-dashoffset: 100;
    }
    100% {
        stroke-dasharray: 30 70;
        stroke-dashoffset: 0;
    }
}

.fkp_dashboard-page__outbound-grid__item__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
}

.fkp_dashboard-page__outbound-grid__item__header b {
    min-width: 0;
    line-height: 1.25;
    overflow-wrap: anywhere;
}

.fkp_dashboard-page .btn.fkp_dashboard-page__outbound-grid__item__copy-button {
    width: 22px;
    height: 22px;
    min-width: 22px;
    min-height: 22px;
    padding: 1px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    line-height: 1;
}

.fkp_dashboard-page__outbound-grid__item__copy-button svg {
    width: 13px;
    height: 13px;
    display: block;
    flex: 0 0 auto;
}

.fkp_dashboard-page__outbound-grid__item__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 10px;
}

.fkp_dashboard-page__outbound-grid__item__type {
    min-width: 0;
    overflow-wrap: anywhere;
}

.fkp_dashboard-page__outbound-grid__item__latency--empty {
    color: var(--primary-color-low, lightgray);
}

.fkp_dashboard-page__outbound-grid__item__latency--green {
    color: var(--success-color-medium, green);
}

.fkp_dashboard-page__outbound-grid__item__latency--yellow {
    color: var(--warn-color-medium, orange);
}

.fkp_dashboard-page__outbound-grid__item__latency--red {
    color: var(--error-color-medium, red);
}

.fkp_dashboard-page__urltest-details {
    box-sizing: border-box;
    width: min(760px, calc(100vw - 56px));
    max-width: 100%;
    padding-top: 10px;
}

.fkp_dashboard-page__urltest-details__params {
    display: grid;
    grid-template-columns: minmax(120px, max-content) minmax(0, 1fr);
    gap: 8px 16px;
    margin: 0 0 18px;
}

.fkp_dashboard-page__urltest-details__param {
    display: contents;
}

.fkp_dashboard-page__urltest-details__param dt {
    color: var(--text-color-medium, #666);
    line-height: 1.35;
}

.fkp_dashboard-page__urltest-details__param dd {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    margin: 0;
}

.fkp_dashboard-page__urltest-details__param dd span {
    min-width: 0;
    overflow-wrap: anywhere;
}

.fkp_dashboard-page__urltest-details__url {
    min-width: 0;
    color: var(--primary-color-high, #337ab7);
    text-decoration: none;
    overflow-wrap: anywhere;
}

.fkp_dashboard-page__urltest-details__url:hover {
    text-decoration: underline;
}

.fkp_dashboard-page__urltest-details__selected-value {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    max-width: 100%;
    padding: 0;
    border: 0;
    color: inherit;
    background: transparent;
    box-sizing: border-box;
    line-height: 1.3;
}

.fkp_dashboard-page__urltest-details__selected-name {
    min-width: 0;
    font-weight: 600;
    overflow-wrap: anywhere;
}

.fkp_dashboard-page__urltest-details__selected-type {
    color: var(--text-color-medium, #666);
}

.fkp_dashboard-page__urltest-details__outbounds-title {
    margin-bottom: 8px;
    font-weight: 600;
}

.fkp_dashboard-page__urltest-details__table {
    display: grid;
    gap: 6px;
    width: calc(100% + 14px);
    box-sizing: border-box;
    max-height: min(46vh, 460px);
    overflow-x: hidden;
    overflow-y: auto;
    padding-right: 14px;
    scrollbar-gutter: auto;
}

.fkp_dashboard-page__urltest-details__row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(54px, max-content) 20px;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-width: 0;
    padding: 7px 8px;
    box-sizing: border-box;
    border: 1px solid transparent;
    border-bottom: 1px solid var(--border-color-low, #eee);
    border-radius: 4px;
}

.fkp_dashboard-page__urltest-details__row--active {
    border-color: var(--success-color-low, #2d7d46);
    background: transparent;
}

.fkp_dashboard-page__urltest-details__row-name,
.fkp_dashboard-page__urltest-details__row-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    line-height: 1.3;
}

.fkp_dashboard-page__urltest-details__row-name {
    flex-wrap: wrap;
}

.fkp_dashboard-page__urltest-details__row-name b {
    min-width: 0;
    overflow-wrap: anywhere;
    line-height: 1.3;
}

.fkp_dashboard-page__urltest-details__priority-name {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 2px 0;
}

.fkp_dashboard-page__urltest-details__priority-number {
    margin-right: 6px;
    color: var(--text-color-medium, #aaa);
    font-family: monospace;
    font-size: 13px;
    font-weight: 600;
}

.fkp_dashboard-page__urltest-details__priority-level {
    margin-right: 8px;
    padding: 2px 6px;
    border-radius: 4px;
    color: var(--text-color-medium, #aaa);
    background: rgba(128, 128, 128, 0.15);
    font-size: 11px;
    font-weight: 400;
}

.fkp_dashboard-page__urltest-details__country-badge {
    display: inline-flex;
    align-items: center;
    user-select: none;
    margin-right: 6px;
    padding: 2px 4px;
    border: 1px solid rgba(128, 128, 128, 0.25);
    border-radius: 4px;
    background: rgba(128, 128, 128, 0.15);
    line-height: 1;
}

.fkp_dashboard-page__flag-emoji,
.fkp_dashboard-page__urltest-details__country-badge {
    font-family: "Twemoji Country Flags";
    font-style: normal;
    font-weight: normal;
}

.fkp_dashboard-page__urltest-details__priority-node {
    color: var(--text-color-high, #fff);
    font-weight: 600;
}

.fkp_dashboard-page__urltest-details__row-type,
.fkp_dashboard-page__urltest-details__row-meta {
    color: var(--text-color-medium, #666);
}

.fkp_dashboard-page__urltest-details__row-type {
    white-space: nowrap;
    line-height: 1.3;
}

.fkp_dashboard-page__urltest-details__row-meta {
    justify-content: flex-end;
    white-space: nowrap;
}

.fkp_dashboard-page__urltest-details__copy-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 20px;
    width: 20px;
    min-width: 20px;
    height: 20px;
    padding: 0;
    box-sizing: border-box;
}

.fkp_dashboard-page__urltest-details__copy-button svg {
    width: 12px;
    height: 12px;
}

.fkp_dashboard-page__urltest-details__copy-placeholder {
    display: block;
    width: 20px;
    min-width: 20px;
    height: 1px;
}

.fkp_dashboard-page__urltest-details__empty {
    margin-top: 4px;
    padding: 24px 0;
    border: 1px dashed var(--border-color-high, #555);
    border-radius: 4px;
    color: var(--text-color-medium, #888);
    background: rgba(128, 128, 128, 0.02);
    font-style: italic;
    text-align: center;
}

.fkp_dashboard-page__urltest-details__footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 14px;
}

@media (max-width: 560px) {
    .fkp_dashboard-page__urltest-details__params {
        grid-template-columns: 1fr;
    }

    .fkp_dashboard-page__urltest-details__row {
        grid-template-columns: minmax(0, 1fr) 20px;
    }

    .fkp_dashboard-page__urltest-details__row-meta {
        grid-column: 1 / -1;
        justify-content: flex-start;
    }
}




#cbi-olcrtcwrt-diagnostic-_mount_node > div {
    width: 100%;
}

#cbi-olcrtcwrt-diagnostic > h3 {
    display: none;
}

.fkp_diagnostic-page {
    display: grid;
    grid-template-columns: 2fr 1fr;
    grid-column-gap: 10px;
    align-items: start;
}

@media (max-width: 800px) {
    .fkp_diagnostic-page {
        grid-template-columns: 1fr;
    }
}

.fkp_diagnostic-page__right-bar {
    display: grid;
    grid-template-columns: 1fr;
    grid-row-gap: 10px;
}

.fkp_diagnostic-page__right-bar__wiki {
    border: 2px var(--background-color-low, lightgray) solid;
    border-radius: 4px;
    padding: 10px;

    display: grid;
    grid-template-columns: auto;
    grid-row-gap: 10px;
}

.fkp_diagnostic-page__right-bar__wiki--warning {
    border: 2px var(--warn-color-medium, orange) solid;
}
.fkp_diagnostic-page__right-bar__wiki--error {
    border: 2px var(--error-color-medium, red) solid;
}

.fkp_diagnostic-page__right-bar__wiki__content {
    display: grid;
    grid-template-columns: 1fr 5fr;
    grid-column-gap: 10px;
}

.fkp_diagnostic-page__right-bar__wiki__texts {}

.fkp_diagnostic-page__right-bar__actions {
    border: 2px var(--background-color-low, lightgray) solid;
    border-radius: 4px;
    padding: 10px;

    display: grid;
    grid-template-columns: auto;
    grid-row-gap: 10px;

}

.fkp_diagnostic-page__right-bar__actions > .fkp-partial-button {
    width: 100%;
    min-width: 0;
    margin-left: 0;
}

.fkp_diagnostic-page__right-bar__system-info {
    border: 2px var(--background-color-low, lightgray) solid;
    border-radius: 4px;
    padding: 10px;

    display: grid;
    grid-template-columns: auto;
    grid-row-gap: 10px;
}

.fkp_diagnostic-page__right-bar__system-info__title {

}

.fkp_diagnostic-page__right-bar__system-info__row {
    display: grid;
    grid-template-columns: auto 1fr;
    grid-column-gap: 5px;
}

.fkp_diagnostic-page__right-bar__system-info__row__tag {
    padding: 2px 4px;
    border: 1px transparent solid;
    border-radius: 4px;
    margin-left: 5px;
}

.fkp_diagnostic-page__right-bar__system-info__row__tag--neutral {
    border: 1px var(--background-color-high, gray) solid;
    color: var(--text-color-medium, gray);
}

.fkp_diagnostic-page__right-bar__system-info__row__tag--warning {
    border: 1px var(--warn-color-medium, orange) solid;
    color: var(--warn-color-medium, orange);
}

.fkp_diagnostic-page__right-bar__system-info__row__tag--success {
    border: 1px var(--success-color-medium, green) solid;
    color: var(--success-color-medium, green);
}

.fkp_diagnostic-page__left-bar {
    display: grid;
    grid-template-columns: 1fr;
    grid-row-gap: 10px;
}

.fkp_diagnostic-page__run_check_wrapper {}

.fkp_diagnostic-page__run_check_wrapper button {
    width: 100%;
}

.fkp_diagnostic-page__checks {
    display: grid;
    grid-template-columns: 1fr;
    grid-row-gap: 10px;
}

.fkp_diagnostic_alert {
    border: 2px var(--background-color-low, lightgray) solid;
    border-radius: 4px;

    display: grid;
    grid-template-columns: 24px 1fr;
    grid-column-gap: 10px;
    align-items: center;
    padding: 10px;
}

.fkp_diagnostic_alert--loading {
    border: 2px var(--primary-color-high, dodgerblue) solid;
}

.fkp_diagnostic_alert--warning {
    border: 2px var(--warn-color-medium, orange) solid;
    color: var(--warn-color-medium, orange);
}

.fkp_diagnostic_alert--error {
    border: 2px var(--error-color-medium, red) solid;
    color: var(--error-color-medium, red);
}

.fkp_diagnostic_alert--success {
    border: 2px var(--success-color-medium, green) solid;
    color: var(--success-color-medium, green);
}

.fkp_diagnostic_alert--skipped {}

.fkp_diagnostic_alert__icon {}

.fkp_diagnostic_alert__content {}

.fkp_diagnostic_alert__title {
    display: block;
}

.fkp_diagnostic_alert__description {}

.fkp_diagnostic_alert__summary {
    margin-top: 10px;
}

.fkp_diagnostic_alert__summary__item {
    display: grid;
    grid-template-columns: 16px auto 1fr;
    grid-column-gap: 10px;
}

.fkp_diagnostic_alert__summary__item--error {
    color: var(--error-color-medium, red);
}

.fkp_diagnostic_alert__summary__item--warning {
    color: var(--warn-color-medium, orange);
}

.fkp_diagnostic_alert__summary__item--success {
    color: var(--success-color-medium, green);
}

.fkp_diagnostic_alert__summary__item__icon {
    width: 16px;
    height: 16px;
}


#cbi-olcrtcwrt-monitoring-_mount_node {
    margin: 16px 0 22px;
    padding: 0;
}

#cbi-olcrtcwrt-monitoring-_mount_node > .cbi-value-title {
    display: none;
}

#cbi-olcrtcwrt-monitoring-_mount_node > .cbi-value-field {
    margin-left: 0;
    width: 100%;
}

#cbi-olcrtcwrt-monitoring-_mount_node > div {
    width: 100%;
}

#cbi-olcrtcwrt-monitoring > h3 {
    display: none;
}

.fkp_monitoring-page {
    --fkp-monitoring-control-height: 34px;
    --fkp-monitoring-row-action-size: 24px;
    --fkp-monitoring-divider-color: rgba(127, 127, 127, 0.22);
    --fkp-monitoring-soft-bg: rgba(127, 127, 127, 0.08);
    --fkp-monitoring-soft-bg-hover: rgba(127, 127, 127, 0.14);
    --fkp-monitoring-danger-color: var(--error-color-medium, #d32f2f);
    --fkp-monitoring-success-color: var(--success-color-medium, #2e7d32);
    --fkp-monitoring-paused-color: var(--primary-color-high, #1976d2);

    width: 100%;
    min-width: 0;
}

.fkp_monitoring-page__panel {
    margin-top: 0;
    border: 0;
    border-radius: 0;
    padding: 0;
    background: transparent;
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
}

.fkp_monitoring-page .btn.fkp_monitoring-page__icon-button {
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
    padding: 0;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    line-height: 1;
    margin: 0;
    border: 1px solid var(--fkp-monitoring-divider-color) !important;
    border-radius: 6px;
    background: var(--fkp-monitoring-soft-bg) !important;
    color: var(--text-color-medium) !important;
    box-shadow: none;
}

.fkp_monitoring-page .btn.fkp_monitoring-page__icon-button:hover:not(:disabled) {
    background: var(--fkp-monitoring-soft-bg-hover) !important;
    color: var(--text-color-high) !important;
}

.fkp_monitoring-page .btn.fkp_monitoring-page__icon-button--active {
    background: rgba(25, 118, 210, 0.16) !important;
    color: var(--primary-color-high, #1976d2) !important;
}

.fkp_monitoring-page .btn.fkp_monitoring-page__icon-button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

.fkp_monitoring-page #monitoring-close-all.btn.fkp_monitoring-page__icon-button {
    order: 2;
    border-color: rgba(217, 83, 79, 0.4) !important;
    background: transparent !important;
    color: var(--fkp-monitoring-danger-color) !important;
}

.fkp_monitoring-page #monitoring-close-all.btn.fkp_monitoring-page__icon-button:hover:not(:disabled) {
    border-color: rgba(217, 83, 79, 0.6) !important;
    background: transparent !important;
    color: color-mix(in srgb, var(--fkp-monitoring-danger-color) 70%, white) !important;
}

.fkp_monitoring-page #monitoring-pause-toggle.btn.fkp_monitoring-page__icon-button,
.fkp_monitoring-page #monitoring-pause-toggle.btn.fkp_monitoring-page__icon-button--active {
    order: 1;
    border-color: rgba(128, 128, 128, 0.3) !important;
    background: transparent !important;
    color: var(--text-color-medium, #888) !important;
}

.fkp_monitoring-page #monitoring-pause-toggle.btn.fkp_monitoring-page__icon-button:hover:not(:disabled),
.fkp_monitoring-page #monitoring-pause-toggle.btn.fkp_monitoring-page__icon-button--active:hover:not(:disabled) {
    border-color: rgba(128, 128, 128, 0.6) !important;
    background: transparent !important;
    color: var(--text-color-high, #eee) !important;
}

.fkp_monitoring-page__icon-button svg,
.fkp_monitoring-page__row-action svg {
    width: 16px;
    height: 16px;
    display: block;
    flex: 0 0 auto;
}

.fkp_monitoring-page__controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 12px;
    width: 100%;
    min-width: 0;
}

.fkp_monitoring-page__actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    min-width: 0;
}

.fkp_monitoring-page__tabs {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    width: max-content;
    padding: 2px;
    border: 1px solid var(--fkp-monitoring-divider-color);
    border-radius: 6px;
    background: var(--fkp-monitoring-soft-bg);
    box-sizing: border-box;
}

.fkp_monitoring-page .btn.fkp_monitoring-page__tab {
    height: calc(var(--fkp-monitoring-control-height) - 6px);
    min-height: calc(var(--fkp-monitoring-control-height) - 6px);
    margin: 0;
    padding: 0 12px;
    border: 0 !important;
    border-radius: 4px;
    background: transparent !important;
    color: var(--text-color-medium) !important;
    box-shadow: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-weight: 600;
    line-height: 1;
}

.fkp_monitoring-page .btn.fkp_monitoring-page__tab:hover {
    background: var(--fkp-monitoring-soft-bg-hover) !important;
    color: var(--text-color-high) !important;
}

.fkp_monitoring-page .btn.fkp_monitoring-page__tab--active {
    background: rgba(25, 118, 210, 0.16) !important;
    color: var(--primary-color-high, #1976d2) !important;
    font-weight: 700;
}

.fkp_monitoring-page__tab-label {
    display: inline-block;
}

.fkp_monitoring-page__tab-badge {
    min-width: 18px;
    height: 18px;
    padding: 0 6px;
    border-radius: 999px;
    background: rgba(127, 127, 127, 0.22);
    color: var(--text-color-medium);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
}

.fkp_monitoring-page__tab--active .fkp_monitoring-page__tab-badge {
    background: rgba(25, 118, 210, 0.22);
    color: var(--primary-color-high, #1976d2);
}

.fkp_monitoring-page__filters {
    display: flex;
    flex: 1 1 auto;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-start;
    gap: 12px;
    min-width: 0;
}

.fkp_monitoring-page__device-filter {
    width: min(220px, 100%);
    min-width: 0;
    height: var(--fkp-monitoring-control-height) !important;
    min-height: var(--fkp-monitoring-control-height) !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    margin: 0 !important;
    box-sizing: border-box;
    line-height: calc(var(--fkp-monitoring-control-height) - 2px) !important;
}

.fkp_monitoring-page__search {
    position: relative;
    display: flex;
    align-items: center;
    width: min(320px, 100%);
    min-width: 0;
    height: var(--fkp-monitoring-control-height);
    margin: 0;
}

.fkp_monitoring-page__search-icon {
    position: absolute;
    left: 8px;
    width: 16px;
    height: 16px;
    color: var(--text-color-medium);
    pointer-events: none;
}

.fkp_monitoring-page__search-icon svg {
    width: 16px;
    height: 16px;
    display: block;
}

.fkp_monitoring-page__search-input {
    width: 100%;
    height: var(--fkp-monitoring-control-height) !important;
    min-height: var(--fkp-monitoring-control-height) !important;
    padding-left: 30px !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    margin: 0 !important;
    box-sizing: border-box;
    line-height: calc(var(--fkp-monitoring-control-height) - 2px) !important;
}

.fkp_monitoring-page__body {
    margin-top: 0;
    width: 100%;
    min-width: 0;
}

.fkp_monitoring-page__table-wrap {
    width: 100%;
    overflow-x: auto;
    margin-bottom: 0;
}

.fkp_monitoring-page__table {
    width: 100%;
    min-width: 840px;
    table-layout: fixed;
    border-collapse: collapse;
    border-spacing: 0;
    margin-bottom: 0;
}

.fkp_monitoring-page__table th,
.fkp_monitoring-page__table td {
    padding: 8px 6px;
    border-bottom: 1px solid var(--fkp-monitoring-divider-color);
    box-sizing: border-box;
    text-align: left;
    vertical-align: middle;
    overflow: hidden;
    white-space: nowrap;
}

.fkp_monitoring-page__table th {
    color: var(--text-color-medium);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    white-space: nowrap;
    border-bottom-color: rgba(127, 127, 127, 0.32);
}

.fkp_monitoring-page__table th:nth-child(1) {
    width: 28%;
}

.fkp_monitoring-page__table th:nth-child(2) {
    width: 6%;
}

.fkp_monitoring-page__table th:nth-child(3) {
    width: 16%;
}

.fkp_monitoring-page__table th:nth-child(4) {
    width: 8%;
}

.fkp_monitoring-page__table th:nth-child(5) {
    width: 9.5%;
}

.fkp_monitoring-page__table th:nth-child(6) {
    width: 8.5%;
}

.fkp_monitoring-page__table th:nth-child(7) {
    width: 16%;
}

.fkp_monitoring-page__table th:nth-child(8) {
    width: 8%;
}

.fkp_monitoring-page__table tbody tr:last-child td {
    border-bottom: 0;
}

.fkp_monitoring-page__table td:last-child {
    padding-top: 0;
    padding-bottom: 0;
}

.fkp_monitoring-page__table th:nth-child(4),
.fkp_monitoring-page__table td:nth-child(4),
.fkp_monitoring-page__table th:nth-child(5),
.fkp_monitoring-page__table td:nth-child(5),
.fkp_monitoring-page__table th:nth-child(6),
.fkp_monitoring-page__table td:nth-child(6) {
    text-align: right;
}

.fkp_monitoring-page__table th:nth-child(7),
.fkp_monitoring-page__table td:nth-child(7) {
    text-align: left;
}

.fkp_monitoring-page__table th:last-child,
.fkp_monitoring-page__table td:last-child {
    text-align: center;
}

.fkp_monitoring-page__value {
    display: block;
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
    line-height: 1.3;
    color: var(--text-color-high);
    font-size: 13px;
    user-select: text;
}

.fkp_monitoring-page__source-value {
    display: flex;
    align-items: baseline;
    justify-content: flex-start;
    gap: 5px;
}

.fkp_monitoring-page__source-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.fkp_monitoring-page__source-ip {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-color-medium);
    font-size: 12px;
}

.fkp_monitoring-page__source-value--ip-only {
    color: var(--text-color-high);
}

.fkp_monitoring-page__cell-main {
    color: var(--text-color-high);
    font-weight: 600;
    line-height: 1.25;
}

.fkp_monitoring-page__cell-secondary {
    margin-top: 2px;
    color: var(--text-color-medium);
    font-size: 12px;
    line-height: 1.25;
}

.fkp_monitoring-page__route {
    display: inline-block;
    width: auto;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(128, 128, 128, 0.15);
    color: var(--text-color-high, #eee);
    font-size: 11px;
    font-weight: 500;
}

.fkp_monitoring-page__network {
    background: transparent;
    border: 0;
    padding: 0;
    color: var(--text-color-medium, #bbb);
    font-family: inherit;
    font-size: 13px;
    text-transform: lowercase;
}

.fkp_monitoring-page__table td:nth-child(4) .fkp_monitoring-page__value,
.fkp_monitoring-page__table td:nth-child(5) .fkp_monitoring-page__value,
.fkp_monitoring-page__table td:nth-child(6) .fkp_monitoring-page__value {
    color: var(--text-color-medium, #bbb);
    font-family: inherit;
    text-align: right;
}

.fkp_monitoring-page .btn.fkp_monitoring-page__row-action {
    width: var(--fkp-monitoring-row-action-size);
    height: var(--fkp-monitoring-row-action-size);
    min-width: var(--fkp-monitoring-row-action-size);
    min-height: var(--fkp-monitoring-row-action-size);
    padding: 0;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    margin: 0;
    border: 0 !important;
    border-radius: 999px;
    background: transparent !important;
    color: var(--fkp-monitoring-danger-color) !important;
    box-shadow: none;
    cursor: pointer;
}

.fkp_monitoring-page__row-action svg {
    width: 14px;
    height: 14px;
}

.fkp_monitoring-page .btn.fkp_monitoring-page__row-action:hover:not(:disabled) {
    background: var(--fkp-monitoring-soft-bg-hover) !important;
    color: var(--fkp-monitoring-danger-color) !important;
}

.fkp_monitoring-page .btn.fkp_monitoring-page__row-action:disabled {
    opacity: 0.45;
    cursor: wait;
}

.fkp_monitoring-page__row--closing {
    opacity: 0.55;
}

.fkp_monitoring-page__state {
    min-height: 90px;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-color-medium);
    text-align: center;
    box-sizing: border-box;
}

.fkp_monitoring-page__state-cell {
    padding: 0 !important;
}

.fkp_monitoring-page__state--error {
    color: var(--error-color-medium, #d32f2f);
}

@media (max-width: 900px) {
    .fkp_monitoring-page__controls {
        align-items: center;
    }

    .fkp_monitoring-page__tabs {
        flex: 1 0 100%;
    }

    .fkp_monitoring-page__filters {
        flex: 1 1 0;
    }

    .fkp_monitoring-page__device-filter,
    .fkp_monitoring-page__search {
        max-width: none;
    }

    .fkp_monitoring-page__table {
        min-width: 0;
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
        border: 1px var(--background-color-low, lightgray) solid;
        border-radius: 4px;
        padding: 8px;
        box-sizing: border-box;
        margin-bottom: 8px;
    }

    .fkp_monitoring-page__table td {
        display: grid;
        grid-template-columns: minmax(92px, 34%) minmax(0, 1fr);
        gap: 8px;
        border: 0;
        border-bottom: 1px solid var(--fkp-monitoring-divider-color);
        padding: 4px 0;
        box-sizing: border-box;
        text-align: left;
    }

    .fkp_monitoring-page__table td::before {
        content: attr(data-label);
        color: var(--text-color-medium);
        font-weight: 700;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .fkp_monitoring-page__table td:last-child {
        grid-template-columns: minmax(92px, 34%) minmax(0, 1fr);
        align-items: center;
        border-bottom: 0;
        min-height: var(--fkp-monitoring-row-action-size);
        padding: 0;
    }

    .fkp_monitoring-page__value {
        text-align: right;
    }

    .fkp_monitoring-page__source-value {
        justify-content: flex-end;
    }

    .fkp_monitoring-page__state-row td::before {
        display: none;
    }
}

@media (max-width: 520px) {
    .fkp_monitoring-page__controls,
    .fkp_monitoring-page__filters {
        align-items: stretch;
    }

    .fkp_monitoring-page__tabs,
    .fkp_monitoring-page__filters,
    .fkp_monitoring-page__device-filter,
    .fkp_monitoring-page__search {
        width: 100%;
    }

    .fkp_monitoring-page__controls,
    .fkp_monitoring-page__filters {
        flex-direction: column;
    }

    .fkp_monitoring-page__actions {
        align-self: flex-end;
    }

    .fkp_monitoring-page__tabs {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        width: 100%;
    }

    .fkp_monitoring-page__table td {
        grid-template-columns: 1fr;
        gap: 2px;
    }

    .fkp_monitoring-page__value {
        text-align: left;
    }

    .fkp_monitoring-page__source-value {
        justify-content: flex-start;
    }
}


#cbi-olcrtcwrt-updates-_mount_node > div {
    width: 100%;
}

#cbi-olcrtcwrt-updates > h3 {
    display: none;
}

.fkp_updates-page {
    width: 100%;
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
    flex: 1 1 auto;
    flex-direction: column;
    gap: 10px;
    min-width: max-content;
}

@media (max-width: 760px) {
    .fkp_updates-page__components {
        flex-direction: column;
    }

    .fkp_updates-page__components-column {
        width: 100%;
        min-width: 0;
    }
}

.fkp_updates-page__component {
    border: 2px var(--background-color-low, lightgray) solid;
    border-radius: 4px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: max-content;
}

.fkp_updates-page__component__header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    border-bottom: 1px var(--background-color-low, lightgray) solid;
    padding-bottom: 8px;
    margin-bottom: 2px;
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
    font-weight: normal;
}

.fkp_updates-page__component__details {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.fkp_updates-page__component__info-row {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    min-height: 24px;
    gap: 8px;
    white-space: nowrap;
}

.fkp_updates-page__component__info-label {
    color: var(--text-color-medium, #888);
    font-size: 12px;
}

.fkp_updates-page__component__info-value {
    color: var(--text-color-high, #000);
    font-weight: 500;
    font-size: 13px;
    text-align: left;
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    overflow-wrap: anywhere;
}

.fkp_updates-page__component__info-value--latest {
    flex-wrap: wrap;
    justify-content: flex-start;
}

.fkp_updates-page__component__release-version-link {
    color: var(--link-color, #3498db) !important;
    text-decoration: underline;
    font-weight: bold;
}

.fkp_updates-page__component__release-version-link:hover {
    color: var(--link-color-dark, #2980b9) !important;
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

.fkp_updates-page__component__actions-main {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    flex-wrap: nowrap;
    gap: 6px;
}

.fkp_updates-page__component__variants {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 4px;
}

.fkp_updates-page__component__variants-title {
    font-size: 11px;
    font-weight: bold;
    color: var(--text-color-medium, gray);
}

.fkp_updates-page__component__variants-buttons {
    display: flex;
    flex-wrap: nowrap;
    gap: 6px;
}


.fkp-partial-button {
    text-align: center;
}

.fkp-partial-button--with-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
}

.fkp-partial-button--loading {
}

.fkp-partial-button--disabled {
}

.fkp-partial-button__icon {
    flex: 0 0 auto;
}

.fkp-partial-button__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.fkp-partial-button__icon svg {
    width: 16px;
    height: 16px;
    display: block;
    flex: 0 0 auto;
}



.fkp-partial-modal__body {}

.fkp-partial-modal__content {
    max-height: 70vh;
    overflow: scroll;
    border-radius: 4px;
}

.fkp-partial-modal__footer {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
}

.fkp-partial-modal__footer button {
    margin-left: 0;
}

.fkp-partial-modal__checkbox {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-right: auto;
    cursor: pointer;
    user-select: none;
}

.fkp-partial-modal__checkbox-text {
    line-height: 1.2;
}
`;

return baseclass.extend({
	injectGlobalStyles: function() {
		if (injected || !document.head)
			return;
		var style = E('style', { 'id': 'olcrtcwrt-forkop-styles', 'type': 'text/css' }, css);
		document.head.appendChild(style);
		injected = true;
	}
});
