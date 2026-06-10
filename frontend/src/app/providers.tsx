"use client";

import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider>
      <ModalsProvider>{children}</ModalsProvider>
    </MantineProvider>
  );
}