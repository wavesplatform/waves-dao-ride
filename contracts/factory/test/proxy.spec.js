import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { invokeScript } from '@waves/waves-transactions'
import { broadcastAndWait, chainId } from '../../../utils/api.js'
import { setupAccounts } from './_setup.js'

chai.use(chaiAsPromised)
const { expect } = chai

describe(`[${process.pid}] factory: proxy`, () => {
  let accounts

  before(async () => {
    accounts = await setupAccounts()
  })

  it('should proxy function to calculator', async () => {
    const { stateChanges } = await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'invest',
        args: []
      },
      chainId
    }, accounts.user1.seed))
    const targetCall = stateChanges.invokes[0].call
    expect(targetCall.function).to.equal('invest')
    expect(targetCall.args[0].type).to.equal('ByteVector')
    expect(targetCall.args[0].value).to.equal(accounts.user1.address)
  })
})
