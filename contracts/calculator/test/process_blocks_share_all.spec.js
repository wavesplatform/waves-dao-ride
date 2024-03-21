import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { api, chainId, broadcastAndWait } from '../../../utils/api.js'
import { setup } from './_setup.js'
import { invokeScript, data } from '@waves/waves-transactions'

chai.use(chaiAsPromised)
const { expect } = chai

describe(`[${process.pid}] calculator: process blocks`, () => {
  const powerShareRatio = 0.13
  const maxProcessBlocks = 10 // Set in calculator.ride

  let accounts, periodLength, blockProcessingReward, powerAssetId
  before(async () => {
    ({ accounts, periodLength, blockProcessingReward, powerAssetId } = await setup({
      periodLength: 1440,
      blockProcessingReward: 500000
    }))

    await broadcastAndWait(data({
      additionalFee: 4e5,
      data: [
        { key: '%s__WXDAOShareAmountPerBlock', type: 'integer', value: 0.5 * 1e8 },
        { key: '%s__powerShareRatio', type: 'integer', value: powerShareRatio * 1e8 }
      ],
      chainId
    }, accounts.factory.seed))
  })

  it('all shares should be transferred correctly', async () => {
    const blockReward = 2e8
    const blocksCount = Math.min(periodLength, maxProcessBlocks)
    const wxDAOPartPerBlock = 0.5 * 1e8
    const wxDAOPart = wxDAOPartPerBlock * blocksCount
    const powerPrice = 0.5 // Set in mock contract
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
    expect(powerContractBalance, 'power part').to.equal(expectedPowerTreasuryBalance)

    const { balance: WXDAOTreasuryBalance } = await api.addresses.fetchBalance(accounts.WXDAOTreasury.address)
    const expectedWXDAOTreasuryBalance = wxDAOPart + setupBalance
    expect(WXDAOTreasuryBalance, 'wxdao part').to.equal(expectedWXDAOTreasuryBalance)

    const { balance: featureTreasuryBalance } = await api.addresses.fetchBalance(accounts.mainTreasury.address)
    const expectedFeatureTreasuryBalance = (blockReward * blocksCount) - blockProcessingReward - sharedPartInWaves - wxDAOPart + setupBalance
    expect(featureTreasuryBalance, 'treasury part').to.be.eql(expectedFeatureTreasuryBalance)
  })
})
