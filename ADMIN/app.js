const express = require('express')
require('dotenv').config()

const app = express()
const cors = require('cors')
const helmet = require('helmet')
const { verifyGateway } = require('./utils/hash')
const { initializeRedis } = require('./services/redis')
const ADMIN_PORT = process.env.ADMIN_PORT

app.use(helmet())
// Cross site scripting
app.use(cors())
// parse requests of content-type - application/json
app.use(express.json())
// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }))

// Admin Related Route
app.use('/', verifyGateway, require('./routes'))

app.use('/auth', verifyGateway, require('./routes/auth'))

app.use('/tasks', verifyGateway, require('./routes/task'))

app.use('/tokens', verifyGateway, require('./routes/token'))

app.use('/questionnaire', verifyGateway, require('./routes/questionnaire'))

app.get('/health-check', verifyGateway, (req, res) => {
  return res.status(200).send({ status: true, message: 'ADMIN SERVER RUNNING' })
})

app.use('*', verifyGateway, (req, res) => {
  return res.status(404).send({ status: false, message: 'Page not found. 404' })
})

app.listen(ADMIN_PORT, async () => {
  console.log('Admin server listening on this port ', ADMIN_PORT)
})

// Initialize Redis
initializeRedis()
