import { test } from 'node:test'
import assert from 'node:assert/strict'
import { capacityStatus, domainHref, nextSharedDropletName, takesCapacitySlot } from './hosting-map'

test('capacityStatus: levels at 5-slot capacity', () => {
  assert.equal(capacityStatus(0, 5).level, 'ok')
  assert.equal(capacityStatus(3, 5).level, 'ok')
  assert.equal(capacityStatus(4, 5).level, 'nearly-full')
  assert.equal(capacityStatus(5, 5).level, 'full')
  assert.equal(capacityStatus(6, 5).level, 'full')
  assert.equal(capacityStatus(6, 5).remaining, 0)
  assert.equal(capacityStatus(3, 5).remaining, 2)
})

test('nextSharedDropletName', () => {
  assert.equal(nextSharedDropletName([]), 'bhc-clients')
  assert.equal(nextSharedDropletName(['bhc-web', 'bhc-clients']), 'bhc-clients-2')
  assert.equal(nextSharedDropletName(['bhc-clients', 'bhc-clients-2']), 'bhc-clients-3')
  assert.equal(nextSharedDropletName(['bhc-clients-3', 'bhc-clients']), 'bhc-clients-4')
  assert.equal(nextSharedDropletName(['bhc-clients-old']), 'bhc-clients')
})

test('takesCapacitySlot: only live/migrating client sites that opt in', () => {
  assert.equal(takesCapacitySlot({ kind: 'client-site', countsTowardCapacity: true, status: 'live' }), true)
  assert.equal(takesCapacitySlot({ kind: 'client-site', countsTowardCapacity: null, status: 'migrating' }), true)
  assert.equal(takesCapacitySlot({ kind: 'client-site', countsTowardCapacity: false, status: 'live' }), false)
  assert.equal(takesCapacitySlot({ kind: 'client-site', countsTowardCapacity: true, status: 'retired' }), false)
  assert.equal(takesCapacitySlot({ kind: 'internal-tool', countsTowardCapacity: true, status: 'live' }), false)
})

test('domainHref', () => {
  assert.equal(domainHref('grantswithinreach.com'), 'https://grantswithinreach.com')
  assert.equal(domainHref('*.preview.getblackhart.com'), null)
  assert.equal(domainHref('https://x.ondigitalocean.app'), 'https://x.ondigitalocean.app')
})
