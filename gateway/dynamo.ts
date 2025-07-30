import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import type { DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  QueryCommand, 
  ScanCommand, 
  DeleteCommand, 
  UpdateCommand,
  BatchGetCommand,
  BatchWriteCommand,
  TransactGetCommand,
  TransactWriteCommand
} from "@aws-sdk/lib-dynamodb";
import { ListTablesCommand } from "@aws-sdk/client-dynamodb";
export class DynamoGateway {
  private client: DynamoDBClient;
  private docClient: DynamoDBDocumentClient;

  constructor(config: DynamoDBClientConfig = {}) {
    this.client = new DynamoDBClient(config);
    this.docClient = DynamoDBDocumentClient.from(this.client, {
      marshallOptions: {
        convertEmptyValues: true,
        removeUndefinedValues: true,
      },
    });
  }

  /**
   * Get a single item from DynamoDB
   * @param tableName The name of the table
   * @param key The primary key of the item to get
   * @param options Additional options like projection expressions
   * @returns The retrieved item or undefined if not found
   */
  async getItem<T = Record<string, any>>(
    tableName: string, 
    key: Record<string, any>,
    options?: {
      consistentRead?: boolean,
      projectionExpression?: string,
      expressionAttributeNames?: Record<string, string>
    }
  ): Promise<T | undefined> {
    const command = new GetCommand({
      TableName: tableName,
      Key: key,
      ConsistentRead: options?.consistentRead,
      ProjectionExpression: options?.projectionExpression,
      ExpressionAttributeNames: options?.expressionAttributeNames
    });

    const response = await this.docClient.send(command);
    return response.Item as T | undefined;
  }

  /**
   * Put a single item into DynamoDB
   * @param tableName The name of the table
   * @param item The item to put
   * @param options Additional options like condition expressions
   * @returns The result of the put operation
   */
  async putItem(
    tableName: string, 
    item: Record<string, any>,
    options?: {
      conditionExpression?: string,
      expressionAttributeNames?: Record<string, string>,
      expressionAttributeValues?: Record<string, any>
    }
  ): Promise<void> {
    const command = new PutCommand({
      TableName: tableName,
      Item: item,
      ConditionExpression: options?.conditionExpression,
      ExpressionAttributeNames: options?.expressionAttributeNames,
      ExpressionAttributeValues: options?.expressionAttributeValues
    });

    await this.docClient.send(command);
  }

  /**
   * Query items from DynamoDB
   * @param tableName The name of the table
   * @param keyConditionExpression The key condition expression
   * @param options Additional query options
   * @returns The query results
   */
  async query<T = Record<string, any>>(
    tableName: string,
    keyConditionExpression: string,
    options?: {
      indexName?: string,
      filterExpression?: string,
      expressionAttributeNames?: Record<string, string>,
      expressionAttributeValues?: Record<string, any>,
      limit?: number,
      scanIndexForward?: boolean,
      consistentRead?: boolean,
      exclusiveStartKey?: Record<string, any>,
      projectionExpression?: string
    }
  ): Promise<{
    items: T[],
    lastEvaluatedKey?: Record<string, any>,
    count: number
  }> {
    const command = new QueryCommand({
      TableName: tableName,
      IndexName: options?.indexName,
      KeyConditionExpression: keyConditionExpression,
      FilterExpression: options?.filterExpression,
      ExpressionAttributeNames: options?.expressionAttributeNames,
      ExpressionAttributeValues: options?.expressionAttributeValues,
      Limit: options?.limit,
      ScanIndexForward: options?.scanIndexForward,
      ConsistentRead: options?.consistentRead,
      ExclusiveStartKey: options?.exclusiveStartKey,
      ProjectionExpression: options?.projectionExpression
    });

    const response = await this.docClient.send(command);
    
    return {
      items: (response.Items || []) as T[],
      lastEvaluatedKey: response.LastEvaluatedKey,
      count: response.Count || 0
    };
  }

  /**
   * Scan items from DynamoDB
   * @param tableName The name of the table
   * @param options Additional scan options
   * @returns The scan results
   */
  async scan<T = Record<string, any>>(
    tableName: string,
    options?: {
      indexName?: string,
      filterExpression?: string,
      expressionAttributeNames?: Record<string, string>,
      expressionAttributeValues?: Record<string, any>,
      limit?: number,
      consistentRead?: boolean,
      exclusiveStartKey?: Record<string, any>,
      projectionExpression?: string,
      segment?: number,
      totalSegments?: number
    }
  ): Promise<{
    items: T[],
    lastEvaluatedKey?: Record<string, any>,
    count: number
  }> {
    const command = new ScanCommand({
      TableName: tableName,
      IndexName: options?.indexName,
      FilterExpression: options?.filterExpression,
      ExpressionAttributeNames: options?.expressionAttributeNames,
      ExpressionAttributeValues: options?.expressionAttributeValues,
      Limit: options?.limit,
      ConsistentRead: options?.consistentRead,
      ExclusiveStartKey: options?.exclusiveStartKey,
      ProjectionExpression: options?.projectionExpression,
      Segment: options?.segment,
      TotalSegments: options?.totalSegments
    });

    const response = await this.docClient.send(command);
    
    return {
      items: (response.Items || []) as T[],
      lastEvaluatedKey: response.LastEvaluatedKey,
      count: response.Count || 0
    };
  }

