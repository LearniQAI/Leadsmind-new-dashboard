import TimeAndDatePickerMain from '@/components/elements/forms/time-and-datepicker/TimeAndDatePickerMain';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const page = () => {
    return (
        <>
            <MetaData pageTitle="Time & Datepicker">
                <Wrapper>
                    <TimeAndDatePickerMain />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default page;