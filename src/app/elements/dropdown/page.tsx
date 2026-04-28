
import DropdownMainArea from '@/components/elements/base-ui/dropdown/DropdownMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const DropdownMain = () => {
    return (
        <>
            <MetaData pageTitle="Dropdown">
                <Wrapper>
                    <DropdownMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default DropdownMain;