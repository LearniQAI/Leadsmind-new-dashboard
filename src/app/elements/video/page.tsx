
import VideosMainArea from '@/components/elements/base-ui/video/VideosMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const VideosMain = () => {
    return (
        <>
            <MetaData pageTitle="Video">
                <Wrapper>
                    <VideosMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default VideosMain;