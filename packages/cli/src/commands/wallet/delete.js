// @flow
import { flags } from '@oclif/command'

import Command from '../../OpenVaultCommand'

export default class WalletDeleteCommand extends Command {
  static description = 'Delete wallet'
  static flags = {
    ...Command.flags,
    id: flags.string({
      description: 'wallet local ID',
    }),
    type: flags.string({
      description: 'wallet local type (hd, ledger or pk)',
    }),
  }

  async run() {
    const client = this.client
    if (client == null) {
      return
    }

    await client.wallet.deleteWallet({
      walletID: this.flags.id,
      type: this.flags.type,
      chain: 'ethereum',
    })

    this.log(`Removed wallet: ${this.flags.id}`)
  }
}
