/**
 * Smart code filtering system for Hosby CLI
 * Intelligently filters files and code content to reduce token usage and focus on business logic
 */

import fs from "fs";
import path from "path";
import { ignorePatterns, IGNORED_COMPONENTS } from "./ignoreFiles.js";

/**
 * Configuration for code filtering
 * @interface
 * @property {number} maxFileSize - Maximum size of a file to include (in bytes)
 * @property {number} maxFiles - Maximum number of files to include
 * @property {number} maxTotalSize - Maximum total content size (in bytes)
 * @property {boolean} includeComments - Whether to include comments in the filtered code
 * @property {boolean} includeImports - Whether to include imports in the filtered code
 */
interface FilterConfig {
  maxFileSize?: number;
  maxFiles?: number;
  maxTotalSize?: number;
  includeComments?: boolean;
  includeImports?: boolean;
}

/**
 * Default configuration for filtering
 * @type {FilterConfig}
 * @default
 * @example
 * const config: FilterConfig = {
 *     maxFileSize: 100 * 1024, // 100KB
 *     maxFiles: 50,
 *     maxTotalSize: 500 * 1024, // 500KB
 *     includeComments: false,
 *     includeImports: true
 * };
 */
const DEFAULT_CONFIG: FilterConfig = {
  maxFileSize: 100 * 1024,
  maxFiles: 50,
  maxTotalSize: 500 * 1024,
  includeComments: false,
  includeImports: true,
};

/**
 * Result of the filtering process
 * @interface
 * @property {string[]} selectedFiles - Files that were selected for inclusion
 * @property {number} totalSize - Total size of the selected content in bytes
 * @property {number} estimatedTokens - Estimated token count (rough approximation)
 * @property {string} content - Filtered content ready to be sent to AI
 */
interface FilterResult {
  selectedFiles: string[];
  totalSize: number;
  estimatedTokens: number;
  content: string;
}

/**
 * Determines if a file is likely to contain business logic
 * @param filePath Path to the file
 * @returns True if the file likely contains business logic
 * @example
 * const isBusinessLogic = isBusinessLogicFile('/path/to/file.ts');
 */
function isBusinessLogicFile(filePath: string): boolean {
  const fileName = path.basename(filePath).toLowerCase();
  const fileExt = path.extname(filePath).toLowerCase();

  // Skip files that match ignore patterns
  if (
    ignorePatterns.some(pattern => {
      // Convert glob pattern to regex
      const regexPattern = pattern
        .replace(/\*\*/g, ".*")
        .replace(/\*/g, "[^/]*")
        .replace(/\?/g, ".");
      return new RegExp(regexPattern).test(filePath);
    })
  ) {
    return false;
  }

  if (IGNORED_COMPONENTS.some(comp => fileName.includes(comp.toLowerCase()))) {
    return false;
  }

  if (
    fileName.includes(".test.") ||
    fileName.includes(".spec.") ||
    filePath.includes("/test/") ||
    filePath.includes("/tests/")
  ) {
    return false;
  }

  if (
    fileName.includes("utils") ||
    fileName.includes("helpers") ||
    fileName.includes("constants") ||
    fileName.includes("config")
  ) {
    return false;
  }

  const supportedExtensions = [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".vue",
    ".svelte",
    ".component.ts",
    ".module.ts",
    ".directive.ts",
    ".pipe.ts",
    ".astro",
    ".solid",
    ".elm",
  ];

  if (supportedExtensions.some(ext => fileExt === ext || filePath.endsWith(ext))) {
    return true;
  }

  if (
    fileName.includes("model") ||
    fileName.includes("schema") ||
    fileName.includes("entity") ||
    fileName.includes("type")
  ) {
    return true;
  }

  return false;
}

/**
 * Scores a file based on its likelihood of containing important business logic
 * Higher score = more likely to be important
 * @param filePath Path to the file
 * @param content File content
 * @returns Score from 0-100
 */
