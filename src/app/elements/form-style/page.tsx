import FormStyleMain from '@/components/elements/forms/form-style/FormStyleMain';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const page = () => {
    return (
        <>
            <MetaData pageTitle="Form Style">
                <Wrapper>
                    <FormStyleMain />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default page;