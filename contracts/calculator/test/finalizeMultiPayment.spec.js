import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { api, chainId, broadcastAndWait, baseSeed } from '../../../utils/api.js'
import { setup } from './_setup.js'
import { invokeScript, transfer, issue } from '@waves/waves-transactions'

chai.use(chaiAsPromised)
const { expect } = chai

const scale8 = 1e8

describe(`[${process.pid}] calculator: finalizeMultiPayment`, () => {
  let accounts
  const paymentAmount = 1
  const periodLength = 1
  const newTreasuryVolumeInWaves = 10000 * 1e8
  const pwrManagersBonusInWaves = 700 * 1e8
  const treasuryVolumeDiffAllocationCoef = -0.5
  const initialInvestInWaves = 5000 * 1e8
  const initialDonatedInWaves = 3000 * 1e8
  const blockProcessingReward = 0.015 * 1e8

  before(async () => {
    const { height } = await api.blocks.fetchHeight();
    ({ accounts } = await setup({
      nextBlockToProcess: height,
      periodLength,
      blockProcessingReward,
      investedWavesAmount: initialInvestInWaves,
      donatedWavesAmount: initialDonatedInWaves
    }))
  })

  it('period should be finalized', async () => {
    const { id: firstAssetId } = await broadcastAndWait(
      issue(
        {
          name: 'FirstAsset',
          description: '',
          quantity: 10e8,
          decimals: 8,
          reissuable: true,
          chainId
        },
        baseSeed
      )
    )

    await broadcastAndWait(transfer({
      recipient: accounts.mainTreasury.address,
      amount: 10e8,
      assetId: firstAssetId,
      additionalFee: 4e5
    }, baseSeed))

    const { id: secondAssetId } = await broadcastAndWait(
      issue(
        {
          name: 'SecondAsset',
          description: '',
          quantity: 10e8,
          decimals: 8,
          reissuable: true,
          chainId
        },
        baseSeed
      )
    )

    await broadcastAndWait(transfer({
      recipient: accounts.mainTreasury.address,
      amount: 10e8,
      assetId: secondAssetId,
      additionalFee: 4e5
    }, baseSeed))

    const { id: thirdAssetId } = await broadcastAndWait(
      issue(
        {
          name: 'ThirdAsset',
          description: '',
          quantity: 10e8,
          decimals: 8,
          reissuable: true,
          chainId
        },
        baseSeed
      )
    )

    await broadcastAndWait(transfer({
      recipient: accounts.mainTreasury.address,
      amount: 10e8,
      assetId: thirdAssetId,
      additionalFee: 4e5
    }, baseSeed))

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

    const { balance: factoryFirstAssetBalanceBefore } = await api.assets.fetchBalanceAddressAssetId(
      accounts.factory.address,
      firstAssetId
    )

    const { balance: factorySecondAssetBalanceBefore } = await api.assets.fetchBalanceAddressAssetId(
      accounts.factory.address,
      secondAssetId
    )

    const { balance: factoryThirdAssetBalanceBefore } = await api.assets.fetchBalanceAddressAssetId(
      accounts.factory.address,
      thirdAssetId
    )

    await broadcastAndWait(
      invokeScript(
        {
          dApp: accounts.factory.address,
          call: {
            function: 'finalize',
            args: [
              { type: 'integer', value: newTreasuryVolumeInWaves },
              { type: 'integer', value: pwrManagersBonusInWaves },
              {
                type: 'integer',
                value: treasuryVolumeDiffAllocationCoef * scale8
              }
            ]
          },
          payment: [
            { assetId: firstAssetId, amount: paymentAmount },
            { assetId: secondAssetId, amount: paymentAmount },
            { assetId: thirdAssetId, amount: paymentAmount }
          ],
          chainId,
          additionalFee: 4e5
        },
        accounts.mainTreasury.seed
      )
    )

    const { balance: factoryFirstAssetBalanceAfter } = await api.assets.fetchBalanceAddressAssetId(
      accounts.factory.address,
      secondAssetId
    )

    const { balance: factorySecondAssetBalanceAfter } = await api.assets.fetchBalanceAddressAssetId(
      accounts.factory.address,
      secondAssetId
    )

    const { balance: factoryThirdAssetBalanceAfter } = await api.assets.fetchBalanceAddressAssetId(
      accounts.factory.address,
      secondAssetId
    )

    const expectedFactoryFirstAssetBalance = factoryFirstAssetBalanceBefore + paymentAmount
    const expectedFactorySecondAssetBalance = factorySecondAssetBalanceBefore + paymentAmount
    const expectedFactoryThirdAssetBalance = factoryThirdAssetBalanceBefore + paymentAmount

    expect(factoryFirstAssetBalanceAfter, 'invalid factory first asset balance').to.equal(expectedFactoryFirstAssetBalance)
    expect(factorySecondAssetBalanceAfter, 'invalid factory second asset balance').to.equal(expectedFactorySecondAssetBalance)
    expect(factoryThirdAssetBalanceAfter, 'invalid factory third asset balance').to.equal(expectedFactoryThirdAssetBalance)
  })
})
