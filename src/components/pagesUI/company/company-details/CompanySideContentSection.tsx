"use client"
import CustomDropdown from '@/components/dropdown/CustomDropdown';
import { dropdownItems } from '@/data/dropdown-data';
import { Tab, Tabs } from '@mui/material';
import React, { useState } from 'react';

const CompanySideContentSection = () => {
    const [value, setValue] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setIsLoading(true);
        setValue(newValue);

        // Simulate a slight delay for content update
        setTimeout(() => {
            setIsLoading(false);
        }, 300);
    };
    return (
        <>
            <div className="card__wrapper no-height">
                <div className="company__tab">
                    <div className="company-tabs-wrapper">
                        {/* Tabs */}
                        <Tabs className='mb-[10px] gap-[10px]' value={value} onChange={handleChange}>
                            <Tab label="Activites" />
                            <Tab label="Notes" />
                            <Tab label="Files" />
                        </Tabs>
                    </div>
                    <div className="company__tab-content">
                        <div className="tab-content">
                        {isLoading ? (
                        <div className="loading-spinner">
                            <p>Loading...</p>
                        </div>
                    ) : (
                        <>
                            <div hidden={value !== 0}>
                                {value === 0 && (
                                    <div className="company__details-wrapper">
                                        <div className="company__details-top mb-5 flex items-center justify-between">
                                            <h2 className="company__details-title">Activities</h2>
                                            <CustomDropdown items={dropdownItems} />
                                        </div>
                                        <div className="company__details-content">
                                            <div className="company__details-single-item">
                                                <span className="company__details-single-item-icon"><i
                                                    className="fa-light fa-user"></i></span>
                                                <div className="company__details-single-item-content">
                                                    <h6 className="title">{`You've`} messaged the contact once.</h6>
                                                    <p>I hope this message finds you well. I wanted to reach
                                                        out to schedule a meeting with you.</p>
                                                    <span>05 May 2024, 10:18am</span>
                                                </div>
                                            </div>
                                            <div className="company__details-single-item">
                                                <span className="company__details-single-item-icon"><i
                                                    className="fa-light fa-user"></i></span>
                                                <div className="company__details-single-item-content">
                                                    <h6 className="title">Notes added by Michael Johnson</h6>
                                                    <p>I sincerely apologize for any inconvenience my
                                                        previous scheduling may have caused. Your
                                                        understanding and flexibility are greatly
                                                        appreciated. If {`it's`} feasible, I kindly request to
                                                        reschedule our appointment to 11:00 AM on the same
                                                        day. However, if this timing {`doesn't`} suit your
                                                        schedule, I am entirely open to exploring
                                                        alternative dates and times throughout the week that
                                                        would better accommodate your availability.</p>
                                                    <span>05 May 2024, 10:18am</span>
                                                </div>
                                            </div>
                                            <div className="company__details-single-item">
                                                <span className="company__details-single-item-icon"><i
                                                    className="fa-light fa-user"></i></span>
                                                <div className="company__details-single-item-content">
                                                    <h6 className="title">Appointment Confirmation: {`Johnson's `}
                                                        Response - Call Scheduled for 2:30 PM</h6>
                                                    <span>05 May 2024, 10:18am</span>
                                                </div>
                                            </div>
                                            <div className="company__details-single-item">
                                                <span className="company__details-single-item-icon"><i
                                                    className="fa-light fa-user"></i></span>
                                                <div className="company__details-single-item-content">
                                                    <h6 className="title">Group Meeting on 10 May 2024, 10:00 AM
                                                    </h6>
                                                    <p>{`I'm`} excited to announce our upcoming marketing
                                                        strategy meeting scheduled for May 10, 2024, at
                                                        10:00 AM. This meeting serves as a crucial platform
                                                        for us to align our efforts, evaluate our progress,
                                                        and strategize our next moves. Our agenda is packed
                                                        with essential topics ranging from market analysis
                                                        and content strategy to campaign planning and
                                                        digital marketing channels. {`We'll`} delve into the
                                                        latest market trends, assess competitor activities,
                                                        and brainstorm innovative content ideas to captivate
                                                        our audience. Additionally, {`we'll`} review our current
                                                        product lineup, discuss upcoming campaigns, and
                                                        explore opportunities for partnerships and
                                                        collaborations.</p>
                                                    <span>07 May 2024, 10:10am</span>
                                                </div>
                                            </div>
                                            <div className="company__details-single-item">
                                                <span className="company__details-single-item-icon"><i
                                                    className="fa-light fa-user"></i></span>
                                                <div className="company__details-single-item-content">
                                                    <h6 className="title">Meeting With Owner</h6>
                                                    <p>Scheduled</p>
                                                    <span>09 May 2024, 11:30am</span>
                                                </div>
                                            </div>
                                            <div className="company__details-single-item">
                                                <span className="company__details-single-item-icon"><i
                                                    className="fa-light fa-user"></i></span>
                                                <div className="company__details-single-item-content">
                                                    <h6 className="title">Experience the Great Outdoors</h6>
                                                    <p>Embark on an adventure into the heart of nature with
                                                        our camping excursions. Immerse yourself in the
                                                        tranquility of towering trees, the melody of
                                                        chirping birds, and the gentle rustle of leaves in
                                                        the wind. Whether you prefer to pitch a tent beneath
                                                        a star-studded sky or cozy up in a rustic cabin, our
                                                        campsites offer a retreat from the hustle and bustle
                                                        of everyday life.</p>
                                                    <span>11 May 2024, 11:30am</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div hidden={value !== 1}>
                                {value === 1 && (
                                    <div className="company__details-wrapper">
                                        <div className="company__details-top mb-5 flex items-center justify-between">
                                            <h2 className="company__details-title">Notes</h2>
                                            <CustomDropdown items={dropdownItems} />
                                        </div>
                                        <div className="company__details-content">
                                            <div className="company__details-single-item">
                                                <span className="company__details-single-item-icon"><i
                                                    className="fa-light fa-user"></i></span>
                                                <div className="company__details-single-item-content">
                                                    <h6 className="title">{`You've`} messaged the contact once.</h6>
                                                    <p>I hope this message finds you well. I wanted to reach
                                                        out to schedule a meeting with you.</p>
                                                    <span>05 May 2024, 10:18am</span>
                                                </div>
                                            </div>
                                            <div className="company__details-single-item">
                                                <span className="company__details-single-item-icon"><i
                                                    className="fa-light fa-user"></i></span>
                                                <div className="company__details-single-item-content">
                                                    <h6 className="title">Notes added by Michael Johnson</h6>
                                                    <p>I sincerely apologize for any inconvenience my
                                                        previous scheduling may have caused. Your
                                                        understanding and flexibility are greatly
                                                        appreciated. If {`it's`} feasible, I kindly request to
                                                        reschedule our appointment to 11:00 AM on the same
                                                        day. However, if this timing {`doesn't`} suit your
                                                        schedule, I am entirely open to exploring
                                                        alternative dates and times throughout the week that
                                                        would better accommodate your availability.</p>
                                                    <span>05 May 2024, 10:18am</span>
                                                </div>
                                            </div>
                                            <div className="company__details-single-item">
                                                <span className="company__details-single-item-icon"><i
                                                    className="fa-light fa-user"></i></span>
                                                <div className="company__details-single-item-content">
                                                    <h6 className="title">Appointment Confirmation: {`Johnson's`}
                                                        Response - Call Scheduled for 2:30 PM</h6>
                                                    <span>05 May 2024, 10:18am</span>
                                                </div>
                                            </div>
                                            <div className="company__details-single-item">
                                                <span className="company__details-single-item-icon"><i
                                                    className="fa-light fa-user"></i></span>
                                                <div className="company__details-single-item-content">
                                                    <h6 className="title">Group Meeting on 10 May 2024, 10:00 AM
                                                    </h6>
                                                    <p>{`I'm`} excited to announce our upcoming marketing
                                                        strategy meeting scheduled for May 10, 2024, at
                                                        10:00 AM. This meeting serves as a crucial platform
                                                        for us to align our efforts, evaluate our progress,
                                                        and strategize our next moves. Our agenda is packed
                                                        with essential topics ranging from market analysis
                                                        and content strategy to campaign planning and
                                                        digital marketing channels. {`We'll`} delve into the
                                                        latest market trends, assess competitor activities,
                                                        and brainstorm innovative content ideas to captivate
                                                        our audience. Additionally, {`we'll`} review our current
                                                        product lineup, discuss upcoming campaigns, and
                                                        explore opportunities for partnerships and
                                                        collaborations.</p>
                                                    <span>07 May 2024, 10:10am</span>
                                                </div>
                                            </div>
                                            <div className="company__details-single-item">
                                                <span className="company__details-single-item-icon"><i
                                                    className="fa-light fa-user"></i></span>
                                                <div className="company__details-single-item-content">
                                                    <h6 className="title">Meeting With Owner</h6>
                                                    <p>Scheduled</p>
                                                    <span>09 May 2024, 11:30am</span>
                                                </div>
                                            </div>
                                            <div className="company__details-single-item">
                                                <span className="company__details-single-item-icon"><i
                                                    className="fa-light fa-user"></i></span>
                                                <div className="company__details-single-item-content">
                                                    <h6 className="title">Experience the Great Outdoors</h6>
                                                    <p>Embark on an adventure into the heart of nature with
                                                        our camping excursions. Immerse yourself in the
                                                        tranquility of towering trees, the melody of
                                                        chirping birds, and the gentle rustle of leaves in
                                                        the wind. Whether you prefer to pitch a tent beneath
                                                        a star-studded sky or cozy up in a rustic cabin, our
                                                        campsites offer a retreat from the hustle and bustle
                                                        of everyday life.</p>
                                                    <span>11 May 2024, 11:30am</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div hidden={value !== 2}>
                                {value === 2 && (
                                    <div className="company__details-wrapper">
                                        <div className="company__details-top mb-5 flex items-center justify-between">
                                            <h2 className="company__details-title">Files</h2>
                                            <CustomDropdown items={dropdownItems} />
                                        </div>
                                        <div className="company__details-content">
                                            <div className="company__details-single-item">
                                                <span className="company__details-single-item-icon"><i
                                                    className="fa-light fa-user"></i></span>
                                                <div className="company__details-single-item-content">
                                                    <h6 className="title">{`You've`} messaged the contact once.</h6>
                                                    <p>I hope this message finds you well. I wanted to reach
                                                        out to schedule a meeting with you.</p>
                                                    <span>05 May 2024, 10:18am</span>
                                                </div>
                                            </div>
                                            <div className="company__details-single-item">
                                                <span className="company__details-single-item-icon"><i
                                                    className="fa-light fa-user"></i></span>
                                                <div className="company__details-single-item-content">
                                                    <h6 className="title">Notes added by Michael Johnson</h6>
                                                    <p>I sincerely apologize for any inconvenience my
                                                        previous scheduling may have caused. Your
                                                        understanding and flexibility are greatly
                                                        appreciated. If {`it's`} feasible, I kindly request to
                                                        reschedule our appointment to 11:00 AM on the same
                                                        day. However, if this timing {`doesn't`} suit your
                                                        schedule, I am entirely open to exploring
                                                        alternative dates and times throughout the week that
                                                        would better accommodate your availability.</p>
                                                    <span>05 May 2024, 10:18am</span>
                                                </div>
                                            </div>
                                            <div className="company__details-single-item">
                                                <span className="company__details-single-item-icon"><i
                                                    className="fa-light fa-user"></i></span>
                                                <div className="company__details-single-item-content">
                                                    <h6 className="title">Appointment Confirmation: {`Johnson's`}
                                                        Response - Call Scheduled for 2:30 PM</h6>
                                                    <span>05 May 2024, 10:18am</span>
                                                </div>
                                            </div>
                                            <div className="company__details-single-item">
                                                <span className="company__details-single-item-icon"><i
                                                    className="fa-light fa-user"></i></span>
                                                <div className="company__details-single-item-content">
                                                    <h6 className="title">Group Meeting on 10 May 2024, 10:00 AM
                                                    </h6>
                                                    <p>{`I'm`} excited to announce our upcoming marketing
                                                        strategy meeting scheduled for May 10, 2024, at
                                                        10:00 AM. This meeting serves as a crucial platform
                                                        for us to align our efforts, evaluate our progress,
                                                        and strategize our next moves. Our agenda is packed
                                                        with essential topics ranging from market analysis
                                                        and content strategy to campaign planning and
                                                        digital marketing channels. {`We'll`} delve into the
                                                        latest market trends, assess competitor activities,
                                                        and brainstorm innovative content ideas to captivate
                                                        our audience. Additionally, {`we'll`} review our current
                                                        product lineup, discuss upcoming campaigns, and
                                                        explore opportunities for partnerships and
                                                        collaborations.</p>
                                                    <span>07 May 2024, 10:10am</span>
                                                </div>
                                            </div>
                                            <div className="company__details-single-item">
                                                <span className="company__details-single-item-icon"><i
                                                    className="fa-light fa-user"></i></span>
                                                <div className="company__details-single-item-content">
                                                    <h6 className="title">Meeting With Owner</h6>
                                                    <p>Scheduled</p>
                                                    <span>09 May 2024, 11:30am</span>
                                                </div>
                                            </div>
                                            <div className="company__details-single-item">
                                                <span className="company__details-single-item-icon"><i
                                                    className="fa-light fa-user"></i></span>
                                                <div className="company__details-single-item-content">
                                                    <h6 className="title">Experience the Great Outdoors</h6>
                                                    <p>Embark on an adventure into the heart of nature with
                                                        our camping excursions. Immerse yourself in the
                                                        tranquility of towering trees, the melody of
                                                        chirping birds, and the gentle rustle of leaves in
                                                        the wind. Whether you prefer to pitch a tent beneath
                                                        a star-studded sky or cozy up in a rustic cabin, our
                                                        campsites offer a retreat from the hustle and bustle
                                                        of everyday life.</p>
                                                    <span>11 May 2024, 11:30am</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            </>
                    )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default CompanySideContentSection;