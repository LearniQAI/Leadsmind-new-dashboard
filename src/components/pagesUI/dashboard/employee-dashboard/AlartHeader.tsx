"use client"
import { AlertType } from '@/interface';
import { IconButton } from '@mui/material';
import React, { useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';

const AlartHeader = () => {
    // State to manage visibility of each alert
    const [alerts, setAlerts] = useState({
        primary: true,
        secondary: true,
        success: true,
        info: true,
        warning: true,
        danger: true,
        light: true,
        dark: true
    });
    // Function to hide an alert
    const closeAlert = (type: AlertType) => {
        setAlerts((prevState) => ({
            ...prevState,
            [type]: false,
        }));
    };
    return (
        <>
            <div className="grid grid-cols-12 gap-4 mb-4 maxXs:gap-x-0">
                <div className="col-span-12">
                    <div className="employee-alert-box">
                        <div className="col-xl-12">
                            {alerts.success && (
                                <div className="alert alert-success alert-dismissible fade show">
                                    <i className="icon-thumbs-up"></i>
                                    <p>Your leave request for <strong><b>“24th April 2024”,</b></strong> has been approved. Enjoy
                                    your day off!</p>
                                    <IconButton className='btn-close' type="button" style={{ boxShadow: 'none' }} onClick={() => closeAlert('success')}>
                                        <CloseIcon />
                                    </IconButton>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="col-span-12">
                    <div className="employee-alert-box">
                        <div className="col-xl-12">
                            {alerts.danger && (
                                <div className="alert alert-danger alert-dismissible fade show">
                                    <i className="icon-thumbs-down"></i>
                                    <p>Your loan request <strong><b>{`hasn't`} been approved</b></strong> Please reach out to HR for
                                        further assistance.</p>
                                    <IconButton className='btn-close' type="button" style={{ boxShadow: 'none' }} onClick={() => closeAlert('danger')}>
                                        <CloseIcon />
                                    </IconButton>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AlartHeader;