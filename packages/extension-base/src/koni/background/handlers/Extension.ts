// Copyright 2019-2022 @subwallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Common } from '@ethereumjs/common';
import { LegacyTransaction } from '@ethereumjs/tx';
import { COMMON_CHAIN_SLUGS } from '@subwallet/chain-list';
import { _AssetRef, _AssetType, _ChainAsset, _ChainInfo, _MultiChainAsset } from '@subwallet/chain-list/types';
import { TransactionError } from '@subwallet/extension-base/background/errors/TransactionError';
import { withErrorLog } from '@subwallet/extension-base/background/handlers/helpers';
import { createSubscription } from '@subwallet/extension-base/background/handlers/subscriptions';
import { AccountExternalError, AddressBookInfo, AmountData, AmountDataWithId, AssetSetting, AssetSettingUpdateReq, BondingOptionParams, BrowserConfirmationType, CampaignBanner, CampaignData, CampaignDataType, ChainType, CronReloadRequest, CrowdloanJson, ExternalRequestPromiseStatus, ExtrinsicType, KeyringState, MantaPayEnableMessage, MantaPayEnableParams, MantaPayEnableResponse, MantaPaySyncState, MetadataItem, NftCollection, NftJson, NftTransactionRequest, NftTransactionResponse, PriceJson, RequestAccountCreateExternalV2, RequestAccountCreateHardwareMultiple, RequestAccountCreateHardwareV2, RequestAccountCreateWithSecretKey, RequestAccountExportPrivateKey, RequestAddInjectedAccounts, RequestApproveConnectWalletSession, RequestApproveWalletConnectNotSupport, RequestAuthorization, RequestAuthorizationBlock, RequestAuthorizationPerAccount, RequestAuthorizationPerSite, RequestAuthorizeApproveV2, RequestBondingSubmit, RequestCameraSettings, RequestCampaignBannerComplete, RequestChangeEnableChainPatrol, RequestChangeLanguage, RequestChangeMasterPassword, RequestChangePriceCurrency, RequestChangeShowBalance, RequestChangeShowZeroBalance, RequestChangeTimeAutoLock, RequestConfirmationComplete, RequestConfirmationCompleteTon, RequestConnectWalletConnect, RequestCrowdloanContributions, RequestDeleteContactAccount, RequestDisconnectWalletConnectSession, RequestEditContactAccount, RequestFindRawMetadata, RequestForgetSite, RequestFreeBalance, RequestGetTransaction, RequestKeyringExportMnemonic, RequestMaxTransferable, RequestMigratePassword, RequestParseEvmContractInput, RequestParseTransactionSubstrate, RequestPassPhishingPage, RequestQrParseRLP, RequestQrSignEvm, RequestQrSignSubstrate, RequestRejectConnectWalletSession, RequestRejectExternalRequest, RequestRejectWalletConnectNotSupport, RequestRemoveInjectedAccounts, RequestResetWallet, RequestResolveExternalRequest, RequestSaveAppConfig, RequestSaveBrowserConfig, RequestSaveOSConfig, RequestSaveRecentAccount, RequestSettingsType, RequestSigningApprovePasswordV2, RequestStakePoolingBonding, RequestStakePoolingUnbonding, RequestSubscribeHistory, RequestSubstrateNftSubmitTransaction, RequestTuringCancelStakeCompound, RequestTuringStakeCompound, RequestUnbondingSubmit, RequestUnlockKeyring, RequestUnlockType, ResolveAddressToDomainRequest, ResolveDomainRequest, ResponseAccountCreateWithSecretKey, ResponseAccountExportPrivateKey, ResponseChangeMasterPassword, ResponseFindRawMetadata, ResponseKeyringExportMnemonic, ResponseMigratePassword, ResponseNftImport, ResponseParseEvmContractInput, ResponseParseTransactionSubstrate, ResponseQrParseRLP, ResponseQrSignEvm, ResponseQrSignSubstrate, ResponseRejectExternalRequest, ResponseResetWallet, ResponseResolveExternalRequest, ResponseSubscribeHistory, ResponseUnlockKeyring, ShowCampaignPopupRequest, StakingJson, StakingRewardJson, StakingType, SufficientMetadata, ThemeNames, TokenPriorityDetails, TransactionHistoryItem, TransactionResponse, ValidateNetworkRequest, ValidateNetworkResponse, ValidatorInfo } from '@subwallet/extension-base/background/KoniTypes';
import { AccountAuthType, AuthorizeRequest, MessageTypes, MetadataRequest, RequestAccountExport, RequestAuthorizeCancel, RequestAuthorizeReject, RequestCurrentAccountAddress, RequestMetadataApprove, RequestMetadataReject, RequestSigningApproveSignature, RequestSigningCancel, RequestTypes, ResponseAccountExport, ResponseAuthorizeList, ResponseType, SigningRequest, WindowOpenParams } from '@subwallet/extension-base/background/types';
import { TransactionWarning } from '@subwallet/extension-base/background/warnings/TransactionWarning';
import { ALL_ACCOUNT_KEY, LATEST_SESSION, XCM_FEE_RATIO } from '@subwallet/extension-base/constants';
import { additionalValidateTransferForRecipient, additionalValidateXcmTransfer, validateTransferRequest, validateXcmTransferRequest } from '@subwallet/extension-base/core/logic-validation/transfer';
import { FrameSystemAccountInfo } from '@subwallet/extension-base/core/substrate/types';
import { _isSnowBridgeXcm } from '@subwallet/extension-base/core/substrate/xcm-parser';
import { ALLOWED_PATH } from '@subwallet/extension-base/defaults';
import { getERC20SpendingApprovalTx } from '@subwallet/extension-base/koni/api/contract-handler/evm/web3';
import { _ERC721_ABI, isAvailBridgeGatewayContract, isSnowBridgeGatewayContract } from '@subwallet/extension-base/koni/api/contract-handler/utils';
import { resolveAzeroAddressToDomain, resolveAzeroDomainToAddress } from '@subwallet/extension-base/koni/api/dotsama/domain';
import { parseSubstrateTransaction } from '@subwallet/extension-base/koni/api/dotsama/parseTransaction';
import { UNSUPPORTED_TRANSFER_EVM_CHAIN_NAME } from '@subwallet/extension-base/koni/api/nft/config';
import { getNftTransferExtrinsic, isRecipientSelf } from '@subwallet/extension-base/koni/api/nft/transfer';
import { getBondingExtrinsic, getCancelWithdrawalExtrinsic, getClaimRewardExtrinsic, getNominationPoolsInfo, getUnbondingExtrinsic, getValidatorsInfo, validateBondingCondition, validateUnbondingCondition } from '@subwallet/extension-base/koni/api/staking/bonding';
import { getTuringCancelCompoundingExtrinsic, getTuringCompoundExtrinsic } from '@subwallet/extension-base/koni/api/staking/bonding/paraChain';
import { getPoolingBondingExtrinsic, getPoolingUnbondingExtrinsic, validatePoolBondingCondition, validateRelayUnbondingCondition } from '@subwallet/extension-base/koni/api/staking/bonding/relayChain';
import { YIELD_EXTRINSIC_TYPES } from '@subwallet/extension-base/koni/api/yield/helper/utils';
import KoniState from '@subwallet/extension-base/koni/background/handlers/State';
import { RequestOptimalTransferProcess } from '@subwallet/extension-base/services/balance-service/helpers/process';
import { isBounceableAddress } from '@subwallet/extension-base/services/balance-service/helpers/subscribe/ton/utils';
import { getERC20TransactionObject, getERC721Transaction, getEVMTransactionObject, getPSP34TransferExtrinsic } from '@subwallet/extension-base/services/balance-service/transfer/smart-contract';
import { createTransferExtrinsic, getTransferMockTxFee } from '@subwallet/extension-base/services/balance-service/transfer/token';
import { createTonTransaction } from '@subwallet/extension-base/services/balance-service/transfer/ton-transfer';
import { createAvailBridgeExtrinsicFromAvail, createAvailBridgeTxFromEth, createPolygonBridgeExtrinsic, createSnowBridgeExtrinsic, createXcmExtrinsic, CreateXcmExtrinsicProps, FunctionCreateXcmExtrinsic, getXcmMockTxFee } from '@subwallet/extension-base/services/balance-service/transfer/xcm';
import { getClaimTxOnAvail, getClaimTxOnEthereum, isAvailChainBridge } from '@subwallet/extension-base/services/balance-service/transfer/xcm/availBridge';
import { _isPolygonChainBridge, getClaimPolygonBridge, isClaimedPolygonBridge } from '@subwallet/extension-base/services/balance-service/transfer/xcm/polygonBridge';
import { _isPosChainBridge, getClaimPosBridge } from '@subwallet/extension-base/services/balance-service/transfer/xcm/posBridge';
import { _API_OPTIONS_CHAIN_GROUP, _DEFAULT_MANTA_ZK_CHAIN, _MANTA_ZK_CHAIN_GROUP, _ZK_ASSET_PREFIX, SUFFICIENT_CHAIN } from '@subwallet/extension-base/services/chain-service/constants';
import { _ChainApiStatus, _ChainConnectionStatus, _ChainState, _NetworkUpsertParams, _SubstrateAdapterQueryArgs, _SubstrateApi, _ValidateCustomAssetRequest, _ValidateCustomAssetResponse, EnableChainParams, EnableMultiChainParams } from '@subwallet/extension-base/services/chain-service/types';
import { _getAssetDecimals, _getAssetSymbol, _getChainNativeTokenBasicInfo, _getContractAddressOfToken, _getEvmChainId, _getTokenMinAmount, _getTokenOnChainAssetId, _getXcmAssetMultilocation, _isAssetSmartContractNft, _isBridgedToken, _isChainEvmCompatible, _isChainSubstrateCompatible, _isChainTonCompatible, _isCustomAsset, _isLocalToken, _isMantaZkAsset, _isNativeToken, _isPureEvmChain, _isTokenEvmSmartContract, _isTokenTransferredByEvm, _isTokenTransferredByTon } from '@subwallet/extension-base/services/chain-service/utils';
import { ClaimPolygonBridgeNotificationMetadata, NotificationSetup } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import { AppBannerData, AppConfirmationData, AppPopupData } from '@subwallet/extension-base/services/mkt-campaign-service/types';
import { EXTENSION_REQUEST_URL } from '@subwallet/extension-base/services/request-service/constants';
import { AuthUrls } from '@subwallet/extension-base/services/request-service/types';
import { DEFAULT_AUTO_LOCK_TIME } from '@subwallet/extension-base/services/setting-service/constants';
import { SWTransaction, SWTransactionResponse, SWTransactionResult, TransactionEmitter, ValidateTransactionResponseInput } from '@subwallet/extension-base/services/transaction-service/types';
import { isProposalExpired, isSupportWalletConnectChain, isSupportWalletConnectNamespace } from '@subwallet/extension-base/services/wallet-connect-service/helpers';
import { ResultApproveWalletConnectSession, WalletConnectNotSupportRequest, WalletConnectSessionRequest } from '@subwallet/extension-base/services/wallet-connect-service/types';
import { SWStorage } from '@subwallet/extension-base/storage';
import { AccountsStore } from '@subwallet/extension-base/stores';
import { AccountJson, AccountProxyMap, AccountsWithCurrentAddress, BalanceJson, BasicTxErrorType, BasicTxWarningCode, BuyServiceInfo, BuyTokenInfo, EarningRewardJson, NominationPoolInfo, OptimalYieldPathParams, RequestAccountBatchExportV2, RequestAccountCreateSuriV2, RequestAccountNameValidate, RequestBatchJsonGetAccountInfo, RequestBatchRestoreV2, RequestBounceableValidate, RequestChangeTonWalletContractVersion, RequestCheckPublicAndSecretKey, RequestCrossChainTransfer, RequestDeriveCreateMultiple, RequestDeriveCreateV3, RequestDeriveValidateV2, RequestEarlyValidateYield, RequestExportAccountProxyMnemonic, RequestGetAllTonWalletContractVersion, RequestGetDeriveAccounts, RequestGetDeriveSuggestion, RequestGetYieldPoolTargets, RequestInputAccountSubscribe, RequestJsonGetAccountInfo, RequestJsonRestoreV2, RequestMetadataHash, RequestMnemonicCreateV2, RequestMnemonicValidateV2, RequestPrivateKeyValidateV2, RequestShortenMetadata, RequestStakeCancelWithdrawal, RequestStakeClaimReward, RequestTransfer, RequestUnlockDotCheckCanMint, RequestUnlockDotSubscribeMintedData, RequestYieldLeave, RequestYieldStepSubmit, RequestYieldWithdrawal, ResponseAccountBatchExportV2, ResponseAccountCreateSuriV2, ResponseAccountNameValidate, ResponseBatchJsonGetAccountInfo, ResponseCheckPublicAndSecretKey, ResponseDeriveValidateV2, ResponseExportAccountProxyMnemonic, ResponseGetAllTonWalletContractVersion, ResponseGetDeriveAccounts, ResponseGetDeriveSuggestion, ResponseGetYieldPoolTargets, ResponseInputAccountSubscribe, ResponseJsonGetAccountInfo, ResponseMetadataHash, ResponseMnemonicCreateV2, ResponseMnemonicValidateV2, ResponsePrivateKeyValidateV2, ResponseShortenMetadata, StakingTxErrorType, StorageDataInterface, TokenSpendingApprovalParams, ValidateYieldProcessParams, YieldPoolType } from '@subwallet/extension-base/types';
import { RequestAccountProxyEdit, RequestAccountProxyForget } from '@subwallet/extension-base/types/account/action/edit';
import { RequestClaimBridge } from '@subwallet/extension-base/types/bridge';
import { GetNotificationParams, RequestIsClaimedPolygonBridge, RequestSwitchStatusParams } from '@subwallet/extension-base/types/notification';
import { CommonOptimalPath } from '@subwallet/extension-base/types/service-base';
import { SwapPair, SwapQuoteResponse, SwapRequest, SwapRequestResult, SwapSubmitParams, ValidateSwapProcessParams } from '@subwallet/extension-base/types/swap';
import { _analyzeAddress, BN_ZERO, combineAllAccountProxy, createTransactionFromRLP, isSameAddress, MODULE_SUPPORT, reformatAddress, signatureToHex, toBNString, Transaction as QrTransaction, transformAccounts, transformAddresses, uniqueStringArray } from '@subwallet/extension-base/utils';
import { parseContractInput, parseEvmRlp } from '@subwallet/extension-base/utils/eth/parseTransaction';
import { MetadataDef } from '@subwallet/extension-inject/types';
import { getKeypairTypeByAddress, isAddress, isSubstrateAddress, isTonAddress } from '@subwallet/keyring';
import { EthereumKeypairTypes, SubstrateKeypairTypes, TonKeypairTypes } from '@subwallet/keyring/types';
import { keyring } from '@subwallet/ui-keyring';
import { SubjectInfo } from '@subwallet/ui-keyring/observable/types';
import { KeyringAddress, KeyringJson$Meta } from '@subwallet/ui-keyring/types';
import { ProposalTypes } from '@walletconnect/types/dist/types/sign-client/proposal';
import { SessionTypes } from '@walletconnect/types/dist/types/sign-client/session';
import { getSdkError } from '@walletconnect/utils';
import BigN from 'bignumber.js';
import { t } from 'i18next';
import { combineLatest, Subject } from 'rxjs';
import { TransactionConfig } from 'web3-core';

import { SubmittableExtrinsic } from '@polkadot/api/types';
import { TypeRegistry } from '@polkadot/types';
import { AnyJson, Registry, SignerPayloadJSON, SignerPayloadRaw } from '@polkadot/types/types';
import { assert, hexStripPrefix, hexToU8a, isAscii, isHex, u8aToHex } from '@polkadot/util';
import { decodeAddress, isEthereumAddress } from '@polkadot/util-crypto';

import { getSuitableRegistry, RegistrySource, setupApiRegistry, setupDappRegistry, setupDatabaseRegistry } from '../utils';

export function isJsonPayload (value: SignerPayloadJSON | SignerPayloadRaw): value is SignerPayloadJSON {
  return (value as SignerPayloadJSON).genesisHash !== undefined;
}

export default class KoniExtension {
  #lockTimeOut: NodeJS.Timer | undefined = undefined;
  readonly #koniState: KoniState;
  #timeAutoLock: number = DEFAULT_AUTO_LOCK_TIME;
  #skipAutoLock = false;
  #firstTime = true;
  #alwaysLock = false;
  /**
   * Use for heartbeat.
   * When auto-lock runs, the value changes, and it stops the heartbeat.
   * With MV3, when the lifecycle ends, this extension Object will be destroyed, so #keyringLockSubject will be destroyed too.
   * */
  #keyringLockSubject = new Subject<boolean>();

