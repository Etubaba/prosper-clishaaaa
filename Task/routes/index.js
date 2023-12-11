const express = require('express')
const router = express.Router()
const { verifyAuth, authJwt } = require('../middleware')
const ClishaTaskController = require('../controllers/ClishaTaskController')
const UserTaskController = require('../controllers/UserTaskController')

router.get(
  '/available/tasks',
  [authJwt.verifyToken],
  UserTaskController.getUserAvailableTask
)

router.get(
  '/calendar',
  [authJwt.verifyToken, UserTaskController.checkUserCalendarCache],
  UserTaskController.getTasksMonthlyCalendar
)

router.get(
  '/check/calendar',
  [authJwt.verifyToken],
  UserTaskController.getTasksMonthlyCalendar
)

router.get(
  '/calendar/reload',
  [authJwt.verifyToken, UserTaskController.reloadUserCalendar],
  UserTaskController.getTasksMonthlyCalendar
)

router.get(
  '/daily/tasks',
  [authJwt.verifyToken],
  UserTaskController.getDailyTask
)

router.post(
  '/complete/task',
  [authJwt.verifyToken, UserTaskController.completeTaskValidator()],
  UserTaskController.completeClishaTask
)

router.get(
  '/tokens/bonus',
  [authJwt.verifyToken],
  UserTaskController.getUserBonusPoints
)

router.get(
  '/tokens/distributed',
  [authJwt.verifyToken],
  ClishaTaskController.getUserTokenPoints
)

module.exports = router
