const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..', '..');
const payout = require('../hooks/payout-invariant-check');
const pii = require('../hooks/pii-redaction-check');
const immutable = require('../hooks/claim-immutability-check');
const input = (file, content) => ({ tool_input: { file_path: path.join(root, file), content } });
test('ClaimFlow pre-write hooks block floating money, PII logging, and evidence mutators', () => {
  assert.equal(payout.decision(input('src/main/java/com/claimflow/service/X.java', 'double payoutAmount = 1.2;'), root).allow, false);
  assert.equal(pii.decision(input('src/main/java/com/claimflow/service/X.java', 'logger.info("description {}", description);'), root).allow, false);
  assert.equal(immutable.decision(input('src/main/java/com/claimflow/domain/Settlement.java', 'public void setAmount() {}'), root).allow, false);
});
