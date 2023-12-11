
const Stripe = require('stripe')

const options = {
  key: process.env.STRIPE_KEY,
  secret: process.env.STRIPE_SECRET,
}

module.exports =  Stripe(process.env.STRIPE_SECRET)
