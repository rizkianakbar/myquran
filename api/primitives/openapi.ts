import { access, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import type { Express, Request as ExpressRequest, RequestHandler } from 'ultimate-express';
import { z } from 'zod';
import { type AppContext, defineAppContext } from './app-context.ts';
import type { Container } from './container.ts';

/**
 * Response marker type for Express compatibility.
 */
type ResponseMarker<T = unknown> = {
  __response: true;
  status: number;
  data: T;
};

/**
 * Helper type to map status codes to method names.
 */
type GetMethodName<K> = K extends 200
  ? 'ok'
  : K extends 201
    ? 'created'
    : K extends 204
      ? 'noContent'
      : K extends 400
        ? 'badRequest'
        : K extends 401
          ? 'unauthorized'
          : K extends 403
            ? 'forbidden'
            : K extends 404
              ? 'notFound'
              : K extends 409
                ? 'conflict'
                : K extends 422
                  ? 'unprocessableEntity'
                  : K extends 500
                    ? 'internalServerError'
                    : never;

function getMethodNameForStatus(status: number): string | null {
  const methodMap: Record<number, string> = {
    200: 'ok',
    201: 'created',
    204: 'noContent',
    400: 'badRequest',
    401: 'unauthorized',
    403: 'forbidden',
    404: 'notFound',
    409: 'conflict',
    422: 'unprocessableEntity',
    500: 'internalServerError',
  };
  return methodMap[status] || null;
}

/**
 * Define typed response builders based on defined response schemas.
 */
export function defineTypedResponses<TResponses extends Record<number, { description: string; schema: z.ZodSchema }>>(
  responses: TResponses,
) {
  type ResponseMethods = {
    [K in keyof TResponses as GetMethodName<K>]: K extends number
      ? TResponses[K]['schema'] extends z.ZodNull
        ? () => ResponseMarker<null>
        : <T extends z.infer<TResponses[K]['schema']>>(data: T) => ResponseMarker<z.infer<TResponses[K]['schema']>>
      : never;
  };

  const builder = {} as ResponseMethods;

  for (const [statusCode, responseSpec] of Object.entries(responses)) {
    const status = Number(statusCode);
    const methodName = getMethodNameForStatus(status);

    if (methodName) {
      (builder as any)[methodName] = (data?: unknown) => {
        const schema = responseSpec.schema;

        if (schema instanceof z.ZodNull || data === null || data === undefined) {
          return {
            __response: true,
            status,
            data: data ?? null,
          };
        }

        const validatedData = schema.parse(data);

        return {
          __response: true,
          status,
          data: validatedData,
        };
      };
    }
  }

  return builder;
}

/**
 * Handler parameters with full type safety for request inputs.
 */
export type HandlerParams<
  TParams extends z.ZodSchema | undefined = undefined,
  TQuery extends z.ZodSchema | undefined = undefined,
  TBody extends z.ZodSchema | undefined = undefined,
  TResponses extends Record<number, { description: string; schema: z.ZodSchema }> = Record<
    number,
    { description: string; schema: z.ZodSchema }
  >,
> = {
  ctx: AppContext;
  body: TBody extends z.ZodSchema ? z.infer<TBody> : unknown;
  params: TParams extends z.ZodSchema ? z.infer<TParams> : Record<string, unknown>;
  query: TQuery extends z.ZodSchema ? z.infer<TQuery> : Record<string, unknown>;
  request: ExpressRequest;
  response: ReturnType<typeof defineTypedResponses<TResponses>>;
};

/**
 * Helper function to define an OpenAPI endpoint with full type safety.
 *
 * @example
 * ```typescript
 * GET: defineOpenAPIEndpoint({
 *   summary: "List posts",
 *   responses: {
 *     200: { description: "Success", schema: z.array(PostSchema) },
 *     401: { description: "Unauthorized", schema: z.object({ error: z.string() }) },
 *   },
 *   async handler({ ctx, response }) {
 *     if (!ctx.apiKey) {
 *       return response.unauthorized({ error: "API key required" });
 *     }
 *     const posts = await listPosts(ctx.container.db, ctx.apiKey.userId);
 *     return response.ok(posts);
 *   },
 * }),
 * ```
 */
export function defineOpenAPIEndpoint<
  TParams extends z.ZodSchema | undefined = undefined,
  TQuery extends z.ZodSchema | undefined = undefined,
  TBody extends z.ZodSchema | undefined = undefined,
  TResponses extends Record<number, { description: string; schema: z.ZodSchema }> = Record<
    number,
    { description: string; schema: z.ZodSchema }
  >,
>(spec: {
  summary?: string;
  description?: string;
  params?: TParams;
  query?: TQuery;
  requestBody?: TBody;
  responses: TResponses;
  handler: (params: HandlerParams<TParams, TQuery, TBody, TResponses>) => Promise<ResponseMarker>;
}) {
  return spec;
}

/**
 * OpenAPI method specification type (for internal use).
 */
export type OpenAPIMethodSpec = {
  summary?: string;
  description?: string;
  params?: z.ZodSchema;
  query?: z.ZodSchema;
  requestBody?: z.ZodSchema;
  responses: Record<number, { description: string; schema: z.ZodSchema }>;
  handler: (params: HandlerParams<any, any, any, any>) => Promise<ResponseMarker>;
};

/**
 * Configuration object for defineOpenAPI.
 */
export type DefineOpenAPIConfig = {
  [K in 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE']?: OpenAPIMethodSpec;
};

/**
 * Return type for defineOpenAPI function.
 */
export type DefineOpenAPIReturn = {
  handlers: Record<string, RequestHandler>;
};

/**
 * Parse and validate request parameters with Zod schema.
 */
function parseParams<T extends z.ZodSchema>(
  schema: T | undefined,
  rawParams: Record<string, string | undefined>,
): T extends z.ZodSchema ? z.infer<T> : Record<string, unknown> {
  if (!schema) return rawParams as any;
  return schema.parse(rawParams) as any;
}

/**
 * Parse and validate query parameters with Zod schema.
 */
function parseQuery<T extends z.ZodSchema>(
  schema: T | undefined,
  url: URL,
): T extends z.ZodSchema ? z.infer<T> : Record<string, unknown> {
  const queryObj: Record<string, string | string[]> = {};
  for (const [key, value] of url.searchParams.entries()) {
    const existing = queryObj[key];
    if (existing === undefined) {
      queryObj[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      queryObj[key] = [existing, value];
    }
  }

  if (!schema) return queryObj as any;
  return schema.parse(queryObj) as any;
}

/**
 * Parse and validate request body with Zod schema.
 */
function parseBody<T extends z.ZodSchema>(
  schema: T | undefined,
  req: ExpressRequest,
): T extends z.ZodSchema ? z.infer<T> : unknown {
  const bodyData: unknown = req.body;
  if (!schema) return bodyData as any;
  return schema.parse(bodyData) as any;
}

/**
 * Define Express handler for a single HTTP method.
 */
function defineExpressHandler(spec: OpenAPIMethodSpec, method: string): RequestHandler {
  return async (req, res, next) => {
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);
      const parsedParams = parseParams(spec.params, req.params);
      const parsedQuery = parseQuery(spec.query, url);
      const parsedBody = parseBody(spec.requestBody, req);
      const responseBuilder = defineTypedResponses(spec.responses);
      const ctx = await defineAppContext({
        apiKey: req.apiKey,
        container: req.app.locals.container as Container,
        request: req,
        fetchSession: false,
      });
      const result = await spec.handler({
        ctx,
        body: parsedBody,
        params: parsedParams,
        query: parsedQuery,
        request: req,
        response: responseBuilder,
      });

      if (result && typeof result === 'object' && '__response' in result) {
        const marker = result as ResponseMarker;
        if (marker.data === null || marker.data === undefined) {
          res.status(marker.status).end();
        } else {
          res.status(marker.status).json(marker.data);
        }
      } else {
        res.status(200).json(result);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorType = method === 'GET' || method === 'HEAD' ? 'query' : 'body';
        const status = errorType === 'body' ? 422 : 400;

        res.status(status).json({
          error: 'validation_error',
          status,
          detail: 'Request validation failed',
          errors: error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        });
      } else {
        next(error);
      }
    }
  };
}

/**
 * Define OpenAPI-based route handlers with full type safety.
 *
 * @param config Configuration object with HTTP method specifications
 * @returns Object containing Express handlers
 *
 * @example
 * ```typescript
 * export default defineOpenAPI({
 *   GET: defineOpenAPIEndpoint({
 *     summary: "Get user by ID",
 *     params: z.object({ id: z.string().uuid() }),
 *     responses: {
 *       200: { description: "User data", schema: UserSchema }
 *     },
 *     handler: async ({ params, response }) => {
 *       const user = await getUser(params.id);
 *       return response.ok(user);
 *     }
 *   }),
 *   POST: defineOpenAPIEndpoint({
 *     summary: "Create user",
 *     requestBody: CreateUserSchema,
 *     responses: {
 *       201: { description: "User created", schema: UserSchema }
 *     },
 *     handler: async ({ body, response }) => {
 *       const user = await createUser(body);
 *       return response.created(user);
 *     }
 *   })
 * });
 * ```
 */
export function defineOpenAPI(config: DefineOpenAPIConfig): DefineOpenAPIReturn {
  const handlers: Record<string, RequestHandler> = {};
  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

  for (const method of methods) {
    const spec = config[method];
    if (spec) {
      handlers[method] = defineExpressHandler(spec, method);
    }
  }

  return { handlers };
}

const appDir = '.';
const routesDir = 'routes';

/**
 * Map a remix-flat-routes-style folder name (`segment+`, `$param+`) to one
 * URL path segment (`segment`, `:param`). Returns null if the name is not
 * recognized.
 */
function folderNameToUrlSegment(name: string): string | null {
  if (!name.endsWith('+')) {
    return null;
  }
  const base = name.slice(0, -1);
  if (base.startsWith('$')) {
    return `:${base.slice(1)}`;
  }
  return base;
}

/**
 * Express path for `routes/.../index.ts`, e.g. `v1+/posts+/index.ts` →
 * `/v1/posts`.
 */
function expressPathForRouteFile(routesRoot: string, absoluteIndexFile: string): string | null {
  const relDir = relative(routesRoot, dirname(absoluteIndexFile));
  if (relDir === '') {
    return '/';
  }
  const parts = relDir.split(sep).filter(Boolean);
  const urlParts: string[] = [];
  for (const part of parts) {
    const segment = folderNameToUrlSegment(part);
    if (segment === null) {
      return null;
    }
    urlParts.push(segment);
  }
  return `/${urlParts.join('/')}`;
}

async function* walkRouteIndexFiles(dir: string): AsyncGenerator<string, void, undefined> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      yield* walkRouteIndexFiles(full);
    } else if (ent.isFile() && ent.name === 'index.ts') {
      yield full;
    }
  }
}

