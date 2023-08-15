import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { api, chainId, broadcastAndWait } from '../../../utils/api.js'
import { setup } from './_setup.js'
import { invokeScript, data } from '@waves/waves-transactions'

chai.use(chaiAsPromised)
const { expect } = chai

describe(`[${process.pid}] calculator: invest2`, () => {
  let accounts, lpAssetId, price

  const businessTreasuryPartValue = 1e8 / 20

  before(async () => {
    ({ accounts, lpAssetId, price } = await setup())

    await broadcastAndWait(
      data(
        {
          additionalFee: 4e5,
          data: [
            {
              key: '%s__businessTreasuryPart',
              type: 'integer',
              value: businessTreasuryPartValue
            }
          ],
          chainId
        },
        accounts.factory.seed
      )
    )
  })

  it('user should receive lp tokens, treasury should receive waves', async () => {
    const priceScale = 1e8
    const paymentAmount = 1e8
    await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: { function: 'invest', args: [] },
      payment: [{ assetId: null, amount: paymentAmount }],
      chainId
    }, accounts.user1.seed))

    const { balance: userBalance } = await api.assets.fetchBalanceAddressAssetId(accounts.user1.address, lpAssetId)

    const businessTreasuryPart = businessTreasuryPartValue / 1e8
    const featureTreasuryPart = 1 - businessTreasuryPart
    const expectedUserBalance = Math.floor(paymentAmount * featureTreasuryPart * priceScale / price)
    expect(userBalance, 'invalid user balance').to.equal(expectedUserBalance)
  })
})
