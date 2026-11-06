import assert from 'node:assert/strict'
import test from 'node:test'
import { TrailValidationError, validateTrail } from '../lib/trailValidation.js'

const start = 1_700_000_000_000
const now = start + 900_000
const latitude = (meters) => (meters / 6371000) * (180 / Math.PI)
const point = (meters = 0, seconds = 0, extra = {}) => ({
  lat: latitude(meters),
  lng: 0,
  t: start + seconds * 1000,
  accuracy: 5,
  ...extra,
})
const invalid = (trail) =>
  assert.throws(() => validateTrail(trail, start, now), TrailValidationError)

test('accepts normal walking, keeps precision, and permits an empty trail', () => {
  const trail = [point(), point(4, 4), point(8, 8)]
  assert.deepEqual(validateTrail(trail, start, now), trail)
  assert.deepEqual(validateTrail([], start, now), [])
})

test('rejects malformed payloads, missing accuracy, extra fields and excessive point counts', () => {
  for (const value of [
    null,
    {},
    'trail',
    [null],
    [[]],
    [{ lat: 0, lng: 0, t: start }],
    [point(0, 0, { spoofed: true })],
    new Array(1801).fill(point()),
  ])
    invalid(value)
})

test('requires each field as an own property and rejects unapproved replacement fields', () => {
  for (const field of ['lat', 'lng', 't', 'accuracy']) {
    const complete = point()
    const missing = { ...complete }
    delete missing[field]
    invalid([missing])
    invalid([{ ...missing, speed: 0 }])
    invalid([Object.assign(Object.create({ [field]: complete[field] }), missing)])
  }
  const { lat, lng, t, accuracy } = point()
  assert.deepEqual(validateTrail([{ accuracy, t, lng, lat }], start, now), [point()])
})

test('rejects non-finite, out-of-range and non-numeric coordinates/times/accuracy', () => {
  for (const extra of [
    { lat: NaN },
    { lat: Infinity },
    { lat: 91 },
    { lat: -91 },
    { lng: 181 },
    { lng: -181 },
    { lat: '0' },
    { t: NaN },
    { t: -1 },
    { t: start + 0.5 },
    { t: Number.MAX_SAFE_INTEGER + 1 },
    { accuracy: null },
    { accuracy: '5' },
    { accuracy: NaN },
    { accuracy: -1 },
    { accuracy: 30.01 },
  ])
    invalid([point(0, 0, extra)])
  validateTrail([point(0, 0, { accuracy: 0 })], start, now)
  validateTrail([point(0, 0, { accuracy: 30 })], start, now)
})

test('rejects duplicate/reversed timestamps and over-900-second trajectories', () => {
  invalid([point(), point(4)])
  invalid([point(0, 2), point(4, 1)])
  assert.throws(() => validateTrail([point(), point(4, 901)], start, start + 902_000), /900秒/)
  validateTrail([point(), point(4, 900)], start, now)
})

test('checks every segment rather than average speed or only the endpoints', () => {
  invalid([point(), point(20, 1)])
  invalid([point(), point(100, 1), point(104, 899)])
  validateTrail([point(), point(15 / 3.6, 1)], start, now)
  invalid([point(), point(15 / 3.6 + 0.01, 1)])
})

test('rejects sub-3m points and permits the 3m boundary', () => {
  invalid([point(), point(2.9, 10)])
  validateTrail([point(), point(3, 3)], start, now)
})

test('uses trusted session creation and server time with only five seconds clock tolerance', () => {
  invalid([point(0, -5.001)])
  invalid([point(0, 905.001)])
  validateTrail([point(0, -5)], start, now)
  validateTrail([point(0, 905)], start, now)
})

test('handles the antimeridian and high latitude without longitude artifacts', () => {
  validateTrail([point(0, 0, { lng: 179.99998 }), point(0, 2, { lng: -179.99998 })], start, now)
  invalid([point(0, 0, { lng: 0 }), point(0, 1, { lng: 180 })])
  validateTrail([point(0, 0, { lat: 89 }), point(0, 2, { lat: 89, lng: 0.002 })], start, now)
})
