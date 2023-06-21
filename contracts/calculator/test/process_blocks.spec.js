import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { api, chainId, broadcastAndWait, baseSeed, daoSeed } from '../../../utils/api.js'
import { setup } from './_setup.js'
import { invokeScript } from '@waves/waves-transactions'
import wc from '@waves/ts-lib-crypto'

chai.use(chaiAsPromised)
const { expect } = chai

describe(`[${process.pid}] calculator: process blocks`, () => {
  let accounts, lpAssetId, periodLength, blockProcessingReward

  before(async () => {
    ({ accounts, lpAssetId, periodLength, blockProcessingReward } = await setup())
  })

  it('rewardForOption function should parse dao reward', async () => {
    const targetHeight = 2
    const response = await api.utils.fetchEvaluate(
      accounts.calculator.address,
      `rewardForOption(blockInfoByHeight(${targetHeight}).value().rewards, Address(base58'${wc.address(daoSeed, chainId)}'))`
    )
    const expectedReward = 200000000
    expect(response).to.not.have.property('error')
    expect(response.result.value).to.equal(expectedReward)
  })

  it('generator should be able to claim lp tokens', async () => {
    await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: { function: 'processBlocks', args: [] },
      chainId
    }, accounts.user1.seed))
    await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: { function: 'claimLP', args: [] },
      chainId
    }, baseSeed))
    const { balance } = await api.assets.fetchBalanceAddressAssetId(wc.address(baseSeed, chainId), lpAssetId)
    const daoBlockReward = 2e8
    const expectedBalance = daoBlockReward * periodLength - blockProcessingReward
    expect(balance).to.equal(expectedBalance)
  })
})
