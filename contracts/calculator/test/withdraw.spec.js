import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { api, chainId, broadcastAndWait } from '../../../utils/api.js'
import { setup } from './_setup.js'
import { invokeScript } from '@waves/waves-transactions'

chai.use(chaiAsPromised)
const { expect } = chai

describe(`[${process.pid}] calculator: withdraw`, () => {
  let accounts, lpAssetId

  before(async () => {
    ({ accounts, lpAssetId } = await setup())

    const paymentAmount = 1e8
    await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: { function: 'invest', args: [] },
      payment: [{ assetId: null, amount: paymentAmount }],
      chainId
    }, accounts.user1.seed))
  })

  it('total withdrawal amount should be increased', async () => {
    const paymentAmount = 1e8
    await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: { function: 'withdraw', args: [] },
      payment: [{ assetId: lpAssetId, amount: paymentAmount }],
      chainId
    }, accounts.user1.seed))
    const { value: totalWithdrawalAmount } = await api.addresses.fetchDataKey(accounts.factory.address, '%s__withdrawal')
    expect(totalWithdrawalAmount).to.equal(paymentAmount)
  })
})
