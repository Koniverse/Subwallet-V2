// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset, _ChainInfo } from '@subwallet/chain-list/types';
import { _isSnowBridgeXcm } from '@subwallet/extension-base/core/substrate/xcm-parser';
import { getERC20Contract } from '@subwallet/extension-base/koni/api/contract-handler/evm/web3';
import { getExtrinsicByPolkadotXcmPallet } from '@subwallet/extension-base/services/balance-service/transfer/xcm/polkadotXcm';
import { getSnowBridgeEvmTransfer } from '@subwallet/extension-base/services/balance-service/transfer/xcm/snowBridge';
import { getExtrinsicByXcmPalletPallet } from '@subwallet/extension-base/services/balance-service/transfer/xcm/xcmPallet';
import { getExtrinsicByXtokensPallet } from '@subwallet/extension-base/services/balance-service/transfer/xcm/xTokens';
import { _XCM_CHAIN_GROUP } from '@subwallet/extension-base/services/chain-service/constants';
import { _EvmApi, _SubstrateApi } from '@subwallet/extension-base/services/chain-service/types';
import { _isChainEvmCompatible, _isNativeToken } from '@subwallet/extension-base/services/chain-service/utils';
import { Keyring } from '@subwallet/keyring';
import { ApiPromise, initialize, signedExtensions, types } from 'avail-js-sdk';
import BigN, { BigNumber } from 'bignumber.js';
import { TransactionConfig } from 'web3-core';

import { SubmittableExtrinsic } from '@polkadot/api/types';
import { isNumber, u8aToHex } from '@polkadot/util';
import { addressToEvm, decodeAddress, isEthereumAddress } from '@polkadot/util-crypto';

type CreateXcmExtrinsicProps = {
  originTokenInfo: _ChainAsset;
  destinationTokenInfo: _ChainAsset;
  recipient: string;
  sendingValue: string;

  substrateApi: _SubstrateApi;
  chainInfoMap: Record<string, _ChainInfo>;
}

export enum TransactionStatus {
  INITIATED = 'INITIATED',
  BRIDGED = 'BRIDGED',
  READY_TO_CLAIM = 'READY_TO_CLAIM',
  CLAIMED = 'CLAIMED',
  FAILED = 'FAILED',
  CLAIM_PENDING = 'PENDING',
}

export interface Transaction {
  status: TransactionStatus,
  destinationChain: Chain,
  messageId: number,
  sourceChain: Chain,
  amount: string,
  dataType: 'ERC20',
  depositorAddress: `0x${string}` | string,
  receiverAddress: string,
  sourceBlockHash: `${string}`,
  sourceBlockNumber: number,
  sourceTransactionHash: string,
  sourceTransactionIndex: number,
  sourceTimestamp: string
  sourceTokenAddress?: `0x${string}`;
  destinationTransactionHash?: `0x${string}` | string;
  destinationTransactionBlockNumber?: number;
  destinationTransactionTimestamp?: number;
  destinationTransactionIndex?: number;
  destinationTokenAddress?: `0x${string}`;
  message?: string;
  blockHash?: `0x${string}`;
}

enum Chain {
  AVAIL = 'AVAIL',
  ETH = 'ETHEREUM',
}

function uint8ArrayToByte32String (uint8Array: Uint8Array) {
  // Ensure the input is Uint8Array
  if (!(uint8Array instanceof Uint8Array)) {
    throw new Error('Input must be a Uint8Array');
  }

  // Create a hex string from the Uint8Array
  let hexString = '';

  for (const byte of uint8Array as any) {
    hexString += byte.toString(16).padStart(2, '0');
  }

  // Ensure the hex string is 64 characters long
  if (hexString.length !== 64) {
    throw new Error('Input must be 32 bytes long');
  }

  return '0x' + hexString;
}

type CreateSnowBridgeExtrinsicProps = Omit<CreateXcmExtrinsicProps, 'substrateApi'> & {
  evmApi: _EvmApi;
  sender: string
}

