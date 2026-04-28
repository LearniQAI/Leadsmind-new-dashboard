"use client";
import React, { useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { IconButton } from '@mui/material';
import { AlertType } from '@/interface';

const AlertOutlineWithIcon = () => {
    const [alerts, setAlerts] = useState({
        primary: true,
        secondary: true,
        success: true,
        info: true,
        warning: true,
        danger: true,
        light: true,
        dark: true,
    });
    // Function to handle dismiss of an alert
    const closeAlert = (alertType:AlertType) => {
        setAlerts((prevState) => ({
            ...prevState,
            [alertType]: false,
        }));
    };

    return (
        <div className="card__wrapper">
            <div className="card__title-wrap mb-[20px]">
                <h5 className="card__heading-title">Alert Outline With Icon</h5>
            </div>
            <div>
                {alerts.primary && (
                    <div className="alert alert-primary outline-one icon-primary alert-dismissible fade show">
                        <i className="icon-clock"></i>
                        <p>Your time is over after <b>5</b> minutes.</p>
                        <IconButton className='btn-close btn-light-style outline-btn-close' type="button" onClick={() => closeAlert('primary')} style={{ boxShadow: 'none' }}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                )}
                {alerts.secondary && (
                    <div className="alert alert-secondary outline-one icon-secondary alert-dismissible fade show">
                        <i className="icon-heart"></i>
                        <p>Oh snap! Change a few things up and submit again.</p>
                        <IconButton className='btn-close btn-light-style outline-btn-close' type="button" onClick={() => closeAlert('secondary')} style={{ boxShadow: 'none' }}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                )}
                {alerts.success && (
                    <div className="alert alert-success outline-one icon-success alert-dismissible fade show">
                        <i className="icon-thumbs-up"></i>
                        <p><b>Well done!</b> You successfully read this important alert message.</p>
                        <IconButton className='btn-close btn-light-style outline-btn-close' type="button" onClick={() => closeAlert('success')} style={{ boxShadow: 'none' }}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                )}
                {alerts.info && (
                    <div className="alert alert-info outline-one icon-info alert-dismissible fade show">
                        <i className="icon-circle-question"></i>
                        <p><b>Welcome!</b> Start your day with some alerts.</p>
                        <IconButton className='btn-close btn-light-style outline-btn-close' type="button" onClick={() => closeAlert('info')} style={{ boxShadow: 'none' }}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                )}
                {alerts.warning && (
                    <div className="alert alert-warning outline-one icon-warning alert-dismissible fade show">
                        <i className="icon-bell"></i>
                        <p><b>Congratulations!</b> Your product was added to the like list.</p>
                        <IconButton className='btn-close btn-light-style outline-btn-close' type="button" onClick={() => closeAlert('warning')} style={{ boxShadow: 'none' }}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                )}
                {alerts.danger && (
                    <div className="alert alert-danger outline-one icon-danger alert-dismissible fade show">
                        <i className="icon-thumbs-down"></i>
                        <p>Your <b>performance</b> is down this week.</p>
                        <IconButton className='btn-close btn-light-style outline-btn-close' type="button" onClick={() => closeAlert('danger')} style={{ boxShadow: 'none' }}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                )}
                {alerts.light && (
                    <div className="alert alert-light outline-one icon-light alert-dismissible fade show">
                        <i className="icon-triangle-exclamation txt-dark"></i>
                        <p>You can check in on some of those fields below.</p>
                        <IconButton className='btn-close btn-light-style outline-btn-close' type="button" onClick={() => closeAlert('light')} style={{ boxShadow: 'none' }}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                )}
                {alerts.dark && (
                    <div className="alert alert-dark outline-one icon-dark alert-dismissible fade show">
                        <i className="icon-circle-exclamation"></i>
                        <p>You can check in on some of those fields below.</p>
                        <IconButton className='btn-close btn-light-style outline-btn-close' type="button" onClick={() => closeAlert('dark')} style={{ boxShadow: 'none' }}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AlertOutlineWithIcon;
