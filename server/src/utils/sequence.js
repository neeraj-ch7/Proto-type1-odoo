const Counter = require('../models/Counter');
// nextNumber('SUB' | 'INV') -> "SUB-0001" / "INV-0001"
const nextNumber = async (key) => `${key}-${String(await Counter.next(key)).padStart(4, '0')}`;
module.exports = { nextNumber };