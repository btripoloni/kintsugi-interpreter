import { Derivation, RunInBuild } from "./types.ts";
import { hashDerivation } from "./hash.ts";

// --- Tipagens das Fontes (Biblioteca sources) ---

export interface FetchUrlArgs {
  url: string;
  sha256: string;
  unpack?: boolean;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  body?: string;
}

export interface FetchLocalArgs {
  path: string;
  exclude?: string[];
  postFetch?: string;
}

export interface FetchVaseArgs {
  vase: string;
}

export interface WriteContentArgs {
  path: string;
  content: unknown;
}

export interface RunInBuildArgs {
  build: Derivation;
  command: {
    entrypoint: string;
    args?: string[];
    umu?: { version: string; id: string };
  };
  outputs: string[];
}

/**
 * Library object containing functions to create different types of sources.
 * Used to define the `src` property of a shard.
 * 
 * @example
 * ```typescript
 * const drv = await mkShard({
 *   name: "my-shard",
 *   version: "1.0.0",
 *   src: sources.fetch_url({ url: "https://...", sha256: "..." })
 * });
 * ```
 */
export const sources = {
  fetch_url: (args: FetchUrlArgs) => ({
    type: "fetch_url" as const,
    source: "url" as const,
    ...args,
  }),

  fetch_local: (args: FetchLocalArgs) => ({
    type: "fetch_local" as const,
    source: "local" as const,
    ...args,
  }),

  fetch_vase: (args: FetchVaseArgs) => ({
    type: "fetch_vase" as const,
    source: "vase" as const,
    ...args,
  }),

  write_text: (args: { path: string; content: string }) => ({
    type: "write_text" as const,
    source: "write" as const,
    ...args,
  }),

  write_json: (args: WriteContentArgs) => ({
    type: "write_json" as const,
    source: "write" as const,
    ...args,
  }),

  write_toml: (args: WriteContentArgs) => ({
    type: "write_toml" as const,
    source: "write" as const,
    ...args,
  }),

  run_in_build: (args: RunInBuildArgs): RunInBuild => {
    // O campo build é mantido como Derivation no TypeScript, mas será convertido
    // para hash (build.out) na serialização para JSON
    return {
      type: "run_in_build" as const,
      build: args.build,
      command: args.command,
      outputs: args.outputs,
    };
  },

  blank_source: () => ({
    type: "blank_source" as const,
    // This source is intentionally blank and ignored by the compiler
    // It serves as a placeholder for shards to be inserted later
  }),
};

// --- Funções de Geração de Shards ---

/**
 * Base function to generate a Shard (derivation) from a definition.
 * Used internally and by high-level functions.
 * 
 * @param shard - Shard definition without the `out` field (will be computed)
 * @returns A complete derivation with computed `out` hash
 * 
 * @example
 * ```typescript
 * const drv = await mkShard({
 *   name: "my-shard",
 *   version: "1.0.0",
 *   src: sources.fetch_url({ url: "https://...", sha256: "..." })
 * });
 * ```
 */
export async function mkShard(shard: Omit<Derivation, "out">): Promise<Derivation> {
  const constructed_shard: Omit<Derivation, "out"> = {
    ...shard,
    // Garante que as dependências sejam mapeadas para seus hashes de saída
    dependencies: shard.deps?.map(d => d.out) ?? [],
  };
  return await hashDerivation(constructed_shard);
}

/**
 * Creates an execution manifest (.run.json) as a complete Shard.
 * Should be used directly in the layers list of a mkComposition.
 * The file will be created at kintsugi/exec/[name].run.json
 * 
 * @param args - Run specification arguments
 * @param args.name - Name of the execution profile (e.g., "default", "editor")
 * @param args.entrypoint - Entrypoint executable or script
 * @param args.umu - Optional UMU configuration
 * @param args.args - Optional command-line arguments
 * @param args.env - Optional environment variables
 * @returns A derivation representing the run specification
 * 
 * @example
 * ```typescript
 * const runSpec = await writeRunSpec({
 *   name: "default",
 *   entrypoint: "game.exe",
 *   args: ["--modded"],
 *   env: { "MOD_PATH": "/mods" }
 * });
 * ```
 */
export interface RunSpecArgs {
  name: string; // Nome do perfil de execução (ex: "default", "editor")
  entrypoint: string;
  umu?: {
    version: string;
    id: string;
  };
  args?: string[];
  env?: Record<string, string>;
}

export async function writeRunSpec(args: RunSpecArgs): Promise<Derivation> {
  // O caminho é sempre kintsugi/exec/[name].run.json
  const path = `kintsugi/exec/${args.name}.run.json`;
  
  return await mkShard({
    name: `run-spec-${args.name}`,
    version: "1.0.0",
    src: sources.write_json({
      path,
      content: {
        entrypoint: args.entrypoint,
        umu: args.umu,
        args: args.args ?? [],
        env: args.env ?? {},
      },
    }),
  });
}

// --- Funções Auxiliares de Conveniência ---

/**
 * Creates a shard from a local path.
 * Helper function to simplify creation of local shards.
 * 
 * @param name - Name of the shard
 * @param version - Version of the shard
 * @param path - Local filesystem path to the source
 * @param deps - Optional array of dependency derivations
 * @returns A derivation representing the local shard
 * 
 * @example
 * ```typescript
 * const game = await mkLocal("skyrim-se", "1.6.117", "/games/skyrim");
 * ```
 */
export async function mkLocal(
  name: string,
  version: string,
  path: string,
  deps?: Derivation[]
): Promise<Derivation> {
  return await mkShard({
    name,
    version,
    src: sources.fetch_local({ path }),
    deps,
  });
}

/**
 * Creates a shard from a URL.
 * Helper function to simplify creation of URL shards.
 * 
 * @param name - Name of the shard
 * @param version - Version of the shard
 * @param url - URL to fetch the source from
 * @param sha256 - SHA256 hash of the source file for verification
 * @param deps - Optional array of dependency derivations
 * @returns A derivation representing the URL shard
 * 
 * @example
 * ```typescript
 * const skse = await mkUrl(
 *   "skse",
 *   "2.0.65",
 *   "https://skse.silverlock.org/beta/skse64_2_06_05.7z",
 *   "sha256-hash-here"
 * );
 * ```
 */
export async function mkUrl(
  name: string,
  version: string,
  url: string,
  sha256: string,
  deps?: Derivation[]
): Promise<Derivation> {
  return await mkShard({
    name,
    version,
    src: sources.fetch_url({ url, sha256 }),
    deps,
  });
}