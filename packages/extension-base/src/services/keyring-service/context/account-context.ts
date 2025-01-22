// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { AccountExternalError, RequestAccountCreateExternalV2, RequestAccountCreateHardwareMultiple, RequestAccountCreateHardwareV2, RequestAccountCreateWithSecretKey, RequestAccountExportPrivateKey, RequestChangeMasterPassword, RequestMigratePassword, RequestMigrateSoloAccount, RequestMigrateUnifiedAndFetchEligibleSoloAccounts, RequestPingSession, ResponseAccountCreateWithSecretKey, ResponseAccountExportPrivateKey, ResponseChangeMasterPassword, ResponseMigratePassword } from '@subwallet/extension-base/background/KoniTypes';
import KoniState from '@subwallet/extension-base/koni/background/handlers/State';
import { KeyringService } from '@subwallet/extension-base/services/keyring-service';
import { AccountMigrationHandler } from '@subwallet/extension-base/services/keyring-service/context/handlers/Migration';
import { AccountProxyMap, CurrentAccountInfo, RequestAccountBatchExportV2, RequestAccountCreateSuriV2, RequestAccountNameValidate, RequestAccountProxyEdit, RequestAccountProxyForget, RequestBatchJsonGetAccountInfo, RequestBatchRestoreV2, RequestChangeTonWalletContractVersion, RequestCheckPublicAndSecretKey, RequestDeriveCreateMultiple, RequestDeriveCreateV3, RequestDeriveValidateV2, RequestExportAccountProxyMnemonic, RequestGetAllTonWalletContractVersion, RequestGetDeriveAccounts, RequestGetDeriveSuggestion, RequestJsonGetAccountInfo, RequestJsonRestoreV2, RequestMnemonicCreateV2, RequestMnemonicValidateV2, RequestPrivateKeyValidateV2, ResponseAccountBatchExportV2, ResponseAccountCreateSuriV2, ResponseAccountNameValidate, ResponseBatchJsonGetAccountInfo, ResponseCheckPublicAndSecretKey, ResponseDeriveValidateV2, ResponseExportAccountProxyMnemonic, ResponseGetAllTonWalletContractVersion, ResponseGetDeriveAccounts, ResponseGetDeriveSuggestion, ResponseJsonGetAccountInfo, ResponseMnemonicCreateV2, ResponseMnemonicValidateV2, ResponsePrivateKeyValidateV2 } from '@subwallet/extension-base/types';
import { InjectedAccountWithMeta } from '@subwallet/extension-inject/types';
import { SubjectInfo } from '@subwallet/ui-keyring/observable/types';

import { AccountDeriveHandler, AccountInjectHandler, AccountJsonHandler, AccountLedgerHandler, AccountMnemonicHandler, AccountModifyHandler, AccountSecretHandler } from './handlers';
import { AccountState } from './state';

export class AccountContext {
  private readonly state: AccountState;
  private readonly deriveHandler: AccountDeriveHandler;
  private readonly mnemonicHandler: AccountMnemonicHandler;
  private readonly jsonHandler: AccountJsonHandler;
  private readonly injectHandler: AccountInjectHandler;
  private readonly ledgerHandler: AccountLedgerHandler;
  private readonly modifyHandler: AccountModifyHandler;
  private readonly secretHandler: AccountSecretHandler;
  private readonly migrationHandler: AccountMigrationHandler;

  constructor (private readonly koniState: KoniState, private readonly parentService: KeyringService) {
    this.state = new AccountState(this.koniState);
    this.deriveHandler = new AccountDeriveHandler(this.parentService, this.state);
    this.mnemonicHandler = new AccountMnemonicHandler(this.parentService, this.state);
    this.jsonHandler = new AccountJsonHandler(this.parentService, this.state);
    this.injectHandler = new AccountInjectHandler(this.parentService, this.state);
    this.ledgerHandler = new AccountLedgerHandler(this.parentService, this.state);
    this.modifyHandler = new AccountModifyHandler(this.parentService, this.state);
    this.secretHandler = new AccountSecretHandler(this.parentService, this.state);
    this.migrationHandler = new AccountMigrationHandler(this.parentService, this.state);
  }

  // TODO: Merge to value
  get pairs (): SubjectInfo {
    return this.state.pairs;
  }

  // TODO: Merge to value
  get observable () {
    return this.state.observable;
  }

  get value () {
    return this.state.value;
  }

  // TODO: Merge to value
  get contacts (): SubjectInfo {
    return this.state.contacts;
  }

