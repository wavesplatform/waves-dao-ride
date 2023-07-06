import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { api, chainId, broadcastAndWait } from '../../../utils/api.js'
import { setup } from './_setup.js'
import { invokeScript } from '@waves/waves-transactions'

chai.use(chaiAsPromised)
const { expect } = chai

describe(`[${process.pid}] calculator: cancel withdraw`, () => {
  let accounts, lpAssetId, withdrawTxId

  before(async () => {
    ({ accounts, lpAssetId } = await setup())

    const paymentAmount = 1e8
    await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: { function: 'invest', args: [] },
      payment: [{ assetId: null, amount: paymentAmount }],
      chainId
    }, accounts.user1.seed));

    ({ id: withdrawTxId } = await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: { function: 'withdraw', args: [] },
      payment: [{ assetId: lpAssetId, amount: paymentAmount }],
      chainId
    }, accounts.user1.seed)))
  })

  it('total withdrawal amount should be decreased', async () => {
    const { balance: userBalanceBefore } = await api.assets.fetchBalanceAddressAssetId(accounts.user1.address, lpAssetId)
    const paymentAmount = 1e8
    const { value: totalWithdrawalAmountBefore } = await api.addresses.fetchDataKey(accounts.factory.address, '%s__withdrawal')
    expect(totalWithdrawalAmountBefore).to.equal(paymentAmount)
    await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: { function: 'cancelWithdraw', args: [{ type: 'string', value: withdrawTxId }] },
      chainId
    }, accounts.user1.seed))
    const { balance: userBalanceAfter } = await api.assets.fetchBalanceAddressAssetId(accounts.user1.address, lpAssetId)
    const { value: totalWithdrawalAmountAfter } = await api.addresses.fetchDataKey(accounts.factory.address, '%s__withdrawal')
    expect(totalWithdrawalAmountAfter, 'invalid total withdrawal amount').to.equal(0)
    const expectedUserBalance = userBalanceBefore + paymentAmount
    expect(userBalanceAfter, 'invalid user balance').to.equal(expectedUserBalance)
  })
})
