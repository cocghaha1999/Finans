// Temporary shims to satisfy the TS server in this environment.
// These libraries ship their own types, but the language service may fail to resolve them.
// Remove this file if your editor resolves types correctly.
declare module "lucide-react";
declare module "recharts";

declare module 'geist/font/sans' {
  export const GeistSans: any
}

declare module 'geist/font/mono' {
  export const GeistMono: any
}
