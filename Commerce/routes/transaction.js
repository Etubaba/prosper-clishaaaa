const express = require('express')
const router = express.Router()
const { authJwt } = require('../middleware')
const TransactionController = require('../controllers/TransactionController')

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin Information
 */

// User Transactions
router.get('/transactions', 
    [ authJwt.verifyAdminToken ],
    TransactionController.clishaTransactions
);

router.post('/transactions/cancel/:id', 
    [ authJwt.verifyAdminToken ],
    TransactionController.cancelUserTransaction
);

router.post('/transactions/approve/:id', 
    [ authJwt.verifyAdminToken ],
    TransactionController.approveUserTransaction
);

// Company Transactions 
router.get('/invoices', 
    [ authJwt.verifyAdminToken ],
    TransactionController.clishaInvoices
);

router.post('/invoices/confirm/:txn_id', 
    [ authJwt.verifyAdminToken ],
    TransactionController.confirmPackagePaymentRequest
);

router.post('/invoices/decline/:txn_id', 
    [ authJwt.verifyAdminToken ],
    TransactionController.declinePackagePaymentRequest
);

module.exports = router
