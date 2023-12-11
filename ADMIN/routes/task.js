const express = require('express')
const router = express.Router()
const TaskController = require('../controllers/TaskController')
const { authJwt } = require('../middleware')

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin Information
 */

router.get('/', [authJwt.verifyAdminToken], TaskController.taskList)

router.post(
  '/',
  [authJwt.verifyAdminToken, TaskController.createTaskValidator()],
  TaskController.createTask
)

//
router.get(
  '/update-start-at',
  [authJwt.verifyAdminToken],
  TaskController.updateCompletedTasks
)

router.put('/:id', [authJwt.verifyAdminToken], TaskController.updateClishaTask)

router.delete('/:taskId', [authJwt.verifyAdminToken], TaskController.deleteTask)

module.exports = router