  /**
   * Delete an item from DynamoDB
   * @param tableName The name of the table
   * @param key The primary key of the item to delete
   * @param options Additional options like condition expressions
   * @returns The result of the delete operation
   */
  async deleteItem(
    tableName: string,
    key: Record<string, any>,
    options?: {
      conditionExpression?: string,
      expressionAttributeNames?: Record<string, string>,
      expressionAttributeValues?: Record<string, any>,
      returnValues?: 'NONE' | 'ALL_OLD'
    }
  ): Promise<Record<string, any> | undefined> {
    const command = new DeleteCommand({
      TableName: tableName,
      Key: key,
      ConditionExpression: options?.conditionExpression,
      ExpressionAttributeNames: options?.expressionAttributeNames,
      ExpressionAttributeValues: options?.expressionAttributeValues,
      ReturnValues: options?.returnValues
    });

    const response = await this.docClient.send(command);
    return response.Attributes;
  }

  /**
   * Update an item in DynamoDB
   * @param tableName The name of the table
   * @param key The primary key of the item to update
   * @param updateExpression The update expression
   * @param options Additional options
   * @returns The result of the update operation
   */
  async updateItem(
    tableName: string,
    key: Record<string, any>,
    updateExpression: string,
    options?: {
      conditionExpression?: string,
      expressionAttributeNames?: Record<string, string>,
      expressionAttributeValues?: Record<string, any>,
      returnValues?: 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW'
    }
  ): Promise<Record<string, any> | undefined> {
    const command = new UpdateCommand({
      TableName: tableName,
      Key: key,
      UpdateExpression: updateExpression,
      ConditionExpression: options?.conditionExpression,
      ExpressionAttributeNames: options?.expressionAttributeNames,
      ExpressionAttributeValues: options?.expressionAttributeValues,
      ReturnValues: options?.returnValues
    });

    const response = await this.docClient.send(command);
    return response.Attributes;
  }

  /**
   * Batch get items from multiple tables
   * @param requestItems Map of table names to keys to get
   * @returns The batch get results
   */
  async batchGetItems(
    requestItems: Record<string, {
      Keys: Record<string, any>[],
      ProjectionExpression?: string,
      ExpressionAttributeNames?: Record<string, string>,
      ConsistentRead?: boolean
    }>
  ): Promise<Record<string, Record<string, any>[]>> {
    const command = new BatchGetCommand({
      RequestItems: requestItems
    });

    const response = await this.docClient.send(command);
    return response.Responses || {};
  }

  /**
   * Batch write items to multiple tables
   * @param requestItems Map of table names to write requests
   * @returns The batch write results
   */
  async batchWriteItems(
    requestItems: Record<string, Array<{
      PutRequest?: { Item: Record<string, any> },
      DeleteRequest?: { Key: Record<string, any> }
    }>>
  ): Promise<Record<string, Array<{ PutRequest?: any, DeleteRequest?: any }>>> {
    const command = new BatchWriteCommand({
      RequestItems: requestItems
    });

    const response = await this.docClient.send(command);
    return response.UnprocessedItems || {};
  }

  /**
   * Execute a transaction to get multiple items
   * @param transactItems Array of get items
   * @returns The transaction get results
   */
  async transactGetItems(
    transactItems: Array<{
      Get: {
        TableName: string,
        Key: Record<string, any>,
        ProjectionExpression?: string,
        ExpressionAttributeNames?: Record<string, string>
      }
    }>
  ): Promise<Array<{ Item?: Record<string, any> }>> {
    const command = new TransactGetCommand({
      TransactItems: transactItems
    });

    const response = await this.docClient.send(command);
    return response.Responses || [];
  }

  /**
   * Execute a transaction to write multiple items
   * @param transactItems Array of write items
   */
  /**
   * Execute a transaction to write multiple items
   * @param transactItems Array of write items. Each item can be a Put, Update, Delete or ConditionCheck.
   * The transaction will be retried if any of the items cause a ConditionalCheckFailedException.
   * @returns A promise that resolves when the transaction is complete
   */
  async transactWriteItems(
    transactItems: Array<{
      Put?: {
        TableName: string,
        Item: Record<string, any>,
        ConditionExpression?: string,
        ExpressionAttributeNames?: Record<string, string>,
        ExpressionAttributeValues?: Record<string, any>
      },
      Update?: {
        TableName: string,
        Key: Record<string, any>,
        UpdateExpression: string,
        ConditionExpression?: string,
        ExpressionAttributeNames?: Record<string, string>,
        ExpressionAttributeValues?: Record<string, any>
      },
      Delete?: {
        TableName: string,
        Key: Record<string, any>,
        ConditionExpression?: string,
        ExpressionAttributeNames?: Record<string, string>,
        ExpressionAttributeValues?: Record<string, any>
      },
      ConditionCheck?: {
        TableName: string,
        Key: Record<string, any>,
        ConditionExpression: string,
        ExpressionAttributeNames?: Record<string, string>,
        ExpressionAttributeValues?: Record<string, any>
      }
    }>
  ): Promise<void> {
    const command = new TransactWriteCommand({
      TransactItems: transactItems
    });

    await this.docClient.send(command);
  }

  /**
   * Lista todas las tablas de DynamoDB en la cuenta
   * @param options Opciones adicionales para listar las tablas
   * @returns Lista de nombres de tablas
   */
  async listTables(options?: {
    limit?: number,
    exclusiveStartTableName?: string
  }): Promise<{
    tableNames: string[],
    lastEvaluatedTableName?: string
  }> {
    const command = new ListTablesCommand({
      Limit: options?.limit,
      ExclusiveStartTableName: options?.exclusiveStartTableName
    });

    const response = await this.client.send(command);
    
    return {
      tableNames: response.TableNames || [],
      lastEvaluatedTableName: response.LastEvaluatedTableName
    };
  }
}