import fs from "fs";
import path from "path";

const tokensPath = path.resolve("global-tokens/tokens.json");
const outputDir = path.resolve("design-system/tokens");
const outputPath = path.join(outputDir, "tokens.css");

const raw = fs.readFileSync(tokensPath, "utf8");
const tokens = JSON.parse(raw);

const toKebabCase = (str) =>
  str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .toLowerCase();

const isMathExpression = (str) =>
  /^[0-9+\-*/().%\s^]+$/.test(str) && /[0-9]/.test(str);

const safeEval = (expr) => {
  try {
    const jsExpr = expr.replace(/\^/g, "**");
    return Function(`"use strict"; return (${jsExpr})`)();
  } catch {
    return expr;
  }
};

const flattenTokens = (obj, prefix = [], result = {}) => {
  for (const [key, value] of Object.entries(obj)) {
    if (key === "$themes" || key === "$metadata") continue;

    if (value && typeof value === "object" && "$value" in value) {
      const varName = "--" + [...prefix, key].map(toKebabCase).join("-");
      result[varName] = { value: value.$value, type: value.$type, path: [...prefix, key] };
    } else if (value && typeof value === "object") {
      flattenTokens(value, [...prefix, key], result);
    }
  }
  return result;
};

const flatMap = flattenTokens(tokens);

const buildLookupTable = (obj, prefix = [], result = {}) => {
  for (const [key, value] of Object.entries(obj)) {
    if (key === "$themes" || key === "$metadata") continue;

    if (value && typeof value === "object" && "$value" in value) {
      const fullPath = [...prefix, key].join(".");
      result[fullPath] = value.$value;
    } else if (value && typeof value === "object") {
      buildLookupTable(value, [...prefix, key], result);
    }
  }
  return result;
};

const lookupTable = buildLookupTable(tokens);

const resolveReference = (refPath) => {
  if (refPath in lookupTable) {
    return lookupTable[refPath];
  }

  const prefixes = ["core", "light", "dark", "theme"];
  for (const prefix of prefixes) {
    const fullPath = `${prefix}.${refPath}`;
    if (fullPath in lookupTable) {
      return lookupTable[fullPath];
    }
  }

  return null;
};

const resolveValue = (value) => {
  if (typeof value !== "string") return value;

  let resolved = value;

  const resolveRefs = (str) => {
    let result = str;
    let safety = 0;
    while (result.includes("{") && safety < 20) {
      result = result.replace(/\{([^}]+)\}/g, (match, refPath) => {
        const refValue = resolveReference(refPath);
        if (refValue === null) return match;

        return resolveValue(refValue);
      });
      safety++;
    }
    return result;
  };

  resolved = resolveRefs(resolved);

  if (resolved.startsWith("roundTo(") && resolved.endsWith(")")) {
    const inner = resolved.slice(8, -1);
    const mathExpr = resolveRefs(inner);

    if (isMathExpression(mathExpr)) {
      const evaluated = safeEval(mathExpr);
      return Math.round(evaluated).toString();
    }
  }

  if (isMathExpression(resolved)) {
    return safeEval(resolved).toString();
  }

  return resolved;
};

