import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { api } from '../../../utils/api.js'
import { setup } from './_setup.js'

chai.use(chaiAsPromised)
const { expect } = chai

describe(`[${process.pid}] calculator: factory address`, () => {
  let accounts

  before(async () => {
    ({ accounts } = await setup())
  })

  it('factory address should be known', async () => {
    const { result } = await api.utils.fetchEvaluate(accounts.calculator.address, 'factoryAddressOrFail')
    expect(result.value.bytes.value).to.equal(accounts.factory.address)
  })
})
