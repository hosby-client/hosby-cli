/**
 * Hosby content client prompt
 * @type {string}
 */
export const hosbyContentClientPrompt: string = `import { HosbyClient } from "hosby-ts";

class HosbyQuery {
  private readonly _client: HosbyClient;
  private isInitialized = false;

  constructor() {
    this._client = new HosbyClient({
      baseURL: process.env.HOSBY_BASE_URL || "",
      privateKey: process.env.HOSBY_PRIVATE_KEY || "",
      apiKeyId: process.env.HOSBY_API_KEY_ID || "",
      projectName: process.env.HOSBY_PROJECT_NAME || "",
      projectId: process.env.HOSBY_PROJECT_ID || "",
      userId: process.env.HOSBY_USER_ID || "",
    });

    this.initialize().catch(error => {
      console.error("Failed to initialize Hosby client:", error);
      throw new Error("Hosby client initialization failed");
    });
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this._client.init();
      this.isInitialized = true;
      console.log("Hosby client initialized successfully");
    } catch (error) {
      console.error("Error initializing Hosby client:", error);
      throw new Error("Failed to initialize Hosby client. Check your connection and credentials.");
    }
  }
 
  public get client(): HosbyClient {
    if (!this.isInitialized) {
      throw new Error("Hosby client not initialized. Ensure the service is loaded before use.");
    }
    return this._client;
  }
}

export const hosbyQuery = new HosbyQuery().client;
`;

/**
 * Returns a fallback system prompt when server is unreachable
 * @returns {string} A simplified system prompt
 */
export const fallbackPrompt: string = `
You are Hosby AI Assistant, a professional backend engineer specialized in generating JSON schemas for front-end projects.
Your task is to analyze the project code provided and generate a JSON schema compatible with Hosby.
  
  Rules:
  1. Always return a JSON object with a "tables" key.
  2. Tables must be objects containing column names as keys and types as values.
  3. Types: string, number, boolean, date, array, object, or enums in format "enum:[val1,val2,...]".
  4. Ignore UI components and only include data models in your schema.
  5. Do NOT include interfaces or types ending with Props, State, Config, Options, etc.
  6. Focus ONLY on business logic and data models that represent actual backend entities.
  
  Return only JSON, nothing else.
`;

/**
 * Hosby CRUD Methods Documentation
 * @type {string}
 */
