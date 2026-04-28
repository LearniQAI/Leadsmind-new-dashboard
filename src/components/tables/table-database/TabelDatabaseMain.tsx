import React from 'react';
import AttendanceTable from './table-short-select/AttendanceTable';
import TableWithCheckbox from './table-short-select/TableWithCheckbox';
import TableWithoutCheckbox from './table-short-select/TableWithoutCheckbox';

const TabelDatabaseMain = () => {
    return (
        <>
            <TableWithoutCheckbox />   
            <TableWithCheckbox />   
            <AttendanceTable />   
        </>
    );
};

export default TabelDatabaseMain;