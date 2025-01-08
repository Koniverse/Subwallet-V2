// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AuthRequestV2, ConfirmationDefinitions, ConfirmationDefinitionsCardano, ConfirmationDefinitionsTon, ConfirmationsQueue, ConfirmationsQueueCardano, ConfirmationsQueueItemOptions, ConfirmationsQueueTon, ConfirmationType, ConfirmationTypeCardano, ConfirmationTypeTon, RequestConfirmationComplete, RequestConfirmationCompleteCardano, RequestConfirmationCompleteTon } from '@subwallet/extension-base/background/KoniTypes';
import { AccountAuthType, AuthorizeRequest, MetadataRequest, RequestAuthorizeTab, RequestSign, ResponseSigning, SigningRequest } from '@subwallet/extension-base/background/types';
import { ChainService } from '@subwallet/extension-base/services/chain-service';
import { KeyringService } from '@subwallet/extension-base/services/keyring-service';
import CardanoRequestHandler from '@subwallet/extension-base/services/request-service/handler/CardanoRequestHandler';
import SettingService from '@subwallet/extension-base/services/setting-service/SettingService';
import { WalletConnectNotSupportRequest, WalletConnectSessionRequest } from '@subwallet/extension-base/services/wallet-connect-service/types';
import { MetadataDef } from '@subwallet/extension-inject/types';
import { BehaviorSubject } from 'rxjs';

import { SignerPayloadJSON } from '@polkadot/types/types/extrinsic';

import TonRequestHandler from './handler/TonRequestHandler';
import { AuthRequestHandler, ConnectWCRequestHandler, EvmRequestHandler, MetadataRequestHandler, NotSupportWCRequestHandler, PopupHandler, SubstrateRequestHandler } from './handler';
import { AuthUrls, MetaRequest } from './types';

export default class RequestService {
  // Common
  readonly #chainService: ChainService;
  readonly settingService: SettingService;
  readonly keyringService: KeyringService;
  readonly #popupHandler: PopupHandler;
  readonly #metadataRequestHandler: MetadataRequestHandler;
  readonly #authRequestHandler: AuthRequestHandler;
  readonly #substrateRequestHandler: SubstrateRequestHandler;
  readonly #evmRequestHandler: EvmRequestHandler;
  readonly #tonRequestHandler: TonRequestHandler;
  readonly #cardanoRequestHandler: CardanoRequestHandler;
  readonly #connectWCRequestHandler: ConnectWCRequestHandler;
  readonly #notSupportWCRequestHandler: NotSupportWCRequestHandler;

  // Common
  constructor (chainService: ChainService, settingService: SettingService, keyringService: KeyringService) {
    this.#chainService = chainService;
    this.settingService = settingService;
    this.keyringService = keyringService;
    this.#popupHandler = new PopupHandler(this);
    this.#metadataRequestHandler = new MetadataRequestHandler(this);
    this.#authRequestHandler = new AuthRequestHandler(this, this.#chainService, this.keyringService);
    this.#substrateRequestHandler = new SubstrateRequestHandler(this);
    this.#evmRequestHandler = new EvmRequestHandler(this);
    this.#tonRequestHandler = new TonRequestHandler(this);
    this.#cardanoRequestHandler = new CardanoRequestHandler(this);
    this.#connectWCRequestHandler = new ConnectWCRequestHandler(this);
    this.#notSupportWCRequestHandler = new NotSupportWCRequestHandler(this);

    // Reset icon on start service
    this.updateIconV2();
  }

  public get numAllRequests () {
    return this.allSubstrateRequests.length + this.numEvmRequests + this.numTonRequests + this.numCardanoRequests;
  }

  public updateIconV2 (shouldClose?: boolean): void {
    this.#popupHandler.updateIconV2(shouldClose);
  }

  getAddressList (value = false): Record<string, boolean> {
    const addressList = Object.keys(this.keyringService.context.pairs);

    return addressList.reduce((addressList, v) => ({ ...addressList, [v]: value }), {});
  }

  // Popup
  public get popup () {
    return this.#popupHandler.popup;
  }

  public popupClose (): void {
    this.#popupHandler.popupClose();
  }

  public popupOpen (): void {
    // Not open new popup and use existed
    const popupList = this.#popupHandler.popup;

    if (popupList && popupList.length > 0) {
      chrome.windows.update(popupList[0], { focused: true })?.catch(console.error);
    } else {
      this.#popupHandler.popupOpen();
    }
  }

