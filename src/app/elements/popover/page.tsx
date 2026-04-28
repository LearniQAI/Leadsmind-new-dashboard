import PopoverMainArea from '@/components/elements/base-ui/Popover/PopoverMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const PopoverMain = () => {
    return (
        <>
            <MetaData pageTitle="Navs Tabs">
                <Wrapper>
                    <PopoverMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default PopoverMain;