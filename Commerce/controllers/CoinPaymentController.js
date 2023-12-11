const db = require('../models')
const { Op, Sequelize } = require('sequelize')
const client = require('../config/coinpayments')

const initializeCoinPaymentTransaction = async (req, res) => {
  const Coinpayments = await client.getBasicInfo()
  const rates = await client.rates()

  return
}

const testCoinPaymentEndpoints = async (req, res) => {
  const payments = await client.getBasicInfo()
  const rates = await client.rates({ short: 1, accepted: 1 })

  return res.status(200).send({
    status: true,
    data: { payments, rates },
    message: 'Admin Login Succesfully',
  })
}

module.exports = {
  initializeCoinPaymentTransaction,
  testCoinPaymentEndpoints,
}
