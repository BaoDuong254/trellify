import http from "node:http";

import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from "@prometheus-io/client";

import logger from "@workspace/shared/utils/logger";

const metricsRegistry = new Registry();

collectDefaultMetrics({ register: metricsRegistry });

export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests handled by the API",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [metricsRegistry],
});

export const connectedSockets = new Gauge({
  name: "socketio_connected_sockets",
  help: "Number of Socket.io clients currently connected to this instance",
  registers: [metricsRegistry],
});

export const boardBroadcastDuration = new Histogram({
  name: "board_broadcast_duration_seconds",
  help: "Time spent fetching the board snapshot and emitting it to the board room",
  labelNames: ["reason"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [metricsRegistry],
});

export const boardBroadcastLocalRecipients = new Histogram({
  name: "board_broadcast_local_recipients",
  help: "Viewers of this board connected to the instance that handled the write, excluding the actor. NOT the cluster-wide fan-out: the broadcast also reaches viewers on other instances through the Redis adapter, and those are not counted here.",
  buckets: [0, 1, 2, 5, 10, 25, 50, 100],
  registers: [metricsRegistry],
});

export const boardBroadcastFailures = new Counter({
  name: "board_broadcast_failures_total",
  help: "Broadcasts that threw before reaching the board room",
  registers: [metricsRegistry],
});

export const boardBroadcastSkipped = new Counter({
  name: "board_broadcast_skipped_total",
  help: "Board updates that skipped the snapshot fetch and emit because the viewer registry held nobody but the actor",
  labelNames: ["reason"],
  registers: [metricsRegistry],
});

export const cacheRequests = new Counter({
  name: "cache_requests_total",
  help: "Read-through cache lookups by cache name and outcome: hit, negative_hit, miss, coalesced_local, coalesced_remote, wait_timeout, error or disabled",
  labelNames: ["cache", "result"],
  registers: [metricsRegistry],
});

export const cacheLoaderDuration = new Histogram({
  name: "cache_loader_duration_seconds",
  help: "Time spent in the cache loader, meaning the query that actually reached the database. Its count is the number of loads that survived single-flight coalescing.",
  labelNames: ["cache"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [metricsRegistry],
});

export const bloomFilterChecks = new Counter({
  name: "bloom_filter_checks_total",
  help: "Bloom filter membership probes by filter and outcome: absent means the id was rejected before any database read, present means it fell through to the cache, skipped means the filter was disabled or not yet built, error means the probe failed and read through",
  labelNames: ["filter", "result"],
  registers: [metricsRegistry],
});

export const bloomFilterItems = new Gauge({
  name: "bloom_filter_items",
  help: "Number of ids inserted while building the filter, 0 when the filter is absent so probes fail open",
  labelNames: ["filter"],
  registers: [metricsRegistry],
});

export const indexesReady = new Gauge({
  name: "mongodb_indexes_ready",
  help: "1 when every expected MongoDB index exists, 0 when at least one failed to be created",
  registers: [metricsRegistry],
});

export const workerJobDuration = new Histogram({
  name: "worker_job_duration_seconds",
  help: "Processing time of BullMQ jobs, by job name and outcome",
  labelNames: ["job", "outcome"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 15, 60],
  registers: [metricsRegistry],
});

export const startMetricsServer = (port: number, label: string): http.Server => {
  const server = http.createServer((request, response) => {
    if (request.url !== "/metrics") {
      response.writeHead(404).end();
      return;
    }
    void (async (): Promise<void> => {
      try {
        const body = await metricsRegistry.metrics();
        response.writeHead(200, { "Content-Type": metricsRegistry.contentType }).end(body);
      } catch (error) {
        logger.error(`Failed to render metrics: ${(error as Error).message}`);
        response.writeHead(500).end();
      }
    })();
  });

  server.listen(port, () => {
    logger.info(`${label} metrics listening on :${port}/metrics`);
  });

  return server;
};
