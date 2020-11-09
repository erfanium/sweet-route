import {
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
  HTTPMethods,
  preValidationHookHandler,
  RouteOptions,
} from 'fastify';

export const authDataSymbol = Symbol('authData');

export interface FastifyRequestWithAuthData<T> extends FastifyRequest {
  [authDataSymbol]?: T;
}

export interface SweetHandler<Params, Res, AuthData> {
  (
    params: Params,
    authData: AuthData,
    req: FastifyRequest,
    rep: FastifyReply
  ): Promise<Res>;
}

export interface SweetAuth<AuthData> {
  (
    req: FastifyRequestWithAuthData<AuthData>,
    rep: FastifyReply,
    done: HookHandlerDoneFunction
  ): Promise<unknown> | void;
}

export interface SweetRoute<Params, Res, AuthData> {
  method: HTTPMethods | HTTPMethods[];
  url: string;
  params?: any;
  mergeParams?: boolean;
  auth?: SweetAuth<AuthData>;
  handler: SweetHandler<Params, Res, AuthData>;
}

const preValidation: preValidationHookHandler = (req, rep, next) => {
  if (req.body === null) req.body = {};
  if (Array.isArray(req.body)) {
    const array = req.body;
    req.body = {
      body: array,
    };
  }
  Object.assign(req.body, req.params, req.query);
  next();
};

export function sweet<Params, Res, AuthData>(
  route: SweetRoute<Params, Res, AuthData>
): RouteOptions {
  if (typeof route.mergeParams !== 'boolean') {
    route.mergeParams = route.method !== 'POST';
  }

  return {
    method: route.method,
    url: route.url,
    schema: {
      body: route.params,
    },
    onRequest: route.auth,
    preValidation: route.mergeParams ? preValidation : undefined,
    handler(req: FastifyRequestWithAuthData<AuthData>, rep) {
      return route.handler(req.body as Params, req[authDataSymbol]!, req, rep);
    },
  };
}
