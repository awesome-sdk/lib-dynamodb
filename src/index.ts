export {
  BatchExecuteStatementCommand,
  BatchGetCommand,
  BatchWriteCommand,
  DeleteCommand,
  DynamoDBDocument,
  DynamoDBDocumentClientCommand,
  ExecuteStatementCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  TransactGetCommand,
  TransactWriteCommand,
  TranslateConfig,
  UpdateCommand,
  paginateQuery, // Optional alias or just ensuring we have it
  paginateQuery as paginateQueryHelper,
  paginateScan,
  paginateScan as paginateScanHelper
} from '@aws-sdk/lib-dynamodb'
export * from './commands/GetCommand'
export * from './DynamoDBDocumentClient'
export * from './errors'

export * from './functions'
