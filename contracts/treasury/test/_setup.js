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
const proxyTreasuryPath = format({ dir: 'contracts/treasury', base: 'proxy_treasury.ride' })

export const setup = async () => {
  const nonce = wc.random(nonceLength, 'Buffer').toString('hex')
  const names = [
    'factory',
    'proxyTreasury',
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

  await setScriptFromFile(proxyTreasuryPath, accounts.proxyTreasury.seed)

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
  }, accounts.proxyTreasury.seed))

  const accountsInfo = Object.entries(accounts)
    .map(([name, { seed, address }]) => [name, address])
  console.log(table(accountsInfo, {
    border: getBorderCharacters('norc'),
    drawHorizontalLine: (index, size) => index === 0 || index === 1 || index === size,
    header: { content: `pid: ${process.pid}, nonce: ${nonce}` }
  }))

  return accounts
}
