const crypto = require('crypto');

const prefix = process.env.PREFIX || 'BONGBA';
const count  = parseInt(process.argv[2]) || 1;
const year   = new Date().getFullYear();

console.log('\n🔑  Lal Salam — Activation Code Generator\n');
console.log('Paste these into ACTIVATION_CODES in data/config.js:\n');

const codes = [];
for (let i = 0; i < count; i++) {
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  const code = `${prefix}-${year}-${rand}`;
  codes.push(code);
  console.log(`  "${code}",`);
}

console.log(`\n✅  ${codes.length} code(s) generated.\n`);
console.log('Remember: each code is single-use.\n');