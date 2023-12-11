const cron = require('node-cron')

const {
  openingDailyClishaRecord,
  closingDailyClishaRecord,
} = require('../services/cron')

const newDayClishaScheduler = () => {
  cron.schedule('0 0 * * *', async () => {
    console.log('Running start of day scheduler...')
    // createClishaRecord()
    // newDayClishaScheduler()
    await openingDailyClishaRecord()
  })
}

const closingDayClishaScheduler = () => {
  cron.schedule('59 23 * * *', async () => {
    console.log('Running close of day scheduler...')
    await closingDailyClishaRecord()
  })
}

module.exports = {
  newDayClishaScheduler,
  closingDayClishaScheduler,
}
