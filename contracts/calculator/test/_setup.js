import wc from '@waves/ts-lib-crypto'
import {
  burn,
  data,
  issue,
  massTransfer
} from '@waves/waves-transactions'
import { format } from 'path'
import { table, getBorderCharacters } from 'table'

import {
  chainId, broadcastAndWait, baseSeed, setScriptFromFile, daoAddress, daoSeed
} from '../../../utils/api.js'

const nonceLength = 3
const calculatorPath = format({ dir: 'contracts/calculator', base: 'calculator.ride' })
const factoryPath = format({ dir: 'contracts/factory', base: 'factory.ride' })
const scale8 = 1e8

export const setup = async ({
  periodLength = 2,
  blockProcessingReward = 500000,
  nextBlockToProcess = 2,
  currentPeriod = 0,
  price = 100000000,
  period = 0,
  donatedWavesAmount = 0,
  investedWavesAmount = 0
} = {}) => {
  const nonce = wc.random(nonceLength, 'Buffer').toString('hex')
  const names = [
    'factory',
    'calculator',
    'treasury',
    'mainTreasury',
    'user1'
  ]
  const accounts = Object.fromEntries(names.map((item) => {
    const seed = `${item}#${nonce}`
    return [item, { seed, address: wc.address(seed, chainId), publicKey: wc.publicKey(seed) }]
  }))
  const accountsInfo = Object.entries(accounts)
    .map(([name, { address }]) => [name, address])
  console.log(table(accountsInfo, {
    border: getBorderCharacters('norc'),
    drawHorizontalLine: (index, size) => index === 0 || index === 1 || index === size,
    header: { content: `pid: ${process.pid}, nonce: ${nonce}` }
  }))
  const amount = 100e8
  const massTransferTx = massTransfer({
    transfers: Object.values(accounts).map(({ address }) => ({ recipient: address, amount })),
    chainId
  }, baseSeed)
  await broadcastAndWait(massTransferTx)

  const lpAssetAmountToIssueRaw = Math.floor(investedWavesAmount * price / scale8)
  const lpAssetAmountToIssue = lpAssetAmountToIssueRaw === 0 ? 1 : lpAssetAmountToIssueRaw

  const { id: lpAssetId } = await broadcastAndWait(issue({
    name: 'WAVESDAOLP',
    description: '',
    quantity: lpAssetAmountToIssue,
    decimals: 8,
    reissuable: true,
    chainId
  }, accounts.factory.seed))

  if (lpAssetAmountToIssueRaw === 0) {
    await broadcastAndWait(burn({
      assetId: lpAssetId,
      amount: 1,
      chainId
    }, accounts.factory.seed))
  }

  await broadcastAndWait(data({
    additionalFee: 4e5,
    data: [
      { key: '%s__factory', type: 'string', value: accounts.factory.address }
    ],
    chainId
  }, accounts.calculator.seed))

  await broadcastAndWait(data({
    additionalFee: 4e5,
    data: [
      { key: '%s__factory', type: 'string', value: accounts.factory.address }
    ],
    chainId
  }, daoSeed))

  await broadcastAndWait(data({
    additionalFee: 4e5,
    data: [
      { key: '%s__calculator', type: 'string', value: accounts.calculator.address },
      { key: '%s__proxyTreasury', type: 'string', value: daoAddress() },
      { key: '%s__mainTreasury', type: 'string', value: accounts.mainTreasury.address },
      { key: '%s__lpAssetId', type: 'string', value: lpAssetId },
      { key: '%s__nextBlockToProcess', type: 'integer', value: nextBlockToProcess },
      { key: '%s__currentPeriod', type: 'integer', value: currentPeriod },
      { key: `%s%d__startHeight__${period}`, type: 'integer', value: nextBlockToProcess },
      { key: `%s%d__price__${period}`, type: 'integer', value: price },
      { key: '%s__periodLength', type: 'integer', value: periodLength },
      { key: '%s__blockProcessingReward', type: 'integer', value: blockProcessingReward },
      { key: '%s%s__invested__WAVES', type: 'integer', value: investedWavesAmount },
      { key: '%s%s__donated__WAVES', type: 'integer', value: donatedWavesAmount }
    ],
    chainId
  }, accounts.factory.seed))

  await setScriptFromFile(calculatorPath, accounts.calculator.seed)
  await setScriptFromFile(factoryPath, accounts.factory.seed)

  return { accounts, lpAssetId, periodLength, blockProcessingReward, price }
}
