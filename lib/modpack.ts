import { BuildOptions, Derivation, Source } from "./types.ts";
import { hashDerivation } from "./hash.ts";

/**
 * Resolves the flat list of all transitive dependencies for a set of derivations.
 * Maintains order: dependencies come BEFORE the derivation that depends on them.
 * 
 * @param roots - Array of root derivations to resolve dependencies for
 * @returns Flat array of all derivations in dependency order (dependencies first)
 * @throws {Error} If a circular dependency is detected
 * 
 * @example
 * ```typescript
 * const game = await mkLocal("game", "1.0.0", "/path/to/game");
 * const mod = await mkLocal("mod", "1.0.0", "/path/to/mod", [game]);
 * const layers = resolveTransitiveLayers([mod]);
 * // Returns [game, mod] - game comes first as it's a dependency
 * ```
 */
export function resolveTransitiveLayers(roots: Derivation[]): Derivation[] {
    const sorted: Derivation[] = [];
    const visited = new Set<string>();
    const processing = new Set<string>();

    function visit(drv: Derivation) {
        if (visited.has(drv.out)) return;
        if (processing.has(drv.out)) {
            throw new Error(`Circular dependency detected involving ${drv.name} (${drv.out})`);
        }

        processing.add(drv.out);

        // Visit all dependencies first
        if (drv.deps) {
            for (const dep of drv.deps) {
                visit(dep);
            }
        }

        processing.delete(drv.out);
        visited.add(drv.out);
        sorted.push(drv);
    }

    for (const root of roots) {
        visit(root);
    }

    return sorted;
}

/**
 * Creates a composition (final build) from multiple derivations (layers).
 * Automatically resolves all transitive dependencies and creates a final derivation
 * that combines all layers into a single build.
 * 
 * @param options - Build configuration options
 * @param options.name - Name of the composition
 * @param options.layers - Array of root derivations to compose
 * @param options.entrypoint - Optional entrypoint executable or script
 * @param options.umu - Optional UMU (Universal Modding Utility) configuration
 * @param options.args - Optional command-line arguments
 * @param options.env - Optional environment variables
 * @param options.permissions - Optional permissions required
 * @param options.postbuild - Optional post-build script
 * @returns A derivation representing the final composition
 * 
 * @example
 * ```typescript
 * const game = await mkLocal("skyrim-se", "1.6.117", "/games/skyrim");
 * const skse = await mkUrl("skse", "2.0.65", "https://...", "sha256-hash");
 * 
 * const modpack = await mkComposition({
 *   name: "my-modpack",
 *   layers: [game, skse],
 *   entrypoint: "skse_loader.exe"
 * });
 * ```
 */
export async function mkComposition(options: BuildOptions): Promise<Derivation> {
    const { name, layers, entrypoint, umu, args, env, permissions, postbuild } = options;
    
    // Auto-resolve transitive dependencies to form the layers list
    const resolvedLayers = resolveTransitiveLayers(layers);
    const layerHashes = resolvedLayers.map(l => l.out);

    const src: Source = {
        type: "fetch_build",
        source: "build",
        layers: layerHashes,
        entrypoint,
        umu,
        args,
        env,
        permissions,
    };

    // The 'dependencies' field in the final recipe should also contain all transitive hashes
    // to ensure the compiler can fetch everything it needs.
    const drv = await hashDerivation({
        name,
        version: "generated",
        src,
        dependencies: layerHashes,
        deps: resolvedLayers,
        permissions,
        postbuild
    });

    return drv;
}
