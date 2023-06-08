import { chainId, setScriptFromFile } from '../utils/api.js'
import wc from '@waves/ts-lib-crypto'
import inquirer from 'inquirer'
import inquirerFileTreeSelection from 'inquirer-file-tree-selection-prompt'

inquirer.registerPrompt('file-tree-selection', inquirerFileTreeSelection)

const { rideFilePath, privateKey } = await inquirer.prompt([
  {
    type: 'file-tree-selection',
    name: 'rideFilePath',
    message: 'Select ride file:',
    root: 'contracts',
    validate: (answer) => /\.ride$/.test(answer)
  },
  {
    type: 'password',
    name: 'privateKey',
    message: 'Private key:',
    mask: '*'
  }
])

const publicKey = wc.publicKey({ privateKey })
const targetAddress = wc.address({ publicKey }, chainId)

const { confirm } = await inquirer.prompt([
  {
    type: 'confirm',
    name: 'confirm',
    message: `Set script from ${rideFilePath} for ${targetAddress}?`
  }
])

if (confirm) await setScriptFromFile(rideFilePath, { privateKey })
