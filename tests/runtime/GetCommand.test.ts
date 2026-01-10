import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { describe, expect, test } from 'vitest'

import { GetCommand as AwesomeGetCommand } from '~/index'
import { Entity } from '~/types/Entity'

describe('GetCommand Runtime', () => {
  test('AwesomeGetCommand is separate but compatible with native input', () => {
    const cmd = new AwesomeGetCommand({ TableName: 'T', Key: { pk: '1' } })
    expect(cmd).toBeInstanceOf(AwesomeGetCommand)
    // Check it inherits correctly (instanceof Native is tricky if mixins/wrappers used, but we extended it)
    expect(cmd).toBeInstanceOf(GetCommand)
  })

  test('Throws if Entity is provided without TableName (not implemented yet)', () => {
    const entity = {} as unknown as Entity<any, any, any, any, any, any, any, any, any>

    expect(() => {
      new AwesomeGetCommand({
        Entity: entity,
        Key: { pk: '1' } // Structure doesn't matter for this check, but type expects strict
      } as any)
    }).toThrow('Entity support not implemented; provide TableName')
  })

  test('Does NOT throw if Entity AND TableName provided', () => {
    const entity = {} as unknown as Entity<any, any, any, any, any, any, any, any, any>

    const cmd = new AwesomeGetCommand({
      TableName: 'T',
      Entity: entity,
      Key: { pk: '1' }
    } as any)
    expect(cmd).toBeDefined()
  })
})
