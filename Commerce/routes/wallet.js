const express = require('express')
const router = express.Router()
const { authJwt } = require('../middleware')
const WalletController = require('../controllers/WalletController')



router.get('/', 
    [ authJwt.verifyToken ],
    WalletController.walletDetails
);

router.get('/transactions', 
    [ authJwt.verifyToken ],
    WalletController.listTransactions
);

router.post('/create/transaction', 
    [ authJwt.verifyToken, WalletController.createTransactionValidation() ],
    WalletController.initiateTransaction
);

router.post('/create', 
    [ authJwt.verifyToken, WalletController.paymentWalletValidation() ],
    WalletController.addPaymentWallet
);

module.exports = router
