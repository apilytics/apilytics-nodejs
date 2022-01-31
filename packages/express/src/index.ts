import { URL } from 'url';

import { milliSecondTimer, sendApilyticsMetrics } from '@apilytics/core';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

const EXPRESS_VERSION = require('express/package.json').version;

/**
 * Express middleware that sends API analytics data to Apilytics (https://apilytics.io).
 *
 * @param apiKey - The API key for your Apilytics origin.
 * @returns An Express middleware that can be passed to `app.use()`.
 *
 * @example
 *
 *     const { apilyticsMiddleware } = require('@apilytics/express');
 *     const express = require('express');
 *
 *     const app = express();
 *
 *     app.use(apilyticsMiddleware("your-api-key"));
 */
export const apilyticsMiddleware = (
  apiKey: string | undefined,
): RequestHandler => {
  if (!apiKey) {
    return (req: Request, res: Response, next: NextFunction): void => {
      next();
    };
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const timer = milliSecondTimer();
    res.on('finish', () => {
      const { pathname: path, search: query } = new URL(
        req.originalUrl,
        'http://_', // Cannot parse a relative URL, so make it absolute.
      );

      const _requestSize = Number(req.headers['content-length']);
      const requestSize = isNaN(_requestSize) ? undefined : _requestSize;

      const _responseSize = Number(
        // @ts-ignore: `_contentLength` is not typed, but it does exist sometimes
        // when the header doesn't. Even if it doesn't this won't fail at runtime.
        res.getHeader('content-length') ?? res._contentLength,
      );
      const responseSize = isNaN(_responseSize) ? undefined : _responseSize;

      sendApilyticsMetrics({
        apiKey,
        path,
        query,
        method: req.method,
        statusCode: res.statusCode,
        requestSize,
        responseSize,
        timeMillis: timer(),
        apilyticsIntegration: 'apilytics-node-express',
        integratedLibrary: `express/${EXPRESS_VERSION}`,
      });
    });
    next();
  };
};