function scoreFileImportance(filePath: string, content: string): number {
  let score = 50;
  const fileName = path.basename(filePath).toLowerCase();

  if (
    fileName.includes("model") ||
    fileName.includes("entity") ||
    fileName.includes("schema") ||
    fileName.includes("type")
  ) {
    score += 20;
  }

  const interfaceCount = (content.match(/interface\s+\w+/g) || []).length;
  score += interfaceCount * 5;

  const classCount = (content.match(/class\s+\w+/g) || []).length;
  score += classCount * 5;

  const typeCount = (content.match(/type\s+\w+\s*=/g) || []).length;
  score += typeCount * 3;

  const importLines = (content.match(/import\s+.+from/g) || []).length;
  const codeLines = content.split("\n").length;
  if (importLines > 0 && codeLines > 0) {
    const importRatio = importLines / codeLines;
    if (importRatio > 0.3) {
      // If more than 30% of lines are imports
      score -= 15;
    }
  }

  // Cap score between 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Filters code content to reduce size
 * @param content Original code content
 * @param config Filter configuration
 * @returns Filtered code content
 */
function filterCodeContent(content: string, config: FilterConfig = DEFAULT_CONFIG): string {
  let filteredContent = content;

  if (!config.includeComments) {
    filteredContent = filteredContent.replace(/\/\*[\s\S]*?\*\//g, "");
    filteredContent = filteredContent.replace(/\/\/.*$/gm, "");
  }

  if (!config.includeImports) {
    filteredContent = filteredContent.replace(/import\s+.+from\s+['"]\.*.['"]\.?\s*/g, "");
  }

  filteredContent = filteredContent.replace(/^\s*[\r\n]/gm, "");

  filteredContent = filterUIComponents(filteredContent);

  return filteredContent;
}

/**
 * Filters out UI component definitions from code content to focus on data models
 *
 * This function removes UI-specific code including:
 * - React/Vue/Angular/Svelte components
 * - UI-related hooks, contexts, and providers
 * - Component props interfaces and types
 * - UI utility functions
 *
 * While removing UI code, it extracts and preserves references to data models
 *
 * @param {string} content - Code content to filter
 * @returns {string} Filtered code content without UI component definitions
 */
function filterUIComponents(content: string): string {
  let filteredContent = content;

  // === React Component Patterns ===

  // Filter out React function components like: function Button() { ... } or const Button = () => { ... }
  const reactFunctionComponentRegex =
    /(?:function|const)\s+([A-Z]\w*)(?:\s*:\s*React\.FC(?:<[^>]*>)?)?\s*(?:=\s*(?:\([^)]*\)\s*=>|function\s*\([^)]*\)))?\s*\{[\s\S]*?\}(?=\s*(?:export|;|$))/g;
  filteredContent = filteredContent.replace(reactFunctionComponentRegex, (match, componentName) => {
    if (isUIComponentName(componentName)) {
      return "";
    }
    return match;
  });

  // Filter out React class components like: class Button extends React.Component { ... }
  const reactClassComponentRegex =
    /class\s+([A-Z]\w*)\s+extends\s+(?:React\.)?Component[\s\S]*?\{[\s\S]*?\}(?=\s*(?:export|;|$))/g;
  filteredContent = filteredContent.replace(reactClassComponentRegex, (match, componentName) => {
    if (isUIComponentName(componentName)) {
      return "";
    }
    return match;
  });

  // Filter out React hooks like: function useButtonState() { ... } or const useFormValidation = () => { ... }
  const reactHookRegex =
    /(?:function|const)\s+(use[A-Z]\w*)\s*(?:=\s*(?:\([^)]*\)\s*=>|function\s*\([^)]*\)))?\s*\{[\s\S]*?\}(?=\s*(?:export|;|$))/g;
  filteredContent = filteredContent.replace(reactHookRegex, (match, hookName) => {
    // Check if it's a UI-related hook
    if (isUIComponentName(hookName.substring(3))) {
      // Remove 'use' prefix for checking
      return "";
    }
    return match;
  });

  // Filter out React context providers like: const ButtonContext = React.createContext(...)
  const contextRegex = /const\s+([A-Z]\w*Context)\s*=\s*(?:React\.)?createContext\([^)]*\)/g;
  filteredContent = filteredContent.replace(contextRegex, (match, contextName) => {
    const baseName = contextName.replace(/Context$/, "");
    if (isUIComponentName(baseName)) {
      return "";
    }
    return match;
  });

  // === Vue.js Component Patterns ===

  // Filter out Vue component definitions like: @Component or @Options
  const vueComponentRegex =
    /(?:@Component|@Options)\s*\([^)]*\)\s*(?:export\s+)?class\s+([A-Z]\w*)[\s\S]*?\{[\s\S]*?\}(?=\s*(?:export|;|$))/g;
  filteredContent = filteredContent.replace(vueComponentRegex, (match, componentName) => {
    if (isUIComponentName(componentName)) {
      return "";
    }
    return match;
  });

  // Filter out Vue.extend components like: const Button = Vue.extend({ ... })
  const vueExtendRegex = /const\s+([A-Z]\w*)\s*=\s*Vue\.extend\([\s\S]*?\)(?=\s*(?:export|;|$))/g;
  filteredContent = filteredContent.replace(vueExtendRegex, (match, componentName) => {
    if (isUIComponentName(componentName)) {
      return "";
    }
    return match;
  });

  // Filter out Vue 3 defineComponent like: const Button = defineComponent({ ... })
  const vueDefineComponentRegex =
    /const\s+([A-Z]\w*)\s*=\s*defineComponent\([\s\S]*?\)(?=\s*(?:export|;|$))/g;
  filteredContent = filteredContent.replace(vueDefineComponentRegex, (match, componentName) => {
    if (isUIComponentName(componentName)) {
      return "";
    }
    return match;
  });

  // === Angular Component Patterns ===

  // Filter out Angular component decorators like: @Component({ ... }) class ButtonComponent { ... }
  const angularComponentRegex =
    /@Component\([\s\S]*?\)\s*(?:export\s+)?class\s+([A-Z]\w*)[\s\S]*?\{[\s\S]*?\}(?=\s*(?:export|;|$))/g;
  filteredContent = filteredContent.replace(angularComponentRegex, (match, componentName) => {
    if (isUIComponentName(componentName)) {
      return "";
    }
    return match;
  });

  // Filter out Angular directives like: @Directive({ ... }) class HighlightDirective { ... }
  const angularDirectiveRegex =
    /@Directive\([\s\S]*?\)\s*(?:export\s+)?class\s+([A-Z]\w*)[\s\S]*?\{[\s\S]*?\}(?=\s*(?:export|;|$))/g;
  filteredContent = filteredContent.replace(angularDirectiveRegex, (match, componentName) => {
    if (isUIComponentName(componentName)) {
      return "";
    }
    return match;
  });

  // === Svelte Component Patterns ===
  const svelteHelperRegex =
    /(?:export\s+)?class\s+([A-Z]\w*(?:Component|Store|Action))\s*(?:extends\s+\w+)?[\s\S]*?\{[\s\S]*?\}(?=\s*(?:export|;|$))/g;
  filteredContent = filteredContent.replace(svelteHelperRegex, (match, componentName) => {
    const baseName = componentName.replace(/(Component|Store|Action)$/, "");
    if (isUIComponentName(baseName)) {
      return "";
    }
    return match;
  });

  // === Common Patterns Across Frameworks ===

  const modelTypes = new Set<string>();

  const propsWithModelsRegex =
    /(?:interface|type)\s+([A-Z]\w*(?:Props|State|Config|Options|Attrs|Events))\s*(?:<[^>]*>)?\s*(?:=\s*)?\{([\s\S]*?)\}(?=\s*(?:export|;|$))/g;
  let propsMatch;

  while ((propsMatch = propsWithModelsRegex.exec(filteredContent)) !== null) {
    const propsContent = propsMatch[2];

    const typeRefRegex = /\w+\s*:\s*([A-Z]\w+)(?:\[\]|\s*\|\s*null)?/g;
    let typeRefMatch;

    while ((typeRefMatch = typeRefRegex.exec(propsContent)) !== null) {
      const modelType = typeRefMatch[1];
      if (
        !isUIComponentName(modelType) &&
        !["React", "Component", "Element", "Node", "JSX"].includes(modelType)
      ) {
        modelTypes.add(modelType);
      }
    }
  }

  if (modelTypes.size > 0) {
    console.log(
      `✔ Extracted ${modelTypes.size} potential model types from UI components: ${Array.from(modelTypes).join(", ")}`
    );
  }

  const propsRegex =
    /(?:interface|type)\s+([A-Z]\w*(?:Props|State|Config|Options|Attrs|Events))\s*(?:<[^>]*>)?\s*(?:=\s*)?\{[\s\S]*?\}(?=\s*(?:export|;|$))/g;
  filteredContent = filteredContent.replace(propsRegex, (_match, _typeName) => {
    return "";
  });

  if (modelTypes.size > 0) {
    filteredContent =
      `// Extracted model types: ${Array.from(modelTypes).join(", ")}\n` + filteredContent;
  }

  return filteredContent;
}

