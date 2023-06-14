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
  chainId, broadcastAndWait, baseSeed, setScriptFromFile, daoAddress
} from '../../../utils/api.js'

const nonceLength = 3
const calculatorPath = format({ dir: 'contracts/calculator', base: 'calculator.ride' })
const factoryMockPath = format({ dir: 'contracts/factory', base: 'factory.ride' })

export const setup = async () => {
  const nonce = wc.random(nonceLength, 'Buffer').toString('hex')
  const names = [
    'factory',
    'calculator',
    'treasury',
    'user1'
  ]
  const accounts = Object.fromEntries(names.map((item) => {
    const seed = `${item}#${nonce}`
    return [item, { seed, address: wc.address(seed, chainId), publicKey: wc.publicKey(seed) }]
  }))
  const amount = 100e8
  const massTransferTx = massTransfer({
    transfers: Object.values(accounts).map(({ address }) => ({ recipient: address, amount })),
    chainId
  }, baseSeed)
  await broadcastAndWait(massTransferTx)

  const { id: lpAssetId } = await broadcastAndWait(issue({
    name: 'WAVESDAOLP',
    description: '',
    quantity: 1,
    decimals: 8,
    reissuable: true,
    chainId
  }, accounts.factory.seed))

  await broadcastAndWait(burn({
    assetId: lpAssetId,
    amount: 1,
    chainId
  }, accounts.factory.seed))

  await broadcastAndWait(data({
    additionalFee: 4e5,
    data: [
      {
        key: '%s__factory',
        type: 'string',
        value: accounts.factory.address
      }
    ],
    chainId
  }, accounts.calculator.seed))

  await broadcastAndWait(data({
    additionalFee: 4e5,
    data: [
      {
        key: '%s__calculator',
        type: 'string',
        value: accounts.calculator.address
      },
      {
        key: '%s__treasury',
        type: 'string',
        value: daoAddress
      },
      {
        key: '%s__lpAssetId',
        type: 'string',
        value: lpAssetId
      }
    ],
    chainId
  }, accounts.factory.seed))

  await setScriptFromFile(calculatorPath, accounts.calculator.seed)
  await setScriptFromFile(factoryMockPath, accounts.factory.seed)

  const accountsInfo = Object.entries(accounts)
    .map(([name, { seed, address }]) => [name, address])
  console.log(table(accountsInfo, {
    border: getBorderCharacters('norc'),
    drawHorizontalLine: (index, size) => index === 0 || index === 1 || index === size,
    header: { content: `pid: ${process.pid}, nonce: ${nonce}` }
  }))

  return { accounts, lpAssetId }
}
