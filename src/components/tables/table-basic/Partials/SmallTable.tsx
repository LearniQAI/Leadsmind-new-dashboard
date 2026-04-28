"use client";
import CustomDropdown from '@/components/dropdown/CustomDropdown';
import { dropdownItems } from '@/data/dropdown-data';
import { meetingData } from '@/data/table_data';

const SmallTable = () => {
    return (
        <>
            <div className="card__wrapper no-height">
                <div className="card__title-wrap flex items-center justify-between mb-[20px]">
                    <h5 className="card__heading-title">Table Small</h5>
                    <CustomDropdown items={dropdownItems} />
                </div>
                <div className="table__wrapper meeting-table table-responsive">
                    <table className="table mb-[20px] w-full">
                        <thead>
                            <tr className="table__title">
                                <th>Meeting Title</th>
                                <th>Meeting Date</th>
                                <th>Meeting Time</th>
                            </tr>
                        </thead>
                        <tbody className="table__body">
                            {meetingData.map((meeting, index) => (
                                <tr key={index}>
                                    <td>{meeting.title}</td>
                                    <td>{meeting.date}</td>
                                    <td>{meeting.time}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default SmallTable;
