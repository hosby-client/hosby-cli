import { IGNORED_COMPONENTS } from "./ignoreFiles.js";
import { HosbySchema } from "../types/types.js";

/**
 * Supported column data types in Hosby schema
 */
export const VALID_COLUMN_TYPES = [
    "string", "number", "boolean", "date", "array", "object", "enum"
];


/**
 * Filters the schema to remove ignored components and empty tables
 * @param {any} schema - The schema object to filter
 * @returns {HosbySchema} Filtered schema with ignored components removed
 * @throws {Error} If schema is invalid or missing required structure
 */
export function filterSchema(schema: HosbySchema): HosbySchema {
    // Validate schema structure
    if (!schema || typeof schema !== 'object') {
        throw new Error('Invalid schema: Schema must be an object');
    }

    if (!schema.tables || typeof schema.tables !== 'object') {
        console.warn('Warning: Schema has no tables or invalid tables property');
        return { tables: {} };
    }

    const filtered: HosbySchema = {
        tables: {},
        version: schema.version || '1.0.0',
        metadata: schema.metadata || {}
    };

    // Filter tables based on ignore list and column presence
    for (const [table, columns] of Object.entries(schema.tables)) {
        if (!columns || typeof columns !== 'object') continue;

        const hasColumns = Object.keys(columns as Record<string, unknown>).length > 0;
        const tableLower = table.toLowerCase();

        const isIgnoredByPattern = IGNORED_COMPONENTS.some(pattern => {
            if (pattern.includes('*')) {
                const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$', 'i');
                return regex.test(tableLower);
            }
            return tableLower === pattern.toLowerCase();
        });

        const isUIComponent = isUIComponentTable(tableLower);

        if (hasColumns && !isIgnoredByPattern && !isUIComponent) {
            filtered.tables[table] = columns as Record<string, string | object>;
        }
    }

    const originalTableCount = Object.keys(schema.tables).length;
    const filteredTableCount = Object.keys(filtered.tables).length;
    const removedCount = originalTableCount - filteredTableCount;

    if (removedCount > 0) {
        console.log(`\n✔ Filtered out ${removedCount} UI component tables from schema`);
    }

    return filtered;
}

/**
 * Determines if a table name appears to be a UI component
 * @param {string} tableName - The lowercase table name to check
 * @returns {boolean} True if the table appears to be a UI component
 */
function isUIComponentTable(tableName: string): boolean {
    const uiPatterns = [
        'props', 'state', 'config', 'options', 'context',
        'button', 'modal', 'dialog', 'card', 'panel', 'menu', 'nav',
        'form', 'input', 'select', 'checkbox', 'radio', 'switch',
        'dropdown', 'tooltip', 'popover', 'toast', 'notification',
        'spinner', 'loader', 'progress', 'skeleton', 'icon',
        'avatar', 'badge', 'tag', 'label', 'tab', 'accordion',
        'slider', 'pagination', 'breadcrumb', 'stepper', 'timeline',
        'component', 'element', 'widget', 'view', 'control', 'renderer'
    ];

    for (const pattern of uiPatterns) {
        if (tableName.endsWith(pattern) || tableName.endsWith(pattern + 's')) {
            return true;
        }
    }

    if (tableName.includes('ui') ||
        tableName.includes('layout') ||
        tableName.includes('style') ||
        tableName.includes('theme') ||
        tableName.includes('display')) {
        return true;
    }

    return false;
}


/**
 * Sanitizes schema column types to ensure compatibility with Hosby
 * @param {unknown} schema - The schema object to sanitize
 * @returns {HosbySchema} Sanitized schema with valid column types
 */
export function sanitizeSchema(schema: unknown): HosbySchema {
    if (!schema || typeof schema !== 'object') {
        return { tables: {} };
    }
    
    // Cast schema to a proper type
    const schemaObj = schema as { tables?: Record<string, Record<string, unknown>>; [key: string]: unknown };
    
    if (!schemaObj.tables) {
        schemaObj.tables = {};
        return schemaObj as HosbySchema;
    }

    // Process each table and column
    for (const table of Object.keys(schemaObj.tables)) {
        if (!schemaObj.tables[table] || typeof schemaObj.tables[table] !== 'object') {
            schemaObj.tables[table] = {};
            continue;
        }

        for (const column of Object.keys(schemaObj.tables[table])) {
            const columnDef = schemaObj.tables[table][column];
            
            // Ensure column type is valid
            if (typeof columnDef === 'object' && columnDef !== null) {
                if ('type' in columnDef && typeof columnDef.type === 'string') {
                    if (!VALID_COLUMN_TYPES.includes(columnDef.type)) {
                        schemaObj.tables[table][column] = { ...columnDef, type: 'string' };
                    }
                } else {
                    // If no type property, default to string
                    schemaObj.tables[table][column] = { ...columnDef, type: 'string' };
                }
            } else if (typeof columnDef === 'string') {
                if (columnDef.toLowerCase().startsWith('enum[') || columnDef.toLowerCase().startsWith('enum:[')) {
                    continue;
                }

                const lowerVal = columnDef.toLowerCase();
                const isValidType = VALID_COLUMN_TYPES.some(type =>
                    lowerVal === type || lowerVal.startsWith(type + ':') || lowerVal.startsWith(type + '[')
                );

                if (!isValidType) {
                    schemaObj.tables[table][column] = 'string';
                }
            } else if (Array.isArray(columnDef)) {
                schemaObj.tables[table][column] = 'array';
            } else {
                schemaObj.tables[table][column] = String(columnDef);
            }
        }
    }

    return schemaObj as HosbySchema;
}

