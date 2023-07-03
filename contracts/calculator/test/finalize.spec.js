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
  const newTreasuryVolumeInWaves = 12345 * 1e8
  const pwrManagersBonusInWaves = 777 * 1e8
  const treasuryVolumeDiffAllocationCoef = -0.123456
  const initialInvestInWaves = 5678 * 1e8
  const initialDonatedInWaves = 3456 * 1e8

  before(async () => {
    const { height } = await api.blocks.fetchHeight();
    ({ accounts, lpAssetId } = await setup({
      nextBlockToProcess: height,
      periodLength,
      blockProcessingReward: 0,
      investedWavesAmount: initialInvestInWaves,
      donatedWavesAmount: initialDonatedInWaves
    }))
  })

  it('only factory can call finalize', async () => {
    return expect(broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'finalize',
        args: [
          { type: 'integer', value: newTreasuryVolumeInWaves },
          { type: 'integer', value: pwrManagersBonusInWaves },
          { type: 'integer', value: treasuryVolumeDiffAllocationCoef * scale8 }
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
          { type: 'integer', value: newTreasuryVolumeInWaves },
          { type: 'integer', value: pwrManagersBonusInWaves },
          { type: 'integer', value: treasuryVolumeDiffAllocationCoef * scale8 }
        ]
      },
      payment: [{ assetId: null, amount: paymentAmount }],
      chainId,
      additionalFee: 4e5
    }, accounts.featureTreasury.seed))).to.be.rejectedWith('unprocessed blocks')
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
          { type: 'integer', value: newTreasuryVolumeInWaves },
          { type: 'integer', value: pwrManagersBonusInWaves },
          { type: 'integer', value: treasuryVolumeDiffAllocationCoef * scale8 }
        ]
      },
      payment: [{ assetId: null, amount: paymentAmount }],
      chainId,
      additionalFee: 4e5
    }, accounts.featureTreasury.seed))

    const { balance: factoryBalanceAfter } = await api.addresses.fetchBalance(accounts.factory.address)

    const [{ quantity }] = await api.assets.fetchDetails([lpAssetId])
    const { value: price } = await api.addresses.fetchDataKey(accounts.factory.address, '%s%d__price__1')

    const totalInitInvest = initialDonatedInWaves + initialInvestInWaves
    const profitOrLoss = newTreasuryVolumeInWaves - totalInitInvest
    const rawProfit = profitOrLoss - (pwrManagersBonusInWaves <= profitOrLoss ? pwrManagersBonusInWaves : 0)

    const donationPart = initialDonatedInWaves / totalInitInvest
    const investPart = initialInvestInWaves / totalInitInvest
    const donatedRawProfit = rawProfit * donationPart
    const investRawProfit = rawProfit * investPart
    let investProfit = investRawProfit
    if (treasuryVolumeDiffAllocationCoef < 0) {
      investProfit = investRawProfit * (1 - Math.abs(treasuryVolumeDiffAllocationCoef))
    }
    if (treasuryVolumeDiffAllocationCoef > 0) {
      investProfit = investRawProfit + donatedRawProfit * Math.abs(treasuryVolumeDiffAllocationCoef)
    }

    const expectedPrice = Math.floor((initialInvestInWaves + investProfit) * scale8 / quantity)
    console.log(price / scale8, expectedPrice / scale8)
    expect(price, 'invalid price').to.equal(expectedPrice)
    const expectedFactoryBalance = factoryBalanceBefore + paymentAmount
    expect(factoryBalanceAfter, 'invalid factory balance').to.equal(expectedFactoryBalance)
  })
})
