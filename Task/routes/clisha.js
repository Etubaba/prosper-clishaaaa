const express = require('express')
const router = express.Router()
const { verifyAuth, authJwt } = require('../middleware')
const ClishaTaskController = require('../controllers/ClishaTaskController')
const UserTaskController = require('../controllers/UserTaskController')

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin Information
 */

// router.get("/ranking",
//     // [authJwt.verifyToken],
//     ClishaTaskController.ranking
// );

router.get('/task/:id', ClishaTaskController.getExtensionTaskDetails)

router.get('/tokens', [authJwt.verifyToken], ClishaTaskController.tokenList)

router.get(
  '/top-ten/users',
  [authJwt.verifyToken],
  ClishaTaskController.getDailyTopTenUsers
)

router.get(
  '/latest-top/users',
  [authJwt.verifyToken],
  ClishaTaskController.getLatestTopUsers
)

router.get(
  '/top/tokens',
  [authJwt.verifyToken],
  ClishaTaskController.getDailyTopTokens
)

router.get('/extension/version', (req, res) => {
  return res.status(200).send({
    status: true,
    version: '1.0.3',
    message: 'Plugin Current version',
  })
})

module.exports = router
