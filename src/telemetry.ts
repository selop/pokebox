import { trace } from '@opentelemetry/api'
import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { ZoneContextManager } from '@opentelemetry/context-zone'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch'
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load'
import { registerInstrumentations } from '@opentelemetry/instrumentation'

const collectorUrl = import.meta.env.VITE_OTEL_COLLECTOR_URL

if (collectorUrl) {
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'pokebox-web',
  })

  const exporter = new OTLPTraceExporter({
    url: `${collectorUrl}/v1/traces`,
  })

  const provider = new WebTracerProvider({
    resource,
    spanProcessors: [new BatchSpanProcessor(exporter)],
  })

  provider.register({
    contextManager: new ZoneContextManager(),
  })

  registerInstrumentations({
    instrumentations: [
      new FetchInstrumentation({
        propagateTraceHeaderCorsUrls: [],
        ignoreUrls: [/\/v1\/traces/],
      }),
      new DocumentLoadInstrumentation(),
    ],
  })
}

export const tracer = trace.getTracer('pokebox-web')
