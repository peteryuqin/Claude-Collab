export = MetricsPanel;
declare class MetricsPanel {
    constructor(grid: any, options: any);
    options: any;
    container: any;
    metrics: {};
    setupComponents(): void;
    diversityGauge: contrib.Widgets.GaugeElement | undefined;
    agreementGauge: contrib.Widgets.GaugeElement | undefined;
    evidenceGauge: contrib.Widgets.GaugeElement | undefined;
    statsBox: any;
    update(metrics: any): void;
    setGaugeColor(gauge: any, value: any, goodThreshold: any, warningThreshold: any): void;
    updateStats(metrics: any): void;
    getWarnings(metrics: any): string;
    focus(): void;
}
import contrib = require("blessed-contrib");
//# sourceMappingURL=metrics-panel.d.ts.map