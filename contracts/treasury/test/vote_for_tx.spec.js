import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { invokeScript, data } from '@waves/waves-transactions'
import { api, broadcastAndWait, chainId } from '../../../utils/api.js'
import { setupAccounts } from './_setup.js'

chai.use(chaiAsPromised)
const { expect } = chai

describe(`[${process.pid}] treasury: vote for allowed tx`, () => {
  let dataTx, treasury, accounts

  before(async () => {
    accounts = await setupAccounts()
    treasury = accounts.treasury.address

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

    // set admins
    const setAdminsTx = data({
      additionalFee: 4e5,
      data: [
        {
          key: '%s__adminAddressList',
          type: 'string',
          value: [
            accounts.admin1.address,
            accounts.admin2.address,
            accounts.admin3.address
          ].join('__')
        }
      ],
      chainId
    }, accounts.treasury.seed)
    await broadcastAndWait(setAdminsTx)

    dataTx = data(
      {
        additionalFee: 4e5,
        data: [{ key: 'foo', type: 'string', value: 'bar' }],
        chainId
      },
      accounts.treasury.seed
    )
  })

  it('tx should be rejected before vote for allowed txid', async () => {
    return expect(api.transactions.broadcast(dataTx)).to.be.rejectedWith('Transaction is not allowed by account-script')
  })

  it('first vote should increment votes count', async () => {
    const vote1tx = invokeScript(
      {
        dApp: treasury,
        call: {
          function: 'voteForTxId',
          args: [{ type: 'string', value: dataTx.id }]
        },
        chainId
      },
      accounts.admin1.seed
    )
    const vote1 = await broadcastAndWait(vote1tx)

    expect(vote1.stateChanges.data).to.eql([
      {
        key: `%s%s%s__allowTxId__${dataTx.id}__${accounts.admin1.address}`,
        type: 'integer',
        value: 1
      }
    ])
  })

  it('second vote should approve tx and remove voting data', async () => {
    const vote2tx = invokeScript(
      {
        dApp: treasury,
        call: {
          function: 'voteForTxId',
          args: [{ type: 'string', value: dataTx.id }]
        },
        chainId
      },
      accounts.admin3.seed
    )
    const vote2 = await broadcastAndWait(vote2tx)

    expect(vote2.stateChanges.data).to.eql([
      {
        key: `%s%s%s__allowTxId__${dataTx.id}__${accounts.admin1.address}`,
        value: null
      },
      {
        key: `%s%s%s__allowTxId__${dataTx.id}__${accounts.admin2.address}`,
        value: null
      },
      {
        key: `%s%s%s__allowTxId__${dataTx.id}__${accounts.admin3.address}`,
        value: null
      },
      {
        key: '%s__txId',
        type: 'string',
        value: dataTx.id
      }
    ])
  })

  it('tx should be allowed after vote for allowed txid', async () => {
    return expect(broadcastAndWait(dataTx)).to.be.fulfilled
  })
})
