import GridMainArea from '@/components/elements/advanced-ui/grid/GridMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const GridMain = () => {
    return (
        <>
            <MetaData pageTitle="Grid">
                <Wrapper>
                    <GridMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default GridMain;