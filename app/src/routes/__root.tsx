import { TanStackDevtools } from '@tanstack/react-devtools';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { AppShell } from '#app/src/components/app-shell.tsx';
import { TRPCProvider } from '#app/src/lib/trpc.tsx';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <TRPCProvider url={`${import.meta.env.VITE_API_URL ?? 'http://localhost:3001'}/trpc`}>
      <AppShell>
        <Outlet />
      </AppShell>
      {import.meta.env.DEV && (
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'TanStack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
      )}
    </TRPCProvider>
  );
}
