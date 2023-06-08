import { create } from '@waves/node-api-js'
import { nodeInteraction, setScript } from '@waves/waves-transactions'

import { readFile } from 'fs/promises'
import { env } from '../env.js'

export const { apiBase, chainId, baseSeed } = env(process.env.NETWORK)

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
  const { script, extraFee, error } = await api.utils.fetchCompileCode(await readFile(path, { encoding: 'utf-8' }))
  if (error) throw new Error(error.message)
  const ssTx = setScript({
    script,
    chainId,
    additionalFee: extraFee
  }, account)
  await broadcastAndWait(ssTx)
}
