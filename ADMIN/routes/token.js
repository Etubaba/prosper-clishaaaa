const express = require('express')
const router = express.Router()
const TokenController = require('../controllers/TokenController')
const { authJwt } = require('../middleware')

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin Information
 */

/**
 *  @swagger
 *  /admin/tasks:
 *     get:
 *       tags: [Admin]
 *       security:
 *          - bearerAuth: []
 * 
 *       responses:
 *         200:
 *           description: Tasks List
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/Task'
 *         401:
 *           description: No token provided!
 *         403:
 *           description: Unauthorized
 *         500:
 *           description: Server error
 */
router.get('/', [authJwt.verifyAdminToken], TokenController.tokenList)

/**
 *  @swagger
 *  /admin/tasks:
 *     post:
 *       summary: Create New Task
 *       tags: [Admin]
 *       security:
 *          - bearerAuth: []
 *       requestBody:
 *          required: true
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Task'
 *       responses:
 *         200:
 *           description: Completed Task has been registered
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/Task'
 *         400:
 *            description: Task alredy completed
 *         401:
 *           description: No token provided!
 *         403:
 *           description: Unauthorized
 *         500:
 *           description: Server error
 */
router.post(
  '/',
  [authJwt.verifyAdminToken, TokenController.createTokenValidator()],
  TokenController.createToken
)

router.post(
  '/photo/:id',
  [authJwt.verifyAdminToken],
  TokenController.updateTokenPhoto
)

router.post(
  '/icon/:id',
  [authJwt.verifyAdminToken],
  TokenController.updateTokenIcon
)

/**
 *  @swagger
 *  /admin/tasks/{id}:
 *     put:
 *       summary: Create New Task
 *       tags: [Admin]
 *       security:
 *          - bearerAuth: []
 *       requestBody:
 *          required: true
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Task'
 *       responses:
 *         200:
 *           description: Completed Task has been registered
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/Task'
 *         400:
 *            description: Task alredy completed
 *         401:
 *           description: No token provided!
 *         403:
 *           description: Unauthorized
 *         500:
 *           description: Server error
 */
router.put(
  '/:id',
  [authJwt.verifyAdminToken, TokenController.createTokenValidator()],
  TokenController.updateToken
)

module.exports = router
