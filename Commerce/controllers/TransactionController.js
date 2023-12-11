const { check, validationResult } = require('express-validator');
const db = require('../models')
const { Op, Sequelize } = require('sequelize')
const { getPagingData, pagination, getPagination } = require('../middleware/helper')
const coinpayment = require('../config/coinpayments');

const User = db.models.User;
const Wallet = db.models.Wallet;
const Token = db.models.Token; 
const CompanyWallet = db.models.CompanyWallet;
const PackagePayment = db.models.PackagePayment;
const Transaction = db.models.Transaction;
const NotificationBoard = db.models.NotificationBoard;



const clishaTransactions = async (req, res) => {
    let admin = req.admin,  
        { size, page, status } = req.query;

    const paging = pagination(page)
    const { limit, offset } = getPagination(page, size)

    let condition = {};
    if(status){
        condition["status"] = status;
    }

    const transactions = await Transaction.findAndCountAll({
        where: condition,
        limit,
        offset,
        order: paging.order,

        include: [  { model: User, as: 'user' } ]
    });

    const paginatedResult = getPagingData(transactions, page, limit, 'transactions')

    return res.status(200).send({
        status: true,
        data: paginatedResult,
        message: '',
    });

}

const cancelUserTransaction = async (req, res) => {
        const admin = req.admin;
        const { id }  = req.params;

        // Find Pending Transaction. 
        //  We can only take action on Pending Transaction
        const transaction = await Transaction.findOne({
            where: { id: id, status: 1 },
            include: [  { model: User, as: 'user' } ]
        });

        if (transaction){
            // Change Transaction status
            transaction.status = 0;
            transaction.adminId = admin.id;
            await transaction.save();
            // Reverse  user points
            let transactionPoints = transaction.points ?? 0;
            let transactionWallet = await Wallet.findOne({ where: { UserId: transaction.userId } });
            transactionWallet.balance += transactionPoints;
            await transactionWallet.save();
            // Send user Notfication Message
            const payload = {
                userId: transaction.userId,
                message: `Your transaction has been canceled and your ${transactionPoints} points has been reverse. 
                            Thank you`,
            };

            await NotificationBoard.create(payload);

            return res.status(200).send({
                status: true,
                message: 'Transaction has been canceled',
            });
        }else{
            return res.status(500).send({ 
                status: false, 
                message: 'Transaction not found' 
            });
        }
        
}

const approveUserTransaction = async (req, res) => {
    const admin = req.admin;
    const { id }  = req.params;

    // Find Pending Transaction. 
    //  We can only take action on Pending Transaction
    const transaction = await Transaction.findOne({
        where: { id: id, status: 1 },
        include: [  { model: User, as: 'user' } ]
    });

    if (transaction){
        // Change Transaction status
        // transaction.status = 2; 
        transaction.adminId = admin.id;
        await transaction.save();

        // We will check a payment method and dispatch the job later here
        let transactionWallet = await Wallet.findOne({ where: { UserId: transaction.userId } });

        const transactionOpts = {
            cmd: "create_withdrawal",
            currency: 'LTC', 
            currency2: 'USD', 
            amount: 1.5,//transaction.amount,
            buyer_email: transaction?.user.email,
            address: 'ltc1q2ehqa75aj0znl97x4jdhgeksm06ftxzlhfezff',//transactionWallet.coinpayment
        }

        let response = await coinpayment.createWithdrawal(transactionOpts);

        console.log('Coinpayment ',response);
        // transaction.details = response.result;


        // Create Transaction
    
        // Send user Notfication Message
        // const payload = {
        //     userId: transaction.userId,
        //     message: `Your transaction has been canceled and your and your ${transactionPoints} point s has been reverse. 
        //                 Thank you`,
        // };
        // await NotificationBoard.create(payload);

        return res.status(200).send({
            status: true,
            message: 'Transaction has been approved',
        });
    }else{
        return res.status(400).send({ 
            status: false, 
            message: 'Transaction not found' 
        });
    }
     
}


const clishaInvoices = async (req, res) => {
    const admin = req.admin,  
        { size, page, status } = req.query;

    const paging = pagination(page)
    const { limit, offset } = getPagination(page, size)

    let condition = {};

    if(status){ 
        condition["status"] = status;
    }

    const invoices = await PackagePayment.findAndCountAll({
        where: condition,

        include: [  { model: Token, as: 'company' } ],

        limit,
        offset,
        order: paging.order,
    });

    const result = getPagingData(invoices, page, limit, 'invoices')

    return res.status(200).send({
        status: true,
        data: result,
    });
}

const confirmPackagePaymentRequest =  async (req, res) => {
    const admin = req.admin;
    const { txn_id } = req.params;

    console.log(txn_id);

    const invoice = await PackagePayment.findOne({ where : { txn_id }})
  
    if( invoice && invoice.status === 0){
        invoice.status = 1;
        invoice.save();

        const wallet = await CompanyWallet.findOne({ where: { companyId: invoice.companyId } })
        wallet.balance += invoice.interactions;
        wallet.save();
    }
    // console.log(response);
    return res.status(200).send({
        status: true, 
        data:   invoice ,
        message: 'Package updated',
    }) 
}


const declinePackagePaymentRequest =  async (req, res) => {
    const admin = req.admin;
    const { txn_id } = req.params;


    const invoice = await PackagePayment.findOne({ where : { txn_id }})

  
    if( invoice && invoice.status === 0){
        invoice.status = 2;
        invoice.save();
    }
    
    return res.status(200).send({
        status: true, 
        data: invoice,
        message: 'Package declined',
    }) 
}

module.exports = {
  clishaTransactions,
  cancelUserTransaction,
  approveUserTransaction,

  clishaInvoices,
  confirmPackagePaymentRequest,
  declinePackagePaymentRequest
}
