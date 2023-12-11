const express = require('express')
const router = express.Router()
const CompanyAuthController = require('../controllers/CompanyAuthController')
const { verifyAuth, authJwt } = require('../middleware')

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin Information
 */

router.post(
  '/registeration',
  CompanyAuthController.registerCompanyValidator(),
  authJwt.wrapAsync(CompanyAuthController.createCompany)
)

router.post(
  '/login',
  CompanyAuthController.loginValidator(),
  authJwt.wrapAsync(CompanyAuthController.loginCompany)
)

router.get('/select/company', CompanyAuthController.subAdminSelectedCompany)

router.get('/verify/email', CompanyAuthController.verifyEmail)

router.post('/reset/password', CompanyAuthController.passwordResetInit)

router.post('/change/password', CompanyAuthController.changePassword)

router.post(
  '/resend/validation/email',
  authJwt.wrapAsync(CompanyAuthController.resendValidationEmail)
)

module.exports = router
