// src/routeTree.gen.ts
import { Route as rootRoute } from './routes/__root'
import { Route as IndexImport } from './routes/index'
import { Route as AuthCallbackImport } from './routes/auth/callback'

const IndexRoute = IndexImport.update({
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const AuthCallbackRoute = AuthCallbackImport.update({
  path: '/auth/callback',
  getParentRoute: () => rootRoute,
} as any)

export const routeTree = rootRoute.addChildren([
  IndexRoute,
  AuthCallbackRoute,
])