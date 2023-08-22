import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { api, chainId, broadcastAndWait, baseSeed, waitForHeight } from '../../../utils/api.js'
import { setup } from './_setup.js'
import { invokeScript, transfer, issue } from '@waves/waves-transactions'

chai.use(chaiAsPromised)
const { expect } = chai

const scale8 = 1e8
const periodLen = 5
const paymentAmount = 1e8

describe(`[${process.pid}] calculator: claim collateral`, () => {
  let accounts, lpAssetId, investedWavesAmount, startHeight

  before(async () => {
    const { height } = await api.blocks.fetchHeight()
    investedWavesAmount = 500 * 1e8;
    ({ accounts, lpAssetId } = await setup({
      investedWavesAmount,
      nextBlockToProcess: height,
      periodLength: periodLen
    }))

    startHeight = height

    investedWavesAmount += paymentAmount

    await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: { function: 'invest', args: [] },
      payment: [{ assetId: null, amount: paymentAmount }],
      chainId
    }, accounts.user1.seed))
  })

  it('user should successfully claim assets after finalization', async () => {
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

    const { id: withdrawTxId } = await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: { function: 'withdraw', args: [] },
      payment: [{ assetId: lpAssetId, amount: paymentAmount }],
      chainId
    }, accounts.user1.seed))

    const newDonatedInWaves = 2000 * 1e8
    const newLpInWaves = 1000 * 1e8
    const claimAmountInWaves = 100 * 1e8
    const pwrManagersBonusInWaves = 100 * 1e8

    await waitForHeight(startHeight + periodLen + 1)

    await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: { function: 'processBlocks', args: [] },
      chainId
    }, accounts.user1.seed))

    const [{ quantity }] = await api.assets.fetchDetails([lpAssetId])

    await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'finalize',
        args: [
          { type: 'integer', value: newDonatedInWaves },
          { type: 'integer', value: newLpInWaves },
          { type: 'integer', value: claimAmountInWaves },
          { type: 'integer', value: pwrManagersBonusInWaves }
        ]
      },
      payment: [
        { assetId: firstAssetId, amount: paymentAmount },
        { assetId: secondAssetId, amount: paymentAmount },
        { assetId: thirdAssetId, amount: paymentAmount }
      ],
      chainId,
      additionalFee: 4e5
    }, accounts.mainTreasury.seed))

    const { stateChanges } = await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'claimCollateral',
        args: [
          { type: 'string', value: withdrawTxId }
        ]
      },
      chainId
    }, accounts.user1.seed))

    const stateChangesTransfers = stateChanges.invokes[0].stateChanges.invokes[2].stateChanges.transfers

    const { value: price } = await api.addresses.fetchDataKey(accounts.factory.address, '%s%d__price__1')
    const expectedPrice = Math.floor(newLpInWaves * scale8 / (quantity - paymentAmount))
    expect(price, 'wrong price').to.equal(expectedPrice)
    expect(stateChangesTransfers, 'wrong collateral transfers').to.deep.equal([
      {
        address: accounts.user1.address,
        asset: firstAssetId,
        amount: paymentAmount
      },
      {
        address: accounts.user1.address,
        asset: secondAssetId,
        amount: paymentAmount
      },
      {
        address: accounts.user1.address,
        asset: thirdAssetId,
        amount: paymentAmount
      }
    ])
  })
})
