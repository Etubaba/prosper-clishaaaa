const express = require('express')
const router = express.Router()
const { authJwt } = require('../middleware')
const VendoController = require('../controllers/users/VendoController')


router.get('/user/points', 
  VendoController.getExperiencePoints
)

router.get('/user/task', 
  VendoController.getUserClishaTask
)

router.get('/ranking/siblings', 
  VendoController.getRankingSiblings
)

router.get('/clisha/ranking', 
  VendoController.getClishaRanking
)



module.exports = router

// // Use this to add batch calculated points for users - Admin
// router.get(
//   "/update/all-users/points",
//   [authJwt.verifyAdminToken],
//   VendoController.updateBatchUsersExperiencePoints
// );
// router.post(
//   '/connection',
//   [VendoController.connectionValidator()],
//   VendoController.vendoConnectionCheck
// )

// router.get('/connect/account', VendoController.connectVendoraccount)


