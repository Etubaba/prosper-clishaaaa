const nodemailer = require('nodemailer')

async function emailService(emailProps) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    secure: true,
    disableFileAccess: true,
    auth: {
      user: 'clishaservice@gmail.com', // generated ethereal user
      pass: 'kqsoqqdjadaagdbe', // generated ethereal password
    },
  })
  // const transporter = nodemailer.createTransport({
  //   host: 'smtp.strato.de',
  //     pool: true,
  //     port: 587,
  //     auth: {
  //       user: 'k.wahab@expectoo.de',
  //       pass: '!TestExi7819',
  //     },
  //     tls: {
  //       rejectUnauthorized: false,
  //     },
  // })

  transporter.verify(function (error, success) {
    if (error) {
      console.log(error.message)
    } else {
      console.log('Email connected')
    }
    if (success) {
      console.log(success)
    }
  })

  const { email, html, text, subject } = emailProps

  await transporter.sendMail({
    from: 'service@clisha.click',
    to: email,
    subject: subject,
    html: html, // html body
    text: text, // plain text body
  })
}

module.exports = { emailService }
