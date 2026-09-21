import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isFlaggedSpam } from './lead-event'

test('isFlaggedSpam reads the flag off the Payload create response', () => {
  assert.equal(isFlaggedSpam({ message: 'ok', doc: { id: 27, suspectedSpam: true } }), true)
  assert.equal(isFlaggedSpam({ message: 'ok', doc: { id: 23, suspectedSpam: false } }), false)
})

test('isFlaggedSpam treats anything unexpected as a clean lead', () => {
  assert.equal(isFlaggedSpam(null), false)
  assert.equal(isFlaggedSpam('nope'), false)
  assert.equal(isFlaggedSpam({}), false)
  assert.equal(isFlaggedSpam({ doc: null }), false)
  assert.equal(isFlaggedSpam({ doc: { suspectedSpam: 'true' } }), false)
})
