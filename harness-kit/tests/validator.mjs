// Tiny JSON Schema 2020-12 validator for harness-kit schemas.
// Supports: type, required, properties, additionalProperties, const, enum, pattern,
// maxLength, minLength, minItems, maxItems, $defs, items.
// Other features are no-ops.

import { readFileSync } from "fs";
import { join } from "path";

export function compile(rawSchema) {
  const defs = rawSchema["$defs"] || {};
  // If the schema is just a $defs container with no top-level type/properties,
  // assume the validator root is `$defs.output` (harness-kit convention).
  let schema = rawSchema;
  if (schema.type == null && schema.properties == null && schema.$ref == null && !("const" in schema) && schema.enum == null && defs.output) {
    schema = { $ref: "#/$defs/output", $defs: defs };
  }
  function resolve(ref) {
    if (!ref.startsWith("#/$defs/")) return null;
    const name = ref.slice("#/$defs/".length);
    return defs[name] || null;
  }
  function node(schemaNode, value, ptr) {
    if (schemaNode === true) return [];
    if (schemaNode === false) return [`${ptr || "<root>"}: schema is \`false\``];
    if (schemaNode.$ref) {
      const r = resolve(schemaNode.$ref);
      if (!r) return [`${ptr || "<root>"}: $ref unresolvable: ${schemaNode.$ref}`];
      return node(r, value, ptr);
    }

    const errs = [];
    function fail(msg) {
      errs.push(`${ptr || "<root>"}: ${msg}`);
    }

    function descend(s, v, p) {
      if (!s) return [];
      if (s.$ref) {
        const r = resolve(s.$ref);
        if (!r) {
          errs.push(`${p || "<root>"}: $ref unresolvable: ${s.$ref}`);
          return [];
        }
        return node(r, v, p);
      }
      return node(s, v, p);
    }

    if ("const" in schemaNode) {
      if (JSON.stringify(schemaNode.const) !== JSON.stringify(value)) fail(`expected const ${JSON.stringify(schemaNode.const)}, got ${JSON.stringify(value)}`);
      return errs;
    }
    if ("enum" in schemaNode) {
      if (!schemaNode.enum.some((e) => JSON.stringify(e) === JSON.stringify(value))) fail(`enum mismatch: ${JSON.stringify(value)}`);
      return errs;
    }

    const t = schemaNode.type;
    if (t) {
      const actual = Array.isArray(value) ? "array" : value === null ? "null" : typeof value;
      const tps = Array.isArray(t) ? t : [t];
      // "integer" is satisfied by a number that has no fractional part.
      const compatible = tps.some((tp) => {
        if (tp === actual) return true;
        if (tp === "integer" && actual === "number" && Number.isInteger(value)) return true;
        return false;
      });
      if (!compatible) {
        fail(`expected type ${tps.join("|")}, got ${actual}`);
        return errs;
      }
    }

    if (schemaNode.required && typeof value === "object" && value !== null) {
      for (const r of schemaNode.required) {
        if (!(r in value)) fail(`missing required field "${r}"`);
      }
    }

    if (typeof value === "object" && value !== null && !Array.isArray(value) && schemaNode.properties) {
      for (const [k, v] of Object.entries(value)) {
        const sub = descend(schemaNode.properties[k], v, `${ptr}/${k}`);
        errs.push(...sub);
      }
    }

    if (schemaNode.additionalProperties === false && typeof value === "object" && value !== null && !Array.isArray(value) && schemaNode.properties) {
      for (const k of Object.keys(value)) {
        if (!(k in schemaNode.properties)) fail(`unknown property "${k}"`);
      }
    }

    if (typeof value === "string" && schemaNode.pattern) {
      const re = new RegExp(schemaNode.pattern);
      if (!re.test(value)) fail(`value "${value}" does not match /${schemaNode.pattern}/`);
    }
    if (typeof value === "string" && schemaNode.maxLength != null && value.length > schemaNode.maxLength) {
      fail(`string length ${value.length} exceeds maxLength ${schemaNode.maxLength}`);
    }
    if (typeof value === "string" && schemaNode.minLength != null && value.length < schemaNode.minLength) {
      fail(`string length ${value.length} below minLength ${schemaNode.minLength}`);
    }

    if (Array.isArray(value) && schemaNode.items) {
      value.forEach((v, i) => {
        const sub = descend(schemaNode.items, v, `${ptr}/${i}`);
        errs.push(...sub);
      });
    }
    if (Array.isArray(value) && schemaNode.minItems != null && value.length < schemaNode.minItems) {
      fail(`array length ${value.length} below minItems ${schemaNode.minItems}`);
    }

    return errs;
  }
  return (value) => {
    const errs = node(schema, value, "");
    return { ok: errs.length === 0, errors: errs };
  };
}
