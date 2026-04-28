
import BreadcrumbMainArea from '@/components/elements/base-ui/breadcrumb/BreadcrumbMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const BreadcrumbMain = () => {
    return (
        <>
            <MetaData pageTitle="Breadcrumb">
                <Wrapper>
                    <BreadcrumbMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default BreadcrumbMain;