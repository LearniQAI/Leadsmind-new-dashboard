import ElementIconMainArea from '@/components/elements/element-icon/ElementIconMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const ElementIconMain = () => {
    return (
        <>
            <MetaData pageTitle="Icommon">
                <Wrapper>
                    <ElementIconMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default ElementIconMain;