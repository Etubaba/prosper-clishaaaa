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
const paypal = require('../config/paypal')
const util = require('util')
const moment = require('moment')
const { CLIENT_URL_MAIN } = require('../config/url')

const Admin = db.models.Admin
const CompanyWallet = db.models.CompanyWallet
const PackagePayment = db.models.PackagePayment
const Transaction = db.models.Transaction

const walletDetails = async (req, res) => {
  const { admin_id, company_id } = req.company

  const wallet = await CompanyWallet.findOne({
    where: { companyId: company_id },
  })

  if (!wallet) {
    const wallet = await CompanyWallet.create({
      companyId: company_id,
    })
  }

  wallet.paypal_plan_id = null
  wallet.paypal_plan = null
  wallet.paypal_links = null
  await wallet.save()

  return res.status(200).send({
    status: true,
    data: { wallet },
    message: 'Wallet Details',
  })
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
      .isString({ min: 10 }),
  ]
}

const updatePaymentWallet = async (req, res) => {
  const { admin_id, company_id } = req.company

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).send({
      status: false,
      errors: errors.array(),
    })
  }

  let payload = {}
  const { payment_method, wallet_address } = req.body

  if (payment_method == 'coinpayment') {
    payload['coinwallet_id'] = wallet_address.trim()
  }

  if (payment_method == 'paypal') {
    payload['paypal_plan_id'] = wallet_address.trim()
  }

  const wallet = await CompanyWallet.update(payload, {
    where: { companyId: company_id },
  })

  return res.status(200).send({
    status: true,
    message: 'Wallet Address has been updated succesfully',
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

const configurePayPalPayment2 = async (req, res) => {
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
  let wallet = await CompanyWallet.findOne({ where: { companyId: company_id } })

  const plan = {
    name: package_name,
    description: `${package_name} Monthly Subscription`,
    type: 'fixed',
    payment_definitions: [
      {
        name: `${package_name} payment`,
        type: 'REGULAR',
        frequency: 'MONTH',
        frequency_interval: '1',
        amount: {
          currency: currency,
          value: amount, // Replace with your subscription amount
        },
        cycles: '12', // Number of billing cycles
      },
    ],
    merchant_preferences: {
      return_url: `${CLIENT_URL_MAIN}/success?mode=paypal`,
      cancel_url: `${CLIENT_URL_MAIN}/cance?mode=paypal`,
      auto_bill_amount: 'YES',
      initial_fail_amount_action: 'CONTINUE',
      max_fail_attempts: '3',
    },
  }

  // // Create Billing Plan
  if (!wallet.paypal_plan_id) {
    await sleep(
      paypal.billingPlan.create(plan, (error, billingPlan) => {
        if (error) {
          console.error('Error creating subscription plan:', error.response)
        } else {
          wallet.paypal_plan_id = billingPlan.id
          wallet.paypal_plan = billingPlan
          wallet.save()
        }
      }),
      2500
    )
  }

  console.log('Subscription Created', wallet)
  // Activate Billing Plan
  // if(wallet.paypal_plan_id && wallet.paypal_plan?.state != 'ACTIVE'){
  const updatePlan = [
    {
      op: 'replace',
      path: '/',
      value: {
        state: 'ACTIVE',
      },
    },
  ]
  await sleep(
    paypal.billingPlan.update(
      wallet.paypal_plan_id,
      updatePlan,
      (error, response) => {
        if (error) {
          console.error('Error activating subscription plan:', error.response)
        } else {
          wallet.paypal_plan = response
          wallet.save()
        }
      }
    ),
    2500
  )
  // }
  console.log('Subscription NOte')
  // Aggrement
  // if (!wallet.paypal_links){
  var isoDate = new Date()
  isoDate.setSeconds(isoDate.getSeconds() + 10)
  isoDate.toISOString().slice(0, 19) + 'Z'

  var isoDate1 = moment().add('+5 minute').format('YYYY-MM-DD HH:mm:ss')

  console.log(isoDate, isoDate1)
  const agreement = {
    name: package_name,
    description: `${package_name} Monthly Subscription`,
    start_date: isoDate,
    payer: {
      payment_method: 'paypal',
    },
    plan: {
      id: wallet.paypal_plan_id,
    },
  }

  await sleep(
    paypal.billingAgreement.create(
      JSON.stringify(agreement),
      (error, billingAgreement) => {
        if (error) {
          console.error(
            'Error creating subscription agreement:',
            error.response
          )
        } else {
          console.log('Subscription agreement created successfully')
          console.log('Agreement ID:', billingAgreement.id, billingAgreement)
          // Redirect the user to the approval URL
          wallet.paypal_links = billingAgreement.links
          wallet.save()
        }
      }
    ),
    2500
  )
  // }

  wallet = await CompanyWallet.findOne({ where: { companyId: company_id } })

  return res.status(200).send({
    status: true,
    data: { wallet },
    message: 'Paypal Wallet updated',
  })
}

const initPaypalPackagePayment2 = async (req, res) => {
  const { admin_id, company_id } = req.company

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).send({
      status: false,
      errors: errors.array(),
    })
  }

  const wallet = await CompanyWallet.findOne({
    where: { companyId: company_id },
  })
  const admin = await Admin.findOne({ where: { id: admin_id } })
  const { amount, currency, package_name, interactions, vat } = req.body

  let tokenHref = wallet.paypal_links[0]?.href
  let paymentToken = tokenHref.split('token=')[1]
  console.log(paymentToken)

  let payload = {
    companyId: company_id,
    package_name,
    payment_method: 'paypal',
    currency,
    amount,
    interactions,
    vat,
    status: 0,
    txn_id: paymentToken, //response?.id,
    // details: response.clientSecret
  }

  const package = await PackagePayment.create(payload)
  await sleep(
    paypal.billingAgreement.execute(
      paymentToken,
      {},
      function (error, billingAgreement) {
        if (error) {
          console.log(error)
          throw error
        } else {
          console.log('Billing Agreement Execute Response')
          console.log(JSON.stringify(billingAgreement))
        }
      }
    ),
    2500
  )

  return res.status(200).send({
    status: true,
    data: { package },
    message: 'Package payment updated',
  })
}

