import { create } from '@waves/node-api-js'
import { nodeInteraction, setScript } from '@waves/waves-transactions'
import ride from '@waves/ride-js'

import { readFile } from 'fs/promises'

export const { API_NODE_URL: apiBase, CHAIN_ID: chainId, BASE_SEED: baseSeed } = process.env

export const api = create(apiBase)
export const largeNumbeConvertHeader = { headers: { Accept: 'application/json;large-significand-format=string' } }

export const separator = '__'

export const broadcastAndWait = async (tx) => {
  await api.transactions.broadcast(tx, {})
  await nodeInteraction.waitForTx(tx.id, { apiBase })
  return api.transactions.fetchInfo(tx.id)
}

export const waitForTx = (txId) => nodeInteraction.waitForTx(txId, { apiBase })

export const waitForHeight = (height) => nodeInteraction.waitForHeight(height, { apiBase })

export const waitNBlocks = (blocksCount) => nodeInteraction.waitNBlocks(blocksCount, { apiBase })

/**
 * @param {string} path
 * @param {string} account
 * @param {function(*): *} transform
 */
export const setScriptFromFile = async (
  path,
  account,
  transform = (content) => content
) => {
  const { base64, size } = ride.compile(transform(await readFile(path, { encoding: 'utf-8' }))).result
  const waveletsPerKilobyte = 1e5
  const bitsInByte = 1024
  const min = 1000000
  let fee = Math.ceil(size / bitsInByte) * waveletsPerKilobyte
  if (fee < min) {
    fee = min
  }
  fee += 4e5
  const ssTx = setScript({
    script: base64,
    chainId,
    fee
  }, account)
  await broadcastAndWait(ssTx)
}
