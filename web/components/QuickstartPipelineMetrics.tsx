'use client';

export type QuickstartAgentMetric = {
  type: string;
  name: string;
  value: number;
  timestamp: number;
};

type QuickstartPipelineMetricsProps = {
  metrics: QuickstartAgentMetric[];
};

const PIPELINE = [
  { key: 'stt', label: 'Sarvam speech-to-text', metricTypes: ['stt', 'asr'] },
  { key: 'llm', label: 'Model + complaint tools', metricTypes: ['llm', 'mllm'] },
  { key: 'tts', label: 'Murf Falcon voice', metricTypes: ['tts'] },
] as const;

function formatMetricName(name: string) {
  return name.replace(/[_-]+/g, ' ');
}

export function QuickstartPipelineMetrics({
  metrics,
}: QuickstartPipelineMetricsProps) {
  const latestByType = new Map<string, QuickstartAgentMetric>();
  for (const metric of metrics) {
    latestByType.set(metric.type.toLowerCase(), metric);
  }

  return (
    <div className="up-pipe" aria-label="Pipeline">
      <span>Pipeline</span>
      {PIPELINE.map((step, index) => {
        const metric = step.metricTypes.map((type) => latestByType.get(type)).find(Boolean);
        return (
          <span key={step.key} className="flex items-center gap-1.5">
            {index > 0 && <span aria-hidden="true">→</span>}
            <span className="step">
              {step.label}
              {metric && (
                <b title={new Date(metric.timestamp).toLocaleTimeString()}>
                  {formatMetricName(metric.name)} {Math.round(metric.value)}ms
                </b>
              )}
            </span>
          </span>
        );
      })}
    </div>
  );
}
