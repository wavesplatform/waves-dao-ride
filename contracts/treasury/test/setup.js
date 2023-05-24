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
const ridePath = 'contracts/treasury'
const treasuryPath = format({ dir: ridePath, base: 'treasury.ride' })

export const setupAccounts = async () => {
  const nonce = wc.random(nonceLength, 'Buffer').toString('hex')
  const names = [
    'config',
    'votingResult',
    'treasury',
    'admin1',
    'admin2',
    'admin3',
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

  await setScriptFromFile(treasuryPath, accounts.treasury.seed)

  await broadcastAndWait(data({
    additionalFee: 4e5,
    data: [
      {
        key: '%s__config',
        type: 'string',
        value: accounts.config.address
      }
    ],
    chainId
  }, accounts.treasury.seed))

  await broadcastAndWait(data({
    additionalFee: 4e5,
    data: [
      {
        key: 'contract_voting_result',
        type: 'string',
        value: accounts.votingResult.address
      }
    ],
    chainId
  }, accounts.config.seed))

  const adminsListString = [
    accounts.admin1.address,
    accounts.admin2.address,
    accounts.admin3.address
  ].join('__')
  const setAdminsTx = data({
    additionalFee: 4e5,
    data: [
      {
        key: '%s__adminAddressList',
        type: 'string',
        value: adminsListString
      }
    ],
    chainId
  }, accounts.treasury.seed)
  await broadcastAndWait(setAdminsTx)

  const accountsInfo = Object.entries(accounts)
    .map(([name, { seed, address }]) => [name, address])
  console.log(table(accountsInfo, {
    border: getBorderCharacters('norc'),
    drawHorizontalLine: (index, size) => index === 0 || index === 1 || index === size,
    header: { content: `pid: ${process.pid}, nonce: ${nonce}` }
  }))

  return accounts
}
