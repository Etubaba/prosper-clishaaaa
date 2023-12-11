const bcrypt = require('bcryptjs')
const Coinpayments = require('coinpayments')

const options = {
  key: process.env.PAYMENT_KEY,
  secret: process.env.PAYMENT_SECRET,
}

module.exports = new Coinpayments(options)