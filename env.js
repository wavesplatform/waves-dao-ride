const envs = {
  testnet: {
    chainId: 'T',
    apiBase: 'https://nodes-testnet.wavesnodes.com'
  },
  custom: {
    chainId: 'R',
    apiBase: 'http://localhost:6869',
    baseSeed: 'waves private node seed with waves tokens',
    daoSeed: 'waves private node seed dao address'
  }
}

export const env = (network = 'custom') => envs[network]
