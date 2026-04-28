
import FormsInputGroupsMain from '@/components/elements/forms/forms-input-groups/FormsInputGroupsMain';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const FormInputGrup = () => {
    return (
        <>
            <MetaData pageTitle="Form Style">
                <Wrapper>
                    <FormsInputGroupsMain />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default FormInputGrup;