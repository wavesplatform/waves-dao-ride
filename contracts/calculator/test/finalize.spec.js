import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { api, chainId, broadcastAndWait } from '../../../utils/api.js'
import { setup } from './_setup.js'
import { invokeScript } from '@waves/waves-transactions'

chai.use(chaiAsPromised)
const { expect } = chai

const scale8 = 1e8

describe(`[${process.pid}] calculator: finalize`, () => {
  let accounts, lpAssetId
  const paymentAmount = 1
  const periodLength = 1
  const initialLpInWaves = 5000 * 1e8
  const initialDonatedInWaves = 3000 * 1e8
  const newLpInWaves = 6000 * 1e8
  const newDonatedIntWaves = 2500 * 1e8
  const claimAmountInWaves = 0 * 1e8
  const pwrManagersBonusInWaves = 700 * 1e8
  const blockProcessingReward = 0.015 * 1e8

  before(async () => {
    const { height } = await api.blocks.fetchHeight();
    ({ accounts, lpAssetId } = await setup({
      nextBlockToProcess: height,
      periodLength,
      blockProcessingReward,
      investedWavesAmount: initialLpInWaves,
      donatedWavesAmount: initialDonatedInWaves
    }))
  })

  it('only factory can call finalize', async () => {
    return expect(broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'finalize',
        args: [
          { type: 'integer', value: newDonatedIntWaves },
          { type: 'integer', value: newLpInWaves },
          { type: 'integer', value: claimAmountInWaves },
          { type: 'integer', value: pwrManagersBonusInWaves }
        ]
      },
      payment: [],
      chainId
    }, accounts.user1.seed))).to.be.rejectedWith('permission denied')
  })

  it('blocks should be processed before finalization', async () => {
    expect(broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'finalize',
        args: [
          { type: 'integer', value: newDonatedIntWaves },
          { type: 'integer', value: newLpInWaves },
          { type: 'integer', value: claimAmountInWaves },
          { type: 'integer', value: pwrManagersBonusInWaves }
        ]
      },
      payment: [{ assetId: null, amount: paymentAmount }],
      chainId,
      additionalFee: 4e5
    }, accounts.mainTreasury.seed))).to.be.rejectedWith('unprocessed blocks')
  })

  it('period should be finalized', async () => {
    await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: { function: 'processBlocks', args: [] },
      chainId
    }, accounts.user1.seed))

    const { balance: factoryBalanceBefore } = await api.addresses.fetchBalance(accounts.factory.address)

    await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'finalize',
        args: [
          { type: 'integer', value: newDonatedIntWaves },
          { type: 'integer', value: newLpInWaves },
          { type: 'integer', value: claimAmountInWaves },
          { type: 'integer', value: pwrManagersBonusInWaves }
        ]
      },
      payment: [{ assetId: null, amount: paymentAmount }],
      chainId,
      additionalFee: 4e5
    }, accounts.mainTreasury.seed))

    const { balance: factoryBalanceAfter } = await api.addresses.fetchBalance(accounts.factory.address)

    const [{ quantity }] = await api.assets.fetchDetails([lpAssetId])
    const { value: price } = await api.addresses.fetchDataKey(accounts.factory.address, '%s%d__price__1')

    const expectedPrice = Math.floor(newLpInWaves * scale8 / quantity)
    expect(price, 'invalid price').to.equal(expectedPrice)
    const expectedFactoryBalance = factoryBalanceBefore + paymentAmount
    expect(factoryBalanceAfter, 'invalid factory balance').to.equal(expectedFactoryBalance)
  })
})
