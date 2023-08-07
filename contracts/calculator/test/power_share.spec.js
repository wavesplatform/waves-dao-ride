import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { api, chainId, broadcastAndWait } from '../../../utils/api.js'
import { setup } from './_setup.js'
import { invokeScript, data } from '@waves/waves-transactions'

chai.use(chaiAsPromised)
const { expect } = chai

describe(`[${process.pid}] calculator: process blocks`, () => {
  let accounts, periodLength, blockProcessingReward

  before(async () => {
    ({ accounts, periodLength, blockProcessingReward } = await setup())

    await broadcastAndWait(data({
      additionalFee: 4e5,
      data: [
        { key: '%s__powerShareRatio', type: 'integer', value: 13000000 } // 13% = 0.13 * 10^8
      ],
      chainId
    }, accounts.factory.seed))
  })

  it('power share should be transferred to power treasury', async () => {
    const blockReward = 2e8
    const powerShareAmount = 51935000 // ((blockReward * periodLength) - blockProcessingReward) * powerShareRatio
    const setupBalance = 100e8 // Waves amount from setup

    await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: { function: 'processBlocks', args: [] },
      chainId
    }, accounts.user1.seed))
    const { balance: powerTreasuryBalance } = await api.addresses.fetchBalance(accounts.powerTreasury.address)
    const expectedPowerTreasuryBalance = powerShareAmount + setupBalance
    expect(powerTreasuryBalance).to.equal(expectedPowerTreasuryBalance)

    const { balance: featureTreasuryBalance } = await api.addresses.fetchBalance(accounts.mainTreasury.address)
    const expectedFeatureTreasuryBalance = blockReward * periodLength - blockProcessingReward - powerShareAmount + setupBalance
    expect(featureTreasuryBalance).to.be.eql(expectedFeatureTreasuryBalance)
  })
})
