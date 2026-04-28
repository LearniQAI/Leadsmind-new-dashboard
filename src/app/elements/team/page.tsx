
import TeamMainArea from '@/components/elements/advanced-ui/team/TeamMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const TeamMain = () => {
    return (
        <>
            <MetaData pageTitle="Team">
                <Wrapper>
                    <TeamMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default TeamMain;