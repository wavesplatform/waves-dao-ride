import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import {
  api,
  chainId,
  broadcastAndWait,
  baseSeed,
  daoAddress
} from '../../../utils/api.js'
import { setup } from './_setup.js'
import { invokeScript, data } from '@waves/waves-transactions'
import wc from '@waves/ts-lib-crypto'

chai.use(chaiAsPromised)
const { expect } = chai

describe(`[${process.pid}] calculator: process blocks`, () => {
  let accounts, lpAssetId, periodLength, blockProcessingReward
  const businessTreasuryPartValue = 1e8 / 20

  before(async () => {
    ({ accounts, lpAssetId, periodLength, blockProcessingReward } =
      await setup())

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

  it('rewardForOption function should parse dao reward', async () => {
    const targetHeight = 2
    const response = await api.utils.fetchEvaluate(
      accounts.calculator.address,
      `rewardForOption(blockInfoByHeight(${targetHeight}).value().rewards, Address(base58'${daoAddress()}'))`
    )
    const expectedReward = 200000000
    expect(response).to.not.have.property('error')
    expect(response.result.value).to.equal(expectedReward)
  })

  it('generator should be able to claim lp tokens', async () => {
    await broadcastAndWait(
      invokeScript(
        {
          dApp: accounts.factory.address,
          call: { function: 'processBlocks', args: [] },
          chainId
        },
        accounts.user1.seed
      )
    )
    await broadcastAndWait(
      invokeScript(
        {
          dApp: accounts.factory.address,
          call: { function: 'claimLP', args: [] },
          chainId
        },
        baseSeed
      )
    )
    const { balance } = await api.assets.fetchBalanceAddressAssetId(
      wc.address(baseSeed, chainId),
      lpAssetId
    )
    const daoBlockReward = 2e8
    const businessTreasuryPart = businessTreasuryPartValue / 1e8
    const businessTreasurePartAmount = daoBlockReward * businessTreasuryPart * periodLength
    const expectedBalance =
      daoBlockReward * periodLength - blockProcessingReward - businessTreasurePartAmount
    expect(balance).to.equal(expectedBalance)

    const { balance: featureTreasuryBalance } =
      await api.addresses.fetchBalance(accounts.mainTreasury.address)
    const blockReward = 2e8
    const setupBalance = 100e8 // Waves amount from setup
    const featureTreasuryPart = 1 - businessTreasuryPart
    const expectedFeatureTreasuryBalance =
      blockReward * periodLength * featureTreasuryPart -
      blockProcessingReward +
      setupBalance
    expect(featureTreasuryBalance).to.be.eql(expectedFeatureTreasuryBalance)
  })
})
