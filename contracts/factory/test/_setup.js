import wc from '@waves/ts-lib-crypto'
import {
  data,
  massTransfer
} from '@waves/waves-transactions'
import { format } from 'path'
import { table, getBorderCharacters } from 'table'

import {
  chainId, broadcastAndWait, baseSeed, setScriptFromFile
} from '../../../utils/api.js'

const nonceLength = 3
const ridePath = 'contracts/factory'
const mockPath = 'contracts/factory/mock'
const factoryPath = format({ dir: ridePath, base: 'factory.ride' })
const calculatorMockPath = format({ dir: mockPath, base: 'calculator.mock.ride' })

export const setupAccounts = async () => {
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

  await setScriptFromFile(factoryPath, accounts.factory.seed)
  await setScriptFromFile(calculatorMockPath, accounts.calculator.seed)

  await broadcastAndWait(data({
    additionalFee: 4e5,
    data: [
      {
        key: '%s__calculator',
        type: 'string',
        value: accounts.calculator.address
      }
    ],
    chainId
  }, accounts.factory.seed))

  const accountsInfo = Object.entries(accounts)
    .map(([name, { seed, address }]) => [name, address])
  console.log(table(accountsInfo, {
    border: getBorderCharacters('norc'),
    drawHorizontalLine: (index, size) => index === 0 || index === 1 || index === size,
    header: { content: `pid: ${process.pid}, nonce: ${nonce}` }
  }))

  return accounts
}
