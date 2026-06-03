import client from 'prom-client';

const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

export const activeMeetingsGauge = new client.Gauge({
  name: 'intellmeet_active_meetings',
  help: 'Number of live meetings',
  registers: [register],
});

export const socketConnectionsGauge = new client.Gauge({
  name: 'intellmeet_socket_connections',
  help: 'Active Socket.io connections',
  registers: [register],
});

export { register };

export function metricsMiddleware(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    const route = req.route?.path || req.path;
    httpRequestDuration.observe(
      { method: req.method, route, status_code: res.statusCode },
      (Date.now() - start) / 1000
    );
  });
  next();
}
