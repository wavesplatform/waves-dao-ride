import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { api, chainId, broadcastAndWait } from '../../../utils/api.js'
import { setup } from './_setup.js'
import { invokeScript } from '@waves/waves-transactions'

chai.use(chaiAsPromised)
const { expect } = chai

const scale8 = 1e8

describe(`[${process.pid}] calculator: claim waves`, () => {
  let accounts, lpAssetId, investedWavesAmount

  before(async () => {
    const { height } = await api.blocks.fetchHeight()
    investedWavesAmount = 500 * 1e8;
    ({ accounts, lpAssetId } = await setup({
      investedWavesAmount,
      nextBlockToProcess: height,
      periodLength: 1
    }))

    await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: { function: 'processBlocks', args: [] },
      chainId
    }, accounts.user1.seed))

    const paymentAmount = 1e8
    investedWavesAmount += paymentAmount
    await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: { function: 'invest', args: [] },
      payment: [{ assetId: null, amount: paymentAmount }],
      chainId
    }, accounts.user1.seed))
  })

  it('user should successfully claim waves after finalization', async () => {
    const paymentAmount = 1e8
    const { id: withdrawTxId } = await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: { function: 'withdraw', args: [] },
      payment: [{ assetId: lpAssetId, amount: paymentAmount }],
      chainId
    }, accounts.user1.seed))

    const finalizePaymentAmount = 100e8
    const newTreasuryVolumeInWaves = 1100 * 1e8
    const pwrManagersBonusinWaves = 100 * 1e8
    const treasuryVolumeDiffAllocationCoef = 0
    const [{ quantity }] = await api.assets.fetchDetails([lpAssetId])
    await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'finalize',
        args: [
          { type: 'integer', value: newTreasuryVolumeInWaves },
          { type: 'integer', value: pwrManagersBonusinWaves },
          { type: 'integer', value: treasuryVolumeDiffAllocationCoef }
        ]
      },
      payment: [{ assetId: null, amount: finalizePaymentAmount }],
      chainId,
      additionalFee: 4e5
    }, accounts.mainTreasury.seed))

    const { stateChanges } = await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'claimWaves',
        args: [
          { type: 'string', value: withdrawTxId }
        ]
      },
      chainId
    }, accounts.user1.seed))

    const transfer = stateChanges.invokes[0].stateChanges.invokes[2].stateChanges.transfers[0]

    const { value: price } = await api.addresses.fetchDataKey(accounts.factory.address, '%s%d__price__1')
    const profitRaw = newTreasuryVolumeInWaves - investedWavesAmount
    const profit = profitRaw - pwrManagersBonusinWaves
    const expectedPrice = Math.floor((investedWavesAmount + profit) * scale8 / quantity)
    expect(price).to.equal(expectedPrice)
    expect(transfer).to.deep.equal({
      address: accounts.user1.address,
      asset: null,
      amount: Math.floor(paymentAmount * price / scale8)
    })
  })
})
