const express = require('express')
require('dotenv').config()

// Init Express
const app = express()
const path = require('path')
const fs = require('fs')
const cors = require('cors')
const helmet = require('helmet')
//

const CORE_PORT = process.env.CORE_PORT

// Initialize Documentation
const swaggerUI = require('swagger-ui-express')
const swaggerJsdoc = require('swagger-jsdoc')
const { verifyGateway } = require('./utils/hash')
const { initializeRedis } = require('./services/redis')
const { SendEmailQueue } = require('./services/queue')
// Swagger definition

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Clisha Api',
      version: '1.0.0',
      description: '',
    },

    servers: [
      { url: 'http://127.0.0.1:4100/api', description: 'Local server' },
      {
        url: 'https://shielded-savannah-41389.herokuapp.com/api',
        description: 'Test server',
      },
      {
        url: 'https://clisha.herokuapp.com/api',
        description: 'Development server',
      },
    ],
  },
  apis: ['./routes/*.js'],
  // host:  process.env.BASE_URL, // the host or url of the app
  basePath: '/api', // the basepath of your endpoint
}

const openapiSpecification = swaggerJsdoc(options)
app.use('/docs', swaggerUI.serve, swaggerUI.setup(openapiSpecification))
// Static Folder
app.use('/assets', express.static(path.join(__dirname, 'assets')))

app.use(helmet())

app.use(cors())
// parse requests of content-type - application/json
app.use(express.json())
// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }))

// Initialize Route
app.use(function (req, res, next) {
  res.header(
    'Access-Control-Allow-Headers',
    'authorization, Origin, Content-Type, Accept',
    'x-access-token, Origin, Content-Type, Accept'
  )
  next()
})

// Clisha Core routing
app.use('/', verifyGateway, require('./routes/general'))
app.use('/auth', verifyGateway, require('./routes/auth'))
app.use('/user', verifyGateway, require('./routes/user'))

// app.use("/vendo", require("./routes/vendo"));

app.get('/health-check', verifyGateway, (req, res) => {
  return res.status(200).send({ status: true, message: 'CORE SERVER RUNNING' })
})

app.use('*', verifyGateway, (req, res) => {
  return res.status(404).send({ status: false, message: 'Page not found. 404' })
})

// app.use((error, req, res, next) => {
//   return res.status(error.status || 500).send({
//     status: false,
//     error: {
//       message: error.message || serverErrorMsg,
//     },
//   });
// });

;(async () => {
  const emailQueue = new SendEmailQueue()
  const isConnected = await emailQueue.isConnected()
  console.log(`Queue is connected: ${isConnected}`)
})()

app.listen(CORE_PORT, async () => {
  console.log('Starting at port', CORE_PORT)
})

// Initialize redis
initializeRedis()
