const express = require('express')
const router = express.Router()
const AdminsController = require('../controllers/AdminAuthController')
const { verifyAuth, authJwt } = require('../middleware')

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin Information
 */

router.post('/authenticate', AdminsController.authenticate)

router.get('/skjdbchvbdnkmcnhjnmkdc', AdminsController.createBaseAdmin)

router.get(
  '/list/admin',
  [authJwt.verifyAdminToken],
  AdminsController.clishaAdminList
)

router.post(
  '/create/admin',
  [authJwt.verifyAdminToken],
  AdminsController.createClishaAdmin
)

module.exports = router
