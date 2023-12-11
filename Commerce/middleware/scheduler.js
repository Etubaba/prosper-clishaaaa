const cron = require('node-cron')

const { submitVendoVQs } = require('../services/cron')

const monthlyVendoScheduler = () => {
  cron.schedule('0 0 1 * *', async () => {
    console.log('Running monthly calendar scheduler...')
    await submitVendoVQs()
  })
}

module.exports = {
  monthlyVendoScheduler,
}
