
import AccordionsMainArea from '@/components/elements/base-ui/accordions/AccordionsMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';
const AccordionsMain = () => {
    return (
        <>
            <MetaData pageTitle="Accordions">
                <Wrapper>
                    <AccordionsMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default AccordionsMain;