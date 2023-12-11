const express = require('express')
const router = express.Router()
const AdminsController = require('../controllers/AdminController')
const { authJwt } = require('../middleware')
const InteractionController = require('../controllers/InteractionController')
const MessageController = require('../controllers/MessageController')
const ReportController = require('../controllers/ReportController')

// Users
router.get(
  '/users',
  [authJwt.verifyAdminToken],
  AdminsController.clishaUsersList
)
router.get(
  '/users/team',
  [authJwt.verifyAdminToken],
  AdminsController.clishaUsersTeam
)
router.get(
  '/users/:id',
  [authJwt.verifyAdminToken],
  AdminsController.clishaUserInfo
)
router.patch(
  '/users/:id',
  [authJwt.verifyAdminToken],
  AdminsController.clishaUpdateUser
)

// Interactions
router.get(
  '/interactions',
  [authJwt.verifyAdminToken],
  InteractionController.interactionList
)
router.post(
  '/interactions',
  [
    authJwt.verifyAdminToken,
    InteractionController.createInteractionValidator(),
  ],
  InteractionController.createInteraction
)
router.put(
  '/interactions/:id',
  [
    authJwt.verifyAdminToken,
    InteractionController.createInteractionValidator(),
  ],
  InteractionController.updateInteraction
)

// Messages
router.get(
  '/messages',
  [authJwt.verifyAdminToken],
  MessageController.messageBoardList
)
router.post(
  '/messages',
  [authJwt.verifyAdminToken, MessageController.createMessageValidator()],
  MessageController.createMesssageBoard
)
router.put(
  '/messages/:id',
  [authJwt.verifyAdminToken],
  MessageController.updateMessageBoard
)
router.delete(
  '/messages/:id',
  [authJwt.verifyAdminToken],
  MessageController.deleteMessageBoard
)

// Report
router.get('/ranking', [authJwt.verifyAdminToken], ReportController.ranking)
router.get(
  '/report/overview',
  [authJwt.verifyAdminToken, ReportController.cacheReportOverview],
  ReportController.clishaReportOverview
)

router.get(
  '/daily/report',
  [authJwt.verifyAdminToken, ReportController.cacheDailyReport],
  ReportController.clishaDailyReport
)

module.exports = router
