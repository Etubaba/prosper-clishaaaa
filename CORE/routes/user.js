const express = require('express')
const router = express.Router()
const UsersController = require('../controllers/users/UsersController')
const { authJwt } = require('../middleware')

router.get('/profile', [authJwt.verifyToken], UsersController.profile)

router.get('/teams', [authJwt.verifyToken], UsersController.teams)

router.get(
  '/notifications',
  [authJwt.verifyToken],
  UsersController.notifications
)

router.get(
  '/messages',
  [authJwt.verifyToken],
  UsersController.clishaBoardMessages
)

router.post(
  '/messages/:id',
  [authJwt.verifyToken],
  UsersController.activateBoardMessage
)

router.post(
  '/profile',
  [authJwt.verifyToken, UsersController.profile_update_validator()],
  UsersController.profile_update
)

router.post(
  '/profile/photo',
  [authJwt.verifyToken],
  UsersController.profile_photo
)

router.post(
  '/account/update/username',
  [authJwt.verifyToken, UsersController.usernameValidator()],
  UsersController.updateUsername
)

router.post(
  '/account/update/password',
  [authJwt.verifyToken, UsersController.passwordValidator()],
  UsersController.updatePassword
)

router.get(
  '/vendo/package-info',
  [authJwt.verifyToken],
  UsersController.getUserVendoPackage
)

module.exports = router