  constructor (state: KoniState) {
    this.#koniState = state;

    const updateTimeAutoLock = (rs: RequestSettingsType) => {
      // Check time auto lock change
      if (this.#timeAutoLock !== rs.timeAutoLock) {
        this.#timeAutoLock = rs.timeAutoLock;
        this.#alwaysLock = !rs.timeAutoLock;
        clearTimeout(this.#lockTimeOut);

        if (this.#timeAutoLock > 0) {
          this.#lockTimeOut = setTimeout(() => {
            if (!this.#skipAutoLock) {
              this.keyringLock();
              updateLatestSession(Date.now());
            }
          }, this.#timeAutoLock * 60 * 1000);
        } else if (this.#alwaysLock) {
          if (!this.#firstTime) {
            this.keyringLock();
            updateLatestSession(Date.now());
          }
        }
      }

      if (this.#firstTime) {
        this.#firstTime = false;
      }
    };

    const updateLatestSession = (time: number) => {
      SWStorage.instance.setItem(LATEST_SESSION, JSON.stringify({ remind: true, timeCalculate: time })).catch(console.error);
    };

    this.#koniState.settingService.getSettings(updateTimeAutoLock);
    this.#koniState.settingService.getSubject().subscribe({
      next: updateTimeAutoLock
    });
  }

  private accountsEdit (request: RequestAccountProxyEdit): boolean {
    return this.#koniState.keyringService.context.accountsEdit(request);
  }

  private tonGetAllTonWalletContractVersion (request: RequestGetAllTonWalletContractVersion): ResponseGetAllTonWalletContractVersion {
    return this.#koniState.keyringService.context.tonGetAllTonWalletContractVersion(request);
  }

  private tonAccountChangeWalletContractVersion (request: RequestChangeTonWalletContractVersion): string {
    return this.#koniState.keyringService.context.tonAccountChangeWalletContractVersion(request);
  }

  private accountsExport ({ address, password }: RequestAccountExport): ResponseAccountExport {
    return { exportedJson: keyring.backupAccount(keyring.getPair(address), password) };
  }

  private metadataApprove ({ id }: RequestMetadataApprove): boolean {
    const queued = this.#koniState.getMetaRequest(id);

    assert(queued, t('Unable to proceed. Please try again'));

    const { request, resolve } = queued;

    this.#koniState.saveMetadata(request);

    resolve(true);

    return true;
  }

  private metadataGet (genesisHash: string | null): MetadataDef | null {
    return this.#koniState.knownMetadata.find((result) => result.genesisHash === genesisHash) || null;
  }

  private metadataList (): MetadataDef[] {
    return this.#koniState.knownMetadata;
  }

  private metadataReject ({ id }: RequestMetadataReject): boolean {
    const queued = this.#koniState.getMetaRequest(id);

    assert(queued, t('Unable to proceed. Please try again'));

    const { reject } = queued;

    reject(new Error('Rejected'));

    return true;
  }

  private metadataSubscribe (id: string, port: chrome.runtime.Port): MetadataRequest[] {
    const cb = createSubscription<'pri(metadata.requests)'>(id, port);
    const subscription = this.#koniState.metaSubject.subscribe((requests: MetadataRequest[]): void =>
      cb(requests)
    );

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
      subscription.unsubscribe();
    });

    return this.#koniState.metaSubject.value;
  }

  // TODO: move to request service
  private signingApproveSignature ({ id, signature, signedTransaction }: RequestSigningApproveSignature): boolean {
    const queued = this.#koniState.getSignRequest(id);

    assert(queued, t('Unable to proceed. Please try again'));

    const { resolve } = queued;

    resolve({ id, signature, signedTransaction });

    return true;
  }

  // TODO: move to request service
  private signingCancel ({ id }: RequestSigningCancel): boolean {
    const queued = this.#koniState.getSignRequest(id);

    assert(queued, t('Unable to proceed. Please try again'));

    const { reject } = queued;

    reject(new TransactionError(BasicTxErrorType.USER_REJECT_REQUEST));

    return true;
  }

  // FIXME This looks very much like what we have in authorization
  private signingSubscribe (id: string, port: chrome.runtime.Port): SigningRequest[] {
    const cb = createSubscription<'pri(signing.requests)'>(id, port);
    const subscription = this.#koniState.signSubject.subscribe((requests: SigningRequest[]): void =>
      cb(requests)
    );

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
      subscription.unsubscribe();
    });

    return this.#koniState.signSubject.value;
  }

  private windowOpen ({ allowedPath: path, params, subPath }: WindowOpenParams): boolean {
    let paramString = '';

    if (params) {
      paramString += '?';

      for (let i = 0; i < Object.keys(params).length; i++) {
        const [key, value] = Object.entries(params)[i];

        paramString += `${key}=${value}`;

        if (i !== Object.keys(params).length - 1) {
          paramString += '&';
        }
      }
    }

    const url = `${chrome.runtime.getURL('index.html')}#${path}${subPath || ''}${paramString}`;

    if (!ALLOWED_PATH.includes(path)) {
      console.error('Not allowed to open the url:', url);

      return false;
    }

    withErrorLog(() => chrome.tabs.create({ url }));

    return true;
  }

  ///

  private cancelSubscription (id: string): boolean {
    return this.#koniState.cancelSubscription(id);
  }

  private createUnsubscriptionHandle (id: string, unsubscribe: () => void): void {
    this.#koniState.createUnsubscriptionHandle(id, unsubscribe);
  }

  private accountExportPrivateKey (request: RequestAccountExportPrivateKey): ResponseAccountExportPrivateKey {
    return this.#koniState.accountExportPrivateKey(request);
  }

  private checkPublicAndSecretKey (request: RequestCheckPublicAndSecretKey): ResponseCheckPublicAndSecretKey {
    return this.#koniState.checkPublicAndSecretKey(request);
  }

  private checkNameExists (request: RequestAccountNameValidate): ResponseAccountNameValidate {
    return this.#koniState.keyringService.context.checkNameExists(request);
  }

  private async accountsGetAllWithCurrentAddress (id: string, port: chrome.runtime.Port): Promise<AccountsWithCurrentAddress> {
    const cb = createSubscription<'pri(accounts.subscribeWithCurrentProxy)'>(id, port);
    const keyringService = this.#koniState.keyringService;

    await this.#koniState.eventService.waitAccountReady;
    await this.#koniState.eventService.waitInjectReady;

    const currentAccount = keyringService.context.currentAccount;
    const accounts = keyringService.context.accounts;
    const transformedAccounts = Object.values(accounts);
    const responseData: AccountsWithCurrentAddress = {
      accounts: transformedAccounts?.length ? [combineAllAccountProxy(transformedAccounts), ...transformedAccounts] : [],
      currentAccountProxy: currentAccount?.proxyId
    };

    const accountProxyMapObservable = keyringService.context.observable.accounts;
    const currentAccountInfoObservable = keyringService.context.observable.currentAccount;

    const subscriptionAccountGroups = combineLatest({ accountProxies: accountProxyMapObservable, currentAccount: currentAccountInfoObservable }).subscribe(({ accountProxies, currentAccount }) => {
      const transformedAccounts = Object.values(accountProxies);

      responseData.accounts = transformedAccounts?.length ? [combineAllAccountProxy(transformedAccounts), ...transformedAccounts] : [];
      responseData.currentAccountProxy = currentAccount?.proxyId;

      console.debug('subscriptionAccountGroups', responseData);
      cb(responseData);
    });

    this.createUnsubscriptionHandle(id, () => {
      subscriptionAccountGroups.unsubscribe();
    });

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return responseData;
  }

  private async subscribeInputAddressData (request: RequestInputAccountSubscribe, id: string, port: chrome.runtime.Port): Promise<ResponseInputAccountSubscribe> {
    const { chain, data } = request;

    const cb = createSubscription<'pri(accounts.subscribeAccountsInputAddress)'>(id, port);

    const combineFunction = async (chainInfoMap: Record<string, _ChainInfo>, accountProxyMap: AccountProxyMap, _contacts: SubjectInfo): Promise<ResponseInputAccountSubscribe> => {
      const accountProxies = Object.values(accountProxyMap);
      const contacts = transformAddresses(_contacts);
      const chainInfo = chainInfoMap[chain];
      const substrateApi = this.#koniState.chainService.getSubstrateApi(chain);
      const rs = await _analyzeAddress(data, accountProxies, contacts, chainInfo, substrateApi);

      return {
        id,
        ...rs
      };
    };

    const accountObservable = this.#koniState.keyringService.context.observable.accounts;
    const contactObservable = this.#koniState.keyringService.context.observable.contacts;
    const chainInfoMapObservable = this.#koniState.chainService.subscribeChainInfoMap().asObservable();

    const subscription = combineLatest({ chainInfoMap: chainInfoMapObservable, accountProxies: accountObservable, contacts: contactObservable }).subscribe(({ accountProxies, chainInfoMap, contacts }) => {
      combineFunction(chainInfoMap, accountProxies, contacts)
        .then((rs) => cb(rs))
        .catch(console.error);
    });

    this.createUnsubscriptionHandle(id, () => {
      subscription.unsubscribe();
    });

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    const accountProxyMap = this.#koniState.keyringService.context.value.accounts;
    const contacts = this.#koniState.keyringService.context.value.contacts;
    const chainInfoMap = this.#koniState.chainService.getChainInfoMap();

    return combineFunction(chainInfoMap, accountProxyMap, contacts);
  }

  /**
   * @todo: move to keyring context
   * */
  private subscribeAddresses (id: string, port: chrome.runtime.Port): AddressBookInfo {
    const _cb = createSubscription<'pri(addressBook.subscribe)'>(id, port);
    let old = '';

    const subscription = this.#koniState.keyringService.context.observable.contacts.subscribe((subjectInfo: SubjectInfo): void => {
      const addresses = transformAddresses(subjectInfo);
      const _new = JSON.stringify(addresses);

      if (old !== _new) {
        _cb({
          addresses: addresses
        });

        old = _new;
      }
    });

    this.createUnsubscriptionHandle(id, () => {
      subscription.unsubscribe();
    });

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    const subjectInfo = this.#koniState.keyringService.context.contacts;

    return {
      addresses: transformAccounts(subjectInfo)
    };
  }

  /**
   * @todo: move to keyring context
   * */
  private saveRecentAccount ({ accountId, chain }: RequestSaveRecentAccount): KeyringAddress {
    if (isAddress((accountId))) {
      const address = reformatAddress(accountId);
      const account = keyring.getAccount(address);
      const contact = keyring.getAddress(address, 'address');

      if (account) {
        return account;
      } else {
        let metadata: KeyringJson$Meta;

        if (contact) {
          metadata = contact.meta;
        } else {
          const _new = keyring.saveRecent(address);

          metadata = _new.json.meta;
        }

        if (contact && !metadata.isRecent) {
          return contact;
        }

        const recentChainSlugs: string[] = (metadata.recentChainSlugs as string[]) || [];

        if (chain) {
          if (!recentChainSlugs.includes(chain)) {
            recentChainSlugs.push(chain);
          }
        }

        metadata.recentChainSlugs = recentChainSlugs;

        const result = keyring.addresses.add(new AccountsStore(), address, address, { address: address, meta: metadata });

        return { ...result.json, publicKey: decodeAddress(address) };
      }
    } else {
      throw Error(t('This is not an address'));
    }
  }

  /**
   * @todo: move to keyring context
   * */
  private editContactAccount ({ address, meta }: RequestEditContactAccount): boolean {
    if (isAddress((address))) {
      const _address = reformatAddress(address);

      keyring.saveAddress(_address, meta);

      return true;
    } else {
      throw Error(t('This is not an address'));
    }
  }

  /**
   * @todo: move to keyring context
   * */
  private deleteContactAccount ({ address }: RequestDeleteContactAccount): boolean {
    if (isAddress((address))) {
      const _address = reformatAddress(address);

      keyring.forgetAddress(_address);

      return true;
    } else {
      throw Error(t('This is not an address'));
    }
  }

  private _getAuthListV2 (): Promise<AuthUrls> {
    const keyringService = this.#koniState.keyringService;

    return new Promise<AuthUrls>((resolve, reject) => {
      this.#koniState.getAuthorize((rs: AuthUrls) => {
        const addressList = Object.keys(keyringService.context.pairs);
        const urlList = Object.keys(rs);

        if (Object.keys(rs[urlList[0]].isAllowedMap).toString() !== addressList.toString()) {
          urlList.forEach((url) => {
            addressList.forEach((address) => {
              if (!Object.keys(rs[url].isAllowedMap).includes(address)) {
                rs[url].isAllowedMap[address] = false;
              }
            });

            Object.keys(rs[url].isAllowedMap).forEach((address) => {
              if (!addressList.includes(address)) {
                delete rs[url].isAllowedMap[address];
              }
            });
          });

          this.#koniState.setAuthorize(rs);
        }

        resolve(rs);
      });
    });
  }

  private authorizeSubscribeV2 (id: string, port: chrome.runtime.Port): AuthorizeRequest[] {
    const cb = createSubscription<'pri(authorize.requestsV2)'>(id, port);
    const subscription = this.#koniState.authSubjectV2.subscribe((requests: AuthorizeRequest[]): void =>
      cb(requests)
    );

    this.createUnsubscriptionHandle(id, subscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return this.#koniState.authSubjectV2.value;
  }

  private async getAuthListV2 (): Promise<ResponseAuthorizeList> {
    const authList = await this._getAuthListV2();

    return { list: authList };
  }

  private authorizeApproveV2 ({ accounts, id }: RequestAuthorizeApproveV2): boolean {
    const queued = this.#koniState.getAuthRequestV2(id);

    assert(queued, t('Unable to proceed. Please try again'));

    const { resolve } = queued;

    resolve({ accounts, result: true });

    return true;
  }

  private authorizeRejectV2 ({ id }: RequestAuthorizeReject): boolean {
    const queued = this.#koniState.getAuthRequestV2(id);

    assert(queued, t('Unable to proceed. Please try again'));

    const { reject } = queued;

    reject(new Error('Rejected'));

    return true;
  }

  private authorizeCancelV2 ({ id }: RequestAuthorizeCancel): boolean {
    const queued = this.#koniState.getAuthRequestV2(id);

    assert(queued, t('Unable to proceed. Please try again'));

    const { reject } = queued;

    // Reject without error meaning cancel
    reject(new Error('Cancelled'));

    return true;
  }

  private _forgetSite (url: string, callBack?: (value: AuthUrls) => void) {
    this.#koniState.getAuthorize((value) => {
      assert(value, 'The source is not known');

      delete value[url];

      this.#koniState.setAuthorize(value, () => {
        callBack && callBack(value);
      });
    });
  }

  private forgetSite (data: RequestForgetSite, id: string, port: chrome.runtime.Port): boolean {
    const cb = createSubscription<'pri(authorize.forgetSite)'>(id, port);

    this._forgetSite(data.url, (items) => {
      cb(items);
    });

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return true;
  }

  private _forgetAllSite (callBack?: (value: AuthUrls) => void) {
    this.#koniState.getAuthorize((value) => {
      assert(value, 'The source is not known');

      value = {};

      this.#koniState.setAuthorize(value, () => {
        callBack && callBack(value);
      });
    });
  }

  private forgetAllSite (id: string, port: chrome.runtime.Port): boolean {
    const cb = createSubscription<'pri(authorize.forgetAllSite)'>(id, port);

    this._forgetAllSite((items) => {
      cb(items);
    });

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return true;
  }

  private getPairs (): AccountJson[] {
    const storedAccounts = this.#koniState.keyringService.context.pairs;

    return transformAccounts(storedAccounts);
  }

  private isAddressValidWithAuthType (address: string, accountAuthTypes?: AccountAuthType[]): boolean {
    const type = getKeypairTypeByAddress(address);

    const validTypes = {
      evm: EthereumKeypairTypes,
      substrate: SubstrateKeypairTypes,
      ton: TonKeypairTypes
    };

    return !!accountAuthTypes && accountAuthTypes.some((authType) => validTypes[authType]?.includes(type));
  }

  private filterAccountsByAccountAuthType (accounts: AccountJson[], accountAuthTypes?: AccountAuthType[]): string[] {
    if (!accountAuthTypes) {
      return [];
    }

    return accountAuthTypes.reduce<string[]>((list, accountAuthType) => {
      if (accountAuthType === 'evm') {
        accounts.forEach(({ address }) => isEthereumAddress(address) && list.push(address));
      } else if (accountAuthType === 'substrate') {
        accounts.forEach(({ address }) => isSubstrateAddress(address) && list.push(address));
      } else if (accountAuthType === 'ton') {
        accounts.forEach(({ address }) => isTonAddress(address) && list.push(address));
      }

      return list;
    }, []);
  }

  private _changeAuthorizationAll (connectValue: boolean, callBack?: (value: AuthUrls) => void) {
    this.#koniState.getAuthorize((value) => {
      assert(value, 'The source is not known');

      const pairs = this.getPairs();

      Object.keys(value).forEach((url) => {
        if (!value[url].isAllowed) {
          return;
        }

        const targetAccounts = this.filterAccountsByAccountAuthType(pairs, value[url].accountAuthTypes);

        targetAccounts.forEach((address) => {
          value[url].isAllowedMap[address] = connectValue;
        });
      });
      this.#koniState.setAuthorize(value, () => {
        callBack && callBack(value);
      });
    });
  }

  private changeAuthorizationAll (data: RequestAuthorization, id: string, port: chrome.runtime.Port): boolean {
    const cb = createSubscription<'pri(authorize.changeSite)'>(id, port);

    this._changeAuthorizationAll(data.connectValue, (items) => {
      cb(items);
    });

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return true;
  }

  private _changeAuthorization (url: string, connectValue: boolean, callBack?: (value: AuthUrls) => void) {
    this.#koniState.getAuthorize((value) => {
      assert(value[url], 'The source is not known');

      const pairs = this.getPairs();
      const targetAccounts = this.filterAccountsByAccountAuthType(pairs, value[url].accountAuthTypes);

      targetAccounts.forEach((address) => {
        value[url].isAllowedMap[address] = connectValue;
      });
      this.#koniState.setAuthorize(value, () => {
        callBack && callBack(value);
      });
    });
  }

  public toggleAuthorization2 (url: string): Promise<ResponseAuthorizeList> {
    return new Promise((resolve) => {
      this.#koniState.getAuthorize((value) => {
        assert(value[url], 'The source is not known');

        value[url].isAllowed = !value[url].isAllowed;

        this.#koniState.setAuthorize(value, () => {
          resolve({ list: value });
        });
      });
    });
  }

  private changeAuthorization (data: RequestAuthorization, id: string, port: chrome.runtime.Port): boolean {
    const cb = createSubscription<'pri(authorize.changeSite)'>(id, port);

    this._changeAuthorization(data.url, data.connectValue, (items) => {
      cb(items);
    });

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return true;
  }

  private _changeAuthorizationPerAcc (address: string, connectValue: boolean, url: string, callBack?: (value: AuthUrls) => void) {
    this.#koniState.getAuthorize((value) => {
      assert(value, 'The source is not known');

      if (this.isAddressValidWithAuthType(address, value[url].accountAuthTypes)) {
        value[url].isAllowedMap[address] = connectValue;

        this.#koniState.setAuthorize(value, () => {
          callBack && callBack(value);
        });
      } else {
        callBack && callBack(value);
      }
    });
  }

  private _changeAuthorizationBlock (connectValue: boolean, id: string) {
    this.#koniState.getAuthorize((value) => {
      assert(value, 'The source is not known');

      value[id].isAllowed = connectValue;

      this.#koniState.setAuthorize(value);
    });
  }

  private _changeAuthorizationPerSite (values: Record<string, boolean>, id: string) {
    this.#koniState.getAuthorize((value) => {
      assert(value, 'The source is not known');

      value[id].isAllowedMap = values;

      this.#koniState.setAuthorize(value);
    });
  }

  private changeAuthorizationPerAcc (data: RequestAuthorizationPerAccount, id: string, port: chrome.runtime.Port): boolean {
    const cb = createSubscription<'pri(authorize.changeSitePerAccount)'>(id, port);

    this._changeAuthorizationPerAcc(data.address, data.connectValue, data.url, (items) => {
      cb(items);
    });

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return true;
  }

  private changeAuthorizationPerSite (data: RequestAuthorizationPerSite): boolean {
    this._changeAuthorizationPerSite(data.values, data.id);

    return true;
  }

  private changeAuthorizationBlock (data: RequestAuthorizationBlock): boolean {
    this._changeAuthorizationBlock(data.connectedValue, data.id);

    return true;
  }

  private async getSettings (): Promise<RequestSettingsType> {
    return await new Promise((resolve) => {
      this.#koniState.getSettings((value) => {
        resolve(value);
      });
    });
  }

  private async toggleBalancesVisibility (): Promise<boolean> {
    return new Promise((resolve) => {
      this.#koniState.getSettings((value) => {
        const updateValue = {
          ...value,
          isShowBalance: !value.isShowBalance
        };

        this.#koniState.setSettings(updateValue, () => {
          resolve(!value.isShowBalance);
        });
      });
    });
  }

  private saveAccountAllLogo (data: string, id: string, port: chrome.runtime.Port) {
    const cb = createSubscription<'pri(settings.saveAccountAllLogo)'>(id, port);

    this.#koniState.getSettings((value) => {
      const updateValue = {
        ...value,
        accountAllLogo: data
      };

      this.#koniState.setSettings(updateValue, () => {
        // eslint-disable-next-line node/no-callback-literal
        cb(updateValue);
      });
    });

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return true;
  }

  private saveTheme (data: ThemeNames) {
    this.#koniState.updateSetting('theme', data);

    return true;
  }

  private setCamera ({ camera }: RequestCameraSettings) {
    this.#koniState.updateSetting('camera', camera);

    return true;
  }

  private saveBrowserConfirmationType (data: BrowserConfirmationType) {
    this.#koniState.updateSetting('browserConfirmationType', data);

    return true;
  }

  private setAutoLockTime ({ autoLockTime }: RequestChangeTimeAutoLock) {
    this.#koniState.updateSetting('timeAutoLock', autoLockTime);

    return true;
  }

  private setUnlockType ({ unlockType }: RequestUnlockType) {
    this.#koniState.updateSetting('unlockType', unlockType);

    return true;
  }

  private async subscribeSettings (id: string, port: chrome.runtime.Port) {
    const cb = createSubscription<'pri(settings.subscribe)'>(id, port);

    const balancesVisibilitySubscription = this.#koniState.subscribeSettingsSubject().subscribe({
      next: (rs) => {
        cb(rs);
      }
    });

    this.createUnsubscriptionHandle(id, balancesVisibilitySubscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return await this.getSettings();
  }

  private setEnableChainPatrol ({ enable }: RequestChangeEnableChainPatrol) {
    this.#koniState.updateSetting('enableChainPatrol', enable);

    return true;
  }

  private saveNotificationSetup (request: NotificationSetup) {
    this.#koniState.updateSetting('notificationSetup', request);

    return true;
  }

  private setShowZeroBalance ({ show }: RequestChangeShowZeroBalance) {
    this.#koniState.updateSetting('isShowZeroBalance', show);

    return true;
  }

  private setLanguage ({ language }: RequestChangeLanguage) {
    this.#koniState.updateSetting('language', language);

    return true;
  }

  private setShowBalance ({ enable }: RequestChangeShowBalance) {
    this.#koniState.updateSetting('isShowBalance', enable);

    return true;
  }

  private async subscribeAuthUrls (id: string, port: chrome.runtime.Port): Promise<AuthUrls> {
    const cb = createSubscription<'pri(authorize.subscribe)'>(id, port);

    const authorizeUrlSubscription = this.#koniState.subscribeAuthorizeUrlSubject().subscribe({
      next: (rs) => {
        cb(rs);
      }
    });

    this.createUnsubscriptionHandle(id, authorizeUrlSubscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return await this.#koniState.getAuthList();
  }

  private async saveCurrentAccountProxy (data: RequestCurrentAccountAddress): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.#koniState.keyringService.context.saveCurrentAccountProxyId(data.address, () => {
        resolve(true);
      });
    });
  }

  private async getAssetSetting (): Promise<Record<string, AssetSetting>> {
    return this.#koniState.chainService.getAssetSettings();
  }

  private subscribeAssetSetting (id: string, port: chrome.runtime.Port): Promise<Record<string, AssetSetting>> {
    const cb = createSubscription<'pri(assetSetting.getSubscription)'>(id, port);

    const assetSettingSubscription = this.#koniState.chainService.subscribeAssetSettings().subscribe(cb);

    this.createUnsubscriptionHandle(id, assetSettingSubscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return this.getAssetSetting();
  }

  private async updateAssetSetting (params: AssetSettingUpdateReq) {
    try {
      await this.#koniState.chainService.updateAssetSetting(params.tokenSlug, params.assetSetting, params.autoEnableNativeToken);

      this.#koniState.eventService.emit('asset.updateState', params.tokenSlug);

      return true;
    } catch (e) {
      console.error(e);

      return false;
    }
  }

  private async getPrice (): Promise<PriceJson> {
    return this.#koniState.priceService.getPrice();
  }

  private async setPriceCurrency ({ currency }: RequestChangePriceCurrency): Promise<boolean> {
    return await this.#koniState.priceService.setPriceCurrency(currency);
  }

  private subscribePrice (id: string, port: chrome.runtime.Port): Promise<PriceJson> {
    const cb = createSubscription<'pri(price.getSubscription)'>(id, port);

    const priceSubscription = this.#koniState.priceService.getPriceSubject()
      .subscribe((rs) => {
        cb(rs);
      });

    this.createUnsubscriptionHandle(id, priceSubscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return this.getPrice();
  }

  private async getBalance (reset?: boolean) {
    return this.#koniState.balanceService.getBalance(reset);
  }

  private async subscribeBalance (id: string, port: chrome.runtime.Port) {
    const cb = createSubscription<'pri(balance.getSubscription)'>(id, port);

    const balanceSubscription = this.#koniState.balanceService.subscribeBalanceMap().subscribe({
      next: (rs) => {
        const data = { details: rs } as BalanceJson;

        cb(data);
      }
    });

    this.createUnsubscriptionHandle(id, balanceSubscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return await this.getBalance(true);
  }

  private getCrowdloan (reset?: boolean): CrowdloanJson {
    return this.#koniState.getCrowdloan(reset);
  }

  private getCrowdloanContributions (request: RequestCrowdloanContributions) {
    return this.#koniState.getCrowdloanContributions(request);
  }

  private subscribeCrowdloan (id: string, port: chrome.runtime.Port): CrowdloanJson {
    const cb = createSubscription<'pri(crowdloan.getSubscription)'>(id, port);

    const crowdloanSubscription = this.#koniState.subscribeCrowdloan().subscribe({
      next: (rs) => {
        cb(rs);
      }
    });

    this.createUnsubscriptionHandle(id, crowdloanSubscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return this.getCrowdloan(true);
  }

  private accountsCreateSuriV2 (request: RequestAccountCreateSuriV2): ResponseAccountCreateSuriV2 {
    const addressDict = this.#koniState.keyringService.context.accountsCreateSuriV2(request);

    if (this.#alwaysLock) {
      this.keyringLock();
    }

    return addressDict;
  }

  private async accountsForgetOverride (request: RequestAccountProxyForget): Promise<boolean> {
    const addresses = await this.#koniState.keyringService.context.accountProxyForget(request);

    // Remove from auth list
    await new Promise<void>((resolve) => {
      this.#koniState.getAuthorize((value) => {
        if (value && Object.keys(value).length) {
          Object.keys(value).forEach((url) => {
            for (const address of addresses) {
              delete value[url].isAllowedMap[address];
            }
          });

          this.#koniState.setAuthorize(value, resolve);
        } else {
          resolve();
        }
      });
    });

    for (const address of addresses) {
      await this.#koniState.disableMantaPay(address);
    }

    if (request.lockAfter) {
      this.checkLockAfterMigrate();
    }

    return true;
  }

  private seedCreateV2 (request: RequestMnemonicCreateV2): Promise<ResponseMnemonicCreateV2> {
    return this.#koniState.keyringService.context.mnemonicCreateV2(request);
  }

  private seedValidateV2 (request: RequestMnemonicValidateV2): ResponseMnemonicValidateV2 {
    return this.#koniState.keyringService.context.mnemonicValidateV2(request);
  }

  private privateKeyValidateV2 (request: RequestPrivateKeyValidateV2): ResponsePrivateKeyValidateV2 {
    return this.#koniState.keyringService.context.privateKeyValidateV2(request);
  }

  /* JSON */

  private parseInfoSingleJson (request: RequestJsonGetAccountInfo): ResponseJsonGetAccountInfo {
    return this.#koniState.keyringService.context.parseInfoSingleJson(request);
  }

  private async jsonRestoreV2 (request: RequestJsonRestoreV2): Promise<string[]> {
    return await this.#koniState.keyringService.context.jsonRestoreV2(request,
      () => {
        if (this.#alwaysLock) {
          this.keyringLock();
        }
      }
    );
  }

  private parseInfoMultiJson (request: RequestBatchJsonGetAccountInfo): ResponseBatchJsonGetAccountInfo {
    return this.#koniState.keyringService.context.parseInfoMultiJson(request);
  }

  private batchRestoreV2 (request: RequestBatchRestoreV2): Promise<string[]> {
    return this.#koniState.keyringService.context.batchRestoreV2(request);
  }

  private async batchExportV2 (request: RequestAccountBatchExportV2): Promise<ResponseAccountBatchExportV2> {
    return this.#koniState.keyringService.context.batchExportV2(request);
  }

  /* JSON */

  private exportAccountProxyMnemonic (request: RequestExportAccountProxyMnemonic): ResponseExportAccountProxyMnemonic {
    return this.#koniState.keyringService.context.exportAccountProxyMnemonic(request);
  }

  private getNftCollection (): Promise<NftCollection[]> {
    return this.#koniState.getNftCollection();
  }

  private subscribeNftCollection (id: string, port: chrome.runtime.Port): Promise<NftCollection[]> {
    const cb = createSubscription<'pri(nftCollection.getSubscription)'>(id, port);
    const nftCollectionSubscription = this.#koniState.subscribeNftCollection().subscribe({
      next: (rs) => {
        cb(rs);
      }
    });

    this.createUnsubscriptionHandle(id, nftCollectionSubscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return this.getNftCollection();
  }

  private getNft (): Promise<NftJson | undefined> {
    return this.#koniState.getNft();
  }

  private async subscribeNft (id: string, port: chrome.runtime.Port): Promise<NftJson | null | undefined> {
    const cb = createSubscription<'pri(nft.getSubscription)'>(id, port);
    const nftSubscription = this.#koniState.subscribeNft().subscribe({
      next: (rs) => {
        cb(rs);
      }
    });

    this.createUnsubscriptionHandle(id, nftSubscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return this.getNft();
  }

  private getStakingReward (): Promise<StakingRewardJson> {
    return new Promise<StakingRewardJson>((resolve, reject) => {
      this.#koniState.getStakingReward((rs: StakingRewardJson) => {
        resolve(rs);
      });
    });
  }

  private subscribeStakingReward (id: string, port: chrome.runtime.Port): Promise<StakingRewardJson | null> {
    const cb = createSubscription<'pri(stakingReward.getSubscription)'>(id, port);
    const stakingRewardSubscription = this.#koniState.subscribeStakingReward().subscribe({
      next: (rs) => {
        cb(rs);
      }
    });

    this.createUnsubscriptionHandle(id, stakingRewardSubscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return this.getStakingReward();
  }

  private async getStaking (): Promise<StakingJson> {
    return this.#koniState.getStaking();
  }

  private async subscribeStaking (id: string, port: chrome.runtime.Port): Promise<StakingJson> {
    const cb = createSubscription<'pri(staking.getSubscription)'>(id, port);
    const stakingSubscription = this.#koniState.subscribeStaking().subscribe({
      next: (rs) => {
        cb(rs);
      }
    });

    this.createUnsubscriptionHandle(id, stakingSubscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return await this.getStaking();
  }

  private async subscribeHistory (id: string, port: chrome.runtime.Port): Promise<TransactionHistoryItem[]> {
    const cb = createSubscription<'pri(transaction.history.getSubscription)'>(id, port);

    const historySubject = await this.#koniState.historyService.getHistorySubject();

    const subscription = historySubject.subscribe((histories) => {
      const addresses = keyring.getAccounts().map((a) => a.address);

      // Re-filter
      cb(histories.filter((item) => addresses.some((address) => isSameAddress(item.address, address))));
    });

    this.createUnsubscriptionHandle(id, subscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    const addresses = keyring.getAccounts().map((a) => a.address);

    // Re-filter
    return historySubject.getValue().filter((item) => addresses.some((address) => isSameAddress(item.address, address)));
  }

  private subscribeHistoryByChainAndAddress ({ address, chain }: RequestSubscribeHistory, id: string, port: chrome.runtime.Port): ResponseSubscribeHistory {
    const cb = createSubscription<'pri(transaction.history.subscribe)'>(id, port);

    const subscribeHistoriesResponse = this.#koniState.historyService.subscribeHistories(chain, address, cb);

    this.createUnsubscriptionHandle(id, subscribeHistoriesResponse.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return {
      id,
      items: subscribeHistoriesResponse.value
    };
  }

  private async getOptimalTransferProcess (params: RequestOptimalTransferProcess): Promise<CommonOptimalPath> {
    return this.#koniState.balanceService.getOptimalTransferProcess(params);
  }

  private async approveSpending (params: TokenSpendingApprovalParams): Promise<SWTransactionResponse> {
    const { amount, chain, contractAddress, owner, spenderAddress } = params;

    if (!isSnowBridgeGatewayContract(spenderAddress) && !isAvailBridgeGatewayContract(spenderAddress)) {
      throw new Error('Only SnowBridge and AvailBridge is supported'); // todo: support all ERC20 spending approval
    }

    const evmApi = this.#koniState.getEvmApi(chain);
    const transactionConfig = await getERC20SpendingApprovalTx(spenderAddress, owner, contractAddress, evmApi, amount);

    return this.#koniState.transactionService.handleTransaction({
      errors: [],
      warnings: [],
      address: owner,
      chain,
      chainType: ChainType.EVM,
      transferNativeAmount: '0',
      transaction: transactionConfig,
      data: params,
      resolveOnDone: true, // todo: double-check this for other transactions
      extrinsicType: ExtrinsicType.TOKEN_SPENDING_APPROVAL,
      isTransferAll: false
    });
  }

  private async makeTransfer (inputData: RequestTransfer): Promise<SWTransactionResponse> {
    const { from, networkKey, to, tokenSlug, transferAll, transferBounceable, value } = inputData;
    const transferTokenInfo = this.#koniState.chainService.getAssetBySlug(tokenSlug);
    const [errors, ,] = validateTransferRequest(transferTokenInfo, from, to, value, transferAll);

    const warnings: TransactionWarning[] = [];
    const chainInfo = this.#koniState.getChainInfo(networkKey);

    const nativeTokenInfo = this.#koniState.getNativeTokenInfo(networkKey);
    const nativeTokenSlug: string = nativeTokenInfo.slug;
    const isTransferNativeToken = nativeTokenSlug === tokenSlug;
    const extrinsicType = isTransferNativeToken ? ExtrinsicType.TRANSFER_BALANCE : ExtrinsicType.TRANSFER_TOKEN;
    let chainType = ChainType.SUBSTRATE;

    const transferAmount: AmountData = { value: '0', symbol: _getAssetSymbol(transferTokenInfo), decimals: _getAssetDecimals(transferTokenInfo) };

    let transaction: ValidateTransactionResponseInput['transaction'];

    const transferTokenAvailable = await this.getAddressTransferableBalance({ address: from, networkKey, token: tokenSlug, extrinsicType });

    try {
      if (isEthereumAddress(from) && isEthereumAddress(to) && _isTokenTransferredByEvm(transferTokenInfo)) {
        chainType = ChainType.EVM;
        const txVal: string = transferAll ? transferTokenAvailable.value : (value || '0');
        const evmApi = this.#koniState.getEvmApi(networkKey);

        // todo: refactor: merge getERC20TransactionObject & getEVMTransactionObject
        // Estimate with EVM API
        if (_isTokenEvmSmartContract(transferTokenInfo) || _isLocalToken(transferTokenInfo)) {
          [
            transaction,
            transferAmount.value
          ] = await getERC20TransactionObject(_getContractAddressOfToken(transferTokenInfo), chainInfo, from, to, txVal, !!transferAll, evmApi);
        } else {
          [
            transaction,
            transferAmount.value
          ] = await getEVMTransactionObject(chainInfo, from, to, txVal, !!transferAll, evmApi);
        }
      } else if (_isMantaZkAsset(transferTokenInfo)) {
        transaction = undefined;
        transferAmount.value = '0';
      } else if (isTonAddress(from) && isTonAddress(to) && _isTokenTransferredByTon(transferTokenInfo)) {
        chainType = ChainType.TON;
        const tonApi = this.#koniState.getTonApi(networkKey);

        [transaction, transferAmount.value] = await createTonTransaction({
          tokenInfo: transferTokenInfo,
          from,
          to,
          networkKey,
          value: value || '0',
          transferAll: !!transferAll, // currently not used
          tonApi
        });
      } else {
        const substrateApi = this.#koniState.getSubstrateApi(networkKey);

        [transaction, transferAmount.value] = await createTransferExtrinsic({
          transferAll: !!transferAll,
          value: value || '0',
          from: from,
          networkKey,
          tokenInfo: transferTokenInfo,
          to: to,
          substrateApi
        });
      }
    } catch (e) {
      const error = e as Error;

      if (error.message.includes('transfer amount exceeds balance')) {
        error.message = t('Insufficient balance');
      }

      throw error;
    }

    const transferNativeAmount = isTransferNativeToken ? transferAmount.value : '0';

    const additionalValidator = async (inputTransaction: SWTransactionResponse): Promise<void> => {
      let senderSendingTokenTransferable: bigint | undefined;
      let receiverSystemAccountInfo: FrameSystemAccountInfo | undefined;

      if (!_isChainSubstrateCompatible(chainInfo)) {
        return undefined;
      }

      // Check ed for sender
      if (!isTransferNativeToken) {
        const [_senderSendingTokenTransferable, _receiverNativeTotal] = await Promise.all([
          this.getAddressTransferableBalance({ address: from, networkKey, token: tokenSlug, extrinsicType }),
          this.getAddressTotalBalance({ address: to, networkKey, token: nativeTokenSlug, extrinsicType: ExtrinsicType.TRANSFER_BALANCE })
        ]);

        senderSendingTokenTransferable = BigInt(_senderSendingTokenTransferable.value);
        receiverSystemAccountInfo = _receiverNativeTotal.metadata as FrameSystemAccountInfo;
      }

      const { value: _receiverSendingTokenKeepAliveBalance } = await this.getAddressTotalBalance({ address: to, networkKey, token: tokenSlug, extrinsicType }); // todo: shouldn't be just transferable, locked also counts
      const receiverSendingTokenKeepAliveBalance = BigInt(_receiverSendingTokenKeepAliveBalance);

      const amount = BigInt(transferAmount.value);

      const substrateApi = this.#koniState.getSubstrateApi(networkKey);
      const isSendingTokenSufficient = await this.isSufficientToken(transferTokenInfo, substrateApi);

      const [warnings, errors] = additionalValidateTransferForRecipient(transferTokenInfo, nativeTokenInfo, extrinsicType, receiverSendingTokenKeepAliveBalance, amount, senderSendingTokenTransferable, receiverSystemAccountInfo, isSendingTokenSufficient);

      warnings.length && inputTransaction.warnings.push(...warnings);
      errors.length && inputTransaction.errors.push(...errors);
    };

    const ignoreWarnings: BasicTxWarningCode[] = [];

    if (transferAll) {
      ignoreWarnings.push(BasicTxWarningCode.NOT_ENOUGH_EXISTENTIAL_DEPOSIT);
    }

    if (transferBounceable) {
      ignoreWarnings.push(BasicTxWarningCode.IS_BOUNCEABLE_ADDRESS);
    }

    return this.#koniState.transactionService.handleTransaction({
      errors,
      warnings,
      address: from,
      chain: networkKey,
      chainType,
      transferNativeAmount,
      transaction,
      data: inputData,
      extrinsicType,
      ignoreWarnings,
      isTransferAll: isTransferNativeToken ? transferAll : false,
      edAsWarning: isTransferNativeToken,
      additionalValidator: additionalValidator
    });
  }

  private async makeCrossChainTransfer (inputData: RequestCrossChainTransfer): Promise<SWTransactionResponse> {
    const { destinationNetworkKey, from, originNetworkKey, to, tokenSlug, transferAll, transferBounceable, value } = inputData;

    const originTokenInfo = this.#koniState.getAssetBySlug(tokenSlug);
    const destinationTokenInfo = this.#koniState.getXcmEqualAssetByChain(destinationNetworkKey, tokenSlug);
    const [errors, fromKeyPair] = validateXcmTransferRequest(destinationTokenInfo, from, value);
    let extrinsic: SubmittableExtrinsic<'promise'> | TransactionConfig | null = null;

    if (errors.length > 0) {
      return this.#koniState.transactionService.generateBeforeHandleResponseErrors(errors);
    }

    const chainInfoMap = this.#koniState.getChainInfoMap();
    const isAvailBridgeFromEvm = _isPureEvmChain(chainInfoMap[originNetworkKey]) && isAvailChainBridge(destinationNetworkKey);
    const isAvailBridgeFromAvail = isAvailChainBridge(originNetworkKey) && _isPureEvmChain(chainInfoMap[destinationNetworkKey]);
    const isSnowBridgeEvmTransfer = _isPureEvmChain(chainInfoMap[originNetworkKey]) && _isSnowBridgeXcm(chainInfoMap[originNetworkKey], chainInfoMap[destinationNetworkKey]) && !isAvailBridgeFromEvm;
    const isPolygonBridgeTransfer = _isPolygonChainBridge(originNetworkKey, destinationNetworkKey);
    const isPosBridgeTransfer = _isPosChainBridge(originNetworkKey, destinationNetworkKey);

    let additionalValidator: undefined | ((inputTransaction: SWTransactionResponse) => Promise<void>);
    let eventsHandler: undefined | ((eventEmitter: TransactionEmitter) => void);

    if (fromKeyPair && destinationTokenInfo) {
      const evmApi = this.#koniState.getEvmApi(originNetworkKey);
      const substrateApi = this.#koniState.getSubstrateApi(originNetworkKey);
      const params: CreateXcmExtrinsicProps = {
        destinationTokenInfo,
        originTokenInfo,
        sendingValue: value,
        sender: from,
        recipient: to,
        chainInfoMap,
        substrateApi,
        evmApi
      };

      let funcCreateExtrinsic: FunctionCreateXcmExtrinsic;

      if (isPosBridgeTransfer || isPolygonBridgeTransfer) {
        funcCreateExtrinsic = createPolygonBridgeExtrinsic;
      } else if (isSnowBridgeEvmTransfer) {
        funcCreateExtrinsic = createSnowBridgeExtrinsic;
      } else if (isAvailBridgeFromEvm) {
        funcCreateExtrinsic = createAvailBridgeTxFromEth;
      } else if (isAvailBridgeFromAvail) {
        funcCreateExtrinsic = createAvailBridgeExtrinsicFromAvail;
      } else {
        funcCreateExtrinsic = createXcmExtrinsic;
      }

      extrinsic = await funcCreateExtrinsic(params);

      additionalValidator = async (inputTransaction: SWTransactionResponse): Promise<void> => {
        const { value: senderTransferable } = await this.getAddressTransferableBalance({ address: from, networkKey: originNetworkKey, token: originTokenInfo.slug });
        const isSnowBridge = _isSnowBridgeXcm(chainInfoMap[originNetworkKey], chainInfoMap[destinationNetworkKey]);
        let recipientNativeBalance = '0';

        if (isSnowBridge) {
          const { value } = await this.getAddressTransferableBalance({ address: to, networkKey: destinationNetworkKey, extrinsicType: ExtrinsicType.TRANSFER_BALANCE });

          recipientNativeBalance = value;
        }

        const [warning, error] = additionalValidateXcmTransfer(originTokenInfo, destinationTokenInfo, value, senderTransferable, recipientNativeBalance, chainInfoMap[destinationNetworkKey], isSnowBridge);

        error && inputTransaction.errors.push(error);
        warning && inputTransaction.warnings.push(warning);
      };

      eventsHandler = (eventEmitter: TransactionEmitter) => {
        eventEmitter.on('send', () => {
          try {
            const dest = keyring.getPair(to);

            if (dest) {
              this.updateAssetSetting({
                autoEnableNativeToken: false,
                tokenSlug: destinationTokenInfo.slug,
                assetSetting: { visible: true }
              }).catch(console.error);
            }
          } catch (e) {
          }
        });
      };
    }

    const ignoreWarnings: BasicTxWarningCode[] = [];

    if (transferAll) {
      ignoreWarnings.push(BasicTxWarningCode.NOT_ENOUGH_EXISTENTIAL_DEPOSIT);
    }

    if (transferBounceable) {
      ignoreWarnings.push(BasicTxWarningCode.IS_BOUNCEABLE_ADDRESS);
    }

    return await this.#koniState.transactionService.handleTransaction({
      url: EXTENSION_REQUEST_URL,
      address: from,
      chain: originNetworkKey,
      transaction: extrinsic,
      data: inputData,
      extrinsicType: ExtrinsicType.TRANSFER_XCM,
      chainType: !isSnowBridgeEvmTransfer && !isAvailBridgeFromEvm && !isPolygonBridgeTransfer && !isPosBridgeTransfer ? ChainType.SUBSTRATE : ChainType.EVM,
      transferNativeAmount: _isNativeToken(originTokenInfo) ? value : '0',
      ignoreWarnings,
      isTransferAll: transferAll,
      errors,
      additionalValidator: additionalValidator,
      eventsHandler: eventsHandler
    });
  }

  private async evmNftSubmitTransaction (inputData: NftTransactionRequest): Promise<SWTransactionResponse> {
    const { networkKey, params, recipientAddress, senderAddress } = inputData;
    const contractAddress = params.contractAddress as string;
    const tokenId = params.tokenId as string;

    if (UNSUPPORTED_TRANSFER_EVM_CHAIN_NAME.includes(networkKey)) {
      return await this.#koniState.transactionService.handleTransaction({
        address: senderAddress,
        chain: networkKey,
        chainType: ChainType.EVM,
        data: inputData,
        extrinsicType: ExtrinsicType.SEND_NFT,
        transaction: null,
        url: EXTENSION_REQUEST_URL
      });
    }

    const transaction = await getERC721Transaction(this.#koniState.getEvmApi(networkKey), networkKey, contractAddress, senderAddress, recipientAddress, tokenId);

    // this.addContact(recipientAddress);

    return await this.#koniState.transactionService.handleTransaction({
      address: senderAddress,
      chain: networkKey,
      chainType: ChainType.EVM,
      data: inputData,
      extrinsicType: ExtrinsicType.SEND_NFT,
      transaction,
      url: EXTENSION_REQUEST_URL
    });
  }

  private async upsertChain (data: _NetworkUpsertParams): Promise<boolean> {
    try {
      return await this.#koniState.upsertChainInfo(data);
    } catch (e) {
      console.error(e);

      return false;
    }
  }

  private removeCustomChain (networkKey: string): boolean {
    return this.#koniState.removeCustomChain(networkKey);
  }

  private disableChain (networkKey: string): Promise<boolean> {
    return this.#koniState.disableChain(networkKey);
  }

  private async enableChain ({ chainSlug, enableTokens }: EnableChainParams): Promise<boolean> {
    return await this.#koniState.enableChain(chainSlug, enableTokens);
  }

  private async reconnectChain (chainSlug: string): Promise<boolean> {
    return this.#koniState.chainService.reconnectChain(chainSlug);
  }

  private async validateNetwork ({ existedChainSlug,
    provider }: ValidateNetworkRequest): Promise<ValidateNetworkResponse> {
    return await this.#koniState.validateCustomChain(provider, existedChainSlug);
  }

  private resetDefaultNetwork (): boolean {
    return this.#koniState.resetDefaultChains();
  }

  private recoverDotSamaApi (networkKey: string): boolean {
    try {
      return this.#koniState.refreshSubstrateApi(networkKey);
    } catch (e) {
      console.error(e);

      return false;
    }
  }

  private async validateERC721Token (data: _ChainAsset): Promise<boolean> {
    const evmApi = this.#koniState.getEvmApi(data.originChain);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const tokenContract = new evmApi.api.eth.Contract(_ERC721_ABI, data.metadata?.contractAddress);

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await tokenContract.methods.tokenOfOwnerByIndex('0xB7fdD27a8Df011816205a6e3cAA097DC4D8C2C5d', 1).call();

      return true;
    } catch (err) {
      const error = err as Error;

      if (error.message.includes('ERC721Enumerable: owner index out of bounds')) {
        return true;
      } else {
        return false;
      }
    }
  }

  private async upsertCustomToken (data: _ChainAsset): Promise<ResponseNftImport> {
    try {
      if (data.assetType === _AssetType.ERC721) {
        const isCompatible = await this.validateERC721Token(data);

        if (!isCompatible) {
          return {
            success: false,
            error: 'incompatibleNFT'
          };
        }
      }

      await this.#koniState.upsertCustomToken(data);

      return {
        success: true,
        error: ''
      };
    } catch (e) {
      console.error(e);

      return {
        success: false,
        error: 'Error'
      };
    }
  }

  private async isSufficientToken (tokenInfo: _ChainAsset, substrateApi: _SubstrateApi): Promise<boolean> {
    let metadata: SufficientMetadata;

    if (SUFFICIENT_CHAIN.includes(tokenInfo.originChain) && tokenInfo.assetType !== _AssetType.NATIVE) {
      const assetId = _isBridgedToken(tokenInfo) ? _getXcmAssetMultilocation(tokenInfo) : _getTokenOnChainAssetId(tokenInfo);

      const queryParams: _SubstrateAdapterQueryArgs = {
        section: 'query',
        module: 'foreignAssets',
        method: 'asset',
        args: [assetId]
      };

      if (!_isBridgedToken(tokenInfo)) {
        queryParams.module = 'assets';
      }

      metadata = (await substrateApi.makeRpcQuery<AnyJson>(queryParams)) as unknown as SufficientMetadata;
    } else {
      return false;
    }

    return metadata.isSufficient;
  }

  private async deleteCustomAsset (assetSlug: string) {
    const assetInfo = this.#koniState.getAssetBySlug(assetSlug);

    if (assetInfo && _isCustomAsset(assetSlug)) {
      if (_isAssetSmartContractNft(assetInfo)) { // check if deleting a smart contract NFT
        await this.#koniState.deleteNftCollection(assetInfo.originChain, _getContractAddressOfToken(assetInfo));
      }

      this.#koniState.deleteCustomAssets([assetSlug]);

      return true;
    }

    return false;
  }

  private async validateCustomAsset (data: _ValidateCustomAssetRequest): Promise<_ValidateCustomAssetResponse> {
    return await this.#koniState.validateCustomAsset(data);
  }

  private async getAddressTransferableBalance ({ address, extrinsicType, networkKey, token }: RequestFreeBalance): Promise<AmountData> {
    if (token && _MANTA_ZK_CHAIN_GROUP.includes(networkKey)) {
      const tokenInfo = this.#koniState.chainService.getAssetBySlug(token);

      if (tokenInfo.symbol.startsWith(_ZK_ASSET_PREFIX)) {
        return await this.#koniState.getMantaPayZkBalance(address, tokenInfo);
      }
    }

    return await this.#koniState.balanceService.getTransferableBalance(address, networkKey, token, extrinsicType);
  }

  private async getAddressTotalBalance ({ address, extrinsicType, networkKey, token }: RequestFreeBalance): Promise<AmountData> {
    return await this.#koniState.balanceService.getTotalBalance(address, networkKey, token, extrinsicType);
  }

  private async getMaxTransferable ({ address, destChain, isXcmTransfer, networkKey, token }: RequestMaxTransferable): Promise<AmountData> {
    const tokenInfo = token ? this.#koniState.chainService.getAssetBySlug(token) : this.#koniState.chainService.getNativeTokenInfo(networkKey);

    if (!_isNativeToken(tokenInfo)) {
      return await this.getAddressTransferableBalance({
        extrinsicType: ExtrinsicType.TRANSFER_TOKEN,
        address,
        networkKey,
        token
      });
    } else {
      let maxTransferable: BigN;

      if (isXcmTransfer) {
        maxTransferable = await this.getXcmMaxTransferable(tokenInfo, destChain, address);
      } else {
        // regular transfer with native token
        maxTransferable = await this.getNativeTokenMaxTransferable(tokenInfo, networkKey, address);
      }

      return {
        value: maxTransferable.gt(BN_ZERO) ? (maxTransferable.toFixed(0) || '0') : '0',
        decimals: tokenInfo.decimals,
        symbol: tokenInfo.symbol
      } as AmountData;
    }
  }

  private async getXcmMaxTransferable (originTokenInfo: _ChainAsset, destChain: string, address: string): Promise<BigN> {
    const substrateApi = this.#koniState.chainService.getSubstrateApi(originTokenInfo.originChain);
    const chainInfoMap = this.#koniState.chainService.getChainInfoMap();
    const destinationTokenInfo = this.#koniState.getXcmEqualAssetByChain(destChain, originTokenInfo.slug);

    // todo: improve this case. Currently set 1 AVAIL for covering fee as default.
    const isSpecialBridgeFromAvail = originTokenInfo.slug === 'avail_mainnet-NATIVE-AVAIL' && destChain === COMMON_CHAIN_SLUGS.ETHEREUM;
    const specialBridgeFromAvailFee = new BigN(toBNString(1, _getAssetDecimals(originTokenInfo))).minus(new BigN(_getTokenMinAmount(originTokenInfo)));

    if (destinationTokenInfo) {
      const [bnMockExecutionFee, { value }] = await Promise.all([
        getXcmMockTxFee(substrateApi, chainInfoMap, originTokenInfo, destinationTokenInfo),
        this.getAddressTransferableBalance({ extrinsicType: ExtrinsicType.TRANSFER_XCM, address, networkKey: originTokenInfo.originChain, token: originTokenInfo.slug })
      ]);

      const bnMaxTransferable = new BigN(value);
      const txFee = isSpecialBridgeFromAvail ? specialBridgeFromAvailFee : bnMockExecutionFee.multipliedBy(XCM_FEE_RATIO);

      return bnMaxTransferable.minus(txFee);
    }

    return new BigN(0);
  }

  private async getNativeTokenMaxTransferable (tokenInfo: _ChainAsset, networkKey: string, address: string): Promise<BigN> {
    const chainInfo = this.#koniState.chainService.getChainInfoByKey(networkKey);
    const api = _isChainEvmCompatible(chainInfo) && _isTokenTransferredByEvm(tokenInfo)
      ? this.#koniState.chainService.getEvmApi(networkKey)
      : _isChainTonCompatible(chainInfo) && _isTokenTransferredByTon(tokenInfo)
        ? this.#koniState.chainService.getTonApi(networkKey)
        : this.#koniState.chainService.getSubstrateApi(networkKey);

    const [mockTxFee, { value }] = await Promise.all([
      getTransferMockTxFee(address, chainInfo, tokenInfo, api),
      this.getAddressTransferableBalance({ extrinsicType: ExtrinsicType.TRANSFER_BALANCE, address, networkKey, token: tokenInfo.slug })
    ]);

    const bnMaxTransferable = new BigN(value);

    return bnMaxTransferable.minus(mockTxFee);
  }

  private async subscribeAddressTransferableBalance ({ address, extrinsicType, networkKey, token }: RequestFreeBalance, id: string, port: chrome.runtime.Port): Promise<AmountData> {
    const cb = createSubscription<'pri(freeBalance.subscribe)'>(id, port);

    const convertData = (data: AmountData): AmountDataWithId => {
      return ({ ...data, id });
    };

    const _cb = (data: AmountData) => {
      // eslint-disable-next-line node/no-callback-literal
      cb(convertData(data));
    };

    const [unsub, currentFreeBalance] = await this.#koniState.balanceService.subscribeTransferableBalance(address, networkKey, token, extrinsicType, _cb);

    this.createUnsubscriptionHandle(
      id,
      unsub
    );

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return convertData(currentFreeBalance);
  }

  private async substrateNftSubmitTransaction (inputData: RequestSubstrateNftSubmitTransaction): Promise<NftTransactionResponse> {
    const { params, recipientAddress, senderAddress } = inputData;
    const isSendingSelf = isRecipientSelf(senderAddress, recipientAddress);

    // TODO: do better to detect tokenType
    const isPSP34 = params?.isPsp34 as boolean | undefined;
    const networkKey = params?.networkKey as string;

    const apiProps = this.#koniState.getSubstrateApi(networkKey);
    const extrinsic = !isPSP34
      ? await getNftTransferExtrinsic(networkKey, apiProps, senderAddress, recipientAddress, params || {})
      : await getPSP34TransferExtrinsic(apiProps, senderAddress, recipientAddress, params || {});

    // this.addContact(recipientAddress);

    const rs = await this.#koniState.transactionService.handleTransaction({
      address: senderAddress,
      chain: networkKey,
      transaction: extrinsic,
      data: { ...inputData, isSendingSelf },
      extrinsicType: ExtrinsicType.SEND_NFT,
      chainType: ChainType.SUBSTRATE
    });

    return { ...rs, isSendingSelf };
  }

  private async enableChains ({ chainSlugs, enableTokens }: EnableMultiChainParams) {
    try {
      await Promise.all(chainSlugs.map((chainSlug) => this.enableChain({ chainSlug, enableTokens })));
    } catch (e) {
      return false;
    }

    return true;
  }

  private async accountsCreateExternalV2 (request: RequestAccountCreateExternalV2): Promise<AccountExternalError[]> {
    return this.#koniState.keyringService.context.accountsCreateExternalV2(request);
  }

  private async accountsCreateHardwareV2 (request: RequestAccountCreateHardwareV2): Promise<boolean> {
    return this.#koniState.keyringService.context.accountsCreateHardwareV2(request);
  }

  private async accountsCreateHardwareMultiple (request: RequestAccountCreateHardwareMultiple): Promise<boolean> {
    return this.#koniState.keyringService.context.accountsCreateHardwareMultiple(request);
  }

  private async accountsCreateWithSecret (request: RequestAccountCreateWithSecretKey): Promise<ResponseAccountCreateWithSecretKey> {
    const result = await this.#koniState.keyringService.context.accountsCreateWithSecret(request);

    if (this.#alwaysLock) {
      this.keyringLock();
    }

    return result;
  }

  /// External account

  private rejectExternalRequest (request: RequestRejectExternalRequest): ResponseRejectExternalRequest {
    const { id, message, throwError } = request;

    const promise = this.#koniState.getExternalRequest(id);

    if (promise.status === ExternalRequestPromiseStatus.PENDING && promise.reject) {
      if (throwError) {
        promise.reject(new Error(message));
      } else {
        promise.reject();
      }

      this.#koniState.updateExternalRequest(id, {
        status: ExternalRequestPromiseStatus.REJECTED,
        message: message,
        reject: undefined,
        resolve: undefined
      });
    }
  }

  private resolveQrTransfer (request: RequestResolveExternalRequest): ResponseResolveExternalRequest {
    const { data, id } = request;

    const promise = this.#koniState.getExternalRequest(id);

    if (promise.status === ExternalRequestPromiseStatus.PENDING) {
      promise.resolve && promise.resolve(data);
      this.#koniState.updateExternalRequest(id, {
        status: ExternalRequestPromiseStatus.COMPLETED,
        reject: undefined,
        resolve: undefined
      });
    }
  }

  private subscribeConfirmations (id: string, port: chrome.runtime.Port) {
    const cb = createSubscription<'pri(confirmations.subscribe)'>(id, port);

    const subscription = this.#koniState.getConfirmationsQueueSubject().subscribe(cb);

    this.createUnsubscriptionHandle(id, subscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return this.#koniState.getConfirmationsQueueSubject().getValue();
  }

  private subscribeConfirmationsTon (id: string, port: chrome.runtime.Port) {
    const cb = createSubscription<'pri(confirmationsTon.subscribe)'>(id, port);

    const subscription = this.#koniState.getConfirmationsQueueSubjectTon().subscribe(cb);

    this.createUnsubscriptionHandle(id, subscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return this.#koniState.getConfirmationsQueueSubjectTon().getValue();
  }

  private async completeConfirmation (request: RequestConfirmationComplete) {
    return await this.#koniState.completeConfirmation(request);
  }

  private async completeConfirmationTon (request: RequestConfirmationCompleteTon) {
    return await this.#koniState.completeConfirmationTon(request);
  }

  /// Sign Qr

  private getNetworkJsonByChainId (chainId?: number): _ChainInfo | null {
    const chainInfoMap = this.#koniState.getChainInfoMap();

    if (!chainId) {
      for (const n in chainInfoMap) {
        if (!Object.prototype.hasOwnProperty.call(chainInfoMap, n)) {
          continue;
        }

        const networkInfo = chainInfoMap[n];

        if (_isChainEvmCompatible(networkInfo)) {
          return networkInfo;
        }
      }

      return null;
    }

    for (const n in chainInfoMap) {
      if (!Object.prototype.hasOwnProperty.call(chainInfoMap, n)) {
        continue;
      }

      const networkInfo = chainInfoMap[n];

      if (_getEvmChainId(networkInfo) === chainId) {
        return networkInfo;
      }
    }

    return null;
  }

  // Parse transaction

  private parseSubstrateTransaction ({ data,
    networkKey }: RequestParseTransactionSubstrate): ResponseParseTransactionSubstrate {
    const apiProps = this.#koniState.getSubstrateApi(networkKey);
    const apiPromise = apiProps.api;

    return parseSubstrateTransaction(data, apiPromise);
  }

  private async parseEVMRLP ({ data }: RequestQrParseRLP): Promise<ResponseQrParseRLP> {
    return await parseEvmRlp(data, this.#koniState.getChainInfoMap(), this.#koniState.getEvmApiMap());
  }

  // Sign

  private qrSignSubstrate ({ address, data, networkKey }: RequestQrSignSubstrate): ResponseQrSignSubstrate {
    const pair = keyring.getPair(address);

    assert(pair, t('Unable to find account'));

    if (pair.isLocked) {
      keyring.unlockPair(pair.address);
    }

    let signed = hexStripPrefix(u8aToHex(pair.sign(data, { withType: true })));
    const network = this.#koniState.getChainInfo(networkKey);

    if (_isChainEvmCompatible(network)) {
      signed = signed.substring(2);
    }

    return {
      signature: signed
    };
  }

  private async qrSignEVM ({ address, chainId, message, type }: RequestQrSignEvm): Promise<ResponseQrSignEvm> {
    let signed: string;
    const network: _ChainInfo | null = this.getNetworkJsonByChainId(chainId);

    if (!network) {
      throw new Error(t('Cannot find network'));
    }

    const pair = keyring.getPair(address);

    if (!pair) {
      throw Error(t('Unable to find account'));
    }

    if (pair.isLocked) {
      keyring.unlockPair(pair.address);
    }

    if (type === 'message') {
      let data = message;

      if (isHex(message)) {
        data = message;
      } else if (isAscii(message)) {
        data = `0x${message}`;
      }

      signed = await pair.evm.signMessage(data, 'personal_sign');
    } else {
      const tx: QrTransaction | null = createTransactionFromRLP(message);

      if (!tx) {
        throw new Error(t('Failed to decode data. Please use a valid QR code'));
      }

      const txObject: TransactionConfig = {
        gasPrice: new BigN(tx.gasPrice).toNumber(),
        to: tx.to,
        value: new BigN(tx.value).toNumber(),
        data: tx.data,
        nonce: new BigN(tx.nonce).toNumber(),
        gas: new BigN(tx.gas).toNumber()
      };

      const common = Common.custom({
        name: network.name,
        networkId: _getEvmChainId(network),
        chainId: _getEvmChainId(network)
      }, { hardfork: 'petersburg' });

      // @ts-ignore
      const transaction = new LegacyTransaction(txObject, { common });

      const signedTranaction = LegacyTransaction.fromSerializedTx(hexToU8a(pair.evm.signTransaction(transaction)));

      signed = signatureToHex({
        r: signedTranaction.r?.toString(16) || '',
        s: signedTranaction.s?.toString(16) || '',
        v: signedTranaction.v?.toString(16) || ''
      });
    }

    return {
      signature: hexStripPrefix(signed)
    };
  }

  private async subscribeChainStakingMetadata (id: string, port: chrome.runtime.Port) {
    const cb = createSubscription<'pri(bonding.subscribeChainStakingMetadata)'>(id, port);

    const chainStakingMetadata = this.#koniState.subscribeChainStakingMetadata().subscribe({
      next: (rs) => {
        cb(rs);
      }
    });

    this.createUnsubscriptionHandle(id, chainStakingMetadata.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return this.#koniState.getChainStakingMetadata();
  }

  private async subscribeStakingNominatorMetadata (id: string, port: chrome.runtime.Port) {
    const cb = createSubscription<'pri(bonding.subscribeNominatorMetadata)'>(id, port);

    const nominatorMetadata = this.#koniState.subscribeNominatorMetadata().subscribe({
      next: (rs) => {
        cb(rs);
      }
    });

    this.createUnsubscriptionHandle(id, nominatorMetadata.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return this.#koniState.getNominatorMetadata();
  }

  private async getBondingOptions ({ chain, type }: BondingOptionParams): Promise<ValidatorInfo[] | undefined> {
    const apiProps = this.#koniState.getSubstrateApi(chain);
    const chainInfo = this.#koniState.getChainInfo(chain);
    const chainStakingMetadata = await this.#koniState.getStakingMetadataByChain(chain, type);

    if (!chainStakingMetadata) {
      return;
    }

    const { decimals } = _getChainNativeTokenBasicInfo(chainInfo);

    return await getValidatorsInfo(chain, apiProps, decimals, chainStakingMetadata);
  }

  private async getNominationPoolOptions (chain: string): Promise<NominationPoolInfo[]> {
    const substrateApi = this.#koniState.getSubstrateApi(chain);

    return await getNominationPoolsInfo(chain, substrateApi);
  }

  private async submitBonding (inputData: RequestBondingSubmit): Promise<SWTransactionResponse> {
    const { address, amount, chain, nominatorMetadata, selectedValidators } = inputData;
    const chainInfo = this.#koniState.getChainInfo(chain);
    const chainStakingMetadata = await this.#koniState.getStakingMetadataByChain(chain, StakingType.NOMINATED);

    if (!chainStakingMetadata) {
      const errMessage = t('Unable to fetch staking data. Re-enable "{{chainName}}" and try again.', { replace: { chainName: chainInfo.name } });

      return this.#koniState.transactionService
        .generateBeforeHandleResponseErrors([new TransactionError(StakingTxErrorType.CAN_NOT_GET_METADATA, errMessage)]);
    }

    const bondingValidation = validateBondingCondition(chainInfo, amount, selectedValidators, address, chainStakingMetadata, nominatorMetadata);

    if (!amount || !selectedValidators || bondingValidation.length > 0) {
      return this.#koniState.transactionService
        .generateBeforeHandleResponseErrors(bondingValidation);
    }

    const substrateApi = this.#koniState.getSubstrateApi(chain);
    const extrinsic = await getBondingExtrinsic(chainInfo, amount, selectedValidators, substrateApi, address, nominatorMetadata);

    return await this.#koniState.transactionService.handleTransaction({
      address,
      chain: chain,
      chainType: ChainType.SUBSTRATE,
      data: inputData,
      extrinsicType: ExtrinsicType.STAKING_BOND,
      transaction: extrinsic,
      url: EXTENSION_REQUEST_URL,
      transferNativeAmount: amount
    });
  }

  private async submitUnbonding (inputData: RequestUnbondingSubmit): Promise<SWTransactionResponse> {
    const { amount, chain, nominatorMetadata, validatorAddress } = inputData;

    const chainStakingMetadata = await this.#koniState.getStakingMetadataByChain(chain, StakingType.NOMINATED);

    if (!chainStakingMetadata || !nominatorMetadata) {
      return this.#koniState.transactionService.generateBeforeHandleResponseErrors([new TransactionError(BasicTxErrorType.INTERNAL_ERROR)]);
    }

    const unbondingValidation = validateUnbondingCondition(nominatorMetadata, amount, chain, chainStakingMetadata, validatorAddress);

    if (!amount || unbondingValidation.length > 0) {
      return this.#koniState.transactionService.generateBeforeHandleResponseErrors(unbondingValidation);
    }

    const substrateApi = this.#koniState.getSubstrateApi(chain);
    const extrinsic = await getUnbondingExtrinsic(nominatorMetadata, amount, chain, substrateApi, validatorAddress);

    return await this.#koniState.transactionService.handleTransaction({
      address: nominatorMetadata.address,
      chain: chain,
      transaction: extrinsic,
      data: inputData,
      extrinsicType: ExtrinsicType.STAKING_UNBOND,
      chainType: ChainType.SUBSTRATE
    });
  }

  private async submitStakeClaimReward (inputData: RequestStakeClaimReward): Promise<SWTransactionResponse> {
    const { address, bondReward, slug } = inputData;
    const poolHandler = this.#koniState.earningService.getPoolHandler(slug);

    if (!address || !poolHandler) {
      return this.#koniState.transactionService.generateBeforeHandleResponseErrors([new TransactionError(BasicTxErrorType.INVALID_PARAMS)]);
    }

    const chain = poolHandler.chain;
    const stakingType: StakingType = poolHandler.type === YieldPoolType.NOMINATION_POOL ? StakingType.POOLED : StakingType.NOMINATED;
    const substrateApi = this.#koniState.getSubstrateApi(chain);
    const extrinsic = await getClaimRewardExtrinsic(substrateApi, chain, address, stakingType, bondReward);

    return await this.#koniState.transactionService.handleTransaction({
      address,
      chain: chain,
      transaction: extrinsic,
      data: inputData,
      extrinsicType: ExtrinsicType.STAKING_CLAIM_REWARD,
      chainType: ChainType.SUBSTRATE
    });
  }

  private async submitCancelStakeWithdrawal (inputData: RequestStakeCancelWithdrawal): Promise<SWTransactionResponse> {
    const { address, selectedUnstaking, slug } = inputData;
    const chain = this.#koniState.earningService.getPoolHandler(slug)?.chain;

    if (!chain || !selectedUnstaking) {
      return this.#koniState.transactionService.generateBeforeHandleResponseErrors([new TransactionError(BasicTxErrorType.INVALID_PARAMS)]);
    }

    const substrateApi = this.#koniState.getSubstrateApi(chain);
    // @ts-ignore
    const extrinsic = await getCancelWithdrawalExtrinsic(substrateApi, chain, selectedUnstaking);

    return await this.#koniState.transactionService.handleTransaction({
      address,
      chain,
      transaction: extrinsic,
      data: inputData,
      extrinsicType: ExtrinsicType.STAKING_CANCEL_UNSTAKE,
      chainType: ChainType.SUBSTRATE
    });
  }

  private async submitPoolBonding (inputData: RequestStakePoolingBonding): Promise<SWTransactionResponse> {
    const { address, amount, chain, nominatorMetadata, selectedPool } = inputData;

    const chainInfo = this.#koniState.getChainInfo(chain);
    const chainStakingMetadata = await this.#koniState.getStakingMetadataByChain(chain, StakingType.NOMINATED);

    if (!chainStakingMetadata) {
      const errMessage = t('Unable to fetch staking data. Re-enable "{{chainName}}" and try again.', { replace: { chainName: chainInfo.name } });

      return this.#koniState.transactionService
        .generateBeforeHandleResponseErrors([new TransactionError(StakingTxErrorType.CAN_NOT_GET_METADATA, errMessage)]);
    }

    const bondingValidation = validatePoolBondingCondition(chainInfo, amount, selectedPool, address, chainStakingMetadata, nominatorMetadata);

    if (!amount || bondingValidation.length > 0) {
      return this.#koniState.transactionService
        .generateBeforeHandleResponseErrors(bondingValidation);
    }

    const substrateApi = this.#koniState.getSubstrateApi(chain);
    const extrinsic = await getPoolingBondingExtrinsic(substrateApi, amount, selectedPool.id, nominatorMetadata);

    return await this.#koniState.transactionService.handleTransaction({
      address,
      chain,
      transaction: extrinsic,
      data: inputData,
      extrinsicType: ExtrinsicType.STAKING_JOIN_POOL,
      chainType: ChainType.SUBSTRATE,
      transferNativeAmount: amount
    });
  }

  private async submitPoolingUnbonding (inputData: RequestStakePoolingUnbonding): Promise<SWTransactionResponse> {
    const { amount, chain, nominatorMetadata } = inputData;

    const chainStakingMetadata = await this.#koniState.getStakingMetadataByChain(chain, StakingType.NOMINATED);

    if (!chainStakingMetadata || !nominatorMetadata) {
      const chainInfo = this.#koniState.getChainInfo(chain);
      const errMessage = t('Unable to fetch staking data. Re-enable "{{chainName}}" and try again.', { replace: { chainName: chainInfo?.name } });

      return this.#koniState.transactionService
        .generateBeforeHandleResponseErrors([new TransactionError(StakingTxErrorType.CAN_NOT_GET_METADATA, errMessage)]);
    }

    const unbondingValidation = validateRelayUnbondingCondition(amount, chainStakingMetadata, nominatorMetadata);

    if (!amount || unbondingValidation.length > 0) {
      return this.#koniState.transactionService
        .generateBeforeHandleResponseErrors(unbondingValidation);
    }

    const substrateApi = this.#koniState.getSubstrateApi(chain);
    const extrinsic = await getPoolingUnbondingExtrinsic(substrateApi, amount, nominatorMetadata);

    return await this.#koniState.transactionService.handleTransaction({
      address: nominatorMetadata.address,
      chain,
      transaction: extrinsic,
      data: inputData,
      extrinsicType: ExtrinsicType.STAKING_LEAVE_POOL,
      chainType: ChainType.SUBSTRATE
    });
  }

  // EVM Transaction
  private async parseContractInput ({ chainId,
    contract,
    data }: RequestParseEvmContractInput): Promise<ResponseParseEvmContractInput> {
    const network = this.getNetworkJsonByChainId(chainId);

    return await parseContractInput(data, contract, network);
  }

  private async submitTuringStakeCompounding (inputData: RequestTuringStakeCompound) {
    const { accountMinimum, address, bondedAmount, collatorAddress, networkKey } = inputData;

    if (!address) {
      return this.#koniState.transactionService.generateBeforeHandleResponseErrors([new TransactionError(BasicTxErrorType.INVALID_PARAMS)]);
    }

    const dotSamaApi = this.#koniState.getSubstrateApi(networkKey);
    const chainInfo = this.#koniState.getChainInfo(networkKey);
    const { decimals } = _getChainNativeTokenBasicInfo(chainInfo);
    const parsedAccountMinimum = parseFloat(accountMinimum) * 10 ** decimals;
    const extrinsic = await getTuringCompoundExtrinsic(dotSamaApi, address, collatorAddress, parsedAccountMinimum.toString(), bondedAmount);

    return await this.#koniState.transactionService.handleTransaction({
      address,
      chain: networkKey,
      transaction: extrinsic,
      data: inputData,
      extrinsicType: ExtrinsicType.STAKING_COMPOUNDING,
      chainType: ChainType.SUBSTRATE
    });
  }

  private async submitTuringCancelStakeCompound (inputData: RequestTuringCancelStakeCompound) {
    const { address, networkKey, taskId } = inputData;
    const txState: TransactionResponse = {};

    if (!address) {
      txState.txError = true;

      return txState;
    }

    const dotSamaApi = this.#koniState.getSubstrateApi(networkKey);
    const extrinsic = await getTuringCancelCompoundingExtrinsic(dotSamaApi, taskId);

    return await this.#koniState.transactionService.handleTransaction({
      address,
      chain: networkKey,
      transaction: extrinsic,
      data: inputData,
      extrinsicType: ExtrinsicType.STAKING_CANCEL_COMPOUNDING,
      chainType: ChainType.SUBSTRATE
    });
  }

  /// Keyring state

  // Subscribe keyring state

  private keyringStateSubscribe (id: string, port: chrome.runtime.Port): KeyringState {
    const cb = createSubscription<'pri(keyring.subscribe)'>(id, port);
    const subscription = this.#koniState.keyringService.keyringStateSubscribe(cb);

    this.createUnsubscriptionHandle(id, subscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return this.#koniState.keyringService.keyringState;
  }

  // Change master password

  private keyringChangeMasterPassword (request: RequestChangeMasterPassword): ResponseChangeMasterPassword {
    const createNew = request.createNew;

    const callback = () => {
      if (this.#alwaysLock && !createNew) {
        this.keyringLock();
      }
    };

    return this.#koniState.keyringService.context.keyringChangeMasterPassword(request, callback);
  }

  // Migrate password

  private checkLockAfterMigrate () {
    const pairs = keyring.getPairs();

    const needMigrate = !!pairs
      .filter((acc) => acc.address !== ALL_ACCOUNT_KEY && !acc.meta.isExternal && !acc.meta.isInjected)
      .filter((acc) => !acc.meta.isMasterPassword)
      .length;

    if (!needMigrate) {
      if (this.#alwaysLock) {
        this.keyringLock();
      }
    }
  }

  private keyringMigrateMasterPassword (request: RequestMigratePassword): ResponseMigratePassword {
    const cb = () => {
      this.checkLockAfterMigrate();
    };

    return this.#koniState.keyringService.context.keyringMigrateMasterPassword(request, cb);
  }

  // Unlock wallet

  private keyringUnlock ({ password }: RequestUnlockKeyring): ResponseUnlockKeyring {
    try {
      keyring.unlockKeyring(password);
      // this.#koniState.initMantaPay(password)
      //   .catch(console.error);
    } catch (e) {
      return {
        errors: [(e as Error).message],
        status: false
      };
    }

    this.#koniState.updateKeyringState();

    return {
      status: true,
      errors: []
    };
  }

  // Lock wallet

  private keyringLock (): void {
    this.#koniState.keyringService.lock();
    this.#keyringLockSubject.next(true);
    clearTimeout(this.#lockTimeOut);
  }

  public keyringLockSubscribe (cb: (state: boolean) => void): any {
    this.#keyringLockSubject.subscribe(cb);
  }

  // Export mnemonic

  private keyringExportMnemonic ({ address, password }: RequestKeyringExportMnemonic): ResponseKeyringExportMnemonic {
    const pair = keyring.getPair(address);

    const result = pair.exportMnemonic(password);

    return { result };
  }

  // Reset wallet

  private async resetWallet ({ resetAll }: RequestResetWallet): Promise<ResponseResetWallet> {
    try {
      await this.#koniState.resetWallet(resetAll);

      return {
        errors: [],
        status: true
      };
    } catch (e) {
      return {
        errors: [(e as Error).message],
        status: false
      };
    }
  }

  // Signing substrate request
  private async signingApprovePasswordV2 ({ id }: RequestSigningApprovePasswordV2): Promise<boolean> {
    const queued = this.#koniState.getSignRequest(id);

    assert(queued, t('Unable to proceed. Please try again'));

    const { reject, request, resolve } = queued;
    const pair = keyring.getPair(queued.address);

    // unlike queued.account.address the following
    // address is encoded with the default prefix
    // which is used for password caching mapping
    const { address } = pair;

    if (!pair) {
      reject(new Error(t('Unable to find account')));

      return false;
    }

    if (pair.isLocked) {
      keyring.unlockPair(address);
    }

    const { payload } = request;

    let registry: Registry = new TypeRegistry();

    if (isJsonPayload(payload)) {
      const [, chainInfo] = this.#koniState.findNetworkKeyByGenesisHash(payload.genesisHash);

      const allRegistry: RegistrySource[] = [
        setupApiRegistry(chainInfo, this.#koniState),
        setupDatabaseRegistry(
          await this.#koniState.chainService.getMetadataByHash(payload.genesisHash) as MetadataItem,
          chainInfo,
          payload
        ),
        setupDappRegistry(
          this.#koniState.knownMetadata.find((meta: MetadataDef) => meta.genesisHash === payload.genesisHash) as MetadataDef,
          payload
        )
      ].filter((item): item is RegistrySource => item !== null && item.registry !== undefined);

      if (allRegistry.length === 0) {
        registry.setSignedExtensions(payload.signedExtensions);
      } else {
        registry = getSuitableRegistry(allRegistry, payload);
      }
    }

    const result = request.sign(registry as unknown as TypeRegistry, pair);

    resolve({
      id,
      // In case evm chain, must be cut 2 character after 0x
      signature: result.signature
    });

    if (this.#alwaysLock) {
      this.keyringLock();
    }

    return true;
  }

  /// Derive account

  private derivationCreateMultiple (request: RequestDeriveCreateMultiple): boolean {
    return this.#koniState.keyringService.context.derivationCreateMultiple(request);
  }

  private derivationCreateV3 (request: RequestDeriveCreateV3): boolean {
    const rs = this.#koniState.keyringService.context.derivationAccountProxyCreate(request);

    if (this.#alwaysLock) {
      this.keyringLock();
    }

    return rs;
  }

  private validateDerivePath (request: RequestDeriveValidateV2): ResponseDeriveValidateV2 {
    return this.#koniState.keyringService.context.validateDerivePath(request);
  }

  private getDeriveSuggestion (request: RequestGetDeriveSuggestion): ResponseGetDeriveSuggestion {
    return this.#koniState.keyringService.context.getDeriveSuggestion(request);
  }

  private getListDeriveAccounts (request: RequestGetDeriveAccounts): ResponseGetDeriveAccounts {
    return this.#koniState.keyringService.context.getListDeriveAccounts(request);
  }

  // ChainService -------------------------------------------------
  private async subscribeChainInfoMap (id: string, port: chrome.runtime.Port): Promise<Record<string, _ChainInfo>> {
    const cb = createSubscription<'pri(chainService.subscribeChainInfoMap)'>(id, port);
    let ready = false;
    const chainInfoMapSubscription = this.#koniState.subscribeChainInfoMap().subscribe({
      next: (rs) => {
        if (ready) {
          cb(rs);
        }
      }
    });

    this.createUnsubscriptionHandle(id, chainInfoMapSubscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    await this.#koniState.eventService.waitChainReady;
    ready = true;

    return this.#koniState.getChainInfoMap();
  }

  private subscribeChainStateMap (id: string, port: chrome.runtime.Port): Record<string, _ChainState> {
    const cb = createSubscription<'pri(chainService.subscribeChainStateMap)'>(id, port);
    const chainStateMapSubscription = this.#koniState.subscribeChainStateMap().subscribe({
      next: (rs) => {
        cb(rs);
      }
    });

    this.createUnsubscriptionHandle(id, chainStateMapSubscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return this.#koniState.getChainStateMap();
  }

  private subscribeChainStatusMap (id: string, port: chrome.runtime.Port): Record<string, _ChainApiStatus> {
    const cb = createSubscription<'pri(chainService.subscribeChainStatusMap)'>(id, port);
    const chainStateMapSubscription = this.#koniState.chainService.subscribeChainStatusMap().subscribe({
      next: (rs) => {
        cb(rs);
      }
    });

    this.createUnsubscriptionHandle(id, chainStateMapSubscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return this.#koniState.chainService.getChainStatusMap();
  }

  private async subscribeAssetRegistry (id: string, port: chrome.runtime.Port): Promise<Record<string, _ChainAsset>> {
    const cb = createSubscription<'pri(chainService.subscribeAssetRegistry)'>(id, port);

    await this.#koniState.eventService.waitAssetOnlineReady;

    const assetRegistrySubscription = this.#koniState.subscribeAssetRegistry().subscribe({
      next: (rs) => {
        cb(rs);
      }
    });

    this.createUnsubscriptionHandle(id, assetRegistrySubscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return this.#koniState.getAssetRegistry();
  }

  private subscribeMultiChainAssetMap (id: string, port: chrome.runtime.Port): Record<string, _MultiChainAsset> {
    const cb = createSubscription<'pri(chainService.subscribeMultiChainAssetMap)'>(id, port);
    const multiChainAssetSubscription = this.#koniState.subscribeMultiChainAssetMap().subscribe({
      next: (rs) => {
        cb(rs);
      }
    });

    this.createUnsubscriptionHandle(id, multiChainAssetSubscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return this.#koniState.getMultiChainAssetMap();
  }

  private subscribeXcmRefMap (id: string, port: chrome.runtime.Port): Record<string, _AssetRef> {
    const cb = createSubscription<'pri(chainService.subscribeXcmRefMap)'>(id, port);
    const xcmRefSubscription = this.#koniState.subscribeXcmRefMap().subscribe({
      next: (rs) => {
        cb(rs);
      }
    });

    this.createUnsubscriptionHandle(id, xcmRefSubscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return this.#koniState.getXcmRefMap();
  }

  private getSupportedSmartContractTypes () {
    return this.#koniState.getSupportedSmartContractTypes();
  }

  private getTransaction ({ id }: RequestGetTransaction): SWTransactionResult {
    const { transaction, ...transactionResult } = this.#koniState.transactionService.getTransaction(id);

    return transactionResult;
  }

  private subscribeTransactions (id: string, port: chrome.runtime.Port): Record<string, SWTransactionResult> {
    const cb = createSubscription<'pri(transactions.subscribe)'>(id, port);

    function convertRs (rs: Record<string, SWTransaction>): Record<string, SWTransactionResult> {
      return Object.fromEntries(Object.entries(rs).map(([key, value]) => {
        const { additionalValidator, eventsHandler, transaction, ...transactionResult } = value;

        return [key, transactionResult];
      }));
    }

    const transactionsSubject = this.#koniState.transactionService.getTransactionSubject();
    const transactionsSubscription = transactionsSubject.subscribe((rs) => {
      cb(convertRs(rs));
    });

    port.onDisconnect.addListener((): void => {
      transactionsSubscription.unsubscribe();
      this.cancelSubscription(id);
    });

    return convertRs(transactionsSubject.getValue());
  }

  private subscribeNotifications (id: string, port: chrome.runtime.Port) {
    const cb = createSubscription<'pri(notifications.subscribe)'>(id, port);
    const notificationSubject = this.#koniState.notificationService.getNotificationSubject();

    const notificationSubscription = notificationSubject.subscribe((rs) => {
      cb(rs);
    });

    port.onDisconnect.addListener((): void => {
      notificationSubscription.unsubscribe();
      this.cancelSubscription(id);
    });

    return notificationSubject.value;
  }

  private async reloadCron ({ data }: CronReloadRequest) {
    if (data === 'nft') {
      return await this.#koniState.reloadNft();
    } else if (data === 'staking') {
      return await this.#koniState.reloadStaking();
    } else if (data === 'balance') {
      return await this.#koniState.reloadBalance();
    } else if (data === 'crowdloan') {
      return await this.#koniState.reloadCrowdloan();
    }

    return Promise.resolve(false);
  }

  private async getLogoMap () {
    const [chainLogoMap, assetLogoMap] = await Promise.all([this.#koniState.chainService.getChainLogoMap(), this.#koniState.chainService.getAssetLogoMap()]);

    return {
      chainLogoMap,
      assetLogoMap
    };
  }

  private subscribeAssetLogoMap (id: string, port: chrome.runtime.Port) {
    const cb = createSubscription<'pri(settings.logo.assets.subscribe)'>(id, port);
    const subscription = this.#koniState.chainService.subscribeAssetLogoMap().subscribe((rs) => {
      cb(rs);
    });

    port.onDisconnect.addListener((): void => {
      subscription.unsubscribe();
      this.cancelSubscription(id);
    });

    return this.#koniState.chainService.getAssetLogoMap();
  }

  private subscribeChainLogoMap (id: string, port: chrome.runtime.Port) {
    const cb = createSubscription<'pri(settings.logo.chains.subscribe)'>(id, port);
    const subscription = this.#koniState.chainService.subscribeChainLogoMap().subscribe((rs) => {
      cb(rs);
    });

    port.onDisconnect.addListener((): void => {
      subscription.unsubscribe();
      this.cancelSubscription(id);
    });

    return this.#koniState.chainService.getChainLogoMap();
  }

  // Phishing detect
  private async passPhishingPage ({ url }: RequestPassPhishingPage) {
    return await this.#koniState.approvePassPhishingPage(url);
  }

  // Set environment config
  private saveAppConfig (request: RequestSaveAppConfig) {
    this.#koniState.saveEnvConfig('appConfig', request.appConfig);

    return true;
  }

  private saveBrowserConfig (request: RequestSaveBrowserConfig) {
    this.#koniState.saveEnvConfig('browserConfig', request.browserConfig);

    return true;
  }

  private saveOSConfig (request: RequestSaveOSConfig) {
    this.#koniState.saveEnvConfig('osConfig', request.osConfig);

    return true;
  }

  /// Wallet connect

  // Connect
  private async connectWalletConnect ({ uri }: RequestConnectWalletConnect): Promise<boolean> {
    await this.#koniState.walletConnectService.connect(uri);

    return true;
  }

  private connectWCSubscribe (id: string, port: chrome.runtime.Port): WalletConnectSessionRequest[] {
    const cb = createSubscription<'pri(walletConnect.requests.connect.subscribe)'>(id, port);
    const subscription = this.#koniState.requestService.connectWCSubject.subscribe((requests: WalletConnectSessionRequest[]): void =>
      cb(requests)
    );

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
      subscription.unsubscribe();
    });

    return this.#koniState.requestService.allConnectWCRequests;
  }

  private async approveWalletConnectSession ({ accounts: selectedAccounts, id }: RequestApproveConnectWalletSession): Promise<boolean> {
    const request = this.#koniState.requestService.getConnectWCRequest(id);

    if (isProposalExpired(request.request.params)) {
      throw new Error('The proposal has been expired');
    }

    const wcId = request.request.id;
    const params = request.request.params;

    const requiredNamespaces: ProposalTypes.RequiredNamespaces = params.requiredNamespaces || {};
    const optionalNamespaces: ProposalTypes.OptionalNamespaces = params.optionalNamespaces || {};

    const availableNamespaces: ProposalTypes.RequiredNamespaces = {};

    const namespaces: SessionTypes.Namespaces = {};
    const chainInfoMap = this.#koniState.getChainInfoMap();

    Object.entries(requiredNamespaces)
      .forEach(([key, namespace]) => {
        if (isSupportWalletConnectNamespace(key)) {
          if (namespace.chains) {
            const unSupportChains = namespace.chains.filter((chain) => !isSupportWalletConnectChain(chain, chainInfoMap));

            if (unSupportChains.length) {
              throw new Error(getSdkError('UNSUPPORTED_CHAINS').message + ' ' + unSupportChains.toString());
            }

            availableNamespaces[key] = namespace;
          }
        } else {
          throw new Error(getSdkError('UNSUPPORTED_NAMESPACE_KEY').message + ' ' + key);
        }
      });

    Object.entries(optionalNamespaces)
      .forEach(([key, namespace]) => {
        if (isSupportWalletConnectNamespace(key)) {
          if (namespace.chains) {
            const supportChains = namespace.chains.filter((chain) => isSupportWalletConnectChain(chain, chainInfoMap)) || [];

            const requiredNameSpace = availableNamespaces[key];
            const defaultChains: string[] = [];

            if (requiredNameSpace) {
              availableNamespaces[key] = {
                chains: [...(requiredNameSpace.chains || defaultChains), ...(supportChains || defaultChains)],
                events: requiredNameSpace.events,
                methods: requiredNameSpace.methods
              };
            } else {
              if (supportChains.length) {
                availableNamespaces[key] = {
                  chains: supportChains,
                  events: namespace.events,
                  methods: namespace.methods
                };
              }
            }
          }
        }
      });

    Object.entries(availableNamespaces)
      .forEach(([key, namespace]) => {
        if (namespace.chains) {
          const accounts: string[] = selectedAccounts.filter((address) => {
            const [_namespace] = address.split(':');

            return _namespace === key;
          });

          const chains = uniqueStringArray(namespace.chains);

          namespaces[key] = {
            accounts,
            methods: namespace.methods,
            events: namespace.events,
            chains: chains
          };
        }
      });

    const result: ResultApproveWalletConnectSession = {
      id: wcId,
      namespaces: namespaces,
      relayProtocol: params.relays[0].protocol
    };

    await this.#koniState.walletConnectService.approveSession(result);
    request.resolve();

    return true;
  }

  private async rejectWalletConnectSession ({ id }: RequestRejectConnectWalletSession): Promise<boolean> {
    const request = this.#koniState.requestService.getConnectWCRequest(id);

    const wcId = request.request.id;

    if (isProposalExpired(request.request.params)) {
      request.reject(new Error('The proposal has been expired'));

      return true;
    }

    await this.#koniState.walletConnectService.rejectSession(wcId);
    request.reject(new Error('USER_REJECTED'));

    return true;
  }

  private subscribeWalletConnectSessions (id: string, port: chrome.runtime.Port): SessionTypes.Struct[] {
    const cb = createSubscription<'pri(walletConnect.session.subscribe)'>(id, port);

    const subscription = this.#koniState.walletConnectService.sessionSubject.subscribe((rs) => {
      cb(rs);
    });

    port.onDisconnect.addListener((): void => {
      subscription.unsubscribe();
      this.cancelSubscription(id);
    });

    return this.#koniState.walletConnectService.sessions;
  }

  private async disconnectWalletConnectSession ({ topic }: RequestDisconnectWalletConnectSession): Promise<boolean> {
    await this.#koniState.walletConnectService.disconnect(topic);

    return true;
  }

  private WCNotSupportSubscribe (id: string, port: chrome.runtime.Port): WalletConnectNotSupportRequest[] {
    const cb = createSubscription<'pri(walletConnect.requests.notSupport.subscribe)'>(id, port);
    const subscription = this.#koniState.requestService.notSupportWCSubject.subscribe((requests: WalletConnectNotSupportRequest[]): void =>
      cb(requests)
    );

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
      subscription.unsubscribe();
    });

    return this.#koniState.requestService.allNotSupportWCRequests;
  }

  private approveWalletConnectNotSupport ({ id }: RequestApproveWalletConnectNotSupport): boolean {
    const request = this.#koniState.requestService.getNotSupportWCRequest(id);

    request.resolve();

    return true;
  }

  private rejectWalletConnectNotSupport ({ id }: RequestRejectWalletConnectNotSupport): boolean {
    const request = this.#koniState.requestService.getNotSupportWCRequest(id);

    request.reject(new Error('USER_REJECTED'));

    return true;
  }

  /// Manta

  private async enableMantaPay ({ address, password }: MantaPayEnableParams): Promise<MantaPayEnableResponse> { // always takes the current account
    function timeout () {
      return new Promise((resolve) => setTimeout(resolve, 1500));
    }

    try {
      await this.#koniState.chainService.enableChain(_DEFAULT_MANTA_ZK_CHAIN);
      this.#koniState.chainService.setMantaZkAssetSettings(true);

      const mnemonic = this.keyringExportMnemonic({ address, password });
      const { connectionStatus } = this.#koniState.chainService.getChainStatusByKey(_DEFAULT_MANTA_ZK_CHAIN);

      if (connectionStatus !== _ChainConnectionStatus.CONNECTED) { // TODO: do better
        await timeout();
      }

      const result = await this.#koniState.enableMantaPay(true, address, password, mnemonic.result);

      this.#skipAutoLock = true;
      await this.saveCurrentAccountProxy({ address });
      const unsubSyncProgress = await this.#koniState.chainService?.mantaPay?.subscribeSyncProgress();

      console.debug('Start initial sync for MantaPay');

      this.#koniState.initialSyncMantaPay(address)
        .then(() => {
          console.debug('Finished initial sync for MantaPay');

          this.#skipAutoLock = false;
          unsubSyncProgress && unsubSyncProgress();
        })
        .catch((e) => {
          console.error('Error syncing MantaPay', e);

          this.#skipAutoLock = false;
          unsubSyncProgress && unsubSyncProgress();
        });

      return {
        success: !!result,
        message: result ? MantaPayEnableMessage.SUCCESS : MantaPayEnableMessage.UNKNOWN_ERROR
      };
    } catch (e) {
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      if (e.toString() === 'Error: Unable to decode using the supplied passphrase') {
        return {
          success: false,
          message: MantaPayEnableMessage.WRONG_PASSWORD
        };
      }

      return {
        success: false,
        message: MantaPayEnableMessage.UNKNOWN_ERROR
      };
    }
  }

  private async initSyncMantaPay (address: string) {
    if (this.#koniState.chainService?.mantaPay?.getSyncState().isSyncing || !MODULE_SUPPORT.MANTA_ZK) {
      return;
    }

    this.#skipAutoLock = true;
    await this.saveCurrentAccountProxy({ address });
    const unsubSyncProgress = await this.#koniState.chainService?.mantaPay?.subscribeSyncProgress();

    console.debug('Start initial sync for MantaPay');

    this.#koniState.initialSyncMantaPay(address)
      .then(() => {
        console.debug('Finished initial sync for MantaPay');

        this.#skipAutoLock = false;
        unsubSyncProgress && unsubSyncProgress();
        // make sure the sync state is set, just in case it gets unsubscribed
        this.#koniState.chainService?.mantaPay?.setSyncState({
          progress: 100,
          isSyncing: false
        });
      })
      .catch((e) => {
        console.error('Error syncing MantaPay', e);

        this.#skipAutoLock = false;
        unsubSyncProgress && unsubSyncProgress();
        this.#koniState.chainService?.mantaPay?.setSyncState({
          progress: 0,
          isSyncing: false
        });
      });
  }

  private async disableMantaPay (address: string) {
    return this.#koniState.disableMantaPay(address);
  }

  private async isTonBounceableAddress ({ address, chain }: RequestBounceableValidate) {
    try {
      const tonApi = this.#koniState.getTonApi(chain);
      const state = await tonApi.getAccountState(address);

      const isActive = state === 'active';
      const isBounceable = isBounceableAddress(address);

      return !isActive && isBounceable;
    } catch (error) {
      console.error(`Failed to validate address ${address} on chain ${chain}:`, error);

      return false;
    }
  }

  private subscribeMantaPayConfig (id: string, port: chrome.runtime.Port) {
    const cb = createSubscription<'pri(mantaPay.subscribeConfig)'>(id, port);
    const mantaPayConfigSubscription = this.#koniState.subscribeMantaPayConfig().subscribe({
      next: (rs) => {
        cb(rs);
      }
    });

    this.createUnsubscriptionHandle(id, mantaPayConfigSubscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return this.#koniState.getMantaPayConfig('calamari');
  }

  private subscribeMantaPaySyncState (id: string, port: chrome.runtime.Port): MantaPaySyncState {
    const cb = createSubscription<'pri(mantaPay.subscribeSyncingState)'>(id, port);

    const syncingStateSubscription = this.#koniState.subscribeMantaPaySyncState()?.subscribe({
      next: (rs) => {
        cb(rs);
      }
    });

    this.createUnsubscriptionHandle(id, syncingStateSubscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return this.#koniState.chainService?.mantaPay?.getSyncState() || {
      isSyncing: false,
      progress: 0,
      needManualSync: false
    };
  }

  /* Metadata */

  private async findRawMetadata ({ genesisHash }: RequestFindRawMetadata): Promise<ResponseFindRawMetadata> {
    const { metadata, specVersion, types, userExtensions } = await this.#koniState.findMetadata(genesisHash);

    return {
      rawMetadata: metadata,
      specVersion,
      types,
      userExtensions
    };
  }

  private async calculateMetadataHash ({ chain }: RequestMetadataHash): Promise<ResponseMetadataHash> {
    const hash = await this.#koniState.calculateMetadataHash(chain);

    return {
      metadataHash: hash || ''
    };
  }

  private async shortenMetadata ({ chain, txBlob }: RequestShortenMetadata): Promise<ResponseShortenMetadata> {
    const shorten = await this.#koniState.shortenMetadata(chain, txBlob);

    return {
      txMetadata: shorten || ''
    };
  }

  /* Metadata */

  private async resolveDomainByAddress (request: ResolveDomainRequest) {
    const chainApi = this.#koniState.getSubstrateApi(request.chain);

    return await resolveAzeroDomainToAddress(request.domain, request.chain, chainApi.api);
  }

  private async resolveAddressByDomain (request: ResolveAddressToDomainRequest) {
    const chainApi = this.#koniState.getSubstrateApi(request.chain);

    return await resolveAzeroAddressToDomain(request.address, request.chain, chainApi.api);
  }

  /// Inject account
  private addInjects (request: RequestAddInjectedAccounts): boolean {
    this.#koniState.keyringService.context.addInjectAccounts(request.accounts);

    return true;
  }

  private removeInjects (request: RequestRemoveInjectedAccounts): boolean {
    this.#koniState.keyringService.context.removeInjectAccounts(request.addresses);

    return true;
  }

  private async subscribeYieldPoolInfo (id: string, port: chrome.runtime.Port) {
    const cb = createSubscription<'pri(yield.subscribePoolInfo)'>(id, port);

    await this.#koniState.earningService.waitForStarted();
    const yieldPoolSubscription = this.#koniState.earningService.subscribeYieldPoolInfo().subscribe({
      next: (rs) => {
        cb(Object.values(rs));
      }
    });

    this.createUnsubscriptionHandle(id, yieldPoolSubscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return this.#koniState.earningService.getYieldPoolInfo();
  }

  private async earlyValidateJoin (request: RequestEarlyValidateYield) {
    return await this.#koniState.earningService.earlyValidateJoin(request);
  }

  private async getOptimalYieldPath (request: OptimalYieldPathParams) {
    return await this.#koniState.earningService.generateOptimalSteps(request);
  }

  private async handleYieldStep (inputData: RequestYieldStepSubmit): Promise<SWTransactionResponse> {
    const { data, path } = inputData;
    const { address } = data;

    if (!data) {
      return this.#koniState.transactionService
        .generateBeforeHandleResponseErrors([new TransactionError(BasicTxErrorType.INTERNAL_ERROR)]);
    }

    const isLastStep = inputData.currentStep + 1 === path.steps.length;

    const yieldValidation: TransactionError[] = await this.#koniState.earningService.validateYieldJoin({ data, path }); // TODO: validate, set to fail upon submission

    if (yieldValidation.length > 0) {
      return this.#koniState.transactionService
        .generateBeforeHandleResponseErrors(yieldValidation);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { chainType, extrinsic, extrinsicType, transferNativeAmount, txChain, txData } = await this.#koniState.earningService.handleYieldJoin(inputData);
    const isPoolSupportAlternativeFee = this.#koniState.earningService.isPoolSupportAlternativeFee(inputData.data.slug);

    const isMintingStep = YIELD_EXTRINSIC_TYPES.includes(extrinsicType);

    return await this.#koniState.transactionService.handleTransaction({
      address,
      chain: txChain,
      transaction: extrinsic,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: txData,
      extrinsicType, // change this depends on step
      chainType,
      resolveOnDone: !isLastStep,
      transferNativeAmount,
      skipFeeValidation: isMintingStep && isPoolSupportAlternativeFee
    });
  }

  private async handleYieldLeave (params: RequestYieldLeave): Promise<SWTransactionResponse> {
    const { address, slug } = params;
    const leaveValidation = await this.#koniState.earningService.validateYieldLeave(params);

    if (leaveValidation.length > 0) {
      return this.#koniState.transactionService.generateBeforeHandleResponseErrors(leaveValidation);
    }

    const [extrinsicType, extrinsic] = await this.#koniState.earningService.handleYieldLeave(params);
    const handler = this.#koniState.earningService.getPoolHandler(slug);

    return await this.#koniState.transactionService.handleTransaction({
      address,
      chain: handler?.chain || '',
      transaction: extrinsic,
      data: params, // TODO
      extrinsicType,
      chainType: handler?.transactionChainType || ChainType.SUBSTRATE
    });
  }

  private async getYieldPoolTargets (request: RequestGetYieldPoolTargets): Promise<ResponseGetYieldPoolTargets> {
    const { slug } = request;

    await this.#koniState.earningService.waitForStarted();
    const targets = await this.#koniState.earningService.getPoolTargets(slug);

    return {
      slug,
      targets
    };
  }

  private async subscribeYieldPosition (id: string, port: chrome.runtime.Port) {
    const cb = createSubscription<'pri(yield.subscribeYieldPosition)'>(id, port);

    await this.#koniState.earningService.waitForStarted();
    const yieldPositionSubscription = this.#koniState.earningService.subscribeYieldPosition().subscribe({
      next: (rs) => {
        cb(rs);
      }
    });

    this.createUnsubscriptionHandle(id, yieldPositionSubscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return await this.#koniState.earningService.getYieldPositionInfo();
  }

  private async subscribeYieldReward (id: string, port: chrome.runtime.Port): Promise<EarningRewardJson | null> {
    const cb = createSubscription<'pri(yield.subscribeYieldReward)'>(id, port);

    await this.#koniState.earningService.waitForStarted();
    const stakingRewardSubscription = this.#koniState.earningService.subscribeEarningReward().subscribe({
      next: (rs) => {
        cb(rs);
      }
    });

    this.createUnsubscriptionHandle(id, stakingRewardSubscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return this.#koniState.earningService.getEarningRewards();
  }

  private async subscribeYieldRewardHistory (id: string, port: chrome.runtime.Port) {
    const cb = createSubscription<'pri(yield.subscribeRewardHistory)'>(id, port);

    await this.#koniState.earningService.waitForStarted();
    const rewardHistorySubscription = this.#koniState.earningService.subscribeEarningRewardHistory().subscribe({
      next: (rs) => {
        cb(rs);
      }
    });

    this.createUnsubscriptionHandle(id, rewardHistorySubscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return this.#koniState.earningService.getEarningRewardHistory();
  }

  private async subscribeEarningMinAmountPercent (id: string, port: chrome.runtime.Port) {
    const cb = createSubscription<'pri(yield.minAmountPercent)'>(id, port);

    await this.#koniState.earningService.waitForStarted();
    const earningMinAmountPercentSubscription = this.#koniState.earningService.subscribeMinAmountPercent().subscribe({
      next: (rs) => {
        cb(rs);
      }
    });

    this.createUnsubscriptionHandle(id, earningMinAmountPercentSubscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return this.#koniState.earningService.getMinAmountPercent();
  }

  private handleValidateYieldProcess (inputData: ValidateYieldProcessParams) {
    return this.#koniState.earningService.validateYieldJoin(inputData);
  }

  private async yieldSubmitWithdrawal (params: RequestYieldWithdrawal): Promise<SWTransactionResponse> {
    const { address, slug } = params;
    const poolHandler = this.#koniState.earningService.getPoolHandler(slug);

    if (!poolHandler) {
      return this.#koniState.transactionService.generateBeforeHandleResponseErrors([new TransactionError(BasicTxErrorType.INVALID_PARAMS)]);
    }

    const extrinsic = await this.#koniState.earningService.handleYieldWithdraw(params);

    return await this.#koniState.transactionService.handleTransaction({
      address: address,
      chain: poolHandler.chain,
      transaction: extrinsic,
      data: params,
      extrinsicType: ExtrinsicType.STAKING_WITHDRAW,
      chainType: poolHandler?.transactionChainType || ChainType.SUBSTRATE
    });
  }

  private async yieldSubmitCancelWithdrawal (params: RequestStakeCancelWithdrawal): Promise<SWTransactionResponse> {
    const { address, selectedUnstaking, slug } = params;
    const poolHandler = this.#koniState.earningService.getPoolHandler(slug);

    if (!poolHandler || !selectedUnstaking) {
      return this.#koniState.transactionService.generateBeforeHandleResponseErrors([new TransactionError(BasicTxErrorType.INVALID_PARAMS)]);
    }

    const chain = poolHandler.chain;
    const extrinsic = await this.#koniState.earningService.handleYieldCancelUnstake(params);

    return await this.#koniState.transactionService.handleTransaction({
      address,
      chain,
      transaction: extrinsic,
      data: params,
      extrinsicType: ExtrinsicType.STAKING_CANCEL_UNSTAKE,
      chainType: poolHandler?.transactionChainType || ChainType.SUBSTRATE
    });
  }

  private async yieldSubmitClaimReward (params: RequestStakeClaimReward): Promise<SWTransactionResponse> {
    const { address, slug } = params;
    const poolHandler = this.#koniState.earningService.getPoolHandler(slug);

    if (!address || !poolHandler) {
      return this.#koniState.transactionService.generateBeforeHandleResponseErrors([new TransactionError(BasicTxErrorType.INVALID_PARAMS)]);
    }

    const extrinsic = await this.#koniState.earningService.handleYieldClaimReward(params);

    return await this.#koniState.transactionService.handleTransaction({
      address,
      chain: poolHandler.chain,
      transaction: extrinsic,
      data: params,
      extrinsicType: ExtrinsicType.STAKING_CLAIM_REWARD,
      chainType: poolHandler?.transactionChainType || ChainType.SUBSTRATE
    });
  }

  /* Campaign */

  private unlockDotCheckCanMint ({ address, network, slug }: RequestUnlockDotCheckCanMint) {
    return this.#koniState.mintCampaignService.unlockDotCampaign.canMint(address, slug, network);
  }

  private unlockDotSubscribeMintedData (id: string, port: chrome.runtime.Port, { transactionId }: RequestUnlockDotSubscribeMintedData) {
    const cb = createSubscription<'pri(campaign.unlockDot.subscribe)'>(id, port);

    const subscription = this.#koniState.mintCampaignService.unlockDotCampaign.subscribeMintedNft(transactionId, cb);

    this.createUnsubscriptionHandle(id, subscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return this.#koniState.mintCampaignService.unlockDotCampaign.getMintedNft(transactionId);
  }

  private async subscribeProcessingBanner (id: string, port: chrome.runtime.Port) {
    const cb = createSubscription<'pri(campaign.banner.subscribe)'>(id, port);

    const filterBanner = (data: CampaignData[]) => {
      const result: CampaignBanner[] = [];

      for (const item of data) {
        if (item.type === CampaignDataType.BANNER) {
          result.push(item);
        }
      }

      return result;
    };

    const callback = (data: CampaignData[]) => {
      cb(filterBanner(data));
    };

    const subscription = this.#koniState.campaignService.subscribeProcessingCampaign().subscribe({
      next: callback
    });

    this.createUnsubscriptionHandle(id, subscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return filterBanner(await this.#koniState.campaignService.getProcessingCampaign());
  }

  private async completeCampaignBanner ({ slug }: RequestCampaignBannerComplete) {
    const campaign = await this.#koniState.dbService.getCampaign(slug);

    if (campaign) {
      await this.#koniState.dbService.upsertCampaign({
        ...campaign,
        isDone: true
      });
    }

    return true;
  }

  private async subscribeCampaignPopupVisibility (id: string, port: chrome.runtime.Port) {
    const cb = createSubscription<'pri(campaign.popup.subscribeVisibility)'>(id, port);

    const popupVisibilitySubscription = this.#koniState.campaignService.subscribeCampaignPopupVisibility().subscribe((rs) => {
      cb(rs);
    });

    this.createUnsubscriptionHandle(id, popupVisibilitySubscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return Promise.resolve(this.#koniState.campaignService.getIsPopupVisible());
  }

  private toggleCampaignPopup (value: ShowCampaignPopupRequest) {
    this.#koniState.campaignService.toggleCampaignPopup(value);

    return null;
  }

  private subscribeAppPopupData (id: string, port: chrome.runtime.Port): AppPopupData[] {
    const cb = createSubscription<'pri(campaign.popups.subscribe)'>(id, port);
    let ready = false;

    const callback = (rs: AppPopupData[]) => {
      if (ready) {
        cb(rs);
      }
    };

    const subscription = this.#koniState.mktCampaignService.subscribePopupsData(callback);

    this.createUnsubscriptionHandle(id, subscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });
    ready = true;

    return this.#koniState.mktCampaignService.getAppPopupsData();
  }

  private subscribeAppBannerData (id: string, port: chrome.runtime.Port): AppBannerData[] {
    const cb = createSubscription<'pri(campaign.banners.subscribe)'>(id, port);
    let ready = false;

    const callback = (rs: AppBannerData[]) => {
      if (ready) {
        cb(rs);
      }
    };

    const subscription = this.#koniState.mktCampaignService.subscribeBannersData(callback);

    this.createUnsubscriptionHandle(id, subscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });
    ready = true;

    return this.#koniState.mktCampaignService.getAppBannersData();
  }

  private subscribeAppConfirmationData (id: string, port: chrome.runtime.Port): AppConfirmationData[] {
    const cb = createSubscription<'pri(campaign.confirmations.subscribe)'>(id, port);
    let ready = false;

    const callback = (rs: AppConfirmationData[]) => {
      if (ready) {
        cb(rs);
      }
    };

    const subscription = this.#koniState.mktCampaignService.subscribeConfirmationsData(callback);

    this.createUnsubscriptionHandle(id, subscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });
    ready = true;

    return this.#koniState.mktCampaignService.getAppConfirmationsData();
  }

  /* Campaign */

  /* Buy service */

  private async subscribeBuyTokens (id: string, port: chrome.runtime.Port): Promise<Record<string, BuyTokenInfo>> {
    const cb = createSubscription<'pri(buyService.tokens.subscribe)'>(id, port);
    let ready = false;

    const callback = (rs: Record<string, BuyTokenInfo>) => {
      if (ready) {
        cb(rs);
      }
    };

    const subscription = this.#koniState.buyService.subscribeBuyTokens(callback);

    this.createUnsubscriptionHandle(id, subscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    await this.#koniState.eventService.waitBuyTokenReady;
    ready = true;

    return this.#koniState.buyService.getBuyTokens();
  }

  private async subscribeBuyServices (id: string, port: chrome.runtime.Port): Promise<Record<string, BuyServiceInfo>> {
    const cb = createSubscription<'pri(buyService.services.subscribe)'>(id, port);
    let ready = false;

    const callback = (rs: Record<string, BuyServiceInfo>) => {
      if (ready) {
        cb(rs);
      }
    };

    const subscription = this.#koniState.buyService.subscribeBuyServices(callback);

    this.createUnsubscriptionHandle(id, subscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    await this.#koniState.eventService.waitBuyServiceReady;
    ready = true;

    return this.#koniState.buyService.getBuyServices();
  }

  /* Buy service */

  /* Swap service */
  private async subscribeSwapPairs (id: string, port: chrome.runtime.Port): Promise<SwapPair[]> {
    const cb = createSubscription<'pri(swapService.subscribePairs)'>(id, port);
    let ready = false;

    await this.#koniState.swapService.waitForStarted();

    const callback = (rs: SwapPair[]) => {
      if (ready) {
        cb(rs);
      }
    };

    const subscription = this.#koniState.swapService.subscribeSwapPairs(callback);

    this.createUnsubscriptionHandle(id, subscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    ready = true;

    return this.#koniState.swapService.getSwapPairs();
  }

  private async handleSwapRequest (request: SwapRequest): Promise<SwapRequestResult> {
    return this.#koniState.swapService.handleSwapRequest(request);
  }

  private async getLatestSwapQuote (swapRequest: SwapRequest): Promise<SwapQuoteResponse> {
    return this.#koniState.swapService.getLatestQuotes(swapRequest);
  }

  private async validateSwapProcess (params: ValidateSwapProcessParams): Promise<TransactionError[]> {
    return this.#koniState.swapService.validateSwapProcess(params);
  }

  private async handleSwapStep (inputData: SwapSubmitParams): Promise<SWTransactionResponse> {
    const { address, process, quote, recipient } = inputData;

    if (!quote || !address || !process) {
      return this.#koniState.transactionService
        .generateBeforeHandleResponseErrors([new TransactionError(BasicTxErrorType.INTERNAL_ERROR)]);
    }

    const isLastStep = inputData.currentStep + 1 === process.steps.length;

    const swapValidations: TransactionError[] = await this.#koniState.swapService.validateSwapProcess({ address, process, selectedQuote: quote, recipient });

    if (swapValidations.length > 0) {
      return this.#koniState.transactionService
        .generateBeforeHandleResponseErrors(swapValidations);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { chainType, extrinsic, extrinsicType, transferNativeAmount, txChain, txData } = await this.#koniState.swapService.handleSwapProcess(inputData);
    // const chosenFeeToken = process.steps.findIndex((step) => step.type === SwapStepType.SET_FEE_TOKEN) > -1;
    // const allowSkipValidation = [ExtrinsicType.SET_FEE_TOKEN, ExtrinsicType.SWAP].includes(extrinsicType);

    return await this.#koniState.transactionService.handleTransaction({
      address,
      chain: txChain,
      transaction: extrinsic,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: txData,
      extrinsicType, // change this depends on step
      chainType,
      resolveOnDone: !isLastStep,
      transferNativeAmount
      // skipFeeValidation: chosenFeeToken && allowSkipValidation
    });
  }
  /* Swap service */

  /* Notification service */
  private async subscribeUnreadNotificationCountMap (id: string, port: chrome.runtime.Port): Promise<Record<string, number>> {
    const cb = createSubscription<'pri(inappNotification.subscribeUnreadNotificationCountMap)'>(id, port);

    const callback = (rs: Record<string, number>) => {
      cb(rs);
    };

    const subscription = this.#koniState.inappNotificationService.subscribeUnreadNotificationsCountMap(callback);

    this.createUnsubscriptionHandle(id, subscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return await this.#koniState.inappNotificationService.getUnreadNotificationsCountMap();
  }

  private markAllReadNotification (proxyId: string) {
    return this.#koniState.inappNotificationService.markAllRead(proxyId);
  }

  private switchReadNotificationStatus (params: RequestSwitchStatusParams) {
    return this.#koniState.inappNotificationService.switchReadStatus(params);
  }

  private async fetchInappNotifications (params: GetNotificationParams) {
    return this.#koniState.inappNotificationService.fetchNotificationsByParams(params);
  }

  private async getInappNotification (id: string) {
    const result = await this.#koniState.inappNotificationService.getNotificationById(id);

    if (!result) {
      throw new Error('Notification not found');
    }

    return result;
  }
  /* Notification service */

  private async submitClaimAvailBridge (data: RequestClaimBridge) {
    const { address, chain, notification } = data;
    const extrinsicType = ExtrinsicType.CLAIM_BRIDGE;

    let transaction: SubmittableExtrinsic<'promise'> | TransactionConfig | null = null;
    let chainType: ChainType;

    if (isSubstrateAddress(address)) {
      const substrateApi = this.#koniState.getSubstrateApi(chain);

      transaction = await getClaimTxOnAvail(notification, substrateApi);
      chainType = ChainType.SUBSTRATE;
    } else {
      const evmApi = this.#koniState.getEvmApi(chain);

      transaction = await getClaimTxOnEthereum(chain, notification, evmApi);
      chainType = ChainType.EVM;
    }

    return await this.#koniState.transactionService.handleTransaction({
      address,
      chain,
      transaction,
      data,
      extrinsicType,
      chainType
    });
  }

  private async getIsClaimedPolygonBridge (data: RequestIsClaimedPolygonBridge) {
    const evmApi = this.#koniState.getEvmApi(data.chainslug);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const isClaimed: boolean = await isClaimedPolygonBridge(data.chainslug, data.counter, data.sourceNetwork, evmApi);

    return isClaimed;
  }

  private async submitClaimPolygonBridge (data: RequestClaimBridge) {
    const { address, chain, notification } = data;
    const extrinsicType = ExtrinsicType.CLAIM_BRIDGE;

    let transaction: SubmittableExtrinsic<'promise'> | TransactionConfig | null = null;

    const evmApi = this.#koniState.getEvmApi(chain);
    const metadata = notification.metadata as ClaimPolygonBridgeNotificationMetadata;

    if (metadata.bridgeType === 'POS') {
      transaction = await getClaimPosBridge(chain, notification, evmApi);
    } else {
      transaction = await getClaimPolygonBridge(chain, notification, evmApi);
    }

    const chainType: ChainType = ChainType.EVM;

    return await this.#koniState.transactionService.handleTransaction({
      address,
      chain,
      transaction,
      data,
      extrinsicType,
      chainType
    });
  }

  /* Ledger */

  private async subscribeLedgerGenericAllowChains (id: string, port: chrome.runtime.Port): Promise<string[]> {
    const cb = createSubscription<'pri(ledger.generic.allow)'>(id, port);

    await this.#koniState.eventService.waitLedgerReady;

    const subscription = this.#koniState.chainService.observable.ledgerGenericAllowChains.subscribe(cb);

    this.createUnsubscriptionHandle(id, subscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return this.#koniState.chainService.value.ledgerGenericAllowChains;
  }

  /* Ledger */

  /* Popular tokens */

  private subscribePriorityTokens (id: string, port: chrome.runtime.Port): TokenPriorityDetails {
    const cb = createSubscription<'pri(tokens.subscribePriority)'>(id, port);

    const subscription = this.#koniState.chainService.observable.priorityTokens.subscribe(cb);

    this.createUnsubscriptionHandle(id, subscription.unsubscribe);

    port.onDisconnect.addListener((): void => {
      this.cancelSubscription(id);
    });

    return this.#koniState.chainService.value.priorityTokens;
  }

  /* Popular tokens */

  // --------------------------------------------------------------
  // eslint-disable-next-line @typescript-eslint/require-await
  public async handle<TMessageType extends MessageTypes> (id: string, type: TMessageType, request: RequestTypes[TMessageType], port: chrome.runtime.Port): Promise<ResponseType<TMessageType>> {
    clearTimeout(this.#lockTimeOut);

    if (this.#timeAutoLock > 0) {
      this.#lockTimeOut = setTimeout(() => {
        if (!this.#skipAutoLock) {
          this.keyringLock();
        }
      }, this.#timeAutoLock * 60 * 1000);
    }

    switch (type) {
      case 'pri(ping)':
        return 'pong';
      /// Clone from PolkadotJs
      case 'pri(accounts.export.json)':
        return this.accountsExport(request as RequestAccountExport);

      case 'pri(metadata.approve)':
        return this.metadataApprove(request as RequestMetadataApprove);

      case 'pri(metadata.get)':
        return this.metadataGet(request as string);

      case 'pri(metadata.list)':
        return this.metadataList();

      case 'pri(metadata.reject)':
        return this.metadataReject(request as RequestMetadataReject);

      case 'pri(metadata.requests)':
        return this.metadataSubscribe(id, port);

      case 'pri(signing.approve.signature)':
        return this.signingApproveSignature(request as RequestSigningApproveSignature);

      case 'pri(signing.cancel)':
        return this.signingCancel(request as RequestSigningCancel);

      case 'pri(signing.requests)':
        return this.signingSubscribe(id, port);

      case 'pri(window.open)':
        return this.windowOpen(request as WindowOpenParams);

      ///
      case 'pri(authorize.changeSiteAll)':
        return this.changeAuthorizationAll(request as RequestAuthorization, id, port);
      case 'pri(authorize.changeSite)':
        return this.changeAuthorization(request as RequestAuthorization, id, port);
      case 'pri(authorize.changeSitePerAccount)':
        return this.changeAuthorizationPerAcc(request as RequestAuthorizationPerAccount, id, port);
      case 'pri(authorize.changeSitePerSite)':
        return this.changeAuthorizationPerSite(request as RequestAuthorizationPerSite);
      case 'pri(authorize.changeSiteBlock)':
        return this.changeAuthorizationBlock(request as RequestAuthorizationBlock);
      case 'pri(authorize.forgetSite)':
        return this.forgetSite(request as RequestForgetSite, id, port);
      case 'pri(authorize.forgetAllSite)':
        return this.forgetAllSite(id, port);
      case 'pri(authorize.approveV2)':
        return this.authorizeApproveV2(request as RequestAuthorizeApproveV2);
      case 'pri(authorize.rejectV2)':
        return this.authorizeRejectV2(request as RequestAuthorizeReject);
      case 'pri(authorize.cancelV2)':
        return this.authorizeCancelV2(request as RequestAuthorizeCancel);
      case 'pri(authorize.requestsV2)':
        return this.authorizeSubscribeV2(id, port);
      case 'pri(authorize.listV2)':
        return this.getAuthListV2();
      case 'pri(authorize.toggle)':
        return this.toggleAuthorization2(request as string);
      case 'pri(settings.changeBalancesVisibility)':
        return await this.toggleBalancesVisibility();

      // Settings
      case 'pri(settings.subscribe)':
        return await this.subscribeSettings(id, port);
      case 'pri(settings.saveAccountAllLogo)':
        return this.saveAccountAllLogo(request as string, id, port);
      case 'pri(settings.saveCamera)':
        return this.setCamera(request as RequestCameraSettings);
      case 'pri(settings.saveTheme)':
        return this.saveTheme(request as ThemeNames);
      case 'pri(settings.saveBrowserConfirmationType)':
        return this.saveBrowserConfirmationType(request as BrowserConfirmationType);
      case 'pri(settings.saveAutoLockTime)':
        return this.setAutoLockTime(request as RequestChangeTimeAutoLock);
      case 'pri(settings.saveUnlockType)':
        return this.setUnlockType(request as RequestUnlockType);
      case 'pri(settings.saveEnableChainPatrol)':
        return this.setEnableChainPatrol(request as RequestChangeEnableChainPatrol);
      case 'pri(settings.saveNotificationSetup)':
        return this.saveNotificationSetup(request as NotificationSetup);
      case 'pri(settings.saveShowZeroBalance)':
        return this.setShowZeroBalance(request as RequestChangeShowZeroBalance);
      case 'pri(settings.saveLanguage)':
        return this.setLanguage(request as RequestChangeLanguage);
      case 'pri(settings.saveShowBalance)':
        return this.setShowBalance(request as RequestChangeShowBalance);

      case 'pri(price.getPrice)':
        return await this.getPrice();
      case 'pri(price.getSubscription)':
        return await this.subscribePrice(id, port);
      case 'pri(settings.savePriceCurrency)':
        return await this.setPriceCurrency(request as RequestChangePriceCurrency);
      case 'pri(balance.getBalance)':
        return await this.getBalance();
      case 'pri(balance.getSubscription)':
        return await this.subscribeBalance(id, port);
      case 'pri(crowdloan.getCrowdloan)':
        return this.getCrowdloan();
      case 'pri(crowdloan.getCrowdloanContributions)':
        return this.getCrowdloanContributions(request as RequestCrowdloanContributions);
      case 'pri(crowdloan.getSubscription)':
        return this.subscribeCrowdloan(id, port);
      case 'pri(nft.getNft)':
        return await this.getNft();
      case 'pri(nft.getSubscription)':
        return await this.subscribeNft(id, port);
      case 'pri(nftCollection.getNftCollection)':
        return await this.getNftCollection();
      case 'pri(nftCollection.getSubscription)':
        return await this.subscribeNftCollection(id, port);
      case 'pri(staking.getStaking)':
        return this.getStaking();
      case 'pri(staking.getSubscription)':
        return await this.subscribeStaking(id, port);
      case 'pri(stakingReward.getStakingReward)':
        return this.getStakingReward();
      case 'pri(stakingReward.getSubscription)':
        return this.subscribeStakingReward(id, port);
      case 'pri(transaction.history.getSubscription)':
        return await this.subscribeHistory(id, port);
      case 'pri(transaction.history.subscribe)':
        return this.subscribeHistoryByChainAndAddress(request as RequestSubscribeHistory, id, port);

        /* Earning */

        /* Info */

      case 'pri(yield.subscribePoolInfo)':
        return this.subscribeYieldPoolInfo(id, port);
      case 'pri(yield.getTargets)':
        return this.getYieldPoolTargets(request as RequestGetYieldPoolTargets);
      case 'pri(yield.subscribeYieldPosition)':
        return this.subscribeYieldPosition(id, port);
      case 'pri(yield.subscribeYieldReward)':
        return this.subscribeYieldReward(id, port);
      case 'pri(yield.subscribeRewardHistory)':
        return this.subscribeYieldRewardHistory(id, port);
      case 'pri(yield.minAmountPercent)':
        return this.subscribeEarningMinAmountPercent(id, port);

        /* Info */

        /* Actions */

        /* Join */

      case 'pri(yield.join.earlyValidate)':
        return await this.earlyValidateJoin(request as RequestEarlyValidateYield);
      case 'pri(yield.join.getOptimalPath)':
        return await this.getOptimalYieldPath(request as OptimalYieldPathParams);
      case 'pri(yield.join.handleStep)':
        return await this.handleYieldStep(request as RequestYieldStepSubmit);
      case 'pri(yield.join.validateProcess)':
        return await this.handleValidateYieldProcess(request as ValidateYieldProcessParams);

        /* Join */

        /* Others */

      case 'pri(yield.leave.submit)':
        return await this.handleYieldLeave(request as RequestYieldLeave);
      case 'pri(yield.withdraw.submit)':
        return await this.yieldSubmitWithdrawal(request as RequestYieldWithdrawal);
      case 'pri(yield.cancelWithdrawal.submit)':
        return await this.yieldSubmitCancelWithdrawal(request as RequestStakeCancelWithdrawal);
      case 'pri(yield.claimReward.submit)':
        return await this.yieldSubmitClaimReward(request as RequestStakeClaimReward);

        /* Others */

        /* Actions */

        /* Earning */

      /* Account management */
      // Add account
      case 'pri(accounts.create.suriV2)':
        return this.accountsCreateSuriV2(request as RequestAccountCreateSuriV2);
      case 'pri(accounts.create.externalV2)':
        return await this.accountsCreateExternalV2(request as RequestAccountCreateExternalV2);
      case 'pri(accounts.create.hardwareV2)':
        return await this.accountsCreateHardwareV2(request as RequestAccountCreateHardwareV2);
      case 'pri(accounts.create.hardwareMultiple)':
        return await this.accountsCreateHardwareMultiple(request as RequestAccountCreateHardwareMultiple);
      case 'pri(accounts.create.withSecret)':
        return await this.accountsCreateWithSecret(request as RequestAccountCreateWithSecretKey);

      case 'pri(accounts.json.info)':
        return this.parseInfoSingleJson(request as RequestJsonGetAccountInfo);
      case 'pri(accounts.json.restoreV2)':
        return this.jsonRestoreV2(request as RequestJsonRestoreV2);

      case 'pri(accounts.json.batchInfo)':
        return this.parseInfoMultiJson(request as RequestBatchJsonGetAccountInfo);
      case 'pri(accounts.json.batchRestoreV2)':
        return this.batchRestoreV2(request as RequestBatchRestoreV2);
      case 'pri(seed.createV2)':
        return this.seedCreateV2(request as RequestMnemonicCreateV2);

      // Remove account
      case 'pri(accounts.forget)':
        return await this.accountsForgetOverride(request as RequestAccountProxyForget);

      // Validate account
      case 'pri(accounts.validate.seed)':
        return this.seedValidateV2(request as RequestMnemonicValidateV2);
      case 'pri(accounts.validate.privateKey)':
        return this.privateKeyValidateV2(request as RequestPrivateKeyValidateV2);
      case 'pri(accounts.validate.substrate.publicAndPrivateKey)':
        return this.checkPublicAndSecretKey(request as RequestCheckPublicAndSecretKey);
      case 'pri(accounts.validate.name)':
        return this.checkNameExists(request as RequestAccountNameValidate);
      case 'pri(accounts.validate.bounceable)':
        return this.isTonBounceableAddress(request as RequestBounceableValidate);

      // Export account
      case 'pri(accounts.export.privateKey)':
        return this.accountExportPrivateKey(request as RequestAccountExportPrivateKey);
      case 'pri(accounts.export.json.batch)':
        return this.batchExportV2(request as RequestAccountBatchExportV2);
      case 'pri(accounts.export.mnemonic)':
        return this.exportAccountProxyMnemonic(request as RequestExportAccountProxyMnemonic);

      // Subscribe account
      case 'pri(accounts.subscribeWithCurrentProxy)':
        return await this.accountsGetAllWithCurrentAddress(id, port);
      case 'pri(accounts.subscribeAccountsInputAddress)':
        return this.subscribeInputAddressData(request as RequestInputAccountSubscribe, id, port);

      // Save current account
      case 'pri(accounts.saveCurrentProxy)':
        return await this.saveCurrentAccountProxy(request as RequestCurrentAccountAddress);

      // Edit account
      case 'pri(accounts.edit)':
        return this.accountsEdit(request as RequestAccountProxyEdit);
      // Ton change wallet contract version
      case 'pri(accounts.ton.version.map)':
        return this.tonGetAllTonWalletContractVersion(request as RequestGetAllTonWalletContractVersion);
      case 'pri(accounts.ton.version.change)':
        return this.tonAccountChangeWalletContractVersion(request as RequestChangeTonWalletContractVersion);

      // Save contact address
      case 'pri(addressBook.saveRecent)':
        return this.saveRecentAccount(request as RequestSaveRecentAccount);
      case 'pri(addressBook.edit)':
        return this.editContactAccount(request as RequestEditContactAccount);
      case 'pri(addressBook.delete)':
        return this.deleteContactAccount(request as RequestDeleteContactAccount);

      // Subscribe address
      case 'pri(addressBook.subscribe)':
        return this.subscribeAddresses(id, port);

      case 'pri(accounts.resolveDomainToAddress)':
        return await this.resolveDomainByAddress(request as ResolveDomainRequest);
      case 'pri(accounts.resolveAddressToDomain)':
        return await this.resolveAddressByDomain(request as ResolveAddressToDomainRequest);

      // Inject account
      case 'pri(accounts.inject.add)':
        return this.addInjects(request as RequestAddInjectedAccounts);
      case 'pri(accounts.inject.remove)':
        return this.removeInjects(request as RequestRemoveInjectedAccounts);

        /* Account management */

      // ChainService
      case 'pri(chainService.subscribeChainInfoMap)':
        return this.subscribeChainInfoMap(id, port);
      case 'pri(chainService.subscribeChainStateMap)':
        return this.subscribeChainStateMap(id, port);
      case 'pri(chainService.subscribeChainStatusMap)':
        return this.subscribeChainStatusMap(id, port);
      case 'pri(chainService.subscribeXcmRefMap)':
        return this.subscribeXcmRefMap(id, port);
      case 'pri(chainService.getSupportedContractTypes)':
        return this.getSupportedSmartContractTypes();
      case 'pri(chainService.enableChain)':
        return await this.enableChain(request as EnableChainParams);
      case 'pri(chainService.reconnectChain)':
        return await this.reconnectChain(request as string);
      case 'pri(chainService.disableChain)':
        return await this.disableChain(request as string);
      case 'pri(chainService.removeChain)':
        return this.removeCustomChain(request as string);
      case 'pri(chainService.validateCustomChain)':
        return await this.validateNetwork(request as ValidateNetworkRequest);
      case 'pri(chainService.upsertChain)':
        return await this.upsertChain(request as _NetworkUpsertParams);
      case 'pri(chainService.resetDefaultChains)':
        return this.resetDefaultNetwork();
      case 'pri(chainService.enableChains)':
        return await this.enableChains(request as EnableMultiChainParams);
      case 'pri(chainService.subscribeAssetRegistry)':
        return this.subscribeAssetRegistry(id, port);
      case 'pri(chainService.subscribeMultiChainAssetMap)':
        return this.subscribeMultiChainAssetMap(id, port);
      case 'pri(chainService.upsertCustomAsset)':
        return await this.upsertCustomToken(request as _ChainAsset);
      case 'pri(chainService.deleteCustomAsset)':
        return this.deleteCustomAsset(request as string);
      case 'pri(chainService.validateCustomAsset)':
        return await this.validateCustomAsset(request as _ValidateCustomAssetRequest);
      case 'pri(assetSetting.getSubscription)':
        return this.subscribeAssetSetting(id, port);
      case 'pri(assetSetting.update)':
        return await this.updateAssetSetting(request as AssetSettingUpdateReq);

      case 'pri(transfer.getMaxTransferable)':
        return this.getMaxTransferable(request as RequestMaxTransferable);
      case 'pri(freeBalance.get)':
        return this.getAddressTransferableBalance(request as RequestFreeBalance);
      case 'pri(freeBalance.subscribe)':
        return this.subscribeAddressTransferableBalance(request as RequestFreeBalance, id, port);
      case 'pri(subscription.cancel)':
        return this.cancelSubscription(request as string);
      case 'pri(chainService.recoverSubstrateApi)':
        return this.recoverDotSamaApi(request as string);

      /// Send NFT
      case 'pri(evmNft.submitTransaction)':
        return this.evmNftSubmitTransaction(request as NftTransactionRequest);
      case 'pri(substrateNft.submitTransaction)':
        return this.substrateNftSubmitTransaction(request as RequestSubstrateNftSubmitTransaction);

      /// Transfer
      case 'pri(accounts.transfer)':
        return await this.makeTransfer(request as RequestTransfer);
      case 'pri(accounts.crossChainTransfer)':
        return await this.makeCrossChainTransfer(request as RequestCrossChainTransfer);
      case 'pri(accounts.getOptimalTransferProcess)':
        return await this.getOptimalTransferProcess(request as RequestOptimalTransferProcess);
      case 'pri(accounts.approveSpending)':
        return await this.approveSpending(request as TokenSpendingApprovalParams);

      /// Sign QR
      case 'pri(qr.transaction.parse.substrate)':
        return this.parseSubstrateTransaction(request as RequestParseTransactionSubstrate);
      case 'pri(qr.transaction.parse.evm)':
        return await this.parseEVMRLP(request as RequestQrParseRLP);
      case 'pri(qr.sign.substrate)':
        return this.qrSignSubstrate(request as RequestQrSignSubstrate);
      case 'pri(qr.sign.evm)':
        return await this.qrSignEVM(request as RequestQrSignEvm);

      /// External account request
      case 'pri(account.external.reject)':
        return this.rejectExternalRequest(request as RequestRejectExternalRequest);
      case 'pri(account.external.resolve)':
        return this.resolveQrTransfer(request as RequestResolveExternalRequest);

      case 'pri(confirmations.subscribe)':
        return this.subscribeConfirmations(id, port);
      case 'pri(confirmationsTon.subscribe)':
        return this.subscribeConfirmationsTon(id, port);
      case 'pri(confirmations.complete)':
        return await this.completeConfirmation(request as RequestConfirmationComplete);
      case 'pri(confirmationsTon.complete)':
        return await this.completeConfirmationTon(request as RequestConfirmationCompleteTon);

      /// Stake
      case 'pri(bonding.getBondingOptions)':
        return await this.getBondingOptions(request as BondingOptionParams);
      case 'pri(bonding.getNominationPoolOptions)':
        return await this.getNominationPoolOptions(request as string);
      case 'pri(bonding.subscribeChainStakingMetadata)':
        return await this.subscribeChainStakingMetadata(id, port);
      case 'pri(bonding.subscribeNominatorMetadata)':
        return await this.subscribeStakingNominatorMetadata(id, port);
      case 'pri(bonding.submitBondingTransaction)':
        return await this.submitBonding(request as RequestBondingSubmit);
      case 'pri(unbonding.submitTransaction)':
        return await this.submitUnbonding(request as RequestUnbondingSubmit);
      case 'pri(staking.submitClaimReward)':
        return await this.submitStakeClaimReward(request as RequestStakeClaimReward);
      case 'pri(staking.submitCancelWithdrawal)':
        return await this.submitCancelStakeWithdrawal(request as RequestStakeCancelWithdrawal);
      case 'pri(staking.submitTuringCompound)':
        return await this.submitTuringStakeCompounding(request as RequestTuringStakeCompound);
      case 'pri(staking.submitTuringCancelCompound)':
        return await this.submitTuringCancelStakeCompound(request as RequestTuringCancelStakeCompound);
      case 'pri(bonding.nominationPool.submitBonding)':
        return await this.submitPoolBonding(request as RequestStakePoolingBonding);
      case 'pri(bonding.nominationPool.submitUnbonding)':
        return await this.submitPoolingUnbonding(request as RequestStakePoolingUnbonding);

      // EVM Transaction
      case 'pri(evm.transaction.parse.input)':
        return await this.parseContractInput(request as RequestParseEvmContractInput);

      // Auth Url subscribe
      case 'pri(authorize.subscribe)':
        return await this.subscribeAuthUrls(id, port);

      // Phishing page
      case 'pri(phishing.pass)':
        return await this.passPhishingPage(request as RequestPassPhishingPage);

      // Set Environment config
      case 'pri(settings.saveAppConfig)':
        return this.saveAppConfig(request as RequestSaveAppConfig);
      case 'pri(settings.saveBrowserConfig)':
        return this.saveBrowserConfig(request as RequestSaveBrowserConfig);
      case 'pri(settings.saveOSConfig)':
        return this.saveOSConfig(request as RequestSaveOSConfig);

      /// Keyring state
      case 'pri(keyring.subscribe)':
        return this.keyringStateSubscribe(id, port);
      case 'pri(keyring.change)':
        return this.keyringChangeMasterPassword(request as RequestChangeMasterPassword);
      case 'pri(keyring.migrate)':
        return this.keyringMigrateMasterPassword(request as RequestMigratePassword);
      case 'pri(keyring.unlock)':
        return this.keyringUnlock(request as RequestUnlockKeyring);
      case 'pri(keyring.lock)':
        return this.keyringLock();
      case 'pri(keyring.export.mnemonic)':
        return this.keyringExportMnemonic(request as RequestKeyringExportMnemonic);
      case 'pri(keyring.reset)':
        return await this.resetWallet(request as RequestResetWallet);

      /// Signing external
      case 'pri(signing.approve.passwordV2)':
        return this.signingApprovePasswordV2(request as RequestSigningApprovePasswordV2);

      /// Derive account
      case 'pri(accounts.derive.validateV2)':
        return this.validateDerivePath(request as RequestDeriveValidateV2);
      case 'pri(accounts.derive.getList)':
        return this.getListDeriveAccounts(request as RequestGetDeriveAccounts);
      case 'pri(accounts.derive.create.multiple)':
        return this.derivationCreateMultiple(request as RequestDeriveCreateMultiple);
      case 'pri(accounts.derive.createV3)':
        return this.derivationCreateV3(request as RequestDeriveCreateV3);
      case 'pri(accounts.derive.suggestion)':
        return this.getDeriveSuggestion(request as RequestGetDeriveSuggestion);

      // Transaction
      case 'pri(transactions.getOne)':
        return this.getTransaction(request as RequestGetTransaction);
      case 'pri(transactions.subscribe)':
        return this.subscribeTransactions(id, port);

      // Notification
      case 'pri(notifications.subscribe)':
        return this.subscribeNotifications(id, port);

      case 'pri(cron.reload)':
        return await this.reloadCron(request as CronReloadRequest);

      case 'pri(settings.getLogoMaps)':
        return await this.getLogoMap();
      case 'pri(settings.logo.assets.subscribe)':
        return this.subscribeAssetLogoMap(id, port);
      case 'pri(settings.logo.chains.subscribe)':
        return this.subscribeChainLogoMap(id, port);

      /// Wallet Connect
      case 'pri(walletConnect.connect)':
        return this.connectWalletConnect(request as RequestConnectWalletConnect);
      case 'pri(walletConnect.requests.connect.subscribe)':
        return this.connectWCSubscribe(id, port);
      case 'pri(walletConnect.session.approve)':
        return this.approveWalletConnectSession(request as RequestApproveConnectWalletSession);
      case 'pri(walletConnect.session.reject)':
        return this.rejectWalletConnectSession(request as RequestRejectConnectWalletSession);
      case 'pri(walletConnect.session.subscribe)':
        return this.subscribeWalletConnectSessions(id, port);
      case 'pri(walletConnect.session.disconnect)':
        return this.disconnectWalletConnectSession(request as RequestDisconnectWalletConnectSession);

      // Not support
      case 'pri(walletConnect.requests.notSupport.subscribe)':
        return this.WCNotSupportSubscribe(id, port);
      case 'pri(walletConnect.notSupport.approve)':
        return this.approveWalletConnectNotSupport(request as RequestApproveWalletConnectNotSupport);
      case 'pri(walletConnect.notSupport.reject)':
        return this.rejectWalletConnectNotSupport(request as RequestRejectWalletConnectNotSupport);

      // Manta
      case 'pri(mantaPay.enable)':
        return await this.enableMantaPay(request as MantaPayEnableParams);
      case 'pri(mantaPay.initSyncMantaPay)':
        return await this.initSyncMantaPay(request as string);
      case 'pri(mantaPay.subscribeConfig)':
        return await this.subscribeMantaPayConfig(id, port);
      case 'pri(mantaPay.disable)':
        return await this.disableMantaPay(request as string);
      case 'pri(mantaPay.subscribeSyncingState)':
        return this.subscribeMantaPaySyncState(id, port);

        /* Campaign */

      case 'pri(campaign.unlockDot.canMint)':
        return this.unlockDotCheckCanMint(request as RequestUnlockDotCheckCanMint);
      case 'pri(campaign.unlockDot.subscribe)':
        return this.unlockDotSubscribeMintedData(id, port, request as RequestUnlockDotSubscribeMintedData);
      case 'pri(campaign.popup.subscribeVisibility)':
        return this.subscribeCampaignPopupVisibility(id, port);
      case 'pri(campaign.popup.toggle)':
        return this.toggleCampaignPopup(request as ShowCampaignPopupRequest);
      case 'pri(campaign.popups.subscribe)':
        return this.subscribeAppPopupData(id, port);
      case 'pri(campaign.banners.subscribe)':
        return this.subscribeAppBannerData(id, port);
      case 'pri(campaign.confirmations.subscribe)':
        return this.subscribeAppConfirmationData(id, port);

        /* Campaign */

      // Metadata
      case 'pri(metadata.find)':
        return this.findRawMetadata(request as RequestFindRawMetadata);
      case 'pri(metadata.hash)':
        return this.calculateMetadataHash(request as RequestMetadataHash);
      case 'pri(metadata.transaction.shorten)':
        return this.shortenMetadata(request as RequestShortenMetadata);

      /* Campaign */
      case 'pri(campaign.banner.subscribe)':
        return this.subscribeProcessingBanner(id, port);
      case 'pri(campaign.banner.complete)':
        return this.completeCampaignBanner(request as RequestCampaignBannerComplete);
        /* Campaign */

        /* Buy service */
      case 'pri(buyService.tokens.subscribe)':
        return this.subscribeBuyTokens(id, port);
      case 'pri(buyService.services.subscribe)':
        return this.subscribeBuyServices(id, port);
        /* Buy service */

        /* Database */
      case 'pri(database.export)':
        return this.#koniState.dbService.exportDB();
      case 'pri(database.import)':
        return this.#koniState.dbService.importDB(request as string);
      case 'pri(database.exportJson)':
        return this.#koniState.dbService.getExportJson();
      case 'pri(database.migrateLocalStorage)':
        return this.#koniState.migrateMV3LocalStorage(request as string);
      case 'pri(database.setLocalStorage)':
        return this.#koniState.setStorageFromWS(request as StorageDataInterface);
      case 'pri(database.getLocalStorage)':
        return this.#koniState.getStorageFromWS(request as string);
        /* Database */

        /* Swap service */
      case 'pri(swapService.subscribePairs)':
        return this.subscribeSwapPairs(id, port);
      case 'pri(swapService.handleSwapRequest)':
        return this.handleSwapRequest(request as SwapRequest);
      case 'pri(swapService.getLatestQuote)':
        return this.getLatestSwapQuote(request as SwapRequest);
      case 'pri(swapService.validateSwapProcess)':
        return this.validateSwapProcess(request as ValidateSwapProcessParams);
      case 'pri(swapService.handleSwapStep)':
        return this.handleSwapStep(request as SwapSubmitParams);
        /* Swap service */

        /* Notification service */
      case 'pri(inappNotification.subscribeUnreadNotificationCountMap)':
        return await this.subscribeUnreadNotificationCountMap(id, port);
      case 'pri(inappNotification.markAllReadNotification)':
        return this.markAllReadNotification(request as string);
      case 'pri(inappNotification.switchReadNotificationStatus)':
        return this.switchReadNotificationStatus(request as RequestSwitchStatusParams);
      case 'pri(inappNotification.fetch)':
        return this.fetchInappNotifications(request as GetNotificationParams);
      case 'pri(inappNotification.get)':
        return this.getInappNotification(request as string);
      case 'pri(inappNotification.isClaimedPolygonBridge)':
        return this.getIsClaimedPolygonBridge(request as RequestIsClaimedPolygonBridge);
        /* Notification service */

        /* Avail Bridge */
      case 'pri(availBridge.submitClaimAvailBridgeOnAvail)':
        return this.submitClaimAvailBridge(request as RequestClaimBridge);
        /* Avail Bridge */

        /* Polygon Bridge */

      case 'pri(polygonBridge.submitClaimPolygonBridge)':
        return this.submitClaimPolygonBridge(request as RequestClaimBridge);

        /* Polygon Bridge */

        /* Ledger */
      case 'pri(ledger.generic.allow)':
        return this.subscribeLedgerGenericAllowChains(id, port);
        /* Ledger */

        /* Priority tokens */
      case 'pri(tokens.subscribePriority)':
        return this.subscribePriorityTokens(id, port);
        /* Priority tokens */

      // Default
      default:
        throw new Error(`Unable to handle message of type ${type}`);
    }
  }
}
