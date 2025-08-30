/**
 * Generic HTTP helper utilities to reduce repetition in the worker handler.
 */
/* eslint-env worker */

/**
 * If the request method is not GET returns a 405 Response, otherwise null.
 * @param {Request} request incoming request
 * @param {string} locale locale for error message
 * @param {(r:Request)=>Record<string,string>} getSecurityHeadersFn function to build security headers
 * @param {(code:string,loc:string)=>string} getErrorMessageFn localization error message provider
 * @returns {Response|null}
 */
export function ensureGetMethod(request, locale, getSecurityHeadersFn, getErrorMessageFn) {
  if (request.method !== 'GET') {
  return new globalThis.Response(getErrorMessageFn('METHOD_NOT_ALLOWED', locale), {
      status: 405,
      headers: { 'Allow': 'GET', ...getSecurityHeadersFn(request) }
    });
  }
  return null;
}

/**
 * Method not allowed JSON response for API endpoints.
 * @param {Request} request request
 * @param {string} allowed Allowed methods string (e.g. 'POST')
 * @param {string} locale locale
 * @param {(code:string,loc:string)=>string} getErrorMessageFn provider
 * @param {(r:Request)=>Record<string,string>} getSecurityHeadersFn security headers provider
 * @returns {Response}
 */
export function methodNotAllowedJSONResponse(request, allowed, locale, getErrorMessageFn, getSecurityHeadersFn) {
  return new globalThis.Response(JSON.stringify({ error: getErrorMessageFn('METHOD_NOT_ALLOWED', locale) }), {
    status: 405,
    headers: {
      'Content-Type': 'application/json',
      'Allow': allowed,
      'Cache-Control': 'no-store',
      ...getSecurityHeadersFn(request)
    }
  });
}

/**
 * Return a 304 Not Modified response if ETag matches; else null.
 * @param {Request} request request
 * @param {string} etag expected ETag
 * @param {(r:Request)=>Record<string,string>} getSecurityHeadersFn provider
 * @returns {Response|null}
 */
export function notModifiedIfMatch(request, etag, getSecurityHeadersFn) {
  if (request.headers.get('if-none-match') === etag) {
  return new globalThis.Response(null, { status: 304, headers: { ...getSecurityHeadersFn(request), ETag: etag } });
  }
  return null;
}