/**
 * Checks if a name appears to be a UI component name
 * @param name Component name to check
 * @returns True if it appears to be a UI component name
 */
function isUIComponentName(name: string): boolean {
  const lowerName = name.toLowerCase();

  if (IGNORED_COMPONENTS.some(comp => lowerName.includes(comp.toLowerCase()))) {
    return true;
  }

  const uiPatterns = [
    // Basic UI elements
    "button",
    "modal",
    "dialog",
    "card",
    "panel",
    "menu",
    "nav",
    "sidebar",
    "header",
    "footer",
    "layout",
    "container",
    "wrapper",
    "grid",
    "flex",
    "form",
    "input",
    "select",
    "checkbox",
    "radio",
    "switch",
    "toggle",
    "dropdown",
    "tooltip",
    "popover",
    "toast",
    "notification",
    "alert",
    "spinner",
    "loader",
    "progress",
    "skeleton",
    "placeholder",
    "icon",
    "avatar",
    "badge",
    "tag",
    "label",
    "tab",
    "accordion",
    "carousel",
    "slider",
    "pagination",
    "breadcrumb",
    "stepper",
    "timeline",
    "divider",
    "view",
    "page",
    "screen",
    "section",
    "row",
    "col",
    "item",
    "list",

    // Animation and transition related
    "animation",
    "transition",
    "motion",
    "animate",
    "fade",
    "slide",
    "zoom",

    // Style and theme related
    "theme",
    "style",
    "styled",
    "css",
    "scss",
    "sass",
    "less",

    // Event handlers and callbacks
    "handler",
    "listener",
    "callback",
    "click",
    "hover",
    "focus",
    "blur",
    "change",
    "submit",
    "drag",
    "drop",
    "scroll",
    "resize",
    "touch",

    // Accessibility related
    "accessible",
    "aria",
    "a11y",

    // Common UI prefixes/suffixes
    "ui",
    "view",
    "widget",
    "element",
    "component",
    "control",

    // Framework-specific UI terms
    "hook",
    "provider",
    "consumer",
    "context",
    "hoc",
    "render",

    // Mobile UI specific
    "swipe",
    "gesture",
    "touch",
    "tap",
    "pinch",
    "screen",

    // Data visualization but not data models
    "chart",
    "graph",
    "plot",
    "diagram",
    "visualization",
    "canvas",

    // Media related UI
    "player",
    "audio",
    "video",
    "media",
    "stream",
    "playback",

    // Common UI utility functions
    "format",
    "validate",
    "transform",
    "convert",
    "parse",
    "stringify",
  ];

  if (uiPatterns.some(pattern => lowerName.includes(pattern))) {
    return true;
  }

  const uiSuffixes = ["component", "element", "control", "view", "widget", "renderer", "display"];
  if (uiSuffixes.some(suffix => lowerName.endsWith(suffix))) {
    return true;
  }

  return false;
}

