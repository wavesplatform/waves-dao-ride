import { setScriptFromFile } from '../utils/api.js'
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

await setScriptFromFile(rideFilePath, { privateKey })
