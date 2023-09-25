import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { chainId, broadcastAndWait } from '../../../utils/api.js'
import { setup } from './_setup.js'
import { invokeScript } from '@waves/waves-transactions'
import { base58Decode, base64Encode } from '@waves/ts-lib-crypto'

chai.use(chaiAsPromised)
const { expect } = chai

describe(`[${process.pid}] proxy_treasury: transfer Waves`, () => {
  let accounts

  before(async () => {
    (accounts = await setup())
  })

  it('user is rejected when try to transferWaves', async () => {
    const transferAmount = 12345678
    const invokeTx = invokeScript({
      dApp: accounts.proxyTreasury.address,
      call: {
        function: 'transferWaves',
        args: [
          {
            type: 'binary',
            value: base64Encode(base58Decode(accounts.user1.address))
          },
          {
            type: 'integer',
            value: transferAmount
          }
        ]
      },
      chainId
    }, accounts.user1.seed)

    return expect(broadcastAndWait(invokeTx)).to.be.rejectedWith('permission denied')
  })

  it('factory can successfully invoke transferWaves', async () => {
    const transferAmount = 12345678
    const invokeTx = invokeScript({
      dApp: accounts.proxyTreasury.address,
      call: {
        function: 'transferWaves',
        args: [
          {
            type: 'binary',
            value: base64Encode(base58Decode(accounts.user1.address))
          },
          {
            type: 'integer',
            value: transferAmount
          }
        ]
      },
      chainId
    }, accounts.factory.seed)

    const { stateChanges } = await broadcastAndWait(invokeTx)
    return expect(stateChanges.transfers).to.be.deep.equal([{
      address: accounts.user1.address,
      amount: transferAmount,
      asset: null
    }])
  })
})