const getInjectorMetadata = (api: ApiPromise) => {
  return {
    chain: api.runtimeChain.toString(),
    specVersion: api.runtimeVersion.specVersion.toNumber(),
    tokenDecimals: api.registry.chainDecimals[0] || 18,
    tokenSymbol: api.registry.chainTokens[0] || 'AVAIL',
    genesisHash: api.genesisHash.toHex(),
    ss58Format: isNumber(api.registry.chainSS58) ? api.registry.chainSS58 : 0,
    chainType: 'substrate' as const,
    icon: 'substrate',
    types: types as any,
    userExtensions: signedExtensions
  };
};

export const substrateAddressToPublicKey = (address: string) => {
  const accountId = address;

  // Instantiate a keyring
  const keyring = new Keyring({ type: 'sr25519' });

  // Add account using the account ID
  const pair = keyring.addFromAddress(accountId);
  const publicKeyByte8Array = pair.publicKey;

  // Get the public address
  const publicKeyByte32String = uint8ArrayToByte32String(publicKeyByte8Array);

  return publicKeyByte32String;
};

const NEXT_PUBLIC_AVAIL_RPC = 'wss://turing-rpc.avail.so/ws';

export const createSnowBridgeExtrinsic = async ({ chainInfoMap,
  destinationTokenInfo,
  evmApi,
  originTokenInfo,
  recipient,
  sender,
  sendingValue }: CreateSnowBridgeExtrinsicProps): Promise<TransactionConfig> => {
  const originChainInfo = chainInfoMap[originTokenInfo.originChain];
  const destinationChainInfo = chainInfoMap[destinationTokenInfo.originChain];

  if (!_isSnowBridgeXcm(originChainInfo, destinationChainInfo)) {
    throw new Error('This is not a valid SnowBridge transfer');
  }

  return getSnowBridgeEvmTransfer(originTokenInfo, originChainInfo, destinationChainInfo, sender, recipient, sendingValue, evmApi);
};

