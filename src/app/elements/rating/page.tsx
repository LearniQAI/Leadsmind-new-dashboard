
import RatingMainArea from '@/components/elements/advanced-ui/rating/RatingMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const RatingMain = () => {
    return (
        <>
            <MetaData pageTitle="Rating">
                <Wrapper>
                    <RatingMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default RatingMain;