import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { api, chainId, broadcastAndWait, daoSeed } from '../../../utils/api.js'
import { setup } from './_setup.js'
import { invokeScript } from '@waves/waves-transactions'

chai.use(chaiAsPromised)
const { expect } = chai

const scale8 = 1e8

describe(`[${process.pid}] calculator: finalize`, () => {
  let accounts, lpAssetId
  const paymentAmount = 1
  const newTreasuryVolumeInWaves = 1000 * 1e8
  const xtnPrice = 0.05 * 1e8
  const pwrManagersBonus = 0.2 * 1e8
  const treasuryVolumeDiffAllocationCoef = 0

  before(async () => {
    const { height } = await api.blocks.fetchHeight();
    ({ accounts, lpAssetId } = await setup({
      nextBlockToProcess: height,
      periodLength: 1
    }))
  })

  it('only factory can call finalize', async () => {
    const newTreasuryVolumeInWaves = 1000 * 1e8
    const xtnPrice = 0.05 * 1e8
    const pwrManagersBonus = 0.2 * 1e8
    const treasuryVolumeDiffAllocationCoef = 0

    return expect(broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'finalize',
        args: [
          { type: 'integer', value: newTreasuryVolumeInWaves },
          { type: 'integer', value: xtnPrice },
          { type: 'integer', value: pwrManagersBonus },
          { type: 'integer', value: treasuryVolumeDiffAllocationCoef }
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
          { type: 'integer', value: xtnPrice },
          { type: 'integer', value: pwrManagersBonus },
          { type: 'integer', value: treasuryVolumeDiffAllocationCoef }
        ]
      },
      payment: [{ assetId: null, amount: paymentAmount }],
      chainId,
      additionalFee: 4e5
    }, daoSeed))).to.be.rejectedWith('unprocessed blocks')
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
          { type: 'integer', value: xtnPrice },
          { type: 'integer', value: pwrManagersBonus },
          { type: 'integer', value: treasuryVolumeDiffAllocationCoef }
        ]
      },
      payment: [{ assetId: null, amount: paymentAmount }],
      chainId,
      additionalFee: 4e5
    }, daoSeed))

    const { balance: factoryBalanceAfter } = await api.addresses.fetchBalance(accounts.factory.address)

    const [{ quantity }] = await api.assets.fetchDetails([lpAssetId])
    const { value: price } = await api.addresses.fetchDataKey(accounts.factory.address, '%s%d__price__1')
    const profit = newTreasuryVolumeInWaves
    const expectedPrice = Math.floor(profit * (scale8 - pwrManagersBonus) / quantity)
    expect(price, 'invalid price').to.equal(expectedPrice)
    const expectedFactoryBalance = factoryBalanceBefore + paymentAmount
    expect(factoryBalanceAfter, 'invalid factory balance').to.equal(expectedFactoryBalance)
  })
})
