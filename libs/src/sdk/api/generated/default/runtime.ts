/* tslint:disable */
/* eslint-disable */
/**
 * API
 * Coliving V1 API
 *
 * The version of the OpenAPI document: 1.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


/**
 * @internal
 */
export const BASE_PATH = "/v1".replace(/\/+$/, "");

/**
 * @internal
 */
const isBlob = (value: any) => typeof Blob !== 'undefined' && value instanceof Blob;

/**
 * @internal
 * This is the base class for all generated API classes.
 */
export class BaseAPI {

    private middleware: Middleware[];

    /**
    * @internal
    */
    constructor(protected configuration: Configuration) {
        this.middleware = configuration.middleware;
    }

    /**
    * @internal
    */
    withMiddleware<T extends BaseAPI>(this: T, ...middlewares: Middleware[]) {
        const next = this.clone<T>();
        next.middleware = next.middleware.concat(...middlewares);
        return next;
    }

    /**
    * @internal
    */
    withPreMiddleware<T extends BaseAPI>(this: T, ...preMiddlewares: Array<Middleware['pre']>) {
        const middlewares = preMiddlewares.map((pre) => ({ pre }));
        return this.withMiddleware<T>(...middlewares);
    }

    /**
    * @internal
    */
    withPostMiddleware<T extends BaseAPI>(this: T, ...postMiddlewares: Array<Middleware['post']>) {
        const middlewares = postMiddlewares.map((post) => ({ post }));
        return this.withMiddleware<T>(...middlewares);
    }

    /**
    * @internal
    */
    protected async request(context: RequestOpts) {
        const { url, init } = this.createFetchParams(context);
        return this.fetchApi(url, init) as any;
    }

    private createFetchParams(context: RequestOpts) {
        let url = this.configuration.basePath + context.path;
        if (context.query !== undefined && Object.keys(context.query).length !== 0) {
            // only add the querystring to the URL if there are query parameters.
            // this is done to avoid urls ending with a "?" character which buggy webservers
            // do not handle correctly sometimes.
            url += '?' + this.configuration.queryParamsStringify(context.query);
        }
        const body = ((typeof FormData !== "undefined" && context.body instanceof FormData) || context.body instanceof URLSearchParams || isBlob(context.body))
        ? context.body
        : JSON.stringify(context.body);

        const headers = Object.assign({}, this.configuration.headers, context.headers);
        const init = {
            method: context.method,
            headers: headers,
            body,
            credentials: this.configuration.credentials
        };
        return { url, init };
    }

    private fetchApi = async (url: string, init?: RequestInit) => {
        let fetchParams = { url, init };
        for (const middleware of this.middleware) {
            if (middleware.pre) {
                fetchParams = await middleware.pre({
                    fetch: this.fetchApi,
                    ...fetchParams,
                }) || fetchParams;
            }
        }
        let response = await this.configuration.fetchApi(fetchParams.url, fetchParams.init);
        for (const middleware of this.middleware) {
            if (middleware.post) {
                response = await middleware.post({
                    fetch: this.fetchApi,
                    url: fetchParams.url,
                    init: fetchParams.init,
                    response
                }) || response;
            }
        }
        return response;
    }

    /**
     * Create a shallow clone of `this` by constructing a new instance
     * and then shallow cloning data members.
     */
    private clone<T extends BaseAPI>(this: T): T {
        const constructor = this.constructor as any;
        const next = new constructor(this.configuration);
        next.middleware = this.middleware.slice();
        return next;
    }
};

/**
 * @internal
 */
export class RequiredError extends Error {
    override name: "RequiredError" = "RequiredError";
    constructor(public field: string, msg?: string) {
        super(msg);
    }
}

/**
 * @internal
 */
export const COLLECTION_FORMATS = {
    csv: ",",
    ssv: " ",
    tsv: "\t",
    pipes: "|",
};


// Returns unknown and is cast to the appropriate type in the corresponding api method
export type FetchAPI = (url: string, init?: RequestInit) => Promise<unknown>

export interface ConfigurationParameters {
    basePath?: string; // override base path
    fetchApi: FetchAPI; // fetch implementation
    middleware?: Middleware[]; // middleware to apply before/after fetch requests
    queryParamsStringify?: (params: HTTPQuery) => string; // stringify function for query strings
    username?: string; // parameter for basic security
    password?: string; // parameter for basic security
    apiKey?: string | ((name: string) => string); // parameter for apiKey security
    accessToken?: string | Promise<string> | ((name?: string, scopes?: string[]) => string | Promise<string>); // parameter for oauth2 security
    headers?: HTTPHeaders; //header params we want to use on every request
    credentials?: RequestCredentials; //value for the credentials param we want to use on each request
}

