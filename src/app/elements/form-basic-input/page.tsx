import FormBasicInputMain from '@/components/elements/forms/form-basic-input/FormBasicInputMain';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const page = () => {
    return (
        <>
            <MetaData pageTitle="Form Basic Input">
                <Wrapper>
                    <FormBasicInputMain />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default page;