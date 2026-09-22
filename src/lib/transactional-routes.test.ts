import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isTransactionalPath } from './transactional-routes'

test('isTransactionalPath covers payment, billing and portal routes', () => {
  assert.equal(isTransactionalPath('/invoice/42'), true)
  assert.equal(isTransactionalPath('/invoice/42/thank-you'), true)
  assert.equal(isTransactionalPath('/care-plan/setup'), true)
  assert.equal(isTransactionalPath('/care-plan/thank-you'), true)
  assert.equal(isTransactionalPath('/portal/cus_123'), true)
  assert.equal(isTransactionalPath('/misbah/tip/result'), true)
  assert.equal(isTransactionalPath('/Invoice/42/'), true)
})

test('isTransactionalPath covers confirmation pages anywhere in the tree', () => {
  assert.equal(isTransactionalPath('/booked'), true)
  assert.equal(isTransactionalPath('/lp/express-website/booked'), true)
})

test('isTransactionalPath leaves marketing pages alone', () => {
  assert.equal(isTransactionalPath('/'), false)
  assert.equal(isTransactionalPath('/free-website-audit'), false)
  assert.equal(isTransactionalPath('/lp/express-website'), false)
  assert.equal(isTransactionalPath('/portfolio/some-project'), false)
  assert.equal(isTransactionalPath('/articles/invoice-tips'), false)
  assert.equal(isTransactionalPath('/invoices-guide'), false)
  assert.equal(isTransactionalPath('/misbah'), false)
  assert.equal(isTransactionalPath(null), false)
  assert.equal(isTransactionalPath(''), false)
})
