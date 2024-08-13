// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { StaticDataProps } from '@subwallet/extension-web-ui/components/Modal/Campaign/AppPopupModal';
import Banner from '@subwallet/extension-web-ui/components/StaticContent/Banner';
import { APP_INSTRUCTION_DATA } from '@subwallet/extension-web-ui/constants';
import { ThemeProps } from '@subwallet/extension-web-ui/types';
import { AppBannerData } from '@subwallet/extension-web-ui/types/staticContent';
import React, { useMemo } from 'react';
import Slider, { Settings } from 'react-slick';
import styled from 'styled-components';
import { useLocalStorage } from 'usehooks-ts';

interface Props extends ThemeProps {
  banners: AppBannerData[];
  dismissBanner: (ids: string[]) => void;
  onClickBanner: (id: string) => (url?: string) => void;
}

const Component = ({ banners, className, dismissBanner, onClickBanner }: Props) => {
  const [appInstructionData] = useLocalStorage(APP_INSTRUCTION_DATA, '[]');
  const instructionDataList: StaticDataProps[] = useMemo(() => {
    try {
      return JSON.parse(appInstructionData || '[]') as StaticDataProps[];
    } catch (e) {
      console.error(e);

      return [];
    }
  }, [appInstructionData]);

  const sliderSettings: Settings = useMemo(() => {
    return {
      dots: true,
      infinite: true,
      slidesToShow: 1,
      slidesToScroll: 1,
      autoplay: true,
      autoplaySpeed: 7000,
      arrows: false
    };
  }, []);

  return (
    <>
      <Slider
        {...sliderSettings}
        className={className}
      >
        {banners.map((item) => (
          <Banner
            data={item}
            dismissBanner={dismissBanner}
            instructionDataList={instructionDataList}
            key={item.id}
            onClickBanner={onClickBanner}
          />
        ))}
      </Slider>
    </>
  );
};

const BannerGenerator = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    marginBottom: 8,
    '.slick-dots': {
      textAlign: 'center',
      paddingInlineStart: 0,
      position: 'absolute',
      marginBottom: -3,
      bottom: 0,
      width: '100%'
    },
    '.slick-dots li': {
      display: 'inline-block',
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 4,
      marginRight: 4,
      padding: 0,
      cursor: 'pointer',
      height: 12,
      width: 6
    },
    '.slick-dots li button': {
      border: 0,
      display: 'block',
      fontSize: 0,
      lineHeight: 0,
      padding: token.sizeXXS - 1,
      backgroundColor: token.colorWhite,
      borderRadius: 10
    },
    '.slick-dots li.slick-active button': {
      opacity: 0.75
    }
  };
});

export default BannerGenerator;