export class Configuration {
    constructor(private configuration: ConfigurationParameters) {}

    get basePath(): string {
        return this.configuration.basePath != null ? this.configuration.basePath : BASE_PATH;
    }

    get fetchApi(): FetchAPI {
        return this.configuration.fetchApi;
    }

    get middleware(): Middleware[] {
        return this.configuration.middleware || [];
    }

    get queryParamsStringify(): (params: HTTPQuery) => string {
        return this.configuration.queryParamsStringify || querystring;
    }

    get username(): string | undefined {
        return this.configuration.username;
    }

    get password(): string | undefined {
        return this.configuration.password;
    }

    get apiKey(): ((name: string) => string) | undefined {
        const apiKey = this.configuration.apiKey;
        if (apiKey) {
            return typeof apiKey === 'function' ? apiKey : () => apiKey;
        }
        return undefined;
    }

    get accessToken(): ((name?: string, scopes?: string[]) => string | Promise<string>) | undefined {
        const accessToken = this.configuration.accessToken;
        if (accessToken) {
            return typeof accessToken === 'function' ? accessToken : async () => accessToken;
        }
        return undefined;
    }

    get headers(): HTTPHeaders | undefined {
        return this.configuration.headers;
    }

    get credentials(): RequestCredentials | undefined {
        return this.configuration.credentials;
    }
}


/**
 * @internal
 */
export type Json = any;
/**
 * @internal
 */
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
/**
 * @internal
 */
export type HTTPHeaders = { [key: string]: string };
/**
 * @internal
 */
export type HTTPQuery = { [key: string]: string | number | null | boolean | Array<string | number | null | boolean> | HTTPQuery };
/**
 * @internal
 */
export type HTTPBody = Json | FormData | URLSearchParams;
/**
 * @internal
 */
export type ModelPropertyNaming = 'camelCase' | 'snake_case' | 'PascalCase' | 'original';

/**
 * @internal
 */
export interface FetchParams {
    url: string;
    init: RequestInit;
}

/**
 * @internal
 */
export interface RequestOpts {
    path: string;
    method: HTTPMethod;
    headers: HTTPHeaders;
    query?: HTTPQuery;
    body?: HTTPBody;
}

/**
 * @internal
 */
export function exists(json: any, key: string) {
    const value = json[key];
    return value !== null && value !== undefined;
}

/**
 * @internal
 */
export function querystring(params: HTTPQuery, prefix: string = ''): string {
    return Object.keys(params)
        .map((key) => {
            const fullKey = prefix + (prefix.length ? `[${key}]` : key);
            const value = params[key];
            if (value instanceof Array) {
                const multiValue = value.map(singleValue => encodeURIComponent(String(singleValue)))
                    .join(`&${encodeURIComponent(fullKey)}=`);
                return `${encodeURIComponent(fullKey)}=${multiValue}`;
            }
            if (value instanceof Date) {
                return `${encodeURIComponent(fullKey)}=${encodeURIComponent(value.toISOString())}`;
            }
            if (value instanceof Object) {
                return querystring(value as HTTPQuery, fullKey);
            }
            return `${encodeURIComponent(fullKey)}=${encodeURIComponent(String(value))}`;
        })
        .filter(part => part.length > 0)
        .join('&');
}

/**
 * @internal
 */
export function mapValues(data: any, fn: (item: any) => any) {
  return Object.keys(data).reduce(
    (acc, key) => ({ ...acc, [key]: fn(data[key]) }),
    {}
  );
}

/**
 * @internal
 */
export function canConsumeForm(consumes: Consume[]): boolean {
    for (const consume of consumes) {
        if ('multipart/form-data' === consume.contentType) {
            return true;
        }
    }
    return false;
}

/**
 * @internal
 */
export interface Consume {
    contentType: string
}

/**
 * @internal
 */
export interface RequestContext {
    fetch: FetchAPI;
    url: string;
    init?: RequestInit;
}

/**
 * @internal
 */
export interface ResponseContext {
    fetch: FetchAPI;
    url: string;
    init?: RequestInit;
    response: unknown;
}

/**
 * @internal
 */
export interface Middleware {
    pre?(context: RequestContext): Promise<FetchParams | void>;
    post?(context: ResponseContext): Promise<unknown | void>;
}
