/**
 * @file Defines patterns and components to ignore during project scanning
 * @description Contains configuration for file exclusion and component filtering
 */

/**
 * List of file patterns to ignore when scanning projects
 * @description These patterns are used to exclude files from being processed by the AI analyzer
 */
export const ignorePatterns = [
    // Build and dependency directories
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/public/**",
    "**/coverage/**",
    
    // Style directories
    "**/styles/**",
    "**/css/**",
    
    // Generated Hosby files
    "**/src/lib/hosbyClient.ts",
    "**/**/hosbyClient.ts",
    "hosby.schema.json",
    
    // Configuration files
    "components.json",
    "tailwind.config.*",
    "vite.config.*",
    "postcss.config.*",
    "esbuild.config.*",
    "tsconfig.json",
    "jsconfig.json",
    "package.json",
    "next.config.*",
    "tsconfig.*.*",
    "jsconfig.*.*",
    
    // Lock files
    "yarn.lock",
    "pnpm-lock.yaml",
    "package-lock.json"
];

/**
 * List of component names to ignore when scanning projects
 * @description These components are typically UI framework components that should not be
 * included in the database schema as they represent UI elements rather than data models
 */
export const IGNORED_COMPONENTS = [
    // UI component props (with and without trailing 's')
    "buttonprops",
    "buttonpropss",
    "badgeprops",
    "badgepropss",
    "sheetcontentprops",
    "sheetcontentpropss",
    "sheetprops",
    "sheetpropss",
    "tooltipprops",
    "tooltippropss",
    "toastprops",
    "toastpropss",
    "modalprops",
    "modalpropss",
    "columnmodalprops",
    "columnmodalpropss",
    "droppablecolumnprops",
    "droppablecolumnpropss",
    "taskcardprops",
    "taskcardpropss",
    "taskmodalprops",
    "taskmodalpropss",
    
    // UI components
    "calendar",
    "calendars",
    "command",
    "commands",
    "dialog",
    "dialogs",
    "alert",
    "alerts",
    "alertdialog",
    "alertdialogs",
    "accordion",
    "accordions",
    "tooltip",
    "tooltips",
    "toast",
    "toasts",
    
    // UI state management
    "state",
    "states"
];
