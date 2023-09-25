import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { invokeScript, data } from '@waves/waves-transactions'
import { api, broadcastAndWait, chainId } from '../../../utils/api.js'
import { setupAccounts } from './_setup.js'

chai.use(chaiAsPromised)
const { expect } = chai

describe(`[${process.pid}] factory: vote for allowed tx`, () => {
  let dataTx, factory, accounts

  before(async () => {
    accounts = await setupAccounts()
    factory = accounts.factory.address

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
    }, accounts.factory.seed))

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
            accounts.admin3.address,
            accounts.admin4.address,
            accounts.admin5.address
          ].join('__')
        }
      ],
      chainId
    }, accounts.factory.seed)
    await broadcastAndWait(setAdminsTx)

    dataTx = data(
      {
        additionalFee: 4e5,
        data: [{ key: 'foo', type: 'string', value: 'bar' }],
        chainId
      },
      accounts.factory.seed
    )
  })

  it('tx should be rejected before vote for allowed txid', async () => {
    return expect(api.transactions.broadcast(dataTx)).to.be.rejectedWith('Transaction is not allowed by account-script')
  })

  it('first votes should increment votes count', async () => {
    await broadcastAndWait(invokeScript(
      {
        dApp: factory,
        call: {
          function: 'voteForTxId',
          args: [{ type: 'string', value: dataTx.id }]
        },
        chainId
      },
      accounts.admin1.seed
    ))
    await broadcastAndWait(invokeScript(
      {
        dApp: factory,
        call: {
          function: 'voteForTxId',
          args: [{ type: 'string', value: dataTx.id }]
        },
        chainId
      },
      accounts.admin2.seed
    ))

    const allowTxIdVotes = await api.addresses.data(factory, { matches: encodeURIComponent(`%s%s%s__allowTxId__${dataTx.id}__.+`) })

    expect(allowTxIdVotes).to.deep.include.members([
      {
        key: `%s%s%s__allowTxId__${dataTx.id}__${accounts.admin1.address}`,
        type: 'integer',
        value: 1
      },
      {
        key: `%s%s%s__allowTxId__${dataTx.id}__${accounts.admin2.address}`,
        type: 'integer',
        value: 1
      }
    ])
  })

  it('last vote should approve tx and remove voting data', async () => {
    const voteTx = invokeScript(
      {
        dApp: factory,
        call: {
          function: 'voteForTxId',
          args: [{ type: 'string', value: dataTx.id }]
        },
        chainId
      },
      accounts.admin5.seed
    )
    const { stateChanges } = await broadcastAndWait(voteTx)

    expect(stateChanges.data).to.eql([
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
        key: `%s%s%s__allowTxId__${dataTx.id}__${accounts.admin4.address}`,
        value: null
      },
      {
        key: `%s%s%s__allowTxId__${dataTx.id}__${accounts.admin5.address}`,
        value: null
      },
      {
        key: '%s__txId',
        type: 'string',
        value: dataTx.id
      }
    ])
  })

  it('vote should be failed if tx is already allowed', async () => {
    const voteTx = invokeScript(
      {
        dApp: factory,
        call: {
          function: 'voteForTxId',
          args: [{ type: 'string', value: dataTx.id }]
        },
        chainId
      },
      accounts.admin3.seed
    )

    return expect(broadcastAndWait(voteTx)).to.be.rejectedWith(`${dataTx.id} is already allowed`)
  })

  it('tx should be allowed after vote for allowed txid', async () => {
    return expect(broadcastAndWait(dataTx)).to.be.fulfilled
  })
})
