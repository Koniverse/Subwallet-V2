// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { AccountExternalError, RequestAccountBatchExportV2, RequestAccountCreateExternalV2, RequestAccountCreateHardwareMultiple, RequestAccountCreateHardwareV2, RequestAccountCreateWithSecretKey, RequestAccountExportPrivateKey, RequestBatchRestoreV2, RequestChangeMasterPassword, RequestJsonRestoreV2, RequestMigratePassword, ResponseAccountBatchExportV2, ResponseAccountCreateWithSecretKey, ResponseAccountExportPrivateKey, ResponseChangeMasterPassword, ResponseMigratePassword } from '@subwallet/extension-base/background/KoniTypes';
import { ResponseJsonGetAccountInfo } from '@subwallet/extension-base/background/types';
import KoniState from '@subwallet/extension-base/koni/background/handlers/State';
import { KeyringService } from '@subwallet/extension-base/services/keyring-service';
import { AccountProxyMap, CurrentAccountInfo, RequestAccountCreateSuriV2, RequestAccountProxyEdit, RequestAccountProxyForget, RequestCheckPublicAndSecretKey, RequestDeriveCreateMultiple, RequestDeriveCreateV3, RequestDeriveValidateV2, RequestExportAccountProxyMnemonic, RequestGetDeriveAccounts, RequestMnemonicCreateV2, RequestMnemonicValidateV2, RequestPrivateKeyValidateV2, ResponseAccountCreateSuriV2, ResponseCheckPublicAndSecretKey, ResponseDeriveValidateV2, ResponseExportAccountProxyMnemonic, ResponseGetDeriveAccounts, ResponseMnemonicCreateV2, ResponseMnemonicValidateV2, ResponsePrivateKeyValidateV2 } from '@subwallet/extension-base/types';
import { InjectedAccountWithMeta } from '@subwallet/extension-inject/types';
import { KeyringPair$Json } from '@subwallet/keyring/types';
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

  constructor (private readonly koniState: KoniState, private readonly parentService: KeyringService) {
    this.state = new AccountState(this.koniState);
    this.deriveHandler = new AccountDeriveHandler(this.parentService, this.state);
    this.mnemonicHandler = new AccountMnemonicHandler(this.parentService, this.state);
    this.jsonHandler = new AccountJsonHandler(this.parentService, this.state);
    this.injectHandler = new AccountInjectHandler(this.parentService, this.state);
    this.ledgerHandler = new AccountLedgerHandler(this.parentService, this.state);
    this.modifyHandler = new AccountModifyHandler(this.parentService, this.state);
    this.secretHandler = new AccountSecretHandler(this.parentService, this.state);
  }

  get pairs (): SubjectInfo {
    return this.state.pairs;
  }

  get observable () {
    return this.state.observable;
  }

  get value () {
    return this.state.value;
  }

  get contacts (): SubjectInfo {
    return this.state.contacts;
  }

  get accounts (): AccountProxyMap {
    return this.state.accounts;
  }

  /* Current account */

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

  public addressesByProxyId (proxyId: string) {
    return this.state.addressesByProxyId(proxyId);
  }

  /* Modify accounts */

  public accountsEdit (request: RequestAccountProxyEdit): boolean {
    return this.modifyHandler.accountsEdit(request);
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

  /* Modify accounts */

  /* Get address for another service */

  public getDecodedAddresses (accountProxy?: string, allowGetAllAccount = true): string[] {
    return this.state.getDecodedAddresses(accountProxy, allowGetAllAccount);
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

  public jsonRestoreV2 (request: RequestJsonRestoreV2): void {
    this.jsonHandler.jsonRestoreV2(request);
  }

  public batchRestoreV2 (request: RequestBatchRestoreV2): void {
    this.jsonHandler.batchRestoreV2(request);
  }

  public jsonGetAccountInfo (json: KeyringPair$Json): ResponseJsonGetAccountInfo {
    return this.jsonHandler.jsonGetAccountInfo(json);
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

  /* Derive account proxy  */
  public derivationAccountProxyCreate (request: RequestDeriveCreateV3): boolean {
    return this.deriveHandler.derivationAccountProxyCreate(request);
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
