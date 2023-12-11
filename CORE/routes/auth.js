const express = require('express')
const router = express.Router()
const AuthController = require('../controllers/users/AuthController')
const NotifierController = require('../controllers/users/NotifierController')
const { verifyAuth } = require('../middleware')

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authenticating User on the platform
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Auth:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *         - confirmPassword
 *       properties:
 *         username:
 *           type: string
 *           description: Unique username
 *         email:
 *             type: string
 *         password:
 *             type: string
 *         confirmPassword:
 *             type: string
 *       example:
 *         username: dewdney
 *         email: a.dewdney@gmail.com
 *         password: !dewdney@
 *         confirmPassword:
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Login:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *             type: string
 *         password:
 *             type: String
 *       example:
 *         email: a.dewdney@gmail.com
 *         password: !Dewdney
 */

/**
 *  @swagger
 * /auth/check/duplicate:
 *   get:
 *     summary: Check if username or email exist
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *       - in: query
 *         name: username
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *               schema:
 *                 $ref: '#/components/schemas/Login'
 */

router.get('/check/duplicate', AuthController.checkDuplicate)

// router.get("/vendo/registeration", AuthController.vendorRegisterartion);

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Auth'
 *     responses:
 *       200:
 *         description: Registeration Completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Auth'
 *       500:
 *         description: Server error
 */
router.post(
  '/register',
  [AuthController.registerValidator()],
  AuthController.register
)

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login User
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Login'
 *     responses:
 *       200:
 *         description: User Login Succesfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Auth'
 *       500:
 *         description: Server error
 */
router.post('/login', [AuthController.loginValidator()], AuthController.login)

/**
 * @swagger
 * /auth/refreshtoken:
 *   post:
 *     summary: Refresh User Token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *              properties:
 *                requestToken:
 *                  type: string
 *
 *     responses:
 *       200:
 *         description: Refresh Token generated succesfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Login'
 *       403:
 *         description: Refresh token has expired. Please make a new signin request
 *       500:
 *         description: Server error
 */
router.post('/refreshtoken', NotifierController.refreshToken)

/**
 * @swagger
 * /auth/resend:
 *   post:
 *     summary: Resend Email Verification
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *              properties:
 *                email:
 *                  type: string
 *
 *     responses:
 *       200:
 *         description: Verification Email Resent
 *         content:
 *           application/json:
 *             schema:
 *       400:
 *         description: User not fount
 *       500:
 *         description: Server error
 */
router.post(
  '/resend',
  [NotifierController.emailValidator()],
  NotifierController.resendVerification
)

/**
 * @swagger
 * /auth/confirm/{token}:
 *   get:
 *     summary: Confirm Email Verification
 *     tags: [Auth]
 *     parameters:
 *      - in: path
 *        name: token
 *        required: true
 *        schema:
 *          type: string
 *        description: The Email Verification token
 *     responses:
 *       200:
 *         description: Account has been succesfully verified
 *         content:
 *           application/json:
 *             schema:
 *       403:
 *         description: Verification token not available!
 *       500:
 *         description: Server error
 */
router.get('/confirm/:token', NotifierController.confirmVerification)

/**
 * @swagger
 * /auth/forgot/password:
 *   post:
 *     summary: Forgot Password
 *     tags: [Auth]
 *     parameters:
 *      - in: token
 *        name: token
 *        required: true
 *        schema:
 *          type: string
 *        description: The Password Reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *              properties:
 *                email:
 *                  type: string
 *
 *     responses:
 *       200:
 *         description: Password Reset link sent
 *         content:
 *           application/json:
 *             schema:
 *       400:
 *         description: User not fount
 *       500:
 *         description: Server error
 */
router.post(
  '/forgot/password',
  [NotifierController.emailValidator()],
  NotifierController.forgotPassword
)

/**
 * @swagger
 * /auth/password/reset/{token}:
 *   post:
 *     summary: Reset Password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *              properties:
 *                email:
 *                  type: string
 *                password:
 *                  type: string
 *                confirmPassword:
 *                  type: string
 *     responses:
 *       200:
 *         description: Password Reset succesfully
 *         content:
 *           application/json:
 *             schema:
 *       400:
 *         description: User not fount
 *       500:
 *         description: Server error
 */
router.post(
  '/password/reset/:token',
  [NotifierController.resetPasswordValidator()],
  NotifierController.resetPassword
)

module.exports = router
