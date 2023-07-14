import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { data } from '@waves/waves-transactions'
import { broadcastAndWait, chainId } from '../../../utils/api.js'
import { setupAccounts } from './_setup.js'

chai.use(chaiAsPromised)
const { expect } = chai

describe(`[${process.pid}] factory: admins`, () => {
  let dataTx, accounts

  before(async () => {
    accounts = await setupAccounts()

    dataTx = data(
      {
        additionalFee: 4e5,
        data: [{ key: 'foo', type: 'string', value: 'bar' }],
        chainId
      },
      accounts.factory.seed
    )
  })

  it('owner can set config address if it was not specified', async () => {
    const setConfigAddressTx = data({
      additionalFee: 4e5,
      data: [
        {
          key: '%s__config',
          type: 'string',
          value: accounts.config.address
        }
      ],
      chainId
    }, accounts.factory.seed)

    return expect(broadcastAndWait(setConfigAddressTx)).to.be.fulfilled
  })

  it('can set admins by owner initially', async () => {
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
    return expect(broadcastAndWait(setAdminsTx)).to.be.fulfilled
  })

  it('owner is denied after admins and config address are specified', async () => {
    return expect(broadcastAndWait(dataTx)).to.be.rejectedWith('Transaction is not allowed by account-script')
  })

  it('tx by proposal should be successfully broadcasted', async () => {
    await broadcastAndWait(data({
      additionalFee: 4e5,
      data: [
        {
          key: `proposal_allow_broadcast_${accounts.factory.address}_${dataTx.id}`,
          type: 'boolean',
          value: true
        }
      ],
      chainId
    }, accounts.votingResult.seed))

    return expect(broadcastAndWait(dataTx)).to.be.fulfilled
  })
})
