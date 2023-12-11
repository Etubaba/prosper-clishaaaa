const bcrypt = require('bcryptjs')
const Coinpayments = require('coinpayments')

const options = {
  key: '6rdftcyvhbujnitdrghvjbjgvhjbm',
  secret: 'ctyvhjbknmhvjbm,nhgcv nmghvbn',
}

module.exports = new Coinpayments(options)
