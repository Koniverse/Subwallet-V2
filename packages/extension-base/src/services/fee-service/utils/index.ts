// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { GAS_PRICE_RATIO, NETWORK_MULTI_GAS_FEE } from '@subwallet/extension-base/constants';
import { _EvmApi } from '@subwallet/extension-base/services/chain-service/types';
import { EvmEIP1995FeeOption, EvmFeeInfo, InfuraFeeInfo, InfuraThresholdInfo } from '@subwallet/extension-base/types';
import { BN_WEI, BN_ZERO } from '@subwallet/extension-base/utils';
import BigN from 'bignumber.js';

const INFURA_API_KEY = process.env.INFURA_API_KEY || '';
const INFURA_API_KEY_SECRET = process.env.INFURA_API_KEY_SECRET || '';
const INFURA_AUTH = 'Basic ' + Buffer.from(INFURA_API_KEY + ':' + INFURA_API_KEY_SECRET).toString('base64');

export const parseInfuraFee = (info: InfuraFeeInfo, threshold: InfuraThresholdInfo): EvmFeeInfo => {
  const base = new BigN(info.estimatedBaseFee).multipliedBy(BN_WEI);
  const thresholdBN = new BigN(threshold.busyThreshold).multipliedBy(BN_WEI);
  const busyNetwork = thresholdBN.gte(BN_ZERO) ? base.gt(thresholdBN) : false;

  return {
    busyNetwork,
    gasPrice: undefined,
    baseGasFee: base.toFixed(0),
    type: 'evm',
    options: {
      slow: {
        maxFeePerGas: new BigN(info.low.suggestedMaxFeePerGas).multipliedBy(BN_WEI).integerValue(BigN.ROUND_UP).toFixed(0),
        maxPriorityFeePerGas: new BigN(info.low.suggestedMaxPriorityFeePerGas).multipliedBy(BN_WEI).integerValue(BigN.ROUND_UP).toFixed(0)
      },
      average: {
        maxFeePerGas: new BigN(info.medium.suggestedMaxFeePerGas).multipliedBy(BN_WEI).integerValue(BigN.ROUND_UP).toFixed(0),
        maxPriorityFeePerGas: new BigN(info.medium.suggestedMaxPriorityFeePerGas).multipliedBy(BN_WEI).integerValue(BigN.ROUND_UP).toFixed(0)
      },
      fast: {
        maxFeePerGas: new BigN(info.high.suggestedMaxFeePerGas).multipliedBy(BN_WEI).integerValue(BigN.ROUND_UP).toFixed(0),
        maxPriorityFeePerGas: new BigN(info.high.suggestedMaxPriorityFeePerGas).multipliedBy(BN_WEI).integerValue(BigN.ROUND_UP).toFixed(0)
      },
      default: busyNetwork ? 'average' : 'slow'
    }
  };
};

export const fetchInfuraFeeData = async (chainId: number, infuraAuth?: string): Promise<EvmFeeInfo | null> => {
  const baseFeeUrl = 'https://gas.api.infura.io/networks/{{chainId}}/suggestedGasFees';
  const baseThressholdUrl = 'https://gas.api.infura.io/networks/{{chainId}}/busyThreshold';
  const feeUrl = baseFeeUrl.replaceAll('{{chainId}}', chainId.toString());
  const thressholdUrl = baseThressholdUrl.replaceAll('{{chainId}}', chainId.toString());

  try {
    const [feeResp, thressholdResp] = await Promise.all([feeUrl, thressholdUrl].map((url) => {
      return fetch(url,
        {
          method: 'GET',
          headers: {
            Authorization: infuraAuth || INFURA_AUTH
          }
        });
    }));

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [feeInfo, thresholdInfo] = await Promise.all([feeResp.json(), thressholdResp.json()]);

    return parseInfuraFee(feeInfo as InfuraFeeInfo, thresholdInfo as InfuraThresholdInfo);
  } catch (e) {
    console.warn(e);

    return null;
  }
};

export const fetchSubWalletFeeData = async (chainId: number, networkKey: string): Promise<EvmFeeInfo | null> => {
  return await new Promise<EvmFeeInfo | null>((resolve) => {
    const baseUrl = 'https://api-cache.subwallet.app/sw-evm-gas/{{chain}}';
    const url = baseUrl.replaceAll('{{chain}}', networkKey);

    fetch(url,
      {
        method: 'GET'
      })
      .then((rs) => {
        return rs.json();
      })
      .then(resolve)
      .catch((e) => {
        console.warn(e);
        resolve(null);
      });
  });
};

