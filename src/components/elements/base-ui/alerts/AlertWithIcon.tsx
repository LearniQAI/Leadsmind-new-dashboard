
"use client"
import React, { useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { IconButton } from '@mui/material';
import { AlertType } from '@/interface';

const AlertWithIcon = () => {
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
    const closeAlert = (type:AlertType) => {
        setAlerts((prevState) => ({
            ...prevState,
            [type]: false,
        }));
    };

    return (
        <div className="card__wrapper">
            <div className="card__title-wrap mb-[20px]">
                <h5 className="card__heading-title">Alert With Icon</h5>
            </div>
            <div className="">
                {alerts.primary && (
                    <div className="alert alert-primary alert-dismissible fade show">
                        <i className="icon-clock"></i>
                        <p>Stay on schedule with this timely alert.</p>
                        <IconButton className='btn-close' type="button" style={{ boxShadow: 'none' }} onClick={() => closeAlert('primary')}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                )}
                {alerts.secondary && (
                    <div className="alert alert-secondary alert-dismissible fade show">
                        <i className="icon-heart"></i>
                        <p>Show some love with this heartwarming alert.</p>
                        <IconButton className='btn-close' type="button" style={{ boxShadow: 'none' }} onClick={() => closeAlert('secondary')}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                )}
                {alerts.success && (
                    <div className="alert alert-success alert-dismissible fade show">
                        <i className="icon-thumbs-up"></i>
                        <p>Celebrate success with this positive alert.</p>
                        <IconButton className='btn-close' type="button" style={{ boxShadow: 'none' }} onClick={() => closeAlert('success')}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                )}
                {alerts.info && (
                    <div className="alert alert-info alert-dismissible fade show">
                        <i className="icon-circle-question"></i>
                        <p>Find out more with this informational alert.</p>
                        <IconButton className='btn-close' type="button" style={{ boxShadow: 'none' }} onClick={() => closeAlert('info')}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                )}
                {alerts.warning && (
                    <div className="alert alert-warning alert-dismissible fade show">
                        <i className="icon-bell"></i>
                        <p>Pay attention to this important warning.</p>
                        <IconButton className='btn-close' type="button" style={{ boxShadow: 'none' }} onClick={() => closeAlert('warning')}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                )}
                {alerts.danger && (
                    <div className="alert alert-danger alert-dismissible fade show">
                        <i className="icon-thumbs-down"></i>
                        <p>Take caution with this danger alert.</p>
                        <IconButton className='btn-close' type="button" style={{ boxShadow: 'none' }} onClick={() => closeAlert('danger')}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                )}
                {alerts.light && (
                    <div className="alert alert-light alert-dismissible fade show">
                        <i className="icon-triangle-exclamation txt-dark"></i>
                        <p>Be aware of this light yet crucial alert.</p>
                        <IconButton className='btn-close' type="button" style={{ boxShadow: 'none' }} onClick={() => closeAlert('light')}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                )}
                {alerts.dark && (
                    <div className="alert alert-dark alert-dismissible fade show">
                        <i className="icon-circle-exclamation"></i>
                        <p>Stay informed with this dark-themed alert.</p>
                        <IconButton className='btn-close' type="button" style={{ boxShadow: 'none' }} onClick={() => closeAlert('dark')}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AlertWithIcon;