export const createXcmExtrinsic = async ({ chainInfoMap,
  destinationTokenInfo,
  originTokenInfo,
  recipient,
  sendingValue,
  substrateApi }: CreateXcmExtrinsicProps): Promise<SubmittableExtrinsic<'promise'>> => {
  const originChainInfo = chainInfoMap[originTokenInfo.originChain];
  const destinationChainInfo = chainInfoMap[destinationTokenInfo.originChain];

  const apiAvailSdk = await initialize(NEXT_PUBLIC_AVAIL_RPC);

  const metadata = getInjectorMetadata(apiAvailSdk);
  const chainApi = await substrateApi.isReady;
  const api = chainApi.api;
  const fromAmountAtomic = new BigNumber(1)
    .multipliedBy(new BigNumber(10).pow(18))
    .toString(10);

  const sampleData = {
    message: {
      FungibleToken: {
        assetId:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
        amount: '1000000000000000000' as unknown as BigInt
      }
    },
    to: `${recipient.padEnd(66, '0')}`,
    domain: 2
  };


  // Note: This config for claim token
  // const proofs = {
  //   accountProof: [
  //     '0xf90211a02c930ab429422ad4b6a75d1ab47dea2a6fa45d16089ead3191c6c99c03c25404a041943f82cf419643e6f577ef028977ab92c713ae244ba418accaa6bd2b5d9021a098b581df4c9d3d2a30ffa2a70078c9a9a4b7859f8d8878d108c551a4844cc26fa07e88cf86bd861fd5d9698587c901ae75f7e4c392024c41aff30a8a957e47fc29a0346bac8e9a719cf0f406a516c2d6e415f24f75924fa5d281065896be805dad0aa003b08284fa37c47687241ed762995be45982e63bda80159dca453f6a9b2eaf63a0c11fe27bce2bed1fd562f3f68c05943cda24bb5bbe9a6568f570aa285507d565a09b6c790b90d40c8fe36c62a5550be660e553b6f9b52f877df623bb25ae1b74cca048e2266696d7f60ba287d15f28663308fddcd6498cdaa3d1301cdc0ec9486c47a0d6d1c976f9094143130030e6755542bfc758fb874c75aa1bef755b6e71b25669a0ac71ff7e429d634c2a187c668e6939bd34d213f77be849878d21d5de4c172f46a0fa91b28486a88f88da1051f8bee1d5fa3a310b9846eeddf3dfd6ab7d2b8e8b2ba0e3f0222897154258953244f694b6d3a8de68c4cb5ec5954e5f66adceafd217f4a0f9bf9e38bcde56af6c6542616d81f9bda909409581c511635146db24aeb87821a0151bef81cc68b2008aa6c46187e8b5c3c96cd578285a5735a5ece1beec8a7536a099cef559ccebef3f7f4b04b3ef38a8a946b93be701dd37255d1d8b5ab0cc2ecc80',
  //     '0xf90211a0f0ff02eb720a2dbaba6d0870ac07466d79be7860a01193197f50b5da0c9f1a57a07635a0b7581d6633f04114901b17e308bc9bcccf8bd984142e4ec986f8663f8aa00b41b988cf3ede7059964f8fe9050ed8b17436857a14fccff0a3ed8503c732b0a0c601f7aef17bea8c8bb2da836d792af9fb78fb018323faf5e8ea53821cd1d396a0c4aa8a8ceb5baf4c5aaf70879029103ba14430142b114ba61e736b3bef700ddca00ee43428cc63f84fb8092ba790824b10dbf5ec1a932e6881d3c6e9d9abf88ed6a0ca785cde7455bd7ab2ba4c41deeca24df7faa8bb5bb317032dfad213c9acb57ba0ec4f05b23f50bf807e62230a18d2e42ca49c251789eec49fad8f79c1acdd3436a03912db0d65b5bee55d6b59d792a37474c1c9b597daeb595397fd159a948ec20aa0273edc5b23ccfa573b727f2a98a7dd66f39a675d2808f13ea4a4f21806861c1ea0161e31f6ca5193d57ed772e1cd66a7ec52fb70033cf6ef1abbbca48313a75a92a0994675d9cf64e1a7506c9cd97fc27d35a9afc2dcd9cb90458babae7b17363c2ba0989a520e588f0245432a0c92cf6af19bc476b1ff797158c3b09197e8dbf36f73a0c4e5fb691aa1c3d309077faddbe11dd738a178a08057bcd03a535a77279f09faa04ec7b2bdebf9c8059cd541bb3c88f71a0399856bf92cf79790b177fbf99b2424a06b0846fe050ae10a4f2990db067c8c783784f36497d58cc66ac1f054fc3f6cad80',
  //     '0xf90211a0c67005dde0c2c60099252cc0bdb49f3e34bca3cf0cb295d4d7f8415f9b8007f2a083bca809663f5ef67261b81a374b95660d1d4e88dd1f0333821a3c9dfcd2136aa0cfa955023b12d7a2c91d70d7ca96e979e7cf5d9d93d74489cbbfb953ebe46a81a0b4d636f3fec37f2e29e95caeeb0f5f0c60eb860446d8bc7769164ae3de5afab9a071ba8f8e098d1d6b7ed19def50ee519e3f2432f5811729c27da2cccda8dc6679a0869e0b607af5c82cfc670bd2da89a4ca6333e4582daf6db8a1a1dcbf2b1e3ab4a037c2a0e3b657d2c861d8015fee7daaf028679a30a7eb28425f8e1d6bb62d0ef3a07ee19e93c45b2eb99773600b48e08de37a09b4cd57fd4e048c00700bc53184eaa08216a30d6b7aa1c4cb3f0812eca32f62d0b302bb318a5e5251987234cdf2fb2ba08a73d75c780d1c897766fe488af1f91df4c67321f9d426e8ea8ee479b7327129a0fdfdbee5655b8be9e3187ceee6789ef277fa3559011ec019e96f52c3c813e0baa0304a3bce7dbeda010b90444974d2c88acd21fad391c8982515871cf14a801ba1a0b3360641f645aa24bdd5cd36edb691b8b20421ae3da1325a39dda67dcb8b8b27a0b0366f622bd86b25887f5be3efe1eb7563411bfa0596a27b0650ff0a50e7a074a060711b5063bb1efd6a0f52a1a6319e6faf9cce1c26841bba4dec415e0baf548aa08fcc515cf603d3235edf074e3b3d97bc2b4e6670e4db1a2b3842aa4d292227a480',
  //     '0xf90211a0f47cb3446aa4ae5bbeffed7145c675ceeb05da803dc3122e332cbc74e0fbe70ea0fad4c541c42fde0b307e19043108a0621f8e3909b6cd4bf635158be4d894f579a0c0634a7815f14aba4f2e06dac2ec7911dd2f0c455a190c5c82dd62b4beb6ed83a0774a4dd1d88e8b47971f7997688431822c2688cb9991559746a94cf464cc1004a0a65e2a7d07091df35f95c3d9bac0c135ffa45b07cc7e405ade957ddfd767ac81a017e000eebae1939b07f4583d16140d8f0fb89b10ef713aa68b4d265d06424e6ba0d9600ed9b3b512339292afe47158af6213c5582848fc38c0883c25d9659f47e4a056f81c71f20790c1e2d7f9f3e8f3f22701899e0ce3efc2942ae3c328e560fd4aa081e7bc49c4c03eece6488c9f3a985870d94ab05fc7d2508539c556446f0e1710a09892770cce0d70055a9d590c94c56b065fe528183ecc03751360c5822ce1f2d2a07ebbf5f84e8246c60cb27988a13a8d7c3dee23b9e6737b367746d9f1f42cd52ba077957f307020160f1160936941813e14ca63394983474b70fe86358380a0914da09665da85b8b51d01858d621870ddfdaff928232996965ad042b1da824c3f39c4a0877e6737e096d2c47c1c60f58e12b6f4e4640c9c9b2fc03b4e73cb954d226c84a0320c9a61ae7ced6f3be4589f6681b18bed1603b8e88dcffd824a285e49facf0aa04adc6dd03e656fe313a06d61f3ed193770234ea53cdd720d80871c4bcce4ac3d80',
  //     '0xf90211a0fdf703b2cbbe9fda056462f0c8c34591cff3c04b8e8c6e12bf55ef0d5c4a9052a042711d2883ddece0cd850be2c27145a1594b29d8d12b69018a12bc88000d9cd4a02e5dbf6b5a909c2dfd2c4f9ede5f69d362639ed47cf91b57691f1cce7be01b08a009c7c83a24821c1cd1a60496be0e095641ed164d1fc2ac6eee29b5c8304df026a0ec23cf372af578112f14447dd243eba5d1639b3e649543d143038360c06e9241a0fc6ee9d087042378a8bef8b2105d68a7812a31c701d86b7a5a03043161817e58a00cca30e9b84095957bc1a57626765451e83f25b2ce7b78795dae428398f9c1d6a00e6ce0168e518db11e1f0725dce19abd298477e745029497fe0842145a86453ba0a62a16129491f2c252d42a542992e5b8dd78e15d55d10688d7f1dc395928b77aa047827a1f0f73d74ba362e9c7820971dcd42981fc0b211b969beebae935f39df5a0356da9987e515e89b84bc9e0f353ff139c61bf56cc4ffbb5fd5450f333e9084aa02d4c74952bb8f9fea483008021bec26fb0ee0de2040a527189a841b327442104a0ddf72a8e6629e078757ee5618e9fbf93e8bbbeff16ad2c2d7245b683f65c114da015670c48ee4783a4d7a172da05e04bd2c1387677d4220f11e0efa333e1e153c8a0330385b84d1d56617a6f7b7cefb0c6e3513db871f4c6ee16497a6fa3a6ce3c31a02dadceab79e3f6eeab8112df2fffd492c8f35239b42ce2f325361f374f03bc4980',
  //     '0xf901f1a00ad20964cfc8ad7aaef7a5adf12f3d6217640340e6098072b6f4acf0f8cc45f8a0e2e8d0d5dfa7f656ca3cffe9f33b71dc9674610c80da6ec49a7415a99c7bdfada09743c9e5f1f98e2748614fdcf53449f44785923027af682d3a072eae05f06888a0e14975019577e27c7393f0207d1913ae735096b7b7181fec6aa4ee80b1c3e301a0606335109ae3296e0b28995d49aeaa6c5881f6658e996501ca1681a104052e93a0c1223e4690544b44fd7425d1651ec37e93beb1e653c44519577e61df4a4c9331a026d43d8c020968499bfb6506cda22ec9856053a43cf1ccfa8387c6caaca5d709a0952749b86e6678bc6cdfa49bc790880ed04306f353f0927d348671ed587cee3ba0d32c7d8b60617ee87cb64ad6dbf3375b7038ab352c69a9ee806f0c0d267f9bb380a0986c0ef037adbaa205a6e9ede0ff0dbe7d47aff490177b84d4da4683b644c94ca0501cbdb13ba83376f74c1f3ae46c456a49220b9757bfc16a0dee514e3996f0e8a00dcf002e17e57c1cb9c0b7db0fd6335b452296fba79becf5c6b9dfa38d1ed9f9a010241a99240212f573084ec21cc71a243c31b32bb8b99b8ce22855b6a03fb857a0efb16457c44e315e1fcf9ab6b8c993b1fdb9ce8241d7668dd6c473606a7ec9dca016595a960dec24e45528d297148af8d70f0652ec63294f98bfec035989ad682780',
  //     '0xf871a07acf346afde7dd29d2336fb8a7adbefdf4b43aade470f7a1808d0d4e880e9c0480808080a025af9da27b1e73b42d5ac92731a06a308cd9b72943d3c84ed4747ce1895de166808080a0a995fa2b954e7eb7137e47c9aa5cd7f99b88a04060493088666e39223f5678d980808080808080',
  //     '0xf8669d3364133d55eaf5f29c03ff34574baaa14a362521f94e5494bac5a7b8f3b846f8440280a096e9b0c70adcb967d89236bdaeb62e472df235c6d0f53387c7b5dfb71ddf5774a078168a9262adad7fa623076295d940f37c0f84c04c1d302e43a75b132f0d5793'
  //   ],
  //   storageProof: [
  //     '0xf90211a00fadefe0636d7c593705ed10646d50eaed8be379d68127664c0ea16d327c8f0aa07cb48daae02af814ddd066dc8ba2d081fdf6ac07c5410798e48b093e10bd047ca0bb2b847de2787a001f405ae104d96284633624560bf6a3675b33d8c6eb8ea9afa0e91f21f85dd0a6e8e72d3b407aa995b5af814ab3634636aac38af16dd3691cfea056b6023d83ee72971289a966f4f031d97f7c75b6f7113fec1089f62228d3b637a0a0022a7661032879c3a30f180d4580167f84c1f469c3109064d767e9bd4884bda0c58a5b648cc3b0869feb1710141bb31ae85a60c58acfccb5ef64be13f1f831a0a08003437ea643eb66d18d09fcd8c9b5d143942b39c6943a068b22fabe644efbd9a066f07184f6e3e475580a3bb103196f618043646cbc98c8c35343478446d3803aa0f7db0ab5670abdc5234281799312310ca6205d7903d8e2ef87f195235ce6cfe6a00db68e2646b0f2fce7574bcc9c891603e1b2de53fc7ccaa9020f9de0d0054b1aa02f2ede38f42bd06b00557d35f25c0e4a9c515ba8b9695c9acee5a0df95a42db1a078bf51fb4451b6be8b5d7617e29f4ddc8e601be576542d01bcec31f048557d9ca00408d1c0c463391fb53feca18ea6566035279d0121605b426dd67c1c0ae649a0a076075ee2c4de40bbd93d0572be6df85b8dcec247d502133c078dc48610268d9ba0ff34970d88ce2f58815ea930a0a0fccd8426d72392f25502dd4b817ba513c10680',
  //     '0xf90211a030b35a2c3f70ddd173961912e86958a94b58534800975d88a34808c520ba73f0a08f391ed72013e20a7193350488e49b52ffc47317880c9995bebe091694df6c8ea0d3868b404ccf61efdbd728658904fca40107b8d626c32192d39dae018a413797a0c1c6ebfa82c74b597ae7a9c808332fa3227c2c2db70fabad387dc8e06c18925da0cbe9e84629841206b1990d445fa1acbe85d121636c3b7555c4317be234784130a0437c2062edce730142338ee9cee3923d369efdcb31e58518d39550449f08ab53a0901c8b0ef36455c97405dd59d119baabb50b7cd34892be1eda5718c1f8a2cb4da08d3b0fcc75eb091fbf1bd6ff3b6aad0c0c5e1f6c00df6babe9a596965cd54ae6a09ccba34b466602326e0332e0f66e4dff44e678bd2e9f3ae2b9564e042059113aa0c863b4cf919d0650c7f004f1ebca44cb79f94961032da5c86b38dd942cbec542a05e3236aa7533efe707d70b514840d0a166645dfa7a6cdabeb8b366cee5239e2aa026053741bdac28b37d295f44b061f820dfcb6f9d7efae515032984250a613de8a0cdaf0359bb12239eed12d0b572455379c41ad30d52df24d1f54ba632c5debb81a05bca02c93e7c843187e9a9c8f32615397dd19041452927a66420f7b744bfa3f1a01daa7b17773bc70319a7b7317a2bb12265cf61fcd9ac609612377bf4e122836aa0a04caebcef2eb82143abe7d0969bc6fd8f774f30ef2cac422e32e5590ee0130d80',
  //     '0xf90211a083d169a720925fba88fca0dffa71a73920c67762eca5802fd3d10397538cc0fca014833168ea496f895b64ed3141bae8dd6b8097c6ac8b162f1d6add19e3eb213aa0d4b15e8633aa8745a7531118ee636f5b72e29d90aec8d471f3cf1b1c82d42072a029f1917e8cebee0e878422991122e39a920aeb9d46d382d1dd79e4948428aa20a083fe86318b1bba211a1cb4cdcd5e1d5be0e425f8f2148a507597ea3244177766a0a4a84645033a65837902152b8bdd881a6a973026e4c8837b40f3dbf57cb0cef7a013f7e4a4b6993d0daad4e6b94d257b73bff3ee646fb7b71a4e4e06d7bb02728ba06b481057e93b3ec6e1f04342195026b94c4f0d0a876fe6122a84eecd1663c5a7a08f63fb94a8c06c2eb7a0f997310ff3c170633336c16343382dbd0207f711c33fa0fb61b56d1d87691ca9bef1ab1f5cb1b0bc4a8881c171fbd32a1a261ba02a1b11a0bb6a5135cfc157b74113fd5bafe34cd9d1a3a4d38ff9d71f3abb75eca9f41faba030d0dc12ae32b209a44ce9037db59a0d48977d3fbe59a5d86d60bc42e559875aa03460c09f0235d8e4513621c1c653f32f1dbd7012c16ca81ba4969b6176a7cdbca0e4840aa51f1d836e38eaa98875649d89d2aa1581cb2507deb2c6f3d0311db146a0753b619a59cb40678f014fc4108ecac15c7ea351975fa9ed22291cc826e72134a00ad4d70fc15267e2be7dab40c1c01443fb50745de4b3686fd03b19767d66dcd180',
  //     '0xf871a0f517c0deac91a0aab1c3f7a3ad1ee6e51344ceacc7a53f7a18f2bc1be3804bcfa037ea71714fc9a224390fe0bb26b48fd829afad297c91442ca5bc9116a36ebc5f80808080808080a014c14369ee296139bb3108682effd14fcc49a23279fdef4359020de5e2f5134680808080808080',
  //     '0xf8429f208b665577d4c197e806bb458d224424b006105543d4ce3fd739093ba6fe8fa1a0bca79f04e7fedf950414bf548a841943b7c43b5fdd1d69d911e0219bd2e62687'
  //   ]
  // };
  //
  // const executeParams = {
  //   messageid: '10135',
  //   amount: '1000000000000000000',
  //   from: '0xdd718f9ecaf8f144a3140b79361b5d713d3a6b19',
  //   to: '5CFh4qpiB5PxsQvPEs6dWAhzgAVLHZa8tZKxeE9XsHBg4n9t',
  //   originDomain: 1,
  //   destinationDomain: 2
  // };
  //
  // const ethHead = {
  //   slot: 5699232,
  //   timestamp: 1724125460,
  //   timestampDiff: 629
  // };
  //
  // const ethToAvailSampleData = {
  //   slot: ethHead.slot,
  //   addrMessage: {
  //     message: {
  //       FungibleToken: {
  //         assetId:
  //           '0x0000000000000000000000000000000000000000000000000000000000000000',
  //         amount: executeParams.amount
  //       }
  //     },
  //     from: `${executeParams.from.padEnd(66, '0')}`,
  //     to: u8aToHex(decodeAddress(executeParams.to)),
  //
  //     // TODO: check if this is correct, should'nt be the way it is right now.
  //     originDomain: executeParams.destinationDomain,
  //     destinationDomain: executeParams.originDomain,
  //     id: executeParams.messageid
  //   },
  //   accountProof: proofs.accountProof,
  //   storageProof: proofs.storageProof
  // };
  let extrinsic;
  const polkadotXcmSpecialCases = _XCM_CHAIN_GROUP.polkadotXcmSpecialCases.includes(originChainInfo.slug) && _isNativeToken(originTokenInfo);

  if (originChainInfo.slug === 'polkadot') {
    try {
      extrinsic = apiAvailSdk.tx.vector.sendMessage(sampleData.message, sampleData.to, sampleData.domain);
      const availAddress = '5CFh4qpiB5PxsQvPEs6dWAhzgAVLHZa8tZKxeE9XsHBg4n9t';
      const ethAddress = '0xdd718f9Ecaf8f144a3140b79361b5D713D3A6b19';
      const sourceChain = '';
      const destinationChain = '';
      const indexedTransactions = await getTransactionsFromIndexer(
        { availAddress: availAddress, ethAddress: ethAddress, sourceChain: sourceChain, destinationChain: destinationChain }
      );
    } catch (e) {
      console.error('Error while sending message via vector avail -> eth:', e);
      extrinsic = getExtrinsicByXcmPalletPallet(originTokenInfo, originChainInfo, destinationChainInfo, recipient, sendingValue, api);
    }
  } else if (_XCM_CHAIN_GROUP.polkadotXcm.includes(originTokenInfo.originChain) || polkadotXcmSpecialCases) {
    extrinsic = getExtrinsicByPolkadotXcmPallet(originTokenInfo, originChainInfo, destinationChainInfo, recipient, sendingValue, api);
  }

  if (_XCM_CHAIN_GROUP.xcmPallet.includes(originTokenInfo.originChain)) {
    extrinsic = getExtrinsicByXcmPalletPallet(originTokenInfo, originChainInfo, destinationChainInfo, recipient, sendingValue, api);
  } else {

    extrinsic = getExtrinsicByXtokensPallet(originTokenInfo, originChainInfo, destinationChainInfo, recipient, sendingValue, api);
  }
  return extrinsic
};

