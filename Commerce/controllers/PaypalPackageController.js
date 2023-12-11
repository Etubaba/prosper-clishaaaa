const paypal = require('../config/paypal')
const util = require('util')
const db = require('../models')
const { check, validationResult } = require('express-validator')
const moment = require('moment')
const { CLIENT_URL_MAIN } = require('../config/url')

const Admin = db.models.Admin
const CompanyWallet = db.models.CompanyWallet
const PackagePayment = db.models.PackagePayment

const activatePayPalPackage = async (req, res) => {
  const { admin_id, company_id } = req.company

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).send({
      status: false,
      errors: errors.array(),
    })
  }

  const admin = await Admin.findOne({ where: { id: admin_id } })
  let wallet = await CompanyWallet.findOne({ where: { companyId: company_id } })
  const { amount, currency, package_name, interactions, vat } = req.body

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

  const updatePlan = [
    {
      op: 'replace',
      path: '/',
      value: {
        state: 'ACTIVE',
      },
    },
  ]

  // Create Billing Plan if it does not exist
  if (!wallet.paypal_plan_id) {
    paypal.billingPlan.create(plan, async (error, billingPlan) => {
      if (error) {
        console.error('Error creating subscription plan:', error.response)
      } else {
        wallet.paypal_plan_id = billingPlan.id
        wallet.paypal_plan = billingPlan
        await wallet.save()
        paypal.billingPlan.update(
          billingPlan.id,
          updatePlan,
          async (error, response) => {
            if (!error) {
              console.error('Plan Updated', response)
              const payplan_plan = { ...wallet.paypal_plan, state: 'ACTIVE' }
              wallet.paypal_plan = payplan_plan
              await wallet.save()

              return res.status(200).send({
                status: true,
                data: { wallet },
                message: 'Paypal package activated successfully.',
              })
            }
          }
        )
      }
    })
  }

  // Activate Billing Plan
  else if (wallet.paypal_plan_id && wallet.paypal_plan?.state != 'ACTIVE') {
    wallet = await CompanyWallet.findOne({ where: { companyId: company_id } })
    paypal.billingPlan.update(
      wallet.paypal_plan_id,
      updatePlan,
      async (error, response) => {
        if (!error) {
          const payplan_plan = { ...wallet.paypal_plan, state: 'ACTIVE' }
          wallet.paypal_plan = payplan_plan
          await wallet.save()

          return res.status(200).send({
            status: true,
            data: { wallet },
            message: 'Paypal package activated successfully.',
          })
        }
      }
    )
  }

  // Package already active
  else {
    return res.status(200).send({
      status: true,
      data: { wallet },
      message: 'Paypal Package detail',
    })
  }
}

const initPaypalAggrement = async (req, res) => {
  const { admin_id, company_id } = req.company

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).send({
      status: false,
      errors: errors.array(),
    })
  }

  const admin = await Admin.findOne({ where: { id: admin_id } })
  let wallet = await CompanyWallet.findOne({ where: { companyId: company_id } })
  const { amount, currency, package_name, interactions, vat } = req.body

  if (!wallet.paypal_links) {
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

    paypal.billingAgreement.create(
      JSON.stringify(agreement),
      async (error, billingAgreement) => {
        if (error) {
          return res.status(400).send({
            status: false,
            message: error.response,
          })
        } else {
          wallet.paypal_links = billingAgreement.links
          await wallet.save()

          console.log('Subscription Agreement ID:', billingAgreement)
          // Redirect the user to the approval URL
          let tokenHref = billingAgreement.links[0]?.href
          let paymentToken = tokenHref.split('token=')[1]

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

          return res.status(200).send({
            status: true,
            data: { wallet, package },
            message: 'Paypal Wallet updated',
          })
        }
      }
    )
  } else {
    return res.status(400).send({
      status: true,
      data: { wallet },
      message: 'Paypal plan',
    })
  }
}

const startPaypalPackageRecurring = async (req, res) => {
  const { admin_id, company_id } = req.company

  const token = req.query.token
  const package = await PackagePayment.findOne({ where: { txn_id: token } })
  const wallet = await CompanyWallet.findOne({
    where: { companyId: company_id },
  })
  const admin = await Admin.findOne({ where: { id: admin_id } })

  paypal.billingAgreement.execute(
    token,
    {},
    function (error, billingAgreement) {
      if (error) {
        return res.status(400).send({
          status: false,
          data: { package },
          message: error.response,
        })
      } else {
        console.log('Billing Agreement Execute Response')
        console.log(JSON.stringify(billingAgreement))

        if (package.status === 0) {
          wallet.balance += package.interactions
          wallet.save()

          package.status = 1
          package.save()
        }

        return res.status(200).send({
          status: true,
          data: { package, wallet },
          message: 'Package payment updated',
        })
      }
    }
  )
}

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

module.exports = {
  activatePayPalPackage,
  initPaypalAggrement,
  startPaypalPackageRecurring,
}
