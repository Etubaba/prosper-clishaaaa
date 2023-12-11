const express = require('express')
const router = express.Router()
const { verifyAuth, authJwt   } = require('../middleware')

const CoinPaymentController = require('../controllers/CoinPaymentController')
const PackageController = require('../controllers/CompanyPackageController')
const PayPalPackageController = require('../controllers/PaypalPackageController')

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin Information
 */

router.get('/wallet', 
    [authJwt.verifyCompanyToken],
    authJwt.wrapAsync(PackageController.walletDetails)
);

router.get('/invoices', 
    [authJwt.verifyCompanyToken],
    authJwt.wrapAsync(PackageController.invoices)
);

router.post('/payment/coinpayment', 
    [authJwt.verifyCompanyToken, PackageController.packagePaymentValidation()],
    authJwt.wrapAsync(PackageController.coinpaymentPackagePayment)
);

router.get('/payment/validation/:txn_id', 
    [authJwt.verifyCompanyToken],
    authJwt.wrapAsync(PackageController.coinpaymentPackageInfo)
);

router.post('/payment/offline', 
    [authJwt.verifyCompanyToken, PackageController.packagePaymentValidation()],
    authJwt.wrapAsync(PackageController.createOfflinePackagePayment)
);

router.post('/payment/stripe', 
    [authJwt.verifyCompanyToken, PackageController.packagePaymentValidation()],
    authJwt.wrapAsync(PackageController.initStripePackagePayment)
);

router.post('/payment/stripe/activate', 
    [authJwt.verifyCompanyToken, PackageController.packagePaymentValidation()],
    authJwt.wrapAsync(PackageController.activateStripePlan)
);

// Paypal
router.post('/paypal/activate/plan', 
    [authJwt.verifyCompanyToken, PackageController.packagePaymentValidation()],
    authJwt.wrapAsync(PayPalPackageController.activatePayPalPackage)
);

router.post('/paypal/excecute/plan', 
    [authJwt.verifyCompanyToken, PackageController.packagePaymentValidation()],
    authJwt.wrapAsync(PayPalPackageController.initPaypalAggrement)
);

router.get('/paypal/start/recurring', 
    [authJwt.verifyCompanyToken],
    authJwt.wrapAsync(PayPalPackageController.startPaypalPackageRecurring)
);

module.exports = router
