// Provides the ambient `declare module '*.png' | '*.svg' | '*.jpg' | ...`
// declarations for static image imports (e.g. `import logo from './logo.png'`).
//
// Next.js normally injects this via `next-env.d.ts`, but that file is generated
// by `next dev` / `next build` and is git-ignored — so a clean CI checkout that
// runs `tsc --noEmit` on its own (without a prior `next build`) has no image
// module types and fails with TS2307 "Cannot find module '...png'".
//
// This tracked file references the exact same declaration source Next uses, so
// type-checking is identical whether or not `next-env.d.ts` has been generated.
/// <reference types="next/image-types/global" />