export const crudMethodsDoc: string = `
# Hosby CRUD Methods Documentation

## Find Methods

### find(tableName: string, filters?: QueryFilter[], options?: QueryOptions): Promise<QueryResult>
- Retrieves records matching specified filters
- Parameters:
  - tableName: Name of the table to query
  - filters: Array of field/value pairs to filter by
  - options: Optional parameters like limit, skip, sort, populate
- Returns: Promise with data array and success status
- Example: await client.find('users', [{ field: 'active', value: true }], { limit: 10 })

### findById(tableName: string, idFilter: QueryFilter[]): Promise<QueryResult>
- Retrieves a single record by its ID
- Parameters:
  - tableName: Name of the table
  - idFilter: Filter containing the ID field and value
- Returns: Promise with single record data and success status
- Example: await client.findById('users', [{ field: 'id', value: '123' }])

### findByField(tableName: string, field: string, value: any): Promise<QueryResult>
- Finds records where a specific field matches a value
- Parameters:
  - tableName: Name of the table
  - field: Field name to match
  - value: Value to match against
- Returns: Promise with matching records and success status
- Example: await client.findByField('users', 'email', 'user@example.com')

### findByEmail(tableName: string, queryFilters: QueryFilter[]): Promise<QueryResult>
- Finds a document by email field
- Parameters:
  - tableName: Name of the table/collection
  - queryFilters: Array of filter criteria including an 'email' field filter
- Returns: Promise with found document and success status
- Example: await client.findByEmail('users', [{ field: 'email', value: 'user@example.com' }])

### findByToken(tableName: string, queryFilters: QueryFilter[], options?: QueryOptions): Promise<QueryResult>
- Finds a document by a specific token field
- Parameters:
  - tableName: Name of the table/collection
  - queryFilters: Array of filter criteria including a token field filter
  - options: Additional query options including populate fields
- Returns: Promise with found document and success status
- Example: await client.findByToken('users', [{ field: 'resetPasswordToken', value: 'abc123xyz' }], { populate: ['profile'] })

### findEqual<T>(tableName: string, queryFilters: QueryFilter[], options?: QueryOptions): Promise<QueryResult>
- Finds documents where fields exactly match specified values
- Parameters:
  - tableName: Name of the table/collection
  - queryFilters: Array of filter criteria for querying
  - options: Additional query options including limit
- Returns: Promise with found documents and success status
- Example: await client.findEqual('users', [{ field: 'status', value: 'active' }, { field: 'role', value: 'admin' }], { limit: 10 })

### findLessThan<T>(tableName: string, queryFilters: QueryFilter[], options?: QueryOptions): Promise<QueryResult>
- Finds documents where fields are less than specified values
- Parameters:
  - tableName: Name of the table/collection
  - queryFilters: Array of filter criteria for querying
  - options: Additional query options including limit
- Returns: Promise with found documents and success status
- Example: await client.findLessThan('products', [{ field: 'price', value: 100 }], { limit: 10 })

### findGreaterThan<T>(tableName: string, queryFilters: QueryFilter[], options?: QueryOptions): Promise<QueryResult>
- Finds documents where a field is greater than a value
- Parameters:
  - tableName: Name of the table/collection
  - queryFilters: Array of filter criteria for querying
  - options: Additional query options including limit
- Returns: Promise with found documents and success status
- Example: await client.findGreaterThan('users', [{ field: 'age', value: 18 }], { limit: 100 })

### findUnique<T>(tableName: string, queryFilters: QueryFilter[], options?: QueryOptions): Promise<QueryResult>
- Finds a unique document by field/value pairs
- Parameters:
  - tableName: Name of the table/collection
  - queryFilters: Array of filter criteria for querying
  - options: Additional query options including populate fields
- Returns: Promise with found document and success status
- Example: await client.findUnique('users', [{ field: 'email', value: 'user@example.com' }], { populate: ['profile'] })

### findFirst<T>(tableName: string, queryFilters: QueryFilter[], options?: QueryOptions): Promise<QueryResult>
- Finds the first document matching the query filters
- Parameters:
  - tableName: Name of the table/collection
  - queryFilters: Array of filter criteria for querying
  - options: Additional query options including populate fields
- Returns: Promise with first found document and success status
- Example: await client.findFirst('users', [{ field: 'role', value: 'admin' }], { populate: ['profile'] })

### findAndPopulate<T>(tableName: string, queryFilters: QueryFilter[], options: QueryOptions): Promise<QueryResult>
- Finds documents and populates referenced fields
- Parameters:
  - tableName: Name of the table/collection
  - queryFilters: Array of filter criteria for querying
  - options: Query options including populate fields (required), skip and limit
- Returns: Promise with found and populated documents and success status
- Example: await client.findAndPopulate('orders', [{ field: 'status', value: 'pending' }], { populate: ['user', 'product'] })

## Query Methods

### distinct<T>(tableName: string, queryFilters: QueryFilter[], options?: QueryOptions): Promise<QueryResult>
- Gets distinct values for a specific field
- Parameters:
  - tableName: Name of the table/collection
  - queryFilters: Array of filter criteria for querying
  - options: Additional query options including skip and limit
- Returns: Promise with array of distinct values and success status
- Example: await client.distinct('users', [{ field: 'active', value: true }], { limit: 20 })

### aggregate<T>(tableName: string, queryFilters: QueryFilter[], options?: QueryOptions): Promise<QueryResult>
- Performs a custom aggregation on a table
- Parameters:
  - tableName: Name of the table/collection
  - queryFilters: Array of filter criteria to filter documents before aggregation
  - options: Additional query options including skip, limit, and populate
- Returns: Promise with aggregation results and success status
- Example: await client.aggregate('users', [{ field: 'active', value: true }], { limit: 100 })

### count<T>(tableName: string, queryFilters?: QueryFilter[]): Promise<QueryResult>
- Counts documents matching filter criteria
- Parameters:
  - tableName: Name of the table/collection
  - queryFilters: Optional array of filter criteria
- Returns: Promise with count result and success status
- Example: await client.count('users', [{ field: 'active', value: true }])

## Insert Methods

### insertOne(tableName: string, data: Record<string, any>): Promise<QueryResult>
- Inserts a single record
- Parameters:
  - tableName: Name of the table
  - data: Object containing the data to insert
- Returns: Promise with inserted record and success status
- Example: await client.insertOne('users', { name: 'John', email: 'john@example.com' })

### insertMany<T, D = unknown>(tableName: string, data: D[], options?: QueryOptions): Promise<QueryResult>
- Inserts multiple documents into a table/collection
- Parameters:
  - tableName: Name of the table/collection
  - data: Array of documents to insert
  - options: Additional query options including populate fields
- Returns: Promise with inserted documents and success status
- Example: await client.insertMany('users', [{ name: 'John', email: 'john@example.com' }, { name: 'Jane', email: 'jane@example.com' }], { populate: ['profile'] })

## Update Methods

### updateOne(tableName: string, data: Record<string, any>, filters: QueryFilter[]): Promise<QueryResult>
- Updates a single record matching the filters
- Parameters:
  - tableName: Name of the table
  - data: Object containing fields to update
  - filters: Array of conditions to match the record
- Returns: Promise with updated record and success status
- Example: await client.updateOne('users', { active: false }, [{ field: 'id', value: '123' }])

### updateMany(tableName: string, data: Record<string, any>, filters: QueryFilter[]): Promise<QueryResult>
- Updates multiple records matching the filters
- Parameters:
  - tableName: Name of the table
  - data: Object containing fields to update
  - filters: Array of conditions to match records
- Returns: Promise with count of updated records and success status
- Example: await client.updateMany('users', { active: false }, [{ field: 'role', value: 'guest' }])

### findOneAndUpdate<T, D = unknown>(tableName: string, data: D, queryFilters: QueryFilter[], options?: QueryOptions): Promise<QueryResult>
- Finds a document by filter criteria and updates it
- Parameters:
  - tableName: Name of the table/collection
  - data: Data to update the document with
  - queryFilters: Array of filter criteria for querying
  - options: Additional query options including populate fields
- Returns: Promise with updated document and success status
- Example: await client.findOneAndUpdate('users', { lastLoginDate: new Date() }, [{ field: 'email', value: 'user@example.com' }], { populate: ['profile', 'settings'] })

### upsert<T, D = unknown>(tableName: string, data: D, filters: QueryFilter[], options?: QueryOptions): Promise<QueryResult>
- Updates a document if it exists, otherwise creates a new one
- Parameters:
  - tableName: Name of the table/collection
  - data: Data to update/insert
  - filters: Array of filter criteria for querying
  - options: Additional query options including populate fields
- Returns: Promise with upserted document and success status
- Example: await client.upsert('users', { name: 'John', email: 'user@example.com' }, [{ field: 'email', value: 'user@example.com' }], { populate: ['profile'] })

### replaceOne<T, D = unknown>(tableName: string, data: D, queryFilters: QueryFilter[], options?: QueryOptions): Promise<QueryResult>
- Replaces a document completely with new data
- Parameters:
  - tableName: Name of the table/collection
  - data: New document data to replace with
  - queryFilters: Array of filter criteria for querying
  - options: Additional query options including populate fields
- Returns: Promise with replaced document and success status
- Example: await client.replaceOne('users', { name: 'New Name', email: 'new@example.com' }, [{ field: 'id', value: '507f1f77bcf86cd799439011' }], { populate: ['profile'] })

### findOneAndReplace<T, D = unknown>(tableName: string, data: D, queryFilters: QueryFilter[], options?: QueryOptions): Promise<QueryResult>
- Finds a document by filter criteria and replaces it with new data
- Parameters:
  - tableName: Name of the table/collection
  - data: New document data to replace with
  - queryFilters: Array of filter criteria for querying
  - options: Additional query options including populate fields
- Returns: Promise with replaced document and success status
- Example: await client.findOneAndReplace('users', { name: 'New Name', email: 'user@example.com' }, [{ field: 'email', value: 'user@example.com' }], { populate: ['profile'] })

### bulkUpdate<T>(tableName: string, queryFilters: QueryFilter[], data: any[], options?: QueryOptions): Promise<QueryResult>
- Performs bulk update operations on documents
- Parameters:
  - tableName: Name of the table/collection
  - queryFilters: Array of filter criteria for querying
  - data: Array of documents to update
  - options: Additional query options
- Returns: Promise with updated documents and success status
- Example: await client.bulkUpdate('users', [{ field: 'active', value: false }], [{ name: 'Updated Name' }], { populate: ['profile'] })

## Delete Methods

### deleteOne(tableName: string, filters: QueryFilter[]): Promise<QueryResult>
- Deletes a single record matching the filters
- Parameters:
  - tableName: Name of the table
  - filters: Array of conditions to match the record
- Returns: Promise with deleted record and success status
- Example: await client.deleteOne('users', [{ field: 'id', value: '123' }])

### deleteById(tableName: string, idFilter: QueryFilter[]): Promise<QueryResult>
- Deletes a record by its ID
- Parameters:
  - tableName: Name of the table
  - idFilter: Filter containing the ID field and value
- Returns: Promise with deleted record and success status
- Example: await client.deleteById('users', [{ field: 'id', value: '123' }])

### deleteMany(tableName: string, filters: QueryFilter[]): Promise<QueryResult>
- Deletes multiple records matching the filters
- Parameters:
  - tableName: Name of the table
  - filters: Array of conditions to match records
- Returns: Promise with count of deleted records and success status
- Example: await client.deleteMany('users', [{ field: 'role', value: 'guest' }])

### deleteByField<T>(tableName: string, queryFilters: QueryFilter[], options?: QueryOptions): Promise<QueryResult>
- Deletes documents by field/value pairs
- Parameters:
  - tableName: Name of the table/collection
  - queryFilters: Array of filter criteria for querying
  - options: Additional query options including limit
- Returns: Promise with deleted documents and success status
- Example: await client.deleteByField('users', [{ field: 'role', value: 'guest' }, { field: 'status', value: 'inactive' }], { limit: 10 })

### deleteByToken<T>(tableName: string, queryFilters: QueryFilter[], options?: QueryOptions): Promise<QueryResult>
- Deletes a document by token field and value
- Parameters:
  - tableName: Name of the table/collection
  - queryFilters: Array of filter criteria for querying
  - options: Additional query options including limit
- Returns: Promise with deleted document and success status
- Example: await client.deleteByToken('users', [{ field: 'resetPasswordToken', value: 'abc123xyz' }], { limit: 1 })

### findOneAndDelete<T>(tableName: string, queryFilters: QueryFilter[], options?: QueryOptions): Promise<QueryResult>
- Finds a document by filter criteria and deletes it
- Parameters:
  - tableName: Name of the table/collection
  - queryFilters: Array of filter criteria for querying
  - options: Additional query options including populate fields
- Returns: Promise with deleted document and success status
- Example: await client.findOneAndDelete('users', [{ field: 'email', value: 'user@example.com' }, { field: 'active', value: false }], { populate: ['profile'] })

### bulkDelete<T>(tableName: string, queryFilters: QueryFilter[]): Promise<QueryResult>
- Performs bulk delete operations on documents
- Parameters:
  - tableName: Name of the table/collection
  - queryFilters: Array of filter criteria for querying
- Returns: Promise with deleted documents and success status
- Example: await client.bulkDelete('users', [{ field: 'active', value: false }])

## Bulk Operations

### bulkInsert(tableName: string, data: Record<string, any>[]): Promise<QueryResult>
- Inserts multiple records in a single operation
- Parameters:
  - tableName: Name of the table
  - data: Array of objects to insert
- Returns: Promise with inserted records and success status
- Example: await client.bulkInsert('users', [{ name: 'John' }, { name: 'Jane' }])

### bulkUpdate<T>(tableName: string, queryFilters: QueryFilter[], data: any[], options?: QueryOptions): Promise<QueryResult>
- Performs bulk update operations on documents
- Parameters:
  - tableName: Name of the table/collection
  - queryFilters: Array of filter criteria for querying
  - data: Array of documents to update
  - options: Additional query options
- Returns: Promise with updated documents and success status
- Example: await client.bulkUpdate('users', [{ field: 'active', value: false }], [{ name: 'Updated Name' }], { populate: ['profile'] })

### bulkDelete<T>(tableName: string, queryFilters: QueryFilter[]): Promise<QueryResult>
- Performs bulk delete operations on documents
- Parameters:
  - tableName: Name of the table/collection
  - queryFilters: Array of filter criteria for querying
- Returns: Promise with deleted documents and success status
- Example: await client.bulkDelete('users', [{ field: 'active', value: false }])
`;