/**
 * Estimates the number of tokens in a string
 * This is a rough approximation (4 chars ≈ 1 token)
 * @param text Text to estimate tokens for
 * @returns Estimated token count
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Intelligently filters project files to focus on business logic
 * @param projectPath Root path of the project
 * @param config Filter configuration
 * @returns Filtered result with selected files and content
 */
export async function filterProjectFiles(
  projectPath: string,
  config: FilterConfig = DEFAULT_CONFIG
): Promise<FilterResult> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const result: FilterResult = {
    selectedFiles: [],
    totalSize: 0,
    estimatedTokens: 0,
    content: "",
  };

  // Find all potential files
  const allFiles: string[] = [];

  function scanDirectory(dirPath: string) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (
          !entry.name.startsWith(".") &&
          !["node_modules", "dist", "build", "coverage"].includes(entry.name)
        ) {
          scanDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        allFiles.push(fullPath);
      }
    }
  }

  scanDirectory(projectPath);

  // Filter and score files
  const scoredFiles = await Promise.all(
    allFiles
      .filter(file => isBusinessLogicFile(file))
      .map(async file => {
        try {
          const stats = fs.statSync(file);

          // Skip files that are too large
          if (stats.size > mergedConfig.maxFileSize!) {
            return null;
          }

          const content = fs.readFileSync(file, "utf-8");
          const score = scoreFileImportance(file, content);

          return {
            path: file,
            size: stats.size,
            content,
            score,
          };
        } catch (err) {
          return null;
        }
      })
  );

  // Sort by importance score (descending)
  const validScoredFiles = scoredFiles.filter(file => file !== null) as Array<{
    path: string;
    size: number;
    content: string;
    score: number;
  }>;

  validScoredFiles.sort((a, b) => b.score - a.score);

  // Select top files up to limits
  let totalSize = 0;
  let selectedContent = "";

  for (const file of validScoredFiles) {
    if (result.selectedFiles.length >= mergedConfig.maxFiles!) {
      break;
    }

    const filteredContent = filterCodeContent(file.content, mergedConfig);
    const filteredSize = filteredContent.length;

    if (totalSize + filteredSize > mergedConfig.maxTotalSize!) {
      break;
    }

    result.selectedFiles.push(file.path);
    totalSize += filteredSize;

    // Add to the combined content with file path as header
    const relativePath = path.relative(projectPath, file.path);
    selectedContent += `\n// File: ${relativePath}\n${filteredContent}\n`;
  }

  result.totalSize = totalSize;
  result.content = selectedContent;
  result.estimatedTokens = estimateTokens(selectedContent);

  return result;
}
