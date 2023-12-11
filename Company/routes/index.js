const express = require('express')
const router = express.Router()
const CompanyController = require('../controllers/CompanyController')
const { authJwt } = require('../middleware')

router.get(
  '/',
  [authJwt.verifyCompanyToken],
  authJwt.wrapAsync(CompanyController.profile)
)
router.get('/admin/all', CompanyController.allAdminManagers)

router.post(
  '/create/manager',
  CompanyController.validateCreateClishaManager(),
  CompanyController.createClishaManagers
)

router.post(
  '/invite/admin',
  CompanyController.inviteAdminValidator(),
  CompanyController.inviteAdmin
)

router.get('/invite/verify', CompanyController.verifyAdminFromInvite)

router.get('/assign/admin', CompanyController.assignAdmin)

router.put(
  '/',
  [authJwt.verifyCompanyToken],
  authJwt.wrapAsync(CompanyController.updateCompany)
)

router.put(
  '/admin',
  [authJwt.verifyCompanyToken],
  authJwt.wrapAsync(CompanyController.updateCompanyAdmin)
)

router.post(
  '/photo',
  [authJwt.verifyCompanyToken],
  authJwt.wrapAsync(CompanyController.updateCompanyPhoto)
)

router.post(
  '/icon',
  [authJwt.verifyCompanyToken],
  authJwt.wrapAsync(CompanyController.updateCompanyIcon)
)

module.exports = router