  // TODO: Merge to value
  get accounts (): AccountProxyMap {
    return this.state.accounts;
  }

  /* Current account */

  // TODO: Merge to value
  get currentAccount (): CurrentAccountInfo {
    return this.state.currentAccount;
  }

  public saveCurrentAccountProxyId (proxyId: string, callback?: (data: CurrentAccountInfo) => void, preventOneAccount?: boolean) {
    this.state.saveCurrentAccountProxyId(proxyId, callback, preventOneAccount);
  }

  /* Current account */

  public isUnifiedAccount (proxyId: string) {
    return this.state.isUnifiedAccount(proxyId);
  }

  public belongUnifiedAccount (address: string) {
    return this.state.belongUnifiedAccount(address);
  }

  public addressesByProxyId (proxyId: string) {
    return this.state.addressesByProxyId(proxyId);
  }

  public getCurrentAccountProxyName (proxyId: string) {
    return this.state.getAccountProxyName(proxyId);
  }

  /* Modify accounts */

  public accountsEdit (request: RequestAccountProxyEdit): boolean {
    return this.modifyHandler.accountsEdit(request);
  }

  public checkNameExists ({ name, proxyId }: RequestAccountNameValidate): ResponseAccountNameValidate {
    const exists = this.state.checkNameExists(name, proxyId);

    return {
      isValid: !exists
    };
  }

  public async accountProxyForget (request: RequestAccountProxyForget): Promise<string[]> {
    return this.modifyHandler.accountProxyForget(request);
  }

  public keyringChangeMasterPassword (request: RequestChangeMasterPassword, callback: () => void): ResponseChangeMasterPassword {
    return this.modifyHandler.keyringChangeMasterPassword(request, callback);
  }

  public keyringMigrateMasterPassword (request: RequestMigratePassword, callback: () => void): ResponseMigratePassword {
    return this.modifyHandler.keyringMigrateMasterPassword(request, callback);
  }

  public tonGetAllTonWalletContractVersion (request: RequestGetAllTonWalletContractVersion): ResponseGetAllTonWalletContractVersion {
    return this.modifyHandler.tonGetAllTonWalletContractVersion(request);
  }

  public tonAccountChangeWalletContractVersion (request: RequestChangeTonWalletContractVersion): string {
    return this.modifyHandler.tonAccountChangeWalletContractVersion(request);
  }

  /* Modify accounts */

  /* Get address for another service */

  public getDecodedAddresses (accountProxy?: string, allowGetAllAccount = true): string[] {
    return this.state.getDecodedAddresses(accountProxy, allowGetAllAccount);
  }

  public getAllAddresses () {
    return this.state.getAllAddresses();
  }

  /* Get address for another service */

  /* Mnemonic */

  /* Create seed */
  public mnemonicCreateV2 (request: RequestMnemonicCreateV2): Promise<ResponseMnemonicCreateV2> {
    return this.mnemonicHandler.mnemonicCreateV2(request);
  }

  /* Validate seed */
  public mnemonicValidateV2 (request: RequestMnemonicValidateV2): ResponseMnemonicValidateV2 {
    return this.mnemonicHandler.mnemonicValidateV2(request);
  }

  /* Add accounts from mnemonic */
  public accountsCreateSuriV2 (request: RequestAccountCreateSuriV2): ResponseAccountCreateSuriV2 {
    return this.mnemonicHandler.accountsCreateSuriV2(request);
  }

  /* Export mnemonic */
  public exportAccountProxyMnemonic (request: RequestExportAccountProxyMnemonic): ResponseExportAccountProxyMnemonic {
    return this.mnemonicHandler.exportAccountProxyMnemonic(request);
  }

  /* Mnemonic */

  /* Add QR-signer, read-only */
  public async accountsCreateExternalV2 (request: RequestAccountCreateExternalV2): Promise<AccountExternalError[]> {
    return this.secretHandler.accountsCreateExternalV2(request);
  }

  /* Import ethereum account with the private key  */
  public privateKeyValidateV2 (request: RequestPrivateKeyValidateV2): ResponsePrivateKeyValidateV2 {
    return this.secretHandler.privateKeyValidateV2(request);
  }

  /* Import ethereum account with the private key  */

  /* Ledger */

  /* For custom derive path */
  public async accountsCreateHardwareV2 (request: RequestAccountCreateHardwareV2): Promise<boolean> {
    return this.ledgerHandler.accountsCreateHardwareV2(request);
  }