const hexToRgb = (hex) => {
  const cleaned = hex.replace("#", "");
  const bigint = parseInt(cleaned, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
};

const normalizeCssValue = (varName, resolved) => {
  let val = String(resolved);

  val = val.replace(/rgba\(#([0-9a-fA-F]{6,8}),\s*([\d.]+)\)/g, (_, hex, alpha) => {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  });

  if (val === "#" || val === "") return null;

  const isNumericUnit = /^\d+(\.\d+)?$/;

  if (
    (varName.includes("spacing") ||
      varName.includes("paragraph-spacing")) &&
    isNumericUnit.test(val)
  ) {
    return `${val}px`;
  }

  if (varName.includes("font-size") && isNumericUnit.test(val)) {
    return `${val}px`;
  }

  if (varName.includes("letter-spacing") && isNumericUnit.test(val)) {
    return `${val}px`;
  }

  if (varName.includes("rounded") && !varName.includes("multi-value")) {
    if (isNumericUnit.test(val)) {
      return `${val}px`;
    }
  }

  if (varName.includes("rounded-multi-value") || varName.includes("spacing-multi-value")) {
    val = val.replace(/(\d+(\.\d+)?)/g, "$1px");
  }

  return val;
};

const mapTokenToTailwindVar = (varName, pathParts) => {
  const joined = pathParts.map(toKebabCase).join("-");

  const cleanPrefixes = (str, ...prefixes) => {
    let result = str;
    for (const p of prefixes) {
      if (result.startsWith(p)) {
        result = result.slice(p.length);
        break;
      }
    }
    return result;
  };

  if (varName.includes("light-") || varName.includes("dark-")) {
    let name = joined;

    if (varName.includes("light-fg-") || varName.includes("dark-fg-")) {
      name = cleanPrefixes(name, "light-fg-", "dark-fg-");
      return `--color-fg-${name}`;
    }
    if (varName.includes("light-bg-") || varName.includes("dark-bg-")) {
      name = cleanPrefixes(name, "light-bg-", "dark-bg-");
      return `--color-bg-${name}`;
    }
    if (varName.includes("light-accent-") || varName.includes("dark-accent-")) {
      name = cleanPrefixes(name, "light-accent-", "dark-accent-");
      return `--color-accent-${name}`;
    }
    if (varName.includes("light-shadows-") || varName.includes("dark-shadows-")) {
      name = cleanPrefixes(name, "light-shadows-", "dark-shadows-");
      return `--shadow-${name}`;
    }

    name = cleanPrefixes(name, "light-", "dark-");
    return `--${name}`;
  }

  let name = joined;
  name = cleanPrefixes(name,
    "core-dimension-", "core-spacing-", "core-border-radius-", "core-colors-",
    "core-opacity-", "core-font-families-", "core-line-heights-", "core-letter-spacing-",
    "core-paragraph-spacing-", "core-font-weights-", "core-font-sizes-",
    "theme-button-", "theme-card-", "theme-box-shadow-", "theme-typography-",
    "core-", "theme-",
  );

  if (varName.includes("colors") && !varName.includes("Colors")) {
    return `--color-${name}`;
  }
  if (varName.includes("dimension")) {
    return `--spacing-${name}`;
  }
  if (varName.includes("spacing") && !varName.includes("letter-spacing") && !varName.includes("paragraph-spacing")) {
    return `--spacing-${name}`;
  }
  if (varName.includes("border-radius") || varName.includes("borderRadius")) {
    return `--rounded-${name}`;
  }
  if (varName.includes("font-sizes") || varName.includes("fontSizes")) {
    return `--font-size-${name}`;
  }
  if (varName.includes("font-families") || varName.includes("fontFamilies")) {
    return `--font-family-${name}`;
  }
  if (varName.includes("line-heights") || varName.includes("lineHeights")) {
    return `--line-height-${name}`;
  }
  if (varName.includes("font-weights") || varName.includes("fontWeights")) {
    return `--font-weight-${name}`;
  }
  if (varName.includes("letter-spacing") || varName.includes("letterSpacing")) {
    return `--letter-spacing-${name}`;
  }
  if (varName.includes("paragraph-spacing") || varName.includes("paragraphSpacing")) {
    return `--spacing-${name}`;
  }
  if (varName.includes("opacity")) {
    return `--opacity-${name}`;
  }
  if (varName.includes("box-shadow") || varName.includes("boxShadow")) {
    return `--shadow-${name}`;
  }
  if (varName.includes("typography")) {
    return `--${name}`;
  }
  if (varName.includes("button")) {
    return `--${name}`;
  }
  if (varName.includes("card")) {
    return `--${name}`;
  }

  return varName;
};

const coreFlat = {};
const lightFlat = {};
const darkFlat = {};
const themeFlat = {};

for (const [varName, { value, type, path: pathParts }] of Object.entries(flatMap)) {
  const resolved = resolveValue(value);
  const normalized = normalizeCssValue(varName, resolved);
  if (normalized === null) continue;
  const twVarName = mapTokenToTailwindVar(varName, pathParts);

  if (varName.startsWith("--core-")) {
    coreFlat[twVarName] = normalized;
  } else if (varName.startsWith("--light-")) {
    lightFlat[twVarName] = normalized;
  } else if (varName.startsWith("--dark-")) {
    darkFlat[twVarName] = normalized;
  } else if (varName.startsWith("--theme-")) {
    themeFlat[twVarName] = normalized;
  }
}

const buildCss = () => {
  const lines = [];

  lines.push("/* Auto-generated from tokens.json - DO NOT EDIT */");
  lines.push("/* Tailwind CSS v4 compatible theme variables */");
  lines.push("");

  lines.push("@import \"tailwindcss\";");
  lines.push("");

  lines.push("@theme {");
  for (const [varName, val] of Object.entries(coreFlat)) {
    lines.push(`  ${varName}: ${val};`);
  }
  lines.push("}");
  lines.push("");

  lines.push(":root {");
  for (const [varName, val] of Object.entries(lightFlat)) {
    lines.push(`  ${varName}: ${val};`);
  }
  lines.push("}");
  lines.push("");

  lines.push(".dark, [data-theme=\"dark\"] {");
  for (const [varName, val] of Object.entries(darkFlat)) {
    lines.push(`  ${varName}: ${val};`);
  }
  lines.push("}");
  lines.push("");

  if (Object.keys(themeFlat).length > 0) {
    lines.push(":root {");
    for (const [varName, val] of Object.entries(themeFlat)) {
      lines.push(`  ${varName}: ${val};`);
    }
    lines.push("}");
  }

  return lines.join("\n");
};

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, buildCss());

console.log(`Generated: ${outputPath}`);
console.log(`Total variables: ${Object.keys(flatMap).length}`);
