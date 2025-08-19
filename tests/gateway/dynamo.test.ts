import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { expect } from 'chai';
import { DynamoGateway } from '../../gateway/dynamo.js';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  QueryCommand,
  ScanCommand,
  DeleteCommand,
  UpdateCommand,
  BatchGetCommand} from '@aws-sdk/lib-dynamodb';

import chai from 'chai';
chai.use(sinonChai as any);

let sandbox: sinon.SinonSandbox;

describe('DynamoGateway', () => {
  let dynamoGateway: DynamoGateway;
  let mockDocClient: { send: sinon.SinonStub };
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(DynamoDBClient.prototype);
    mockDocClient = { send: sandbox.stub() };
    sandbox.stub(DynamoDBDocumentClient, 'from').returns(mockDocClient as any);
    dynamoGateway = new DynamoGateway({
      region: 'us-east-1'
    });
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  describe('getItem', () => {
    it('should get an item from DynamoDB', async () => {
      const tableName = 'TestTable';
      const key = { id: '123' };
      const mockItem = { id: '123', name: 'Test Item' };
      
      mockDocClient.send.resolves({ Item: mockItem });
      
      const result = await dynamoGateway.getItem(tableName, key);
      
      expect(mockDocClient.send).to.have.been.calledOnce;
      expect(result).to.deep.equal(mockItem);
      
      const sendCall = mockDocClient.send.getCall(0);
      expect(sendCall.args[0]).to.be.instanceOf(GetCommand);
      expect(sendCall.args[0].input).to.deep.include({
        TableName: tableName,
        Key: key
      });
    });
    
    it('should return undefined when item is not found', async () => {
      const tableName = 'TestTable';
      const key = { id: '123' };
      
      mockDocClient.send.resolves({});
      
      const result = await dynamoGateway.getItem(tableName, key);
      
      expect(mockDocClient.send).to.have.been.calledOnce;
      expect(result).to.be.undefined;
    });
  });
  
  describe('putItem', () => {
    it('should put an item into DynamoDB', async () => {
      const tableName = 'TestTable';
      const item = { id: '123', name: 'Test Item' };
      
      mockDocClient.send.resolves({});
      
      await dynamoGateway.putItem(tableName, item);
      
      expect(mockDocClient.send).to.have.been.calledOnce;
      
      const sendCall = mockDocClient.send.getCall(0);
      expect(sendCall.args[0]).to.be.instanceOf(PutCommand);
      expect(sendCall.args[0].input).to.deep.include({
        TableName: tableName,
        Item: item
      });
    });
  });
  
  describe('query', () => {
    it('should query items from DynamoDB', async () => {
      const tableName = 'TestTable';
      const keyConditionExpression = 'id = :id';
      const expressionAttributeValues = { ':id': '123' };
      const mockItems = [
        { id: '123', name: 'Test Item 1' },
        { id: '123', name: 'Test Item 2' }
      ];
      
      mockDocClient.send.resolves({
        Items: mockItems,
        Count: 2
      });
      
      const result = await dynamoGateway.query(tableName, keyConditionExpression, {
        expressionAttributeValues
      });
      
      expect(mockDocClient.send).to.have.been.calledOnce;
      expect(result.items).to.deep.equal(mockItems);
      expect(result.count).to.equal(2);
      
      const sendCall = mockDocClient.send.getCall(0);
      expect(sendCall.args[0]).to.be.instanceOf(QueryCommand);
      expect(sendCall.args[0].input).to.deep.include({
        TableName: tableName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues
      });
    });
  });
  
  describe('scan', () => {
    it('should scan items from DynamoDB', async () => {
      const tableName = 'TestTable';
      const mockItems = [
        { id: '123', name: 'Test Item 1' },
        { id: '456', name: 'Test Item 2' }
      ];
      
      mockDocClient.send.resolves({
        Items: mockItems,
        Count: 2
      });
      
      const result = await dynamoGateway.scan(tableName);
      
      expect(mockDocClient.send).to.have.been.calledOnce;
      expect(result.items).to.deep.equal(mockItems);
      expect(result.count).to.equal(2);
      
      const sendCall = mockDocClient.send.getCall(0);
      expect(sendCall.args[0]).to.be.instanceOf(ScanCommand);
      expect(sendCall.args[0].input).to.deep.include({
        TableName: tableName
      });
    });
  });
  
  describe('deleteItem', () => {
    it('should delete an item from DynamoDB', async () => {
      const tableName = 'TestTable';
      const key = { id: '123' };
      const mockAttributes = { id: '123', name: 'Deleted Item' };
      
      mockDocClient.send.resolves({ Attributes: mockAttributes });
      
      const result = await dynamoGateway.deleteItem(tableName, key, { returnValues: 'ALL_OLD' });
      
      expect(mockDocClient.send).to.have.been.calledOnce;
      expect(result).to.deep.equal(mockAttributes);
      
      const sendCall = mockDocClient.send.getCall(0);
      expect(sendCall.args[0]).to.be.instanceOf(DeleteCommand);
      expect(sendCall.args[0].input).to.deep.include({
        TableName: tableName,
        Key: key,
        ReturnValues: 'ALL_OLD'
      });
    });
  });
  
  describe('updateItem', () => {
    it('should update an item in DynamoDB', async () => {
      const tableName = 'TestTable';
      const key = { id: '123' };
      const updateExpression = 'SET #name = :name';
      const expressionAttributeNames = { '#name': 'name' };
      const expressionAttributeValues = { ':name': 'Updated Name' };
      const mockAttributes = { id: '123', name: 'Updated Name' };
      
      mockDocClient.send.resolves({ Attributes: mockAttributes });
      
      const result = await dynamoGateway.updateItem(tableName, key, updateExpression, {
        expressionAttributeNames,
        expressionAttributeValues,
        returnValues: 'ALL_NEW'
      });
      
      expect(mockDocClient.send).to.have.been.calledOnce;
      expect(result).to.deep.equal(mockAttributes);
      
      const sendCall = mockDocClient.send.getCall(0);
      expect(sendCall.args[0]).to.be.instanceOf(UpdateCommand);
      expect(sendCall.args[0].input).to.deep.include({
        TableName: tableName,
        Key: key,
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      });
    });
  });
  
  describe('batchGetItems', () => {
    it('should batch get items from DynamoDB', async () => {
      const requestItems = {
        'Table1': {
          Keys: [{ id: '1' }, { id: '2' }]
        },
        'Table2': {
          Keys: [{ id: '3' }]
        }
      };
      
      const mockResponses = {
        'Table1': [{ id: '1', name: 'Item 1' }, { id: '2', name: 'Item 2' }],
        'Table2': [{ id: '3', name: 'Item 3' }]
      };
      
      mockDocClient.send.resolves({ Responses: mockResponses });
      
      const result = await dynamoGateway.batchGetItems(requestItems);
      
      expect(mockDocClient.send).to.have.been.calledOnce;
      expect(result).to.deep.equal(mockResponses);
      
      const sendCall = mockDocClient.send.getCall(0);
      expect(sendCall.args[0]).to.be.instanceOf(BatchGetCommand);
      expect(sendCall.args[0].input).to.deep.include({
        RequestItems: requestItems
      });
    });
  });
});
