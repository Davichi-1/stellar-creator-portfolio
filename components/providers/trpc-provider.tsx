'use client';

import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { trpc, trpcClient, queryClient } from '@/lib/trpc-client';

/**
 * Wraps the app in the shared tRPC and React Query clients (from
 * `@/lib/trpc-client`), so any descendant can use `trpc.*` hooks. The clients
 * are created once via lazy `useState` initializers and reused for the
 * component's lifetime.
 */
export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => trpcClient);
  const [qClient] = useState(() => queryClient);

  return (
    <trpc.Provider client={client} queryClient={qClient}>
      <QueryClientProvider client={qClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}