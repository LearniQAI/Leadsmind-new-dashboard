import DropzoneMainArea from '@/components/elements/advanced-ui/dropzone/DropzoneMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const DropzoneMain = () => {
    return (
        <>
            <MetaData pageTitle="Dropzone">
                <Wrapper>
                    <DropzoneMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default DropzoneMain;