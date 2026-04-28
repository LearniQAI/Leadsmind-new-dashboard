
import ButtonsMainArea from '@/components/elements/base-ui/buttons/ButtonsMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const ButtonsMain = () => {
    return (
        <>
            <MetaData pageTitle="Buttons">
                <Wrapper>
                    <ButtonsMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default ButtonsMain;