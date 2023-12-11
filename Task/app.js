const express = require('express')
require('dotenv').config()

const app = express()
const cors = require('cors')
const helmet = require('helmet')
const { verifyGateway } = require('./utils/hash')
const {
  newDayClishaScheduler,
  closingDayClishaScheduler,
} = require('./middleware/scheduler')
const { initializeRedis } = require('./services/redis')
const TASK_PORT = process.env.TASK_PORT

app.use(helmet())

app.use(cors())
// parse requests of content-type - application/json
app.use(express.json())
// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }))

// Admin Related Route
app.use('/', verifyGateway, require('./routes'))
app.use('/vendo', verifyGateway, require('./routes/vendo'))
app.use('/clisha', verifyGateway, require('./routes/clisha'))
app.use('/experience', verifyGateway, require('./routes/experience'))

app.get('/health-check', verifyGateway, (req, res) => {
  return res.status(200).send({ status: true, message: 'TASK SERVER RUNNING' })
})

app.use('*', verifyGateway, (req, res) => {
  return res
    .status(404)
    .send({ status: false, message: `Page not found. 404. ${req.url}` })
})

app.listen(TASK_PORT, async () => {
  console.log('TASK SERVER listening on this port ', TASK_PORT)
  // Run Schedule
  newDayClishaScheduler()
  closingDayClishaScheduler()
})

initializeRedis()
