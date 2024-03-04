import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { api, chainId, broadcastAndWait } from '../../../utils/api.js'
import { setup } from './_setup.js'
import { invokeScript } from '@waves/waves-transactions'

chai.use(chaiAsPromised)
const { expect } = chai

describe(`[${process.pid}] calculator: withdrawFor`, () => {
  let accounts, lpAssetId

  before(async () => {
    const { height } = await api.blocks.fetchHeight();
    ({ accounts, lpAssetId } = await setup({
      nextBlockToProcess: height,
      periodLength: 10
    }))

    const paymentAmount = 1e8
    await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: { function: 'invest', args: [] },
      payment: [{ assetId: null, amount: paymentAmount }],
      chainId
    }, accounts.user1.seed))
  })

  it('total withdrawal amount should be increased', async () => {
    const { balance: factoryBalanceBefore } = await api.assets.fetchBalanceAddressAssetId(accounts.factory.address, lpAssetId)
    const paymentAmount = 1e8
    const { id: txId } = await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: { function: 'withdrawFor', args: [{ type: 'string', value: accounts.user2.address }] },
      payment: [{ assetId: lpAssetId, amount: paymentAmount }],
      chainId
    }, accounts.user1.seed))
    const { balance: factoryBalanceAfter } = await api.assets.fetchBalanceAddressAssetId(accounts.factory.address, lpAssetId)
    const { value: totalWithdrawalAmount } = await api.addresses.fetchDataKey(accounts.factory.address, '%s__withdrawal')
    expect(totalWithdrawalAmount, 'invalid total withdrawal amount').to.equal(paymentAmount)
    const expectedFactoryBalance = factoryBalanceBefore + paymentAmount
    expect(factoryBalanceAfter, 'invalid factory balance').to.equal(expectedFactoryBalance)
    const { value: withdrawRequestValue } = await api.addresses.fetchDataKey(accounts.factory.address, `%s%s%s__withdrawal__${accounts.user2.address}__${txId}`)
    const expectedWithdrawRequestValue = `%s%d%d%s__PENDING__${paymentAmount}__1__SOON`
    expect(withdrawRequestValue, 'invalid withdraw request value').to.equal(expectedWithdrawRequestValue)
  })
})
