import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';
import FormEditorsArea from "../../../components/elements/forms/form-editors/FormEditorsMain";

const FormEditors = () => {
    return (
        <>
            <MetaData pageTitle="Form Editors">
                <Wrapper>
                    <FormEditorsArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default FormEditors;