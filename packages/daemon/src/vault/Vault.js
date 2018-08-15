// @flow

// eslint-disable-next-line import/named
import {
  isValidSemver,
  writeManifestFile,
  type ManifestData, // eslint-disable-line import/named
  type PartialManifestData, // eslint-disable-line import/named
} from '@mainframe/app-manifest'
import {
  createRequirements,
  type PermissionsRequirements, // eslint-disable-line import/named
} from '@mainframe/app-permissions'
import { readEncryptedFile, writeEncryptedFile } from '@mainframe/secure-file'
import {
  decodeBase64,
  encodeBase64,
  type base64, // eslint-disable-line import/named
} from '@mainframe/utils-base64'
import {
  PASSWORDHASH_ALG_ARGON2ID13,
  PASSWORDHASH_MEMLIMIT_SENSITIVE,
  PASSWORDHASH_OPSLIMIT_SENSITIVE,
  createPasswordHashSalt,
  createSecretBoxKeyFromPassword,
} from '@mainframe/utils-crypto'
// eslint-disable-next-line import/named
import { uniqueID, type ID } from '@mainframe/utils-id'

import type { AppUserSettings, SessionData } from '../app/AbstractApp'
import type App from '../app/App'
import AppsRepository, {
  type AppsRepositorySerialized,
} from '../app/AppsRepository'
import type OwnApp from '../app/OwnApp'
import type Session from '../app/Session'
import IdentitiesRepository, {
  type IdentitiesRepositorySerialized,
} from '../identity/IdentitiesRepository'

type VaultKDF = {
  algorithm: number,
  memlimit: number,
  opslimit: number,
  salt: base64,
}

type VaultMetadata = {
  version: 1,
  kdf: VaultKDF,
}

type VaultKeyParams = {
  key: Buffer,
  kdf: VaultKDF,
}

export const createVaultKeyParams = async (
  password: Buffer,
): Promise<VaultKeyParams> => {
  const salt = createPasswordHashSalt()
  const kdf = {
    algorithm: PASSWORDHASH_ALG_ARGON2ID13,
    memlimit: PASSWORDHASH_MEMLIMIT_SENSITIVE,
    opslimit: PASSWORDHASH_OPSLIMIT_SENSITIVE,
    salt: encodeBase64(salt),
  }
  const key = await createSecretBoxKeyFromPassword(
    password,
    salt,
    kdf.opslimit,
    kdf.memlimit,
    kdf.algorithm,
  )
  return { kdf, key }
}

export const readVaultFile = async (
  path: string,
  password: Buffer,
): Promise<{ keyParams: VaultKeyParams, data: Object }> => {
  let keyParams
  const file = await readEncryptedFile(path, async (meta: ?VaultMetadata) => {
    if (meta == null) {
      throw new Error('Missing metadata')
    }
    if (meta.version !== 1) {
      throw new Error('Invalid vault format version')
    }
    if (meta.kdf == null) {
      throw new Error('Missing KDF parameters in metadata')
    }

    const key = await createSecretBoxKeyFromPassword(
      password,
      decodeBase64(meta.kdf.salt),
      meta.kdf.opslimit,
      meta.kdf.memlimit,
      meta.kdf.algorithm,
    )
    keyParams = { key, kdf: meta.kdf }

    return key
  })

  if (file.opened == null) {
    throw new Error('Invalid password')
  }
  if (keyParams == null) {
    throw new Error('Invalid file')
  }

  return {
    data: JSON.parse(file.opened.toString()),
    keyParams,
  }
}

export type UserSettings = {
  bzzURL: string,
  web3HTTPProvider: string,
}

export type VaultData = {
  apps: AppsRepository,
  identities: IdentitiesRepository,
  settings: UserSettings,
}

export type VaultSerialized = {
  apps?: AppsRepositorySerialized,
  identities?: IdentitiesRepositorySerialized,
  settings?: UserSettings,
}

export default class Vault {
  static create = async (path: string, password: Buffer): Promise<Vault> => {
    const keyParams = await createVaultKeyParams(password)
    const vault = new Vault(path, keyParams)
    await vault.save()
    return vault
  }

  static open = async (path: string, password: Buffer): Promise<Vault> => {
    const { data, keyParams } = await readVaultFile(path, password)
    return new Vault(path, keyParams, {
      apps: AppsRepository.fromJSON(data.apps),
      identities: IdentitiesRepository.fromJSON(data.identities),
      settings: data.settings,
    })
  }

  _path: string
  _keyParams: VaultKeyParams
  _data: VaultData
  _sessions: { [ID]: Session } = {}

  constructor(path: string, keyParams: VaultKeyParams, data?: ?VaultData) {
    this._path = path
    this._keyParams = keyParams

    const vaultData = {
      apps: new AppsRepository(),
      identities: new IdentitiesRepository(),
      settings: {
        bzzURL: 'http://localhost:8500',
        web3HTTPProvider: 'https://mainnet.infura.io/KWLG1YOMaYgl4wiFlcJv',
      },
    }
    this._data = data ? Object.assign(vaultData, data) : vaultData
  }

  // Getters

  get path(): string {
    return this._path
  }

  get apps(): AppsRepository {
    return this._data.apps
  }

  get identities(): IdentitiesRepository {
    return this._data.identities
  }

  get settings(): UserSettings {
    return this._data.settings
  }

  // App lifecycle

