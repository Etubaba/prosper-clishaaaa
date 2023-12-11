const { check, validationResult } = require('express-validator')
const db = require('../models')
const { Op, Sequelize } = require('sequelize')
const {
  getPagingData,
  pagination,
  getPagination,
} = require('../middleware/helper')
const coinpayment = require('../config/coinpayments')
const stripe = require('../config/stripe')
const util = require('util')
const shortid = require('shortid')
const moment = require('moment')
const { CLIENT_URL_MAIN } = require('../config/url')
const sleep = util.promisify(setTimeout)

const Admin = db.models.Admin
const CompanyWallet = db.models.CompanyWallet
const PackagePayment = db.models.PackagePayment
const Transaction = db.models.Transaction

shortid.characters(
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$@'
)

const walletDetails = async (req, res) => {
  const { admin_id, company_id } = req.company

  const wallet = await CompanyWallet.findOne({
    where: { companyId: company_id },
  })

  const current_plan = await PackagePayment.findOne({
    where: {
      companyId: company_id,
    },
    status: 1,
    order: [['createdAt', 'DESC']],
  })

  if (req.query.clean == 'clean_paypal') {
    wallet.paypal_plan_id = null
    wallet.paypal_plan = null
    wallet.paypal_links = null
    await wallet.save()
  }

  return res.status(200).send({
    status: true,
    data: { wallet, current_plan },
    // message: 'Wallet Details',
  })
}

const invoices = async (req, res) => {
  const { admin_id, company_id } = req.company

  const wallet = await CompanyWallet.findOne({
    where: { companyId: company_id },
  })

  const invoices = await PackagePayment.findAll({
    where: {
      companyId: company_id,
    },
    order: [['createdAt', 'DESC']],
  })

  return res.status(200).send({
    status: true,
    data: {
      invoices,
    },
    // message: 'Invoices',
  })
}

const packagePaymentValidation = () => {
  return [
    check('package_name')
      .notEmpty()
      .withMessage('Package name is required')
      .isString({ min: 3, max: 3 }),

    check('amount')
      .notEmpty()
      .withMessage('Amount is required')
      .isFloat({ min: 0 })
      .withMessage('Input a valid amount'),

    check('interactions')
      .notEmpty()
      .withMessage('Interactions is required')
      .isFloat({ min: 0 })
      .withMessage('Input a valid interactions'),

    check('vat')
      .notEmpty()
      .withMessage('VAT is required')
      .isFloat({ min: 0 })
      .withMessage('Input a valid vat'),

    check('currency')
      .notEmpty()
      .withMessage('Currency is required')
      .isIn(['USD', 'EUR'])
      .isString({ min: 3, max: 3 }),
  ]
}

const createOfflinePackagePayment = async (req, res) => {
  const { admin_id, company_id } = req.company

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).send({
      status: false,
      errors: errors.array(),
    })
  }

  const admin = await Admin.findOne({ where: { id: admin_id } })
  const { amount, currency, package_name, interactions, vat } = req.body

  const genID = shortid.generate()
  const trx_id = `${genID}${Date.now()}`
  let payload = {
    companyId: company_id,
    txn_id: trx_id,
    package_name,
    payment_method: 'offline',
    currency,
    amount,
    interactions,
    vat,
    status: 0,
  }

  const package = await PackagePayment.create(payload)

  return res.status(200).send({
    status: true,
    data: { package },
    message: 'Package has been registered',
  })
}

const coinpaymentPackagePayment = async (req, res) => {
  const { admin_id, company_id } = req.company

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).send({
      status: false,
      errors: errors.array(),
    })
  }

  const admin = await Admin.findOne({ where: { id: admin_id } })
  const { amount, currency, package_name, interactions, vat } = req.body

  const transactionOpts = {
    cmd: 'create_transaction',
    currency1: currency,
    currency2: 'LTCT',
    amount: amount,
    buyer_email: admin?.email,
    buyer_name: admin?.name,
    // ipn_url: ipn_url
  }

  const response = await coinpayment.createTransaction(transactionOpts)
  console.log('Coinpayment ', response)
  let payload = {
    companyId: company_id,
    package_name,
    payment_method: 'coinpayment',
    currency,
    amount,
    interactions,
    vat,
    status: 0,
    txn_id: response?.txn_id,
    details: response,
  }

  const package = await PackagePayment.create(payload)

  return res.status(200).send({
    status: true,
    data: { package, response },
    message: 'Package has been registered',
  })
}

