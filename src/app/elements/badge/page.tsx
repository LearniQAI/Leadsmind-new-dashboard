
import BadgeMainArea from '@/components/elements/base-ui/badge/BadgeMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const BadgeMain = () => {
    return (
        <>
            <MetaData pageTitle="Badge">
                <Wrapper>
                    <BadgeMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default BadgeMain;