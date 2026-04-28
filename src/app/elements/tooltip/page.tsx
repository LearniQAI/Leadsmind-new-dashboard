import TooltipMainArea from '@/components/elements/base-ui/tooltip/TooltipMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const TooltipMain = () => {
    return (
        <>
            <MetaData pageTitle="Tooltip">
                <Wrapper>
                    <TooltipMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default TooltipMain;