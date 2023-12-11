const express = require('express')
const router = express.Router()
const InteractionController = require('../controllers/InteractionController')
const { authJwt } = require('../middleware')

// Interactions
router.get(
  '/',
  [authJwt.verifyCompanyToken],
  authJwt.wrapAsync(InteractionController.interactionList)
)

router.post(
  '/',
  [
    authJwt.verifyCompanyToken,
    InteractionController.createInteractionValidator(),
  ],
  authJwt.wrapAsync(InteractionController.createInteraction)
)

router.put(
  '/:id',
  [
    authJwt.verifyCompanyToken,
    InteractionController.createInteractionValidator(),
  ],
  authJwt.wrapAsync(InteractionController.updateInteraction)
)

module.exports = router
