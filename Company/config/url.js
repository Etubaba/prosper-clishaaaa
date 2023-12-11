require('dotenv').config()

const BASE_URL = process.env.EMAIL_BASE_URL
const CLIENT_URL_MAIN = process.env.CLIENT_URL_MAIN

module.exports = {
  BASE_URL,
  CLIENT_URL_MAIN,
}