  // Metadata
  public get metaSubject (): BehaviorSubject<MetadataRequest[]> {
    return this.#metadataRequestHandler.metaSubject;
  }

  public get knownMetadata (): MetadataDef[] {
    return this.#metadataRequestHandler.knownMetadata;
  }

  public get numMetaRequests (): number {
    return this.#metadataRequestHandler.numMetaRequests;
  }

  public injectMetadata (url: string, request: MetadataDef): Promise<boolean> {
    return this.#metadataRequestHandler.injectMetadata(url, request);
  }

  public getMetaRequest (id: string): MetaRequest {
    return this.#metadataRequestHandler.getMetaRequest(id);
  }

  public saveMetadata (meta: MetadataDef): void {
    this.#metadataRequestHandler.saveMetadata(meta);
  }

  // Auth
  public get authSubjectV2 (): BehaviorSubject<AuthorizeRequest[]> {
    return this.#authRequestHandler.authSubjectV2;
  }

  public get numAuthRequests (): number {
    return this.#authRequestHandler.numAuthRequestsV2;
  }

  public setAuthorize (data: AuthUrls, callback?: () => void): void {
    this.#authRequestHandler.setAuthorize(data, callback);
  }

  public getAuthorize (update: (value: AuthUrls) => void): void {
    this.#authRequestHandler.getAuthorize(update);
  }

  public getAuthList (): Promise<AuthUrls> {
    return this.#authRequestHandler.getAuthList();
  }

  public async authorizeUrlV2 (url: string, request: RequestAuthorizeTab): Promise<boolean> {
    return this.#authRequestHandler.authorizeUrlV2(url, request);
  }

  public getAuthRequestV2 (id: string): AuthRequestV2 {
    return this.#authRequestHandler.getAuthRequestV2(id);
  }

  public getDAppChainInfo (options: {accessType: AccountAuthType, autoActive?: boolean, defaultChain?: string, url?: string}) {
    return this.#authRequestHandler.getDAppChainInfo(options);
  }

  public get subscribeEvmChainChange () {
    return this.#authRequestHandler.subscribeEvmChainChange;
  }

  public get subscribeAuthorizeUrlSubject () {
    return this.#authRequestHandler.subscribeAuthorizeUrlSubject;
  }

  public ensureUrlAuthorizedV2 (url: string): Promise<boolean> {
    return this.#authRequestHandler.ensureUrlAuthorizedV2(url);
  }

  // Substrate requests
  public get signSubject (): BehaviorSubject<SigningRequest[]> {
    return this.#substrateRequestHandler.signSubject;
  }

  public get allSubstrateRequests (): SigningRequest[] {
    return this.#substrateRequestHandler.allSubstrateRequests;
  }

  public sign (url: string, request: RequestSign, id?: string): Promise<ResponseSigning> {
    return this.#substrateRequestHandler.sign(url, request, id);
  }

  public get numSubstrateRequests (): number {
    return this.#substrateRequestHandler.numSubstrateRequests;
  }

  // Evm requests
  public get numEvmRequests (): number {
    return this.#evmRequestHandler.numEvmRequests;
  }

  public get numTonRequests (): number {
    return this.#tonRequestHandler.numTonRequests;
  }

  public get numCardanoRequests (): number {
    return this.#cardanoRequestHandler.numCardanoRequests;
  }

  public get confirmationsQueueSubject (): BehaviorSubject<ConfirmationsQueue> {
    return this.#evmRequestHandler.getConfirmationsQueueSubject();
  }

  public get confirmationsQueueSubjectTon (): BehaviorSubject<ConfirmationsQueueTon> {
    return this.#tonRequestHandler.getConfirmationsQueueSubjectTon();
  }

  public get confirmationsQueueSubjectCardano (): BehaviorSubject<ConfirmationsQueueCardano> {
    return this.#cardanoRequestHandler.getConfirmationsQueueSubjectCardano();
  }

  public getSignRequest (id: string) {
    return this.#substrateRequestHandler.getSignRequest(id);
  }

  public async signInternalTransaction (id: string, address: string, url: string, payload: SignerPayloadJSON): Promise<ResponseSigning> {
    return this.#substrateRequestHandler.signTransaction(id, address, url, payload);
  }

  public addConfirmation<CT extends ConfirmationType> (
    id: string,
    url: string,
    type: CT,
    payload: ConfirmationDefinitions[CT][0]['payload'],
    options: ConfirmationsQueueItemOptions = {},
    validator?: (input: ConfirmationDefinitions[CT][1]) => Error | undefined
  ): Promise<ConfirmationDefinitions[CT][1]> {
    return this.#evmRequestHandler.addConfirmation(id, url, type, payload, options, validator);
  }

