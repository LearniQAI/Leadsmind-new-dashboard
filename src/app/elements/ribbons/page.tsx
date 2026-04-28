import RibbonsMainArea from '@/components/elements/advanced-ui/ribbons/RibbonsMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const RibbonsMain = () => {
    return (
        <>
            <MetaData pageTitle="Ribbons">
                <Wrapper>
                    <RibbonsMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default RibbonsMain;