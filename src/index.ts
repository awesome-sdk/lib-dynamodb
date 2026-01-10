export {
  BatchExecuteStatementCommand,
  BatchGetCommand,
  BatchWriteCommand,
  DeleteCommand,
  DynamoDBDocument,
  DynamoDBDocumentClientCommand,
  ExecuteStatementCommand,
  GetCommand,
  paginateQuery, // Optional alias or just ensuring we have it
  paginateQuery as paginateQueryHelper,
  paginateScan,
  paginateScan as paginateScanHelper,
  PutCommand,
  QueryCommand,
  ScanCommand,
  TransactGetCommand,
  TransactWriteCommand,
  TranslateConfig,
  UpdateCommand
} from '@aws-sdk/lib-dynamodb'
export * from './DynamoDBDocumentClient'
export * from './errors'

export * from './functions'
