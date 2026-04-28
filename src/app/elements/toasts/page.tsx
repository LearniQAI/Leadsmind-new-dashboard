import ToastsMainArea from '@/components/elements/base-ui/toasts/ToastsMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const ToastsMain = () => {
    return (
        <>
            <MetaData pageTitle="Snackbar Toast">
                <Wrapper>
                    <ToastsMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default ToastsMain;