# @btripoloni/kintsugi

TypeScript/Deno library for creating declarative and reproducible modpacks using Kintsugi.

## Installation

This package is available on JSR (JavaScript Registry):

```bash
deno add jsr:@btripoloni/kintsugi@1.0.0
```

Or add manually to your `deno.json`:

```json
{
  "imports": {
    "kintsugi/": "jsr:@btripoloni/kintsugi@1.0.0/"
  }
}
```

## Basic Usage

```typescript
import { mkLocal, mkUrl, mkBuild, sources } from "kintsugi/mod.ts";

// Create a shard from a local path
const game = await mkLocal("skyrim-se", "1.6.117", "/games/skyrim");

// Create a shard from a URL
const skse = await mkUrl(
  "skse",
  "2.0.65",
  "https://skse.silverlock.org/beta/skse64_2_06_05.7z",
  "sha256-hash-here"
);

// Create a final composition
export default await mkBuild({
  name: "my-modpack",
  layers: [game, skse],
  entrypoint: "skse_loader.exe"
});
```

## API

### Main Functions

- `mkShard(options)`: Creates a shard (derivation) from a definition
- `mkComposition(options)` / `mkBuild(options)`: Composes multiple shards into a final composition
- `mkLocal(name, version, path, deps?)`: Helper function to create local shards
- `mkUrl(name, version, url, sha256, deps?)`: Helper function to create URL shards
- `writeRunSpec(args)`: Creates an execution manifest (.run.json)

### `sources` Object

The `sources` object provides functions to create different types of sources:

- `sources.fetch_url(args)`: Fetch from a URL
- `sources.fetch_local(args)`: Fetch from a local path
- `sources.fetch_vase(args)`: Fetch from a vase
- `sources.fetch_git(args)`: Fetch from a Git repository
- `sources.write_text(args)`: Write text to a file
- `sources.write_json(args)`: Write JSON to a file
- `sources.write_toml(args)`: Write TOML to a file
- `sources.run_in_build(args)`: Run command in a build
- `sources.blank_source()`: Empty source (placeholder)

### Types

- `Derivation`: Represents a derivation (shard)
- `Source`: Union type for different types of sources
- `BuildOptions`: Options for creating a composition
- Various auxiliary types for function arguments

## Complete Documentation

For complete documentation, see the [Kintsugi documentation](https://github.com/btripoloni/kintsugi).

## License

MIT
