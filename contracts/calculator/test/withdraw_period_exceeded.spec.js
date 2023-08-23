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
    const { height } = await api.blocks.fetchHeight();
    ({ accounts, lpAssetId } = await setup({
      nextBlockToProcess: height - 10,
      periodLength: 1
    }))

    const paymentAmount = 1e8
    await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: { function: 'invest', args: [] },
      payment: [{ assetId: null, amount: paymentAmount }],
      chainId
    }, accounts.user1.seed))
  })

  it('withdraw should be disabled if period is over', async () => {
    const paymentAmount = 1e8
    const tx = broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: { function: 'withdraw', args: [] },
      payment: [{ assetId: lpAssetId, amount: paymentAmount }],
      chainId
    }, accounts.user1.seed))
    return expect(tx).to.be.rejectedWith('too late to withdraw in this period')
  })
})
