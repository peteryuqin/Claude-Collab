"use strict";
/**
 * Metrics Panel Component for Terminal Dashboard
 * Shows diversity metrics and collaboration health
 */
const blessed = require('blessed');
const contrib = require('blessed-contrib');
class MetricsPanel {
    constructor(grid, options) {
        this.options = options;
        // Create container for metrics
        this.container = grid.set(options.row, options.col, options.rowSpan, options.colSpan, blessed.box, {
            label: options.label || ' Diversity Metrics ',
            border: { type: 'line' },
            style: {
                border: { fg: 'cyan' }
            }
        });
        this.setupComponents();
        this.metrics = {};
    }
    setupComponents() {
        // Diversity gauge
        this.diversityGauge = contrib.gauge({
            parent: this.container,
            label: 'Overall Diversity',
            width: '25%',
            height: '80%',
            top: 1,
            left: 1,
            stroke: 'green',
            fill: 'white',
            gaugeSpacing: 1,
            gaugeHeight: 1
        });
        // Agreement rate
        this.agreementGauge = contrib.gauge({
            parent: this.container,
            label: 'Agreement Rate',
            width: '25%',
            height: '80%',
            top: 1,
            left: '25%',
            stroke: 'yellow',
            fill: 'white'
        });
        // Evidence rate
        this.evidenceGauge = contrib.gauge({
            parent: this.container,
            label: 'Evidence Rate',
            width: '25%',
            height: '80%',
            top: 1,
            left: '50%',
            stroke: 'cyan',
            fill: 'white'
        });
        // Stats text
        this.statsBox = blessed.box({
            parent: this.container,
            width: '25%',
            height: '80%',
            top: 1,
            left: '75%',
            tags: true,
            style: {
                fg: 'white'
            }
        });
    }
    update(metrics) {
        this.metrics = metrics;
        // Update gauges with percentages
        const diversityPercent = Math.round((metrics.overallDiversity || 0) * 100);
        const agreementPercent = Math.round((metrics.agreementRate || 0) * 100);
        const evidencePercent = Math.round((metrics.evidenceRate || 0) * 100);
        this.diversityGauge.setPercent(diversityPercent);
        this.agreementGauge.setPercent(agreementPercent);
        this.evidenceGauge.setPercent(evidencePercent);
        // Set gauge colors based on thresholds
        this.setGaugeColor(this.diversityGauge, diversityPercent, 60, 40); // Want high diversity
        this.setGaugeColor(this.agreementGauge, 100 - agreementPercent, 70, 50); // Want low agreement
        this.setGaugeColor(this.evidenceGauge, evidencePercent, 70, 50); // Want high evidence
        // Update stats
        this.updateStats(metrics);
        this.container.screen.render();
    }
    setGaugeColor(gauge, value, goodThreshold, warningThreshold) {
        if (value >= goodThreshold) {
            gauge.setOptions({ stroke: 'green' });
        }
        else if (value >= warningThreshold) {
            gauge.setOptions({ stroke: 'yellow' });
        }
        else {
            gauge.setOptions({ stroke: 'red' });
        }
    }
    updateStats(metrics) {
        const content = `{bold}Live Stats{/}
    
Agents: {cyan-fg}${metrics.activeAgents || 0}{/}
Msg/min: {yellow-fg}${metrics.messagesPerMinute || 0}{/}

{bold}Warnings:{/}
${this.getWarnings(metrics)}`;
        this.statsBox.setContent(content);
    }
    getWarnings(metrics) {
        const warnings = [];
        if (metrics.overallDiversity < 0.5) {
            warnings.push('{red-fg}⚠ Low diversity!{/}');
        }
        if (metrics.agreementRate > 0.8) {
            warnings.push('{red-fg}⚠ Echo chamber risk!{/}');
        }
        if (metrics.evidenceRate < 0.3) {
            warnings.push('{yellow-fg}⚠ Low evidence rate{/}');
        }
        if (metrics.activeAgents < 2) {
            warnings.push('{gray-fg}ℹ Need more agents{/}');
        }
        return warnings.length > 0 ? warnings.join('\n') : '{green-fg}✓ All good!{/}';
    }
    focus() {
        this.container.focus();
    }
}
module.exports = MetricsPanel;
//# sourceMappingURL=metrics-panel.js.map