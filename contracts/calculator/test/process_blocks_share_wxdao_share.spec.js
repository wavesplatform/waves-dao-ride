import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { api, chainId, broadcastAndWait } from '../../../utils/api.js'
import { setup } from './_setup.js'
import { invokeScript, data } from '@waves/waves-transactions'

chai.use(chaiAsPromised)
const { expect } = chai

describe(`[${process.pid}] calculator: process blocks`, () => {
  const maxProcessBlocks = 10 // Set in calculator.ride

  let accounts, periodLength, blockProcessingReward
  before(async () => {
    ({ accounts, periodLength, blockProcessingReward } = await setup({
      periodLength: 1440,
      blockProcessingReward: 500000
    }))

    await broadcastAndWait(data({
      additionalFee: 4e5,
      data: [
        { key: '%s__WXDAOShareAmountPerBlock', type: 'integer', value: 0.5 * 1e8 }
      ],
      chainId
    }, accounts.factory.seed))
  })

  it('wxdao share should be transferred to wxdao treasury', async () => {
    const blockReward = 2e8
    const blocksCount = Math.min(periodLength, maxProcessBlocks)
    const wxDAOPartPerBlock = 0.5 * 1e8
    const wxDAOPart = wxDAOPartPerBlock * blocksCount
    const setupBalance = 100e8 // Waves amount from setup

    await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: { function: 'processBlocks', args: [] },
      chainId
    }, accounts.user1.seed))

    const { balance: WXDAOTreasuryBalance } = await api.addresses.fetchBalance(accounts.WXDAOTreasury.address)
    const expectedWXDAOTreasuryBalance = wxDAOPart + setupBalance
    expect(WXDAOTreasuryBalance, 'wxdao part').to.equal(expectedWXDAOTreasuryBalance)

    const { balance: featureTreasuryBalance } = await api.addresses.fetchBalance(accounts.mainTreasury.address)
    const expectedFeatureTreasuryBalance = blockReward * blocksCount - blockProcessingReward + setupBalance - wxDAOPart
    expect(featureTreasuryBalance, 'treasury part').to.be.eql(expectedFeatureTreasuryBalance)

    const totalWXDAOState = await api.addresses.fetchDataKey(accounts.factory.address, '%s__WXDAOShareTotalAmount')
    expect(totalWXDAOState, 'factory state').to.be.eql({
      key: '%s__WXDAOShareTotalAmount', type: 'integer', value: wxDAOPart
    })
  })
})