  public addConfirmationTon<CT extends ConfirmationTypeTon> (
    id: string,
    url: string,
    type: CT,
    payload: ConfirmationDefinitionsTon[CT][0]['payload'],
    options: ConfirmationsQueueItemOptions = {},
    validator?: (input: ConfirmationDefinitionsTon[CT][1]) => Error | undefined
  ): Promise<ConfirmationDefinitionsTon[CT][1]> {
    return this.#tonRequestHandler.addConfirmationTon(id, url, type, payload, options, validator);
  }

  public addConfirmationCardano<CT extends ConfirmationTypeCardano> (
    id: string,
    url: string,
    type: CT,
    payload: ConfirmationDefinitionsCardano[CT][0]['payload'],
    options: ConfirmationsQueueItemOptions = {},
    validator?: (input: ConfirmationDefinitionsCardano[CT][1]) => Error | undefined
  ): Promise<ConfirmationDefinitionsCardano[CT][1]> {
    return this.#cardanoRequestHandler.addConfirmationCardano(id, url, type, payload, options, validator);
  }

  public async completeConfirmation (request: RequestConfirmationComplete): Promise<boolean> {
    return await this.#evmRequestHandler.completeConfirmation(request);
  }

  public async completeConfirmationTon (request: RequestConfirmationCompleteTon): Promise<boolean> {
    return await this.#tonRequestHandler.completeConfirmationTon(request);
  }

  public async completeConfirmationCardano (request: RequestConfirmationCompleteCardano) {
    return await this.#cardanoRequestHandler.completeConfirmationCardano(request);
  }

  public updateConfirmation<CT extends ConfirmationType> (
    id: string,
    type: CT,
    payload: ConfirmationDefinitions[CT][0]['payload'],
    options: ConfirmationsQueueItemOptions = {},
    validator?: (input: ConfirmationDefinitions[CT][1]) => Error | undefined
  ) {
    return this.#evmRequestHandler.updateConfirmation(id, type, payload, options, validator);
  }

  // WalletConnect Connect requests
  public getConnectWCRequest (id: string) {
    return this.#connectWCRequestHandler.getConnectWCRequest(id);
  }

  public get connectWCSubject (): BehaviorSubject<WalletConnectSessionRequest[]> {
    return this.#connectWCRequestHandler.connectWCSubject;
  }

  public get allConnectWCRequests (): WalletConnectSessionRequest[] {
    return this.#connectWCRequestHandler.allConnectWCRequests;
  }

  public get numConnectWCRequests (): number {
    return this.#connectWCRequestHandler.numConnectWCRequests;
  }

  public addConnectWCRequest (request: WalletConnectSessionRequest): void {
    return this.#connectWCRequestHandler.addConnectWCRequest(request);
  }

  // WalletConnect not support requests
  public getNotSupportWCRequest (id: string) {
    return this.#notSupportWCRequestHandler.getNotSupportWCRequest(id);
  }

  public get notSupportWCSubject (): BehaviorSubject<WalletConnectNotSupportRequest[]> {
    return this.#notSupportWCRequestHandler.notSupportWCSubject;
  }

  public get allNotSupportWCRequests (): WalletConnectNotSupportRequest[] {
    return this.#notSupportWCRequestHandler.allNotSupportWCRequests;
  }

  public get numNotSupportWCRequests (): number {
    return this.#notSupportWCRequestHandler.numNotSupportWCRequests;
  }

  public addNotSupportWCRequest (request: WalletConnectNotSupportRequest): void {
    return this.#notSupportWCRequestHandler.addNotSupportWCRequest(request);
  }

  // General methods
  public get numRequests (): number {
    return this.numMetaRequests + this.numAuthRequests + this.numSubstrateRequests + this.numEvmRequests + this.numConnectWCRequests + this.numNotSupportWCRequests + this.numTonRequests + this.numCardanoRequests;
  }

  public resetWallet (): void {
    this.#authRequestHandler.resetWallet();
    this.#substrateRequestHandler.resetWallet();
    this.#evmRequestHandler.resetWallet();
    this.#tonRequestHandler.resetWallet();
    this.#cardanoRequestHandler.resetWallet();
    this.#metadataRequestHandler.resetWallet();
    this.#connectWCRequestHandler.resetWallet();
    this.#notSupportWCRequestHandler.resetWallet();
  }
}
