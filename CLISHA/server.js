const express = require('express')
require('dotenv').config()

const app = express()
const cors = require('cors')
// const gateway = require("fast-gateway");
const morgan = require('morgan')
const {
  createProxyMiddleware,
  fixRequestBody,
} = require('http-proxy-middleware')

// parse Cross site origin
app.use(cors())
// parse requests of content-type - application/json
app.use(express.json())
// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }))

const APP_URL = process.env.APP_URL
const DOCKER_URL = `http://${'host.docker.internal'}`
const CLISHA_PORT = process.env.CLISHA_PORT

console.log(`${DOCKER_URL}:${8004}`, APP_URL);

const CoreServerAuth = async (req, res, next) => {
  const token = process.env.CORE_KEY
  req.headers['gateway-auth'] = token
  next()
}

const AdminServerAuth = async (req, res, next) => {
  const token = process.env.ADMIN_KEY
  req.headers['gateway-auth'] = token
  next()
}

const TaskServerAuth = async (req, res, next) => {
  const token = process.env.TASK_KEY
  req.headers['gateway-auth'] = token
  next()
}

const CommerceServerAuth = async (req, res, next) => {
  const token = process.env.COMMERCE_KEY
  req.headers['gateway-auth'] = token
  next()
}

const CompanyServerAuth = async (req, res, next) => {
  const token = process.env.COMPANY_KEY
  req.headers['gateway-auth'] = token
  next()
}

app.use(
  '/api',
  CoreServerAuth,
  createProxyMiddleware({
    target: `${DOCKER_URL}:${8001}`,
    changeOrigin: true,
    pathRewrite: {
      '^/api': '',
    },
    onProxyReq: fixRequestBody,
  })
)

app.use(
  '/admin',
  AdminServerAuth,
  createProxyMiddleware({
    target: `${DOCKER_URL}:${8002}`,
    changeOrigin: true,
    pathRewrite: {
      '^/admin': '',
    },
    onProxyReq: fixRequestBody,
  })
)

app.use(
  '/task',
  TaskServerAuth,
  createProxyMiddleware({
    target: `${DOCKER_URL}:${8003}`,
    changeOrigin: true,
    pathRewrite: {
      '^/task': '',
    },
    onProxyReq: fixRequestBody,
  })
)


app.use(
  '/commerce',
  CommerceServerAuth,
  createProxyMiddleware({
    target: `${DOCKER_URL}:${8004}`,
    changeOrigin: true,
    pathRewrite: {
      '^/commerce': '',
    },
    onProxyReq: fixRequestBody,
  })
)


app.use(
  '/company',
  CompanyServerAuth,
  createProxyMiddleware({
    target: `${DOCKER_URL}:${8005}`,
    changeOrigin: true,
    pathRewrite: {
      '/company': '',
    },
    onProxyReq: fixRequestBody,
  })
)


app.get('/health-check', (req, res) => {
  return res
    .status(200)
    .send({ status: true, message: 'Gateway server active... listening...' })
})

app.listen(CLISHA_PORT, () => {
  console.log('CLISHA GATEWAY SERVER STARTED ON PORT ', CLISHA_PORT)
})

// Initialize APP Gateway
// const server = gateway({
//   routes: [
//     {
//       prefix: "/api",
//       target: `${APP_URL}:${CORE_PORT}`,
//       middlewares: [CoreServerAuth],
//       // methods: ['*'],
//       hooks: {},
//     },
//     {
//       prefix: "/task",
//       target: `${APP_URL}:${TASK_PORT}`,
//       middlewares: [TaskServerAuth],
//       // methods: ['*']
//     },
//     {
//       prefix: "/admin",
//       target: `${APP_URL}:${ADMIN_PORT}`,
//       middlewares: [AdminServerAuth],
//       // methods: ['*']
//     },
//     {
//       prefix: "/commerce",
//       target: `${APP_URL}:${COMMERCE_PORT}`,
//       middlewares: [CommerceServerAuth],
//       // methods: ['*']
//     },
//   ],
// });

// const APP_URL = process.env.APP_URL;
// const CORE_PORT = process.env.CORE_PORT;
// const ADMIN_PORT = process.env.ADMIN_PORT;
// const TASK_PORT = process.env.TASK_PORT;
// const COMMERCE_PORT = process.env.COMMERCE_PORT;
