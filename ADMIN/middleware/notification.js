const db = require('../models')
const config = require('../config/auth')
const mailing = require('../config/mail')
const { v4: uuidv4 } = require('uuid')
const ejs = require('ejs')
const path = require('path')

const VerificationToken = db.models.VerificationToken

const sendEmailVerification = async (user) => {
  let expiredAt = new Date()
  expiredAt.setSeconds(expiredAt.getSeconds() + config.tokenExpiration)

  let _token = uuidv4()
  let verificationToken = await VerificationToken.create({
    token: _token,
    UserId: user.id,
    verifier: 'register',
    expiryDate: expiredAt.getTime(),
  })

  let data = {
    title: 'Verify Your Email Address',
    username: user.username,
    email: user.email,
    confirm_link: `${mailing.host}/auth/confirm/${verificationToken.token}`,
  }

  let html = await ejs.renderFile(
    path.resolve() + '/views/emails/welcome_email.ejs',
    data
  )

  return mailing.transport().sendMail({
    from: mailing.from,
    to: user.email,
    subject: 'Please confirm your account',
    html: html,
  })
  // html: `<h1>Email Confirmation</h1>
  //         <h2>Hello ${user.username}</h2>
  //         <p>Thank you for registering. Please confirm your email by clicking on the following link</p>
  //         <a href=${mailing.host}auth/confirm/${verificationToken.token}> Click here</a>
  //     </div>`,
  // .catch(err => { console.log(err); throw err; } );
}

const sendPasswordResetMail = async (user) => {
  let expiredAt = new Date()
  expiredAt.setSeconds(expiredAt.getSeconds() + config.tokenExpiration)

  let _token = uuidv4()
  let verificationToken = await VerificationToken.create({
    token: _token,
    UserId: user.id,
    verifier: 'reset',
    expiryDate: expiredAt.getTime(),
  })

  let data = {
    title: 'Reset Password Notification',
    username: user.username,
    email: user.email,
    confirm_link: `${mailing.client}/new-password?token=${verificationToken.token}&email=${user.email}`,
  }

  let html = await ejs.renderFile(
    path.resolve() + '/views/emails/reset.ejs',
    data
  )

  // console.log(html);

  return mailing.transport().sendMail({
    from: mailing.from,
    to: user.email,
    subject: 'Password Reset',
    html: html,
  })
  // .catch((error, info) => {
  //   // console.log('Error',error);// throw error;
  //   let status = (error) ? false : true;
  //   let data = { status, error, info };
  //   return data;
  //   // if (error) {
  //   //   return res.json({ status: false, message: 'Error Occured', error: error });
  //   // } else {
  //   //   return res.json({ status: false, message: "Email Sent" });
  //   // }
  // });
}

const sendVendorVerification = async (user, vendo_email) => {
  let expiredAt = new Date()
  expiredAt.setSeconds(expiredAt.getSeconds() + config.connectionExpiration)

  let _token = uuidv4()
  let verificationToken = await VerificationToken.create({
    token: _token,
    UserId: user.id,
    verifier: 'connection',
    expiryDate: expiredAt.getTime(),
  })

  let data = {
    title: 'Verify Vendo Access',
    username: user.username,
    email: user.email,
    vendo_email: vendo_email,
    confirm_link: `https://server.clisha.me/api/vendo/connect/account?email=${vendo_email}&token=${verificationToken.token}`,
  }

  let html = await ejs.renderFile(
    path.resolve() + '/views/emails/vendor_access_email.ejs',
    data
  )

  return mailing.transport().sendMail({
    from: mailing.from,
    to: user.email,
    subject: 'Clisha - Vendo Connection',
    html: html,
  })
  // .catch(err => { console.log(err); throw err; } );
}

const sendClishaFeedback = async (email, subject, message) => {
  let data = {
    title: 'Clisha Feedback',
    email,
    subject,
    message,
  }

  let html = await ejs.renderFile(
    path.resolve() + '/views/emails/clisha_feedback.ejs',
    data
  )

  return mailing.transport().sendMail({
    from: mailing.from,
    to: 'support@clisha.io',
    subject: subject,
    html: html,
  })
  // .catch(err => { console.log(err); throw err; } );
}

module.exports = {
  sendEmailVerification,
  sendPasswordResetMail,
  sendVendorVerification,
  sendClishaFeedback,
}
