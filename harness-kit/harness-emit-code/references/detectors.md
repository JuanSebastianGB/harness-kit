# harness-emit-code: detectors

Failure detection patterns for the emit-code stage. Each detector lists the
trigger, severity, and description.

| Name | Trigger | Severity | Description |
|------|---------|----------|-------------|
| `manifest_present_no_adapter` | manifest exists but `target_stack.language` has no matching adapter | warn | Emit-code cannot emit without a matching adapter. Add an adapter or set language to a known value. See `references/adapters/typescript.md` for the TypeScript adapter. |
| `no_manifest_skip_emit` | manifest.json not found in output directory | info | No manifest to emit from. Stage is a no-op. v0.2.0 backward compat behavior. |
| `exports_mismatch` | emitted file's exports don't match `manifest.exports[]` | warn | The emitted module interface diverges from the manifest contract. Check the template or adapter. |
| `sandbox_drift` | emitted code uses resources outside `constraints_inherited` | warn | Code accesses paths, networks, or commands beyond what the propose phase authorized. |
| `empty_files_array` | `files[]` is empty in manifest | info | Nothing to emit. Manifest exists but requests no files. |
| `tsc_compile_error` | `tsc --noEmit` fails on emitted TypeScript files | error | Emitted TypeScript does not compile. Fix the template or adapter. |

## References

- TypeScript adapter: `references/adapters/typescript.md`
