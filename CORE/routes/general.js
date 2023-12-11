const express = require('express')
const router = express.Router()
const GeneralController = require('../controllers/users/GeneralController')
const VendoController = require('../controllers/users/VendoConnectionController')
const { authJwt } = require('../middleware')

router.get('/', (req, res) => {
  res.status(200).send({
    status: true,
    message:
      "V1  If you're not sure you know what you are doing, you probably shouldn't be using this API.",
  })
})

/**
 * @swagger
 * tags:
 *   name: User
 *   description: User Information
 */

/**
 *  @swagger
 *  /ranking:
 *     get:
 *       summary: Clisha Ranking
 *       tags: [User]
 *       security:
 *          - bearerAuth: []
 *       responses:
 *         200:
 *           description: Clisha Ranking
 *           content:
 *             application/json:
 *               schema:
 *                 properties:
 *                    user:
 *                      $ref: '#/components/schemas/User'
 *                    total_points:
 *                      type: integer
 *                      example: 29
 *         401:
 *           description: No token provided!
 *         403:
 *           description: Unauthorized
 *         500:
 *           description: Server error
 */
router.get(
  '/ranking',
  // [authJwt.verifyToken],
  GeneralController.ranking
)

router.post(
  '/contact',
  [authJwt.verifyToken, GeneralController.contactValidator()],
  GeneralController.contactClisha
)

//Vendo
router.get('/gen-id', VendoController.generateClishaID)

router.post(
  '/vendo/connection',
  [VendoController.connectionValidator()],
  VendoController.vendoConnectionCheck
)

router.get('/vendo/connect/account', VendoController.connectVendorAccount)

router.get('/extension/version', (req, res) => {
  return res.status(200).send({
    status: true,
    version: '1.0.3',
    message: 'Plugin Current version',
  })
})

module.exports = router