export const fetchOnlineFeeData = async (chainId: number, networkKey: string, useInfura = false): Promise<EvmFeeInfo | null> => {
  return await new Promise<EvmFeeInfo | null>((resolve) => {
    const fetchFunction = useInfura ? fetchInfuraFeeData : fetchSubWalletFeeData;

    fetchFunction(chainId, useInfura ? '' : networkKey)
      .then((info) => {
        resolve(info);
      })
      .catch((e) => {
        console.warn(e);
        resolve(null);
      });
  });
};

export const recalculateGasPrice = (_price: string, chain: string) => {
  const needMulti = NETWORK_MULTI_GAS_FEE.includes(chain) || NETWORK_MULTI_GAS_FEE.includes('*');

  return needMulti ? new BigN(_price).multipliedBy(GAS_PRICE_RATIO).toFixed(0) : _price;
};

export const getEIP1559GasFee = (
  baseFee: BigN,
  maxPriorityFee: BigN
): EvmEIP1995FeeOption => {
  // https://www.blocknative.com/blog/eip-1559-fees
  const maxFee = baseFee.multipliedBy(2).plus(maxPriorityFee);

  return { maxFeePerGas: maxFee.toFixed(0), maxPriorityFeePerGas: maxPriorityFee.toFixed(0) };
};

export const calculateGasFeeParams = async (web3: _EvmApi, networkKey: string, useOnline = false, useInfura = false): Promise<EvmFeeInfo> => {
  if (useOnline) {
    try {
      const chainId = await web3.api.eth.getChainId();
      const onlineData = await fetchOnlineFeeData(chainId, networkKey, useInfura);

      if (onlineData) {
        return onlineData;
      }
    } catch (e) {

    }
  }

  try {
    const numBlock = 20;
    const rewardPercent: number[] = [25, 50, 75];

    const history = await web3.api.eth.getFeeHistory(numBlock, 'latest', rewardPercent);

    const baseGasFee = new BigN(history.baseFeePerGas[history.baseFeePerGas.length - 1]); // Last element is latest

    const blocksBusy = history.reward.reduce((previous: number, rewards, currentIndex) => {
      const [firstPriority] = rewards;
      const base = history.baseFeePerGas[currentIndex];

      const priorityBN = new BigN(firstPriority);
      const baseBN = new BigN(base);

      /*
      * True if priority >= 0.3 * base
      *  */
      const blockIsBusy = baseBN.gt(BN_ZERO)
        ? (priorityBN.dividedBy(baseBN).gte(0.3) ? 1 : 0)
        : 0; // Special for bsc, base fee = 0

      return previous + blockIsBusy;
    }, 0);

    const busyNetwork = blocksBusy >= (numBlock / 2); // True, if half of block is busy

    const slowPriorityFee = history.reward.reduce((previous, rewards) => previous.plus(rewards[0]), BN_ZERO).dividedBy(numBlock).decimalPlaces(0);
    const averagePriorityFee = history.reward.reduce((previous, rewards) => previous.plus(rewards[1]), BN_ZERO).dividedBy(numBlock).decimalPlaces(0);
    const fastPriorityFee = history.reward.reduce((previous, rewards) => previous.plus(rewards[2]), BN_ZERO).dividedBy(numBlock).decimalPlaces(0);

    return {
      type: 'evm',
      gasPrice: undefined,
      baseGasFee: baseGasFee.toString(),
      busyNetwork,
      options: {
        slow: getEIP1559GasFee(baseGasFee, slowPriorityFee),
        average: getEIP1559GasFee(baseGasFee, averagePriorityFee),
        fast: getEIP1559GasFee(baseGasFee, fastPriorityFee),
        default: busyNetwork ? 'average' : 'slow'
      }
    };
  } catch (e) {
    const _price = await web3.api.eth.getGasPrice();
    const gasPrice = recalculateGasPrice(_price, networkKey);

    return {
      type: 'evm',
      busyNetwork: false,
      gasPrice,
      baseGasFee: undefined,
      options: undefined
    };
  }
};
