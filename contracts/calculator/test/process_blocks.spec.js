import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { api, daoAddress, chainId, broadcastAndWait, baseSeed } from '../../../utils/api.js'
import { setup } from './_setup.js'
import { data, invokeScript } from '@waves/waves-transactions'
import { address } from '@waves/ts-lib-crypto'

chai.use(chaiAsPromised)
const { expect } = chai

describe(`[${process.pid}] calculator: process blocks`, () => {
  let accounts, lpAssetId
  const periodLength = 2
  const blockProcessingReward = 500000

  before(async () => {
    ({ accounts, lpAssetId } = await setup())

    const nextBlockToProcess = 2
    const currentPeriod = 0
    const price = 100000000
    await broadcastAndWait(data({
      data: [
        { key: '%s__nextBlockToProcess', type: 'integer', value: nextBlockToProcess },
        { key: '%s__currentPeriod', type: 'integer', value: currentPeriod },
        { key: '%s%d__startHeight__0', type: 'integer', value: nextBlockToProcess },
        { key: '%s%d__price__0', type: 'integer', value: price },
        { key: '%s__periodLength', type: 'integer', value: periodLength },
        { key: '%s__blockProcessingReward', type: 'integer', value: blockProcessingReward }
      ],
      chainId,
      additionalFee: 4e5
    }, accounts.factory.seed))
  })

  it('rewardForOption function should parse dao reward', async () => {
    const targetHeight = 2
    const response = await api.utils.fetchEvaluate(
      accounts.calculator.address,
      `rewardForOption(blockInfoByHeight(${targetHeight}).value().rewards, Address(base58'${daoAddress}'))`
    )
    const expectedReward = 200000000
    expect(response).to.not.have.property('error')
    expect(response.result.value).to.equal(expectedReward)
  })

  it('processBlock call', async () => {
    await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'processBlocks',
        args: []
      },
      chainId
    }, accounts.user1.seed))
    await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'claimLP',
        args: []
      },
      chainId
    }, baseSeed))
    const { balance } = await api.assets.fetchBalanceAddressAssetId(address(baseSeed, chainId), lpAssetId)
    const daoBlockReward = 2e8
    const expectedBalance = daoBlockReward * periodLength - blockProcessingReward
    expect(balance).to.equal(expectedBalance)
  })
})
