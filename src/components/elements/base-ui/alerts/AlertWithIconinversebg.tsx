"use client"
import React, { useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { IconButton } from '@mui/material';
import { AlertType } from '@/interface';

const AlertWithIconinversebg = () => {
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
    const closeAlert = (alertType: AlertType) => {
        setAlerts((prevState) => ({
            ...prevState,
            [alertType]: false,
        }));
    };
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Alert With Icon inverse bg</h5>
                </div>
                <div className="">
                    {alerts.primary && (
                        <div className="alert alert-primary inverse-bg inverse-primary alert-dismissible fade show">
                            <i className="icon-timer"></i>
                            <p>Your time is over after <b>5</b> minutes.</p>
                            <IconButton className='btn-close outline-btn-close' type="button" style={{ boxShadow: 'none' }} onClick={() => closeAlert('primary')}>
                                <CloseIcon />
                            </IconButton>
                        </div>
                    )}
                    {alerts.secondary && (
                        <div className="alert alert-secondary inverse-bg inverse-secondary alert-dismissible fade show">
                            <i className="icon-heart"></i>
                            <p>Oh snap! Change a few things up and submit again.</p>
                            <IconButton className='btn-close outline-btn-close' type="button" style={{ boxShadow: 'none' }} onClick={() => closeAlert('secondary')}>
                                <CloseIcon />
                            </IconButton>
                        </div>
                    )}
                    {alerts.success && (
                    <div className="alert alert-success inverse-bg inverse-success alert-dismissible fade show">
                        <i className="icon-thumbs-up"></i>
                        <p><b>Well done!</b> You successfully read this important alert message.</p>
                        <IconButton className='btn-close outline-btn-close' type="button" style={{ boxShadow: 'none' }} onClick={() => closeAlert('success')}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                     )}
                     {alerts.info && (
                    <div className="alert alert-info inverse-bg inverse-info alert-dismissible fade show">
                        <i className="icon-circle-question"></i>
                        <p><b>Welcome!</b> Start your day with some alerts.</p>
                        <IconButton className='btn-close outline-btn-close' type="button" style={{ boxShadow: 'none' }} onClick={() => closeAlert('info')}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                     )}
                      {alerts.warning && (
                    <div className="alert alert-warning inverse-bg inverse-warning alert-dismissible fade show">
                        <i className="icon-bell"></i>
                        <p><b>Congratulations!</b> Your product was added to the like list.</p>
                        <IconButton className='btn-close outline-btn-close' type="button" style={{ boxShadow: 'none' }} onClick={() => closeAlert('warning')}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                      )}
                       {alerts.danger && (
                    <div className="alert alert-danger inverse-bg inverse-danger alert-dismissible fade show">
                        <i className="icon-thumbs-down"></i>
                        <p>Your <b>performance</b> is down this week.</p>
                        <IconButton className='btn-close outline-btn-close' type="button" style={{ boxShadow: 'none' }} onClick={() => closeAlert('danger')}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                       )}
                        {alerts.light && (
                    <div className="alert alert-light inverse-bg inverse-light alert-dismissible fade show">
                        <i className="icon-triangle-exclamation txt-dark"></i>
                        <p>You can check in on some of those fields below.</p>
                        <IconButton className='btn-close outline-btn-close' type="button" style={{ boxShadow: 'none' }} onClick={() => closeAlert('light')}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                        )}
                         {alerts.dark && (
                    <div className="alert alert-dark inverse-bg inverse-dark alert-dismissible fade show">
                        <i className="icon-circle-exclamation"></i>
                        <p>You can check in on some of those fields below.</p>
                        <IconButton className='btn-close outline-btn-close' type="button" style={{ boxShadow: 'none' }} onClick={() => closeAlert('dark')}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                         )}
                </div>
            </div>
        </>
    );
};

export default AlertWithIconinversebg;