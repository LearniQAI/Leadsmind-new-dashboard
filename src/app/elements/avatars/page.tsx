

import AvatarMainArea from '@/components/elements/base-ui/avatars/AvatarMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const AvatarMain = () => {
    return (
        <>
            <MetaData pageTitle="Avatars">
                <Wrapper>
                    <AvatarMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default AvatarMain;