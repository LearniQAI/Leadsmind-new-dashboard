import ModalsMainArea from '@/components/elements/base-ui/modals/ModalsMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const ModalsMain = () => {
    return (
        <>
            <MetaData pageTitle="Modal">
                <Wrapper>
                    <ModalsMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default ModalsMain;