import ThemeColorPlate from '@/components/elements/base-ui/template-color/ThemeColorPlate';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const TemplateColorMain = () => {
    return (
        <>
            <MetaData pageTitle="Color Plate">
                <Wrapper>
                    <ThemeColorPlate />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default TemplateColorMain;