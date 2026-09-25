/**
 * Performance Logger Middleware
 *
 * Measures and logs response time for every API request.
 * Flags slow requests (>500ms) so you can immediately spot bottlenecks.
 *
 * Output format (in your terminal):
 *   [PERF] POST /api/v1/spoc/addFarmer  → 243ms
 *   [SLOW] GET  /api/v1/spoc/getAllFarmers  → 1204ms  ← investigate this
 */

const SLOW_THRESHOLD_MS = 500; // anything above this gets flagged as slow

const performanceLogger = (req, res, next) => {
    const start = process.hrtime.bigint(); // nanosecond precision

    // Hook into the moment the response finishes sending.
    res.on("finish", () => {
        const end       = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1_000_000; // convert ns → ms
        const rounded    = durationMs.toFixed(2);

        const method  = req.method.padEnd(6);
        const url     = req.originalUrl;
        const status  = res.statusCode;

        if (durationMs > SLOW_THRESHOLD_MS) {
            // Red-flag slow requests in the terminal
            console.warn(
                `[SLOW] ${method} ${url}  →  ${rounded}ms  (status: ${status})  ← investigate`
            );
        } else {
            console.log(
                `[PERF] ${method} ${url}  →  ${rounded}ms  (status: ${status})`
            );
        }
    });

    next();
};

export default performanceLogger;
