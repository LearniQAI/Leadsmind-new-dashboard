
import TimelineMainArea from '@/components/elements/advanced-ui/timeline/TimelineMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const TimeLineMain = () => {
    return (
        <>
            <MetaData pageTitle="Timeline">
                <Wrapper>
                    <TimelineMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default TimeLineMain;