const configureStripePayment = async (req, res) => {}

const configurePayPalPayment = async (req, res) => {
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
  let wallet = await CompanyWallet.findOne({ where: { companyId: company_id } })

  const plan = {
    name: package_name,
    description: `${package_name} Monthly Subscription`,
    type: 'fixed',
    payment_definitions: [
      {
        name: `${package_name} payment`,
        type: 'REGULAR',
        frequency: 'MONTH',
        frequency_interval: '1',
        amount: {
          currency: currency,
          value: amount, // Replace with your subscription amount
        },
        cycles: '12', // Number of billing cycles
      },
    ],
    merchant_preferences: {
      return_url: `${CLIENT_URL_MAIN}/success?mode=paypal'`,
      cancel_url: `${CLIENT_URL_MAIN}/cance?mode=paypal`,
      auto_bill_amount: 'YES',
      initial_fail_amount_action: 'CONTINUE',
      max_fail_attempts: '3',
    },
  }

  const createBillingPlan = util.promisify(paypal.billingPlan.create)
  const updateBillingPlan = util.promisify(paypal.billingPlan.update)
  const createBillingAgreement = util.promisify(paypal.billingAgreement.create)

  const createSubscriptionPlan = async (plan) => {
    try {
      const billingPlan = await createBillingPlan(plan)
      console.log('Subscription plan created successfully')
      console.log('Plan ID:', billingPlan.id)
      wallet.paypal_plan_id = billingPlan.id
      wallet.paypal_plan = billingPlan
      await wallet.save()
    } catch (error) {
      console.error('Error creating subscription plan:', error.response)
    }
  }

  const activateSubscriptionPlan = async (paypal_plan_id) => {
    const updatePlan = [
      {
        op: 'replace',
        path: '/',
        value: {
          state: 'ACTIVE',
        },
      },
    ]

    try {
      const response = await updateBillingPlan(paypal_plan_id, updatePlan)
      console.log('Subscription plan activated successfully')
      wallet.paypal_plan = response
      await wallet.save()
    } catch (error) {
      console.error('Error activating subscription plan:', error.response)
    }
  }

  const createSubscriptionAgreement = async () => {
    const isoDate = new Date()
    isoDate.setSeconds(isoDate.getSeconds() + 10)
    isoDate.toISOString().slice(0, 19) + 'Z'

    const agreement = {
      name: package_name,
      description: `${package_name} Monthly Subscription`,
      start_date: isoDate,
      payer: {
        payment_method: 'paypal',
      },
      plan: {
        id: wallet.paypal_plan_id,
      },
    }

    try {
      const billingAgreement = await createBillingAgreement(
        JSON.stringify(agreement)
      )
      console.log('Agreement ID:', billingAgreement.id)
      wallet.paypal_links = billingAgreement.links
      await wallet.save()
    } catch (error) {
      console.error('Error creating subscription agreement:', error.response)
    }
  }

  const plan_id = await createSubscriptionPlan(plan)
  console.log('Subscription Created', plan_id)
  // if (!wallet.paypal_plan_id) {}

  wallet = await CompanyWallet.findOne({ where: { companyId: company_id } })
  console.log(wallet)

  const plan_aggrrement = await activateSubscriptionPlan(plan_id)
  // if (wallet.paypal_plan_id && wallet.paypal_plan?.state != 'ACTIVE') {
  // }

  console.log('Subscription Note', plan_aggrrement)
  // if (!wallet.paypal_links) {
  // }
  const sub = await createSubscriptionAgreement()
  console.log(sub)

  wallet = await CompanyWallet.findOne({ where: { companyId: company_id } })

  return res.status(200).send({
    status: true,
    data: { wallet },
    message: 'Paypal Wallet updated',
  })
}

const initPaypalPackagePayment = async (req, res) => {
  const { admin_id, company_id } = req.company

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).send({
      status: false,
      errors: errors.array(),
    })
  }

  const wallet = await CompanyWallet.findOne({
    where: { companyId: company_id },
  })
  const admin = await Admin.findOne({ where: { id: admin_id } })
  const { amount, currency, package_name, interactions, vat } = req.body

  let tokenHref = wallet.paypal_links[0]?.href
  let paymentToken = tokenHref.split('token=')[1]
  console.log(paymentToken)

  let payload = {
    companyId: company_id,
    package_name,
    payment_method: 'paypal',
    currency,
    amount,
    interactions,
    vat,
    status: 0,
    txn_id: paymentToken, //response?.id,
    // details: response.clientSecret
  }

  const package = await PackagePayment.create(payload)
  await sleep(
    paypal.billingAgreement.execute(
      paymentToken,
      {},
      function (error, billingAgreement) {
        if (error) {
          console.log(error)
          throw error
        } else {
          console.log('Billing Agreement Execute Response')
          console.log(JSON.stringify(billingAgreement))
        }
      }
    ),
    2500
  )

  return res.status(200).send({
    status: true,
    data: { package },
    message: 'Package payment updated',
  })
}

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

module.exports = {
  walletDetails,
  paymentWalletValidation,
  updatePaymentWallet,
  // Coinpayment
  packagePaymentValidation,
  coinpaymentPackagePayment,
  coinpaymentPackageInfo,
  // Stripe
  initStripePackagePayment,
  // Paypal
  initPaypalPackagePayment,
  configurePayPalPayment,
}
