const express = require('express')
const router = express.Router()
const CompanyTask = require('../controllers/CompanyTaskController')
const { authJwt } = require('../middleware')

router.get('/', [authJwt.verifyCompanyToken], CompanyTask.companyTaskList)

router.get('/calendar', [authJwt.verifyCompanyToken], CompanyTask.calenderTask)

router.get(
  '/calendar/all',
  [authJwt.verifyCompanyToken],
  CompanyTask.allUserCalenderTask
)

router.post(
  '/',
  [authJwt.verifyCompanyToken, CompanyTask.createTaskValidator()],
  authJwt.wrapAsync(CompanyTask.createCompanyTask)
)

router.post(
  '/campaign',
  [(authJwt.verifyCompanyToken, CompanyTask.createTaskValidator())],
  authJwt.wrapAsync(CompanyTask.createCampaignTask)
)

router.put(
  '/:id',
  [authJwt.verifyCompanyToken],
  authJwt.wrapAsync(CompanyTask.updateClishaTask)
)

router.delete(
  '/:taskId',
  [authJwt.verifyCompanyToken],
  authJwt.wrapAsync(CompanyTask.deleteTask)
)

// Special Case
// router.get(
//   '/update-start-at',
//   [authJwt.verifyCompanyToken],
//   CompanyTask.updateCompletedTasks
// )
module.exports = router