/**
 * Route module type for scanned API routes.
 */
export type RouteModule = {
  path: string;
  handlers: Record<string, RequestHandler>;
};

/**
 * Scan `routes/` for `defineOpenAPI` modules (flat `segment+` folders, same
 * layout as before) and derive Express paths without React Router tooling.
 */
export async function scanAPIRoutes(container: Container): Promise<RouteModule[]> {
  const routesRoot = resolve(`${appDir}/${routesDir}`);
  try {
    await access(routesRoot);
  } catch {
    container.logger.warn('OpenAPI routes directory not found');
    return [];
  }

  const routes: RouteModule[] = [];
  for await (const absolutePath of walkRouteIndexFiles(routesRoot)) {
    const routePath = expressPathForRouteFile(routesRoot, absolutePath);
    if (routePath === null) {
      container.logger.warn(
        `Skipping route file (unsupported path segments): ${relative(process.cwd(), absolutePath)}`,
      );
      continue;
    }

    try {
      const module = await import(absolutePath);
      const exported = module.default;

      if (!exported?.handlers) {
        continue;
      }

      const routeFile = relative(resolve(appDir), absolutePath);
      container.logger.info(`Registering route: ${routePath} from ${routeFile}`);

      routes.push({
        path: routePath,
        handlers: exported.handlers,
      });
    } catch (error) {
      container.logger.error(error, `Error loading route ${relative(process.cwd(), absolutePath)}:`);
    }
  }

  return routes;
}

/**
 * Register scanned routes with Express app.
 */
export function registerRoutes(app: Express, routes: RouteModule[]): void {
  for (const route of routes) {
    for (const [method, handler] of Object.entries(route.handlers)) {
      const methodLower = method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';

      if (app[methodLower]) {
        app[methodLower](route.path, handler);
      }
    }
  }
}

/**
 * Load and register API routes with Express (convenience function).
 */
export async function loadAndRegisterAPIRoutes(app: Express): Promise<void> {
  const container = app.locals.container as Container;
  const routes = await scanAPIRoutes(container);
  registerRoutes(app, routes);
}
