const express = require('express')
require('dotenv').config()

const app = express()
const cors = require('cors')
const helmet = require('helmet')
const { verifyGateway } = require('./utils/hash')
// const { initializeRedis } = require('./services/redis')
const COMPANY_PORT = process.env.COMPANY_PORT

app.use(helmet())
// Cross site scripting
app.use(cors())
// parse requests of content-type - application/json
app.use(express.json())
// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }))

// Companay Related Route
app.use('/', require('./routes'))

app.use('/admin', require('./routes/auth'))

app.use('/tasks', verifyGateway, require('./routes/task'))

app.use('/report', verifyGateway, require('./routes/report'))

app.use('/interactions', verifyGateway, require('./routes/interaction'))

app.get('/health-check', (req, res) => {
  return res
    .status(200)
    .send({ status: true, message: 'COMPANY SERVER RUNNING' })
})

app.use('*', (req, res) => {
  return res.status(404).send({
    status: false,
    message: `Company Page not found. 404 at ${req.url}`,
  })
})

app.listen(COMPANY_PORT, async () => {
  console.log('Company server listening on this port ', COMPANY_PORT)
})

// Initialize Redis
// initializeRedis()
