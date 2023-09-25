import { create } from '@waves/node-api-js'
import { nodeInteraction, setScript } from '@waves/waves-transactions'

import { readFile } from 'fs/promises'
import { env } from '../env.js'
import { address } from '@waves/ts-lib-crypto'

export const { apiBase, chainId, baseSeed, daoSeed } = env(process.env.NETWORK)

export const daoAddress = () => address(daoSeed, chainId)

export const api = create(apiBase)
export const largeNumberConvertHeader = { headers: { Accept: 'application/json;large-significand-format=string' } }

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
  const file = await readFile(path, { encoding: 'utf-8' })
  const fileTransformed = transform(file)
  const { script, extraFee, error } = await api.utils.fetchCompileCode(fileTransformed)
  if (error) throw new Error(error.message)
  const ssTx = setScript({
    script,
    chainId,
    additionalFee: extraFee
  }, account)
  return broadcastAndWait(ssTx)
}
