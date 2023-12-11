const { check, validationResult } = require('express-validator')
const db = require('../models')
const { Op, Sequelize } = require('sequelize')
const shortid = require('shortid')
const {
  getPagingData,
  pagination,
  getPagination,
} = require('../middleware/helper')

const Wallet = db.models.Wallet
const Transaction = db.models.Transaction

shortid.characters(
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$@'
)

const walletDetails = async (req, res) => {
  try {
    let user = req.user
    const wallet = await Wallet.findOne({ where: { UserId: user.id } })

    const coinpayment_transaction = await Transaction.findOne({
      where: {
        userId: user.id,
        status: 1,
        payment_method: 'coinpayment',
      }, 
    })

    const pendings = {
      coinpayment: coinpayment_transaction ? true : false,
      paypal: false,
    }

    return res.status(200).send({
      status: true,
      data: { wallet, pendings },
      message: 'Wallet Details',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const listTransactions = async (req, res) => {
  try {
    let user = req.user,
      { size, page, status } = req.query

    const paging = pagination(page)
    const { limit, offset } = getPagination(page, size)

    let condition = { userId: user.id }

    // Filter by type
    if (status) {
      condition['status'] = status
    }

    const transactions = await Transaction.findAndCountAll({
      where: condition,
      limit,
      offset,
      order: paging.order,
    })

    const paginatedResult = getPagingData(
      transactions,
      page,
      limit,
      'transactions'
    )

    return res.status(200).send({
      status: true,
      data: paginatedResult,
      message: '',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const paymentWalletValidation = () => {
  return [
    check('payment_method')
      .notEmpty()
      .withMessage('Payment Method is required')
      .isIn(['coinpayment', 'paypal'])
      .withMessage('Input a valid payment method'),

    check('wallet_address')
      .notEmpty()
      .withMessage('Wallet address is required')
      .isString({ min: 3 }),
  ]
}

const addPaymentWallet = async (req, res) => {
  try {
    let user = req.user

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).send({
        status: false,
        errors: errors.array(),
      })
    }

    let payload = {}
    const { payment_method, wallet_address } = req.body

    const transaction = await Transaction.findOne({
      where: {
        userId: user.id,
        status: 1,
        payment_method: payment_method,
      },
    })

    if (transaction) {
      return res.status(400).send({
        status: false,
        message: `You cannot update this wallet address. Payment Request is pending`,
      })
    }

    if (payment_method == 'coinpayment') {
      payload['coinwallet_id'] = wallet_address.trim()
    }

    const wallet = await Wallet.update(payload, {
      where: { UserId: user.id },
    })

    return res.status(200).send({
      status: true,
      message: 'Wallet Address has been updated succesfully',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const createTransactionValidation = () => {
  return [
    check('payment_method')
      .notEmpty()
      .withMessage('Payment Method is required')
      .isIn(['coinpayment', 'paypal'])
      .withMessage('Input a valid payment method'),

    check('amount')
      .notEmpty()
      .withMessage('Amount is required')
      .isNumeric({ min: 1, max:10000 }),

    check('currency').notEmpty().withMessage('Currency  is required'),
  ]
}

const initiateTransaction = async (req, res) => {
  try {
    let user = req.user

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).send({
        status: false,
        errors: errors.array(),
      })
    }
    //Confirm if user can make payment request
    const wallet = await Wallet.findOne({ where: { UserId: user.id } })
    const { payment_method, amount, currency } = req.body
    const dollorToPoint = 2.5
    const points = parseInt(amount) * dollorToPoint

    if (points > wallet.balance) {
      return res.status(400).send({
        status: false,
        message: `You don't have enough points to make this payment request`,
      })
    }

    // Payload Generator
    const genID = shortid.generate()
    const trx_id = `${genID}${Date.now()}`
    const payload = {
      userId: user.id,
      trx_id,
      payment_method,
      currency,
      amount: parseInt(amount),
      points,
    }

    // Create Transaction and remove points from wallet
    const transaction = await Transaction.create(payload)

    if (transaction) {
      wallet.balance -= points
      await wallet.save()
    }

    return res.status(200).send({
      status: true,
      data: {
        transaction,
      },
      message: 'Payout has been requested',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

async function testCoinPaymentEndpoints() {
  const transactionOpts = {
    cmd: "create_transfer",
    currency: 'LTCT', 
    // currency2: 'USD',  
    amount: 1,//transaction.amount,
    // buyer_email: transaction?.user.email,
    address: 'mxrZ6UTSPvaRiLoFQkN27Jcny3vshRPdSU',//transactionWallet.coinpayment
  }

  let response = await coinpayment.createWithdrawal(transactionOpts);
}


module.exports = {
  walletDetails,
  listTransactions,
  createTransactionValidation,
  initiateTransaction,

  paymentWalletValidation,
  addPaymentWallet,
}
