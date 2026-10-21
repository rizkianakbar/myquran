import { createCsrfMiddleware, createStart } from '@tanstack/react-start';

export const startInstance = createStart(() => ({
  // The reader is driven by per-device state in localStorage (theme, language,
  // translation, progress), so route components render on the client. The
  // document shell and <head> are still server-rendered.
  defaultSsr: false,
  // Reject cross-site calls to server functions. Page navigations are left
  // alone so links from other sites keep working.
  requestMiddleware: [createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === 'serverFn' })],
}));
