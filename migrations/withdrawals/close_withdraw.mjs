import { data } from '@waves/waves-transactions'
import { writeFile } from 'fs'

const chainId = 'W'
const nodeUrl = 'https://nodes.wx.network'
const dataUrl = nodeUrl + '/addresses/data/'
const keyRegEx = '?matches=%s%s%s__withdrawal__.*'
const SEP = '__'
const withdrawPeriod = '2'

const factoryAddress = '3PJVm7xLPabmYohbnvdgGDYHMwnZxF2x18m'
const factoryPubKey = '7iwk3fSEypQw8aS1jGbgX19wsMviMu9tAENmGtHir9He'

const addrDataUrl = dataUrl + factoryAddress + keyRegEx
const req = fetch(encodeURI(addrDataUrl))

req.then((res) => {
  res.json().then((jsonData) => {
    // Filter out withdrawals from different period
    const filteredJsonData = jsonData.filter((el) => el.value.split(SEP)[3] === withdrawPeriod)
    console.log(jsonData.length, filteredJsonData.length)
    console.log('=============')

    const chunkSize = 50
    for (let i = 0; i < filteredJsonData.length; i += chunkSize) {
      const chunk = filteredJsonData.slice(i, i + chunkSize)

      const stateData = []
      for (const c of chunk) {
        const keyArr = c.key.split(SEP)
        const userAddress = keyArr[2]
        const txId = keyArr[3]

        const valArr = c.value.split(SEP)
        const lpAmount = valArr[2]

        const withdrawHistoryKey = `%s%s%s__withdrawalHistory__${userAddress}__${txId}`

        stateData.push({ key: c.key, value: null })
        stateData.push({ key: withdrawHistoryKey, type: 'integer', value: parseInt(lpAmount) })
      }
      console.log(stateData.length)

      const dataTx = data({
        data: stateData,
        chainId,
        additionalFee: 4e5,
        senderPublicKey: factoryPubKey
      })

      delete dataTx.timestamp
      delete dataTx.proofs
      delete dataTx.id
      delete dataTx.chainId

      const fileName = `factory_dataTx_${parseInt(i / chunkSize)}.json`
      writeFile(fileName, JSON.stringify(dataTx), (err) => { console.log(err) })
    }
  })
})
