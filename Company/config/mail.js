'use strict'
const nodemailer = require('nodemailer')

// async..await is not allowed in global scope, must use a wrapper
module.exports = {
  host: process.env.BASE_URL,
  api: process.env.BASE_URL, //'https://shielded-savannah-41389.herokuapp.com',
  client: process.env.CLIENT_URL, //'https://clisha-stagging.netlify.app',
  vendo: process.env.VENDO_API,
  from: 'support@clisha.me',

  transport: () => {
    return nodemailer.createTransport({
      host: 'smtp.strato.de',
      pool: true,
      port: 587,
      auth: {
        user: 'k.wahab@expectoo.de',
        pass: '!TestExi7819',
      },
      tls: {
        rejectUnauthorized: false,
      },
    })
  },
}
