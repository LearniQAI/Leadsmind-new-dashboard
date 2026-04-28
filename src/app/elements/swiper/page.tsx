

import SwiperMainArea from '@/components/elements/advanced-ui/swiper/SwiperMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const SwiperMain = () => {
    return (
        <>
            <MetaData pageTitle="Swiper">
                <Wrapper>
                    <SwiperMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default SwiperMain;