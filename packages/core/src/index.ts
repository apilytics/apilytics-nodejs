import https from 'https';

const APILYTICS_VERSION = require('../package.json').version;

interface Params {
  apiKey: string;
  path: string;
  method: string;
  timeMillis: number;
  query?: string;
  statusCode?: number | null;
  requestSize?: number;
  responseSize?: number;
  userAgent?: string;
  apilyticsIntegration?: string;
  integratedLibrary?: string;
}

/**
 * Send API analytics data to Apilytics (https://apilytics.io).
 * Does the sending as fire-and-forget background task.
 *
 * @param params
 * @param params.apiKey - The API key for your Apilytics origin.
 * @param params.path - Path of the user's HTTP request, e.g. '/foo/bar/123'.
 * @param params.method - Method of the user's HTTP request, e.g. 'GET'.
 * @param params.timeMillis - The amount of time in milliseconds it took
 *     to respond to the user's request.
 * @param params.query - Optional query string of the user's HTTP request
 *     e.g. 'key=val&other=123'. An empty string and null are treated equally.
 *     Can have an optional '?' at the start.
 * @param params.statusCode - Status code for the sent HTTP response.
 *     Can be omitted (or null) if the middleware could not get the status code
 *     for the response. E.g. if the inner request handling threw an exception.
 * @param params.requestSize - Size of the user's HTTP request's body in bytes.
 * @param params.responseSize - Size of the sent HTTP response's body in bytes.
 * @param params.userAgent - Value of the `User-Agent` header from the user's
 *     HTTP request.
 * @param params.apilyticsIntegration - Name of the Apilytics integration that's
 *     calling this, e.g. 'apilytics-node-express'.
 *     No need to pass this when calling from user code.
 * @param params.integratedLibrary - Name and version of the integration that
 *     this is used in, e.g. 'express/4.17.2'.
 *     No need to pass this when calling from user code.
 *
 * @example
 *
 *    const timer = milliSecondTimer();
 *    const res = await handler(req);
 *    sendApilyticsMetrics({
 *      apikey: "<your-api-key>",
 *      path: req.path,
 *      query: req.queryString,
 *      method: req.method,
 *      statusCode: res.statusCode,
 *      requestSize: req.bodyBytes.length,
 *      responseSize: res.bodyBytes.length,
 *      userAgent: req.headers['user-agent'],
 *      timeMillis: timer(),
 *    });
 */
export const sendApilyticsMetrics = ({
  apiKey,
  path,
  method,
  timeMillis,
  query,
  statusCode,
  requestSize,
  responseSize,
  userAgent,
  apilyticsIntegration,
  integratedLibrary,
}: Params): void => {
  const data = JSON.stringify({
    path,
    query: query || undefined,
    method,
    statusCode: statusCode ?? undefined,
    requestSize,
    responseSize,
    userAgent: userAgent || undefined,
    timeMillis,
  });
  let apilyticsVersion = `${
    apilyticsIntegration ?? 'apilytics-node-core'
  }/${APILYTICS_VERSION};node/${process.versions.node}`;

  if (integratedLibrary) {
    apilyticsVersion += `;${integratedLibrary}`;
  }

  const options = {
    hostname: 'www.apilytics.io',
    port: 443,
    path: '/api/v1/middleware',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'X-API-Key': apiKey,
      'Apilytics-Version': apilyticsVersion,
    },
  };

  new Promise((_, reject) => {
    const req = https.request(options);
    req.on('error', (err) => {
      reject(err);
    });
    req.write(data);
    req.end();
  }).catch((err) => {
    if (process.env.NODE_ENV !== 'production') {
      console.error(err);
    }
  });
};

/**
 * Times the amount of milliseconds something takes to execute.
 * The timer starts when this is initially called.
 *
 * @returns A function that can be called to stop the timer.
 *     That function's return value is the elapsed time.
 */
export const milliSecondTimer = (): (() => number) => {
  const startTimeNs = process.hrtime.bigint();

  return (): number => {
    const endTimeNs = process.hrtime.bigint();
    return Number((endTimeNs - startTimeNs) / BigInt(1_000_000));
  };
};