  closeApp(sessID: ID): void {
    delete this._sessions[sessID]
  }

  openApp(appID: ID, userID: ID): SessionData {
    const sessionData = this.apps.createSession(appID, userID)
    this._sessions[sessionData.sessID] = sessionData.session
    return sessionData
  }

  installApp(
    manifest: ManifestData,
    userID: ID,
    settings: AppUserSettings,
  ): App {
    let app = this.apps.getByMainframeID(manifest.id)
    if (app == null) {
      // Add app with user settings
      app = this.apps.add(manifest, userID, settings)
    } else {
      // Set user settings for already existing app
      this.apps.setUserSettings(app.id, userID, settings)
    }
    return app
  }

  removeApp(appID: ID) {
    this.apps.remove(appID)
  }

  getSession(id: ID): ?Session {
    return this._sessions[id]
  }

  // App creation and management

  createApp(params: {
    contentsPath: string,
    developerID?: ?ID,
    name?: ?string,
    version?: ?string,
  }): OwnApp {
    const appIdentity = this.identities.getOwnApp(
      this.identities.createOwnApp(),
    )
    if (appIdentity == null) {
      throw new Error('Failed to create app identity')
    }

    let developerID = params.developerID
    if (developerID == null) {
      developerID = this.identities.createOwnDeveloper()
    } else {
      const devIdentity = this.identities.getOwnDeveloper(developerID)
      if (devIdentity == null) {
        throw new Error('Developer identity not found')
      }
    }

    const version =
      params.version == null || !isValidSemver(params.version)
        ? '1.0.0'
        : params.version

    return this.apps.create({
      appID: uniqueID(),
      data: {
        contentsPath: params.contentsPath,
        developerID,
        mainframeID: appIdentity.id,
        name: params.name || 'Untitled',
        version,
      },
      versions: {
        [version]: {
          permissions: createRequirements(),
          publicationState: 'unpublished',
        },
      },
    })
  }

  setAppContentsURI(appID: ID, contentsURI: string, version?: ?string): void {
    const app = this.apps.getOwnByID(appID)
    if (app == null) {
      throw new Error('App not found')
    }
    app.setContentsURI(contentsURI, version)
  }

  setAppPermissionsRequirements(
    appID: ID,
    permissions: PermissionsRequirements,
    version?: ?string,
  ): void {
    const app = this.apps.getOwnByID(appID)
    if (app == null) {
      throw new Error('App not found')
    }
    app.setPermissionsRequirements(permissions, version)
  }

  getAppData(appID: ID, version?: ?string): PartialManifestData {
    const app = this.apps.getOwnByID(appID)
    if (app == null) {
      throw new Error('App not found')
    }
    const devIdentity = this.identities.getOwnDeveloper(app.data.developerID)
    if (devIdentity == null) {
      throw new Error('Developer identity not found')
    }
    const versionData = app.getVersionData(version)
    if (versionData == null) {
      throw new Error('Invalid app version')
    }

    return {
      id: app.mainframeID,
      author: {
        id: devIdentity.id,
      },
      name: app.data.name,
      version: app.data.version,
      contentsURI: versionData.contentsURI,
      permissions: versionData.permissions,
    }
  }

  async writeAppManifest(
    appID: ID,
    toPath: string,
    version?: ?string,
  ): Promise<void> {
    const app = this.apps.getOwnByID(appID)
    if (app == null) {
      throw new Error('App not found')
    }

    const appIdentityID = this.identities.getID(app.mainframeID)
    if (appIdentityID == null) {
      throw new Error('App identity not found')
    }
    const appIdentity = this.identities.getOwnApp(appIdentityID)
    if (appIdentity == null) {
      throw new Error('App identity not found')
    }

    const devIdentity = this.identities.getOwnDeveloper(app.data.developerID)
    if (devIdentity == null) {
      throw new Error('Developer identity not found')
    }

    const versionData = app.getVersionData(version)
    if (versionData == null) {
      throw new Error('Invalid app version')
    }

    if (versionData.publicationState === 'unpublished') {
      throw new Error(
        'App contents must be published before manifest can be created',
      )
    }
    if (versionData.publicationState === 'manifest_published') {
      throw new Error('Manifest has already been published for this version')
    }

    if (versionData.contentsURI == null) {
      throw new Error(
        'App contents URI must be set before manifest can be created',
      )
    }

    const manifestData = {
      id: app.mainframeID,
      author: {
        id: devIdentity.id,
      },
      name: app.data.name,
      version: app.data.version,
      contentsURI: versionData.contentsURI,
      permissions: versionData.permissions,
    }

    await writeManifestFile(toPath, manifestData, [
      appIdentity.keyPair,
      devIdentity.keyPair,
    ])
  }

  // Settings

  setBzzURL(url: string): void {
    this._data.settings.bzzURL = url
  }

  setWeb3HTTPProvider(provider: string): void {
    this._data.settings.web3HTTPProvider = provider
  }

  // Vault lifecycle

  save() {
    const data = Buffer.from(JSON.stringify(this.toJSON()))
    return writeEncryptedFile(this._path, data, this._keyParams.key, {
      version: 1,
      kdf: this._keyParams.kdf,
    })
  }

  toJSON(): VaultSerialized {
    return this._data
      ? {
          apps: AppsRepository.toJSON(this._data.apps),
          identities: IdentitiesRepository.toJSON(this._data.identities),
          settings: this._data.settings,
        }
      : {}
  }
}
