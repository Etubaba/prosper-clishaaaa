const express = require('express')
require('dotenv').config()

const app = express()
const cors = require('cors')
const COMMERCE_PORT = process.env.COMMERCE_PORT

const { verifyGateway } = require('./utils/hash')
const { monthlyVendoScheduler } = require('./middleware/scheduler')

// const { initializeRedis } = require("./services/redis");

app.use(cors())
// parse requests of content-type - application/json
app.use(express.json())
// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }))

// Company
app.use('/company', verifyGateway, require('./routes'))

// User
app.use('/wallet', verifyGateway, require('./routes/wallet'))

// Super Admin
app.use('/clisha', verifyGateway, require('./routes/transaction'))

app.get('/health-check', verifyGateway, (req, res) => {
  return res
    .status(200)
    .send({ status: true, message: 'PAYMENT SERVER RUNNING' })
})

app.use('*', verifyGateway, (req, res) => {
  return res.status(404).send({ status: false, message: 'Page not found. 404' })
})

app.listen(COMMERCE_PORT, () => {
  console.log('Payment server listening on this port ', COMMERCE_PORT)
  // Run  Cron Schedular
  monthlyVendoScheduler()
})

// initializeRedis();
