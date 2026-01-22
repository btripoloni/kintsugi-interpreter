// Export main composition function
export { mkComposition } from "./lib/modpack.ts";

// Export sources object and helper functions
export { sources, mkShard, writeRunSpec } from "./lib/sources.ts";

// Export types
export type {
    Derivation,
    Source,
    BuildOptions,
    FetchUrl,
    FetchGit,
    FetchLocal,
    FetchVase,
    WriteText,
    WriteJson,
    WriteToml,
    FetchBuild,
    RunInBuild,
    BlankSource,
} from "./lib/types.ts";

// Export source argument types
export type {
    FetchUrlArgs,
    FetchLocalArgs,
    FetchVaseArgs,
    WriteContentArgs,
    RunInBuildArgs,
    RunSpecArgs,
} from "./lib/sources.ts";

// Export helper function aliases for convenience
export { mkComposition as mkBuild } from "./lib/modpack.ts";

// Export convenience helper functions
export { mkLocal, mkUrl } from "./lib/sources.ts";
