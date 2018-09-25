// @flow

import { readManifestFile } from '@mainframe/app-manifest'
import {
  /* eslint-disable import/named */
  type AppGetAllResult,
  APP_CREATE_SCHEMA,
  type AppCreateParams,
  type AppCreateResult,
  APP_INSTALL_SCHEMA,
  type AppInstallParams,
  type AppInstallResult,
  APP_OPEN_SCHEMA,
  type AppOpenParams,
  APP_REMOVE_SCHEMA,
  type AppRemoveParams,
  APP_REMOVE_OWN_SCHEMA,
  type AppRemoveOwnParams,
  type AppSetUserSettingsParams,
  APP_SET_USER_SETTINGS_SCHEMA,
  type IdentityCreateResult,
  type IdentityGetOwnUsersResult,
  type IdentityGetOwnDevelopersResult,
  VAULT_SCHEMA,
  type VaultParams,
  /* eslint-enable import/named */
} from '@mainframe/client'

import type { LauncherContext } from '../contexts'

export default {
  // Apps
  app_getAll: (ctx: LauncherContext): Promise<AppGetAllResult> => {
    return ctx.client.app.getAll()
  },
  app_install: {
    params: APP_INSTALL_SCHEMA,
    handler: (
      ctx: LauncherContext,
      params: AppInstallParams,
    ): Promise<AppInstallResult> => {
      return ctx.client.app.install(params)
    },
  },
  app_launch: {
    params: APP_OPEN_SCHEMA,
    handler: async (ctx: LauncherContext, params: AppOpenParams) => {
      const appSession = await ctx.client.app.open(params)
      ctx.launchApp(appSession)
    },
  },
  app_create: {
    params: APP_CREATE_SCHEMA,
    handler: (
      ctx: LauncherContext,
      params: AppCreateParams,
    ): Promise<AppCreateResult> => {
      return ctx.client.app.create(params)
    },
  },
  app_remove: {
    params: APP_REMOVE_SCHEMA,
    handler: (ctx: LauncherContext, params: AppRemoveParams) => {
      return ctx.client.app.remove(params)
    },
  },
  app_removeOwn: {
    params: APP_REMOVE_OWN_SCHEMA,
    handler: (ctx: LauncherContext, params: AppRemoveOwnParams) => {
      return ctx.client.app.removeOwn(params)
    },
  },
  app_readManifest: {
    params: {
      path: 'string',
    },
    handler: async (ctx: LauncherContext, params: { path: string }) => {
      const manifest = await readManifestFile(params.path)
      return {
        data: manifest.data,
        // TODO: lookup keys to check if they match know identities in vault
        keys: manifest.keys,
      }
    },
  },
  app_setUserSettings: {
    params: APP_SET_USER_SETTINGS_SCHEMA,
    handler: (ctx: LauncherContext, params: AppSetUserSettingsParams) => {
      return ctx.client.app.setUserSettings(params)
    },
  },

  // Identities
  identity_createUser: {
    params: {
      data: 'any',
    },
    handler: (
      ctx: LauncherContext,
      params: { data?: Object },
    ): Promise<IdentityCreateResult> => {
      return ctx.client.identity.createUser(params)
    },
  },
  identity_createDeveloper: {
    params: {
      data: 'any',
    },
    handler: (
      ctx: LauncherContext,
      params: { data?: Object },
    ): Promise<IdentityCreateResult> => {
      return ctx.client.identity.createDeveloper(params)
    },
  },
  identity_getOwnUsers: (
    ctx: LauncherContext,
  ): Promise<IdentityGetOwnUsersResult> => {
    return ctx.client.identity.getOwnUsers()
  },
  identity_getOwnDevelopers: (
    ctx: LauncherContext,
  ): Promise<IdentityGetOwnDevelopersResult> => {
    return ctx.client.identity.getOwnDevelopers()
  },
  // Vaults
  vault_create: {
    handler: async (
      ctx: LauncherContext,
      params: { label: string, password: string },
    ): Promise<string> => {
      const path = ctx.vaultConfig.createVaultPath()
      await ctx.client.vault.create({ path, password: params.password })
      ctx.vaultConfig.setLabel(path, params.label)
      ctx.vaultConfig.defaultVault = path
      ctx.vaultOpen = path
      return path
    },
  },
  vault_getVaultsData: (ctx: LauncherContext) => ({
    vaults: ctx.vaultConfig.vaults,
    defaultVault: ctx.vaultConfig.defaultVault,
    vaultOpen: ctx.vaultOpen,
  }),
  vault_open: {
    params: VAULT_SCHEMA,
    handler: async (ctx: LauncherContext, params: VaultParams) => {
      await ctx.client.vault.open(params)
      ctx.vaultOpen = params.path
      return { open: true }
    },
  },
}