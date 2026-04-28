
import PaginationMainArea from '@/components/elements/advanced-ui/pagination/PaginationMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const NavsTabMain = () => {
    return (
        <>
            <MetaData pageTitle="Pagination">
                <Wrapper>
                    <PaginationMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default NavsTabMain;