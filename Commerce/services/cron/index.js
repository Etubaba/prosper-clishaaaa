const db = require('../../models')
const _ = require('lodash')
const { Op, Sequelize } = require('sequelize')
const axios = require('axios')
const VENDO_SERVER = process.env.VENDO_SERVER
// Models
const User = db.models.User
const Wallet = db.models.Wallet

const submitVendoVQs = async () => {
  console.log('Submiting  VQs')
  const wallets = await Wallet.findAll({
    where: { bonus_eligibility: true },
  })

  const response = wallets.map(async (wallet) => {
    let user = await User.findOne({ where: { id: wallet.UserId } });
    const ratio = [0.1, 0.2, 0.5, 1]

    const vendo_package = await axios.get(
      `${VENDO_SERVER}/user-vqs-package-for-clisha/${user.clishaId}`
    )
    if (vendo_package?.data.status) {
        const packages = vendo_package.data.packages
        const package_level = vendo_package.data.package_level
        const vq_ratio = ratio[packages.indexOf(package_level)]
        wallet.bonus_points *=  Number(vq_ratio);
     
        const payload = {
          clisha_id: user.clishaId,
          vqs: wallet.bonus_points
        }
    
        const vendo = await axios.post(
          `${VENDO_SERVER}/update-user-vqs-from-clisha`,
          payload
        )
    }


    if (vendo.data.status) {
      wallet.bonus_points = 0
      wallet.bonus_eligibility = false
      await wallet.save()
    }
  })

  await Promise.all([response])

  console.log('Complete posting of Vendo Vqs')
}

module.exports = {
  submitVendoVQs,
}