type TransactionQueryParams = {
  availAddress?: string;
  ethAddress?: string;
  sourceChain?: string;
  destinationChain?: string;
};

function validateParams ({ availAddress, ethAddress }: TransactionQueryParams) {
  if (!availAddress && !ethAddress) {
    console.log('Either availAddress or ethAddress must be provided.');

    return [];
  }
}

async function fetchTransactions (
  userAddress: string,
  sourceChain?: string,
  destinationChain?: string
): Promise<Transaction[]> {
  const queryParams = new URLSearchParams({
    userAddress,
    sourceChain: sourceChain || '',
    destinationChain: destinationChain || '',
    limit: '100',
    page: '0'
  });

  try {
    const response = await fetch(
      `https://turing-bridge-indexer.fra.avail.so/transactions?${queryParams}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        credentials: 'omit' // Corresponds to `withCredentials: false` in Axios
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return data.data.result;
  } catch (e) {
    console.error(e);
    console.log('Error fetching transactions from indexer');

    return [];
  }
}

/**
 * @description Fetches transactions and adds to store, based on wallet logged in
 *
 * @param {TransactionQueryParams}
 * @returns Transaction[]
 */
export const getTransactionsFromIndexer = async (
  { availAddress, destinationChain, ethAddress, sourceChain }: TransactionQueryParams
): Promise<Transaction[]> => {
  validateParams({ availAddress, ethAddress });

  const allTransactions: Transaction[] = [];
  const seenHashes = new Set<string>();

  const addUniqueTransactions = (transactions: Transaction[]) => {
    transactions.forEach((txn) => {
      if (!seenHashes.has(txn.sourceTransactionHash)) {
        seenHashes.add(txn.sourceTransactionHash);
        allTransactions.push(txn);
      }
    });
  };

  console.log('Fetching transactions from indexer');

  if (ethAddress) {
    const ethTransactions = await fetchTransactions(ethAddress, Chain.ETH, destinationChain);

    console.log('ethTransactions', ethTransactions);
    addUniqueTransactions(ethTransactions);
  }

  if (availAddress) {
    const availTransactions = await fetchTransactions(availAddress, Chain.AVAIL, destinationChain);

    console.log('availTransactions1', availTransactions);
    addUniqueTransactions(availTransactions);
  }

  return allTransactions;
};

export const getXcmMockTxFee = async (substrateApi: _SubstrateApi, chainInfoMap: Record<string, _ChainInfo>, originTokenInfo: _ChainAsset, destinationTokenInfo: _ChainAsset): Promise<BigN> => {
  try {
    const destChainInfo = chainInfoMap[destinationTokenInfo.originChain];
    const originChainInfo = chainInfoMap[originTokenInfo.originChain];
    const address = '5DRewsYzhJqZXU3SRaWy1FSt5iDr875ao91aw5fjrJmDG4Ap'; // todo: move this

    // mock receiving account from sender
    const recipient = !isEthereumAddress(address) && _isChainEvmCompatible(destChainInfo) && !_isChainEvmCompatible(originChainInfo)
      ? u8aToHex(addressToEvm(address))
      : address
    ;

    const mockTx = await createXcmExtrinsic({
      chainInfoMap,
      destinationTokenInfo,
      originTokenInfo,
      recipient: recipient,
      sendingValue: '1000000000000000000',
      substrateApi
    });
    const paymentInfo = await mockTx.paymentInfo(address);

    return new BigN(paymentInfo?.partialFee?.toString() || '0');
  } catch (e) {
    console.error('error mocking xcm tx fee', e);

    return new BigN(0);
  }
};
