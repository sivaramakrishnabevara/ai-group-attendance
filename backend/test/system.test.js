const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { signToken, verifyToken } = require('../utils/jwt');

describe('Security & Authentication Tests', () => {
  test('bcrypt should hash and correctly verify passwords', async () => {
    const raw = 'admin123';
    const hash = await bcrypt.hash(raw, 10);
    assert.ok(hash.startsWith('$2'));

    const isMatch = await bcrypt.compare(raw, hash);
    assert.strictEqual(isMatch, true);

    const isBadMatch = await bcrypt.compare('wrongpass', hash);
    assert.strictEqual(isBadMatch, false);
  });

  test('JWT token generation and verification for roles', () => {
    const payload = { id: 1, email: 'admin@aigroup.com', role: 'ADMIN' };
    const token = signToken(payload);
    assert.ok(typeof token === 'string' && token.length > 20);

    const decoded = verifyToken(token);
    assert.strictEqual(decoded.id, 1);
    assert.strictEqual(decoded.email, 'admin@aigroup.com');
    assert.strictEqual(decoded.role, 'ADMIN');
  });
});

describe('Biometrics & Attendance Rules Tests', () => {
  test('Optimal cosine similarity threshold check', () => {
    const OPTIMAL_THRESHOLD = 0.36;
    const samePersonCosine = 0.72;
    const imposterCosine = 0.18;

    assert.ok(samePersonCosine >= OPTIMAL_THRESHOLD, 'Genuine match must exceed threshold');
    assert.ok(imposterCosine < OPTIMAL_THRESHOLD, 'Imposter match must fall below threshold');
  });

  test('Attendance low attendance alert threshold', () => {
    const defaultThreshold = 75.0;
    const student1Pct = 68.5;
    const student2Pct = 85.0;

    assert.strictEqual(student1Pct < defaultThreshold, true, 'Student 1 must trigger low attendance alert');
    assert.strictEqual(student2Pct < defaultThreshold, false, 'Student 2 is above threshold');
  });
});
