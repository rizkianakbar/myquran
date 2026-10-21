import { TanStackDevtools } from '@tanstack/react-devtools';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { TRPCProvider } from '#app/src/lib/trpc.tsx';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <TRPCProvider url="http://localhost:3001/trpc">
      <Outlet />
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
    </TRPCProvider>
  );
}
