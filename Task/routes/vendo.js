const express = require('express')
const router = express.Router()
const { authJwt } = require('../middleware')
const VendoController = require('../controllers/VendoController')

router.get('/user/points', VendoController.getExperiencePoints)

router.get('/ranking/siblings', VendoController.getRankingSiblings)

router.get('/clisha/ranking', VendoController.getClishaRanking)

router.get('/clisha/kickback', VendoController.getVendoKickback)

router.get('/clear/vqs', VendoController.clearVendorPoints)

// // Use this to add batch calculated points for users - Admin
// router.get(
//   "/update/all-users/points",
//   [authJwt.verifyAdminToken],
//   VendoController.updateBatchUsersExperiencePoints
// );

module.exports = router