const coinpaymentPackageInfo = async (req, res) => {
  const { admin_id, company_id } = req.company
  const { txn_id } = req.params

  const package = await PackagePayment.findOne({ where: { txn_id } })
  const wallet = await CompanyWallet.findOne({
    where: { companyId: company_id },
  })

  if (package.status === 0) {
    wallet.balance += package.interactions
    wallet.save()

    package.status = 1
    package.save()
  }

  // const response =  await coinpayment.getTransactionInfo({
  //     cmd: "get_tx_info",
  //     txn_id
  // });

  // console.log(response);
  return res.status(200).send({
    status: true,
    data: { package, wallet },
    message: 'Package information',
  })
}

const initStripePackagePayment = async (req, res) => {
  const { admin_id, company_id } = req.company

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).send({
      status: false,
      errors: errors.array(),
    })
  }

  const admin = await Admin.findOne({ where: { id: admin_id } })
  const { amount, currency, package_name, interactions, vat } = req.body

  const response = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: currency,
          product_data: { name: package_name },
          unit_amount: amount * 100,
        },
        quantity: 1,
      },
    ],
    success_url: `${CLIENT_URL_MAIN}/success?mode=stripe`,
  })

  let payload = {
    companyId: company_id,
    package_name,
    payment_method: 'stripe',
    currency,
    amount,
    interactions,
    vat,
    status: 0,
    txn_id: response.id,
    // details: response.clientSecret
  }

  const package = await PackagePayment.create(payload)

  return res.status(200).send({
    status: true,
    data: { package, response },
    message: 'Package has been registered',
  })
}

const activateStripePlan = async (req, res) => {
  const { admin_id, company_id } = req.company

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).send({
      status: false,
      errors: errors.array(),
    })
  }

  const admin = await Admin.findOne({ where: { id: admin_id } })
  const { amount, currency, package_name, interactions, vat } = req.body

  const customer = await stripe.customers.create({
    email: admin.email,
  })

  console.log('Customer ', customer)

  // Card
  // const paymentMethod = await stripe.paymentMethods.create({
  //     type: 'card',
  //     // type: 'visa',
  //     card: {
  //       number: '4242424242424242',
  //       exp_month: '12',
  //       exp_year: '2025',
  //       cvc: '123',
  //     }
  // });

  // const paymentMethod = await stripe.paymentIntents.create({
  //     amount: 500,
  //     currency: 'gbp',
  //     payment_method: 'pm_card_visa',
  // });

  const paymentMethod = await stripe.paymentMethods.create({
    type: 'card',
    card: {
      token: 'tok_visa', // Use a test token (e.g., tok_visa)
    },
  })

  await stripe.paymentMethods.attach(paymentMethod.id, {
    customer: customer.id,
  })

  console.log(paymentMethod)

  // await stripe.paymentMethods.attach(paymentMethod.id, { customer: customer.id });

  const plan = await stripe.plans.create({
    nickname: `${package_name} Monthly Subscription`,
    currency: currency,
    amount: amount, // Amount in cents (e.g., $9.99)
    interval: 'month', // Other options: 'day', 'week', 'month', 'year'
  })

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ plan: plan.id }],
    default_payment_method: paymentMethod.id,
  })

  console.log('Subscription created:', subscription)

  return res.status(200).send({
    status: true,
    data: { subscription, plan },
    message: 'Paypal Package detail',
  })
}

const createStripeSubscriptuin = async (req, res) => {
  const { admin_id, company_id } = req.company

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).send({
      status: false,
      errors: errors.array(),
    })
  }

  const admin = await Admin.findOne({ where: { id: admin_id } })
  const { amount, currency, package_name, interactions, vat } = req.body

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ plan: planId }],
  })

  console.log(subscription)
}

module.exports = {
  invoices,
  walletDetails,
  createOfflinePackagePayment,
  // Coinpayment
  packagePaymentValidation,
  coinpaymentPackagePayment,
  coinpaymentPackageInfo,
  // Stripe
  initStripePackagePayment,
  activateStripePlan,
}
