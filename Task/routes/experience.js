const express = require('express')
const router = express.Router()
const { authJwt } = require('../middleware')
const ExperiencePointController = require('../controllers/ExperiencePointsController')

router.post(
  '/points',
  [authJwt.verifyToken],
  ExperiencePointController.addExperiencePoints
)

router.get(
  '/points',
  [authJwt.verifyToken],
  ExperiencePointController.getExperiencePoints
)

router.patch(
  '/points',
  [authJwt.verifyToken],
  ExperiencePointController.updateExperiencePoints
)

// Use this to add batch calculated points for users - Admin
router.get(
  '/update/all-users/points',
  [authJwt.verifyAdminToken],
  ExperiencePointController.updateBatchUsersExperiencePoints
)

module.exports = router
