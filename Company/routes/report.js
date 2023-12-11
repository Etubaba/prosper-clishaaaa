const express = require('express')
const router = express.Router()
const ReportController = require('../controllers/ReportController')
const { verifyAuth, authJwt } = require('../middleware')

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin Information
 */

router.get(
  '/overview',
  [authJwt.verifyCompanyToken],
  authJwt.wrapAsync(ReportController.companyReportOverview)
)

router.get(
  '/summary',
  [authJwt.verifyCompanyToken],
  authJwt.wrapAsync(ReportController.companyTaskSummary)
)

router.get(
  '/summary/:id',
  [authJwt.verifyCompanyToken],
  authJwt.wrapAsync(ReportController.taskSummary)
)

module.exports = router
