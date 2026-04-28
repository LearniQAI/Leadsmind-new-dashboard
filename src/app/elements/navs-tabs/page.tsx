
import NavsTabMainArea from '@/components/elements/base-ui/navs-tabs/NavsTabMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const NavsTabMain = () => {
    return (
        <>
            <MetaData pageTitle="Navs Tabs">
                <Wrapper>
                    <NavsTabMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default NavsTabMain;