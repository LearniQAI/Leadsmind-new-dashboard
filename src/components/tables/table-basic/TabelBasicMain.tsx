import React from 'react';
import SmallTable from './Partials/SmallTable';
import SmallTableScroll from './Partials/SmallTableScroll';
import CalendarTable from './Partials/CalendarTable';

const TabelBasicMain = () => {
    return (
        <>
            <SmallTable />   
            <SmallTableScroll />   
            <CalendarTable />   
        </>
    );
};

export default TabelBasicMain;