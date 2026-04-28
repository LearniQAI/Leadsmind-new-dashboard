
import StepsMainArea from '@/components/elements/advanced-ui/steps/StepsMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const StepsMain = () => {
    return (
        <>
            <MetaData pageTitle="Steps">
                <Wrapper>
                    <StepsMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default StepsMain;