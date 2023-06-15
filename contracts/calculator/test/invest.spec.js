import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { api, chainId, broadcastAndWait } from '../../../utils/api.js'
import { setup } from './_setup.js'
import { invokeScript } from '@waves/waves-transactions'

chai.use(chaiAsPromised)
const { expect } = chai

describe(`[${process.pid}] calculator: invest`, () => {
  let accounts, lpAssetId, price

  before(async () => {
    ({ accounts, lpAssetId, price } = await setup())
  })

  it('user should receive lp tokens', async () => {
    const priceScale = 1e8
    const paymentAmount = 1e8
    await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: { function: 'invest', args: [] },
      payment: [{ assetId: null, amount: paymentAmount }],
      chainId
    }, accounts.user1.seed))
    const { balance } = await api.assets.fetchBalanceAddressAssetId(accounts.user1.address, lpAssetId)
    const expectedBalance = paymentAmount * priceScale / price
    expect(balance).to.equal(expectedBalance)
  })
})