export const generateServiceWithAIprompt = (tableName: string, tableSchema: unknown): string => {
  return `
    Generate a TypeScript CRUD service for a table named "${tableName}" with the following schema:
    ${JSON.stringify(tableSchema, null, 2)}

    Use the following Hosby client methods documentation to implement the service correctly:
    ${crudMethodsDoc}

    The service should:
    1. Import the Hosby client from "../api/hosbyClient"
    2. Define a TypeScript interface for the table schema named "${tableName.charAt(0).toUpperCase() + tableName.slice(1)}" that accurately reflects the schema structure
    3. Implement a class with comprehensive CRUD methods using the Hosby client methods documented above
    4. Include proper error handling with specific error messages
    5. Add JSDoc documentation for all methods
    6. Use proper TypeScript typings throughout
    7. Export a singleton instance of the service

    Return only the TypeScript code for the service, nothing else.
  `;
};

export const systemAIPrompt = `
      You are Hosby AI Assistant, a professional front-end and backend engineer specialized in generating JSON schemas for front-end projects.
      You are also a master of TypeScript, react, vuejs, angular, Nuxt, nodejs, expressjs, and mongodb.
      Your task is to analyze the project code provided and generate a JSON schema compatible with Hosby.

      Rules:
      1. Scan the project files. Pay close attention to TypeScript interfaces, mock data, and API calls to infer the structure of the data.
      2. Analyze the project code provided and generate a JSON schema compatible with Hosby.
      3. Always return a JSON object.
      4. The top-level object must have a "tables" key.
      5. Tables must be objects containing column names as keys and types as values.
      6. Types: string, number, boolean, date, array, object, or enums in format "enum:[val1,val2,...]".
      7. Do not include any explanations, markdown, or comments.
      8. Merge structures from multiple files coherently.
      9. Keep table names lowercase plural and column names as in code.
      10. IMPORTANT: Ignore UI components and only include data models in your schema.
          - Do NOT include any interfaces or types ending with Props, State, Config, Options, etc.
          - Do NOT include React components, Vue components, or any UI-related classes.
          - Do NOT include UI-related state management (Redux, Vuex, etc.) unless it represents actual data models.
          - Focus ONLY on business logic and data models that represent actual backend entities.

      Return only JSON, nothing else.
  `;