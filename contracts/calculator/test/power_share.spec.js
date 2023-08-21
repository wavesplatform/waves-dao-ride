import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { api, chainId, broadcastAndWait } from '../../../utils/api.js'
import { setup } from './_setup.js'
import { invokeScript, data } from '@waves/waves-transactions'

chai.use(chaiAsPromised)
const { expect } = chai

describe(`[${process.pid}] calculator: process blocks`, () => {
  const powerShareRatio = 0.13
  const maxProcessBlocks = 20 // Set in calculator.ride

  let accounts, periodLength, blockProcessingReward, powerAssetId
  before(async () => {
    ({ accounts, periodLength, blockProcessingReward, powerAssetId } = await setup({
      periodLength: 1440,
      blockProcessingReward: 500000
    }))

    await broadcastAndWait(data({
      additionalFee: 4e5,
      data: [
        { key: '%s__powerShareRatio', type: 'integer', value: powerShareRatio * 1e8 }
      ],
      chainId
    }, accounts.factory.seed))
  })

  it('power share should be transferred to power treasury', async () => {
    const blockReward = 2e8
    const powerPrice = 0.5 // Set in mock contract
    const blocksCount = Math.min(periodLength, maxProcessBlocks)
    const sharedPartInWaves = Math.floor(blockReward * blocksCount * powerShareRatio)
    const sharedPartInPower = Math.floor(sharedPartInWaves * powerPrice)
    const setupBalance = 100e8 // Waves amount from setup

    await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: { function: 'processBlocks', args: [] },
      chainId
    }, accounts.user1.seed))

    const { balance: powerContractBalance } = await api.assets.fetchBalanceAddressAssetId(accounts.powerContract.address, powerAssetId)
    const expectedPowerTreasuryBalance = sharedPartInPower + setupBalance
    expect(powerContractBalance).to.equal(expectedPowerTreasuryBalance)

    const { balance: featureTreasuryBalance } = await api.addresses.fetchBalance(accounts.mainTreasury.address)
    const expectedFeatureTreasuryBalance = blockReward * blocksCount - blockProcessingReward - sharedPartInWaves + setupBalance
    expect(featureTreasuryBalance).to.be.eql(expectedFeatureTreasuryBalance)
  })
})
