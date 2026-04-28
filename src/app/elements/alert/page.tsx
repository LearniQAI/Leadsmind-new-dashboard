
import AlertMainArea from '@/components/elements/base-ui/alerts/AlertMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const AlertMain = () => {
    return (
        <>
            <MetaData pageTitle="Alert">
                <Wrapper>
                    <AlertMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default AlertMain;