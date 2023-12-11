const bcrypt = require('bcryptjs')

const hash = async (param) => {
  return await bcrypt.hash(param, 12)
}

//verify hash
const verifyHash = async (hashedPram, param) => {
  return await bcrypt.compare(param, hashedPram)
}

// verify Gateway Request
const verifyGateway = async (req, res, next) => {
  const gatewayKey = req.headers['gateway-auth']

  if (!gatewayKey) {
    return res.status(401).json({ status: false, message: 'Unauthorized!' })
  }

  // const isVerified = await verifyHash(gatewayKey, process.env.GATEWAY_KEY);

  if (gatewayKey != process.env.COMPANY_KEY) {
    return res.status(401).json({ status: false, message: 'Unauthorized!' })
  }

  return next()
}

module.exports = {
  hash,
  verifyHash,
  verifyGateway,
}
