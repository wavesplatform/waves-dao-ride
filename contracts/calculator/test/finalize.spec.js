import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { api, chainId, broadcastAndWait, daoSeed } from '../../../utils/api.js'
import { setup } from './_setup.js'
import { invokeScript } from '@waves/waves-transactions'

chai.use(chaiAsPromised)
const { expect } = chai

describe(`[${process.pid}] calculator: finalize`, () => {
  let accounts

  before(async () => {
    const { height } = await api.blocks.fetchHeight();
    ({ accounts } = await setup({
      nextBlockToProcess: height,
      periodLength: 1
    }))

    await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: { function: 'processBlocks', args: [] },
      chainId
    }, accounts.user1.seed))

    // const paymentAmount = 1e8
    // await broadcastAndWait(invokeScript({
    //   dApp: accounts.factory.address,
    //   call: { function: 'invest', args: [] },
    //   payment: [{ assetId: null, amount: paymentAmount }],
    //   chainId
    // }, accounts.user1.seed))
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

  it('period should be finalized', async () => {
    const paymentAmount = 1
    const newTreasuryVolumeInWaves = 1000 * 1e8
    const xtnPrice = 0.05 * 1e8
    const pwrManagersBonus = 0.2 * 1e8
    const treasuryVolumeDiffAllocationCoef = 0
    const { stateChanges } = await broadcastAndWait(invokeScript({
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
    console.log(stateChanges)
  })
})