  /* For multi select */
  public async accountsCreateHardwareMultiple (request: RequestAccountCreateHardwareMultiple): Promise<boolean> {
    return this.ledgerHandler.accountsCreateHardwareMultiple(request);
  }

  /* Ledger */

  /* JSON */

  public parseInfoSingleJson (request: RequestJsonGetAccountInfo): ResponseJsonGetAccountInfo {
    return this.jsonHandler.parseInfoSingleJson(request);
  }

  public jsonRestoreV2 (request: RequestJsonRestoreV2, onDone: VoidFunction): Promise<string[]> {
    return this.jsonHandler.jsonRestoreV2(request, onDone);
  }

  public parseInfoMultiJson (request: RequestBatchJsonGetAccountInfo): ResponseBatchJsonGetAccountInfo {
    return this.jsonHandler.parseInfoMultiJson(request);
  }

  public batchRestoreV2 (request: RequestBatchRestoreV2): Promise<string[]> {
    return this.jsonHandler.batchRestoreV2(request);
  }

  public batchExportV2 (request: RequestAccountBatchExportV2): Promise<ResponseAccountBatchExportV2> {
    return this.jsonHandler.batchExportV2(request);
  }

  /* JSON */

  /* Add with secret and public key */
  public async accountsCreateWithSecret (request: RequestAccountCreateWithSecretKey): Promise<ResponseAccountCreateWithSecretKey> {
    return this.secretHandler.accountsCreateWithSecret(request);
  }

  public checkPublicAndSecretKey (request: RequestCheckPublicAndSecretKey): ResponseCheckPublicAndSecretKey {
    return this.secretHandler.checkPublicAndSecretKey(request);
  }

  public accountExportPrivateKey (request: RequestAccountExportPrivateKey): ResponseAccountExportPrivateKey {
    return this.secretHandler.accountExportPrivateKey(request);
  }

  /* Derive */

  /**
   * @func derivationCreateMultiple
   * @desc Derive multi account
   * Note: Must update before re-use
   * @deprecated
   */
  public derivationCreateMultiple (request: RequestDeriveCreateMultiple): boolean {
    return this.deriveHandler.derivationCreateMultiple(request);
  }

  /**
   * @func getListDeriveAccounts
   * @desc Get a derivation account list.
   * Note: Must update before re-use
   * @deprecated
   */
  public getListDeriveAccounts (request: RequestGetDeriveAccounts): ResponseGetDeriveAccounts {
    return this.deriveHandler.getListDeriveAccounts(request);
  }

  /* Validate derivation path */
  public validateDerivePath (request: RequestDeriveValidateV2): ResponseDeriveValidateV2 {
    return this.deriveHandler.validateDerivePath(request);
  }

  /* Validate derivation path */
  public getDeriveSuggestion (request: RequestGetDeriveSuggestion): ResponseGetDeriveSuggestion {
    return this.deriveHandler.getDeriveSuggestion(request);
  }

  /* Derive account proxy  */
  public derivationAccountProxyCreate (request: RequestDeriveCreateV3, isMigration?: boolean): boolean {
    return this.deriveHandler.derivationAccountProxyCreate(request, isMigration);
  }

  /* Derive */

  /* Inject */

  public addInjectAccounts (accounts: InjectedAccountWithMeta[]) {
    this.injectHandler.addInjectAccounts(accounts);
  }

  public removeInjectAccounts (_addresses: string[]) {
    this.injectHandler.removeInjectAccounts(_addresses);
  }

  /* Inject */

  /* Migration */
  public async migrateUnifiedAndFetchEligibleSoloAccounts (request: RequestMigrateUnifiedAndFetchEligibleSoloAccounts) {
    return await this.migrationHandler.migrateUnifiedAndFetchEligibleSoloAccounts(request);
  }

  public migrateSoloAccount (request: RequestMigrateSoloAccount) {
    return this.migrationHandler.migrateSoloToUnifiedAccount(request);
  }

  public pingSession (request: RequestPingSession) {
    return this.migrationHandler.pingSession(request);
  }

  /* Migration */

  /* Others */

  public removeNoneHardwareGenesisHash () {
    this.state.removeNoneHardwareGenesisHash();
  }

  public updateMetadataForPair () {
    this.state.updateMetadataForPair();
  }

  /* Others */

  /* Reset wallet */
  public resetWallet () {
    this.state.resetWallet();
  }

  /* Reset wallet */
}
