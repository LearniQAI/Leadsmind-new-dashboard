
import ProgressMainArea from '@/components/elements/base-ui/progress-bar/ProgressMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const ProgressbarMain = () => {
    return (
        <>
            <MetaData pageTitle="Progress Bar">
                <Wrapper>
                    <ProgressMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default ProgressbarMain;