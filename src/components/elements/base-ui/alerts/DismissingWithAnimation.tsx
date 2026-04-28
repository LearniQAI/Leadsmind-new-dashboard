"use client"
import React, { useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { IconButton } from '@mui/material';
import { AlertType } from '@/interface';

const DismissingWithAnimation = () => {
    // State to manage visibility of each alert
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

    // Function to hide an alert with animation
    const closeAlert = (type: AlertType) => {
        setAlerts((prevState) => ({
            ...prevState,
            [type]: false,
        }));
    };

    return (
        <div className="card__wrapper">
            <div className="card__title-wrap mb-[20px]">
                <h5 className="card__heading-title">Dismissing With Animation</h5>
            </div>
            <div>
                {alerts.primary && (
                    <div className="alert alert-primary alert-dismissible fade show">
                        <p>
                            <strong>Heads up!</strong> This is a primary alert—check it out!
                        </p>
                        <IconButton className='btn-close' type="button" style={{ boxShadow: 'none' }} onClick={() => closeAlert('primary')}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                )}
                {alerts.secondary && (
                    <div className="alert alert-secondary alert-dismissible fade show">
                        <p>
                            <strong>Notice!</strong> This is a secondary alert—check it out!
                        </p>
                        <IconButton className='btn-close' type="button" style={{ boxShadow: 'none' }} onClick={() => closeAlert('secondary')}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                )}
                {alerts.success && (
                    <div className="alert alert-success alert-dismissible fade show">
                        <p>
                            <strong>Success!</strong> This is a success alert—check it out!
                        </p>
                        <IconButton className='btn-close' type="button" style={{ boxShadow: 'none' }} onClick={() => closeAlert('success')}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                )}
                {alerts.info && (
                    <div className="alert alert-info alert-dismissible fade show">
                        <p>
                            <strong>Info!</strong> This is an info alert—check it out!
                        </p>
                        <IconButton className='btn-close' type="button" style={{ boxShadow: 'none' }} onClick={() => closeAlert('info')}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                )}
                {alerts.warning && (
                    <div className="alert alert-warning alert-dismissible fade show">
                        <p>
                            <strong>Warning!</strong> This is a warning alert—check it out!
                        </p>
                        <IconButton className='btn-close' type="button" style={{ boxShadow: 'none' }} onClick={() => closeAlert('warning')}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                )}
                {alerts.danger && (
                    <div className="alert alert-danger alert-dismissible fade show">
                        <p>
                            <strong>Danger!</strong> This is a danger alert—check it out!
                        </p>
                        <IconButton className='btn-close' type="button" style={{ boxShadow: 'none' }} onClick={() => closeAlert('danger')}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                )}
                {alerts.light && (
                    <div className="alert alert-light alert-dismissible fade show">
                        <p>
                            <strong>Light!</strong> This is a light alert—check it out!
                        </p>
                        <IconButton className='btn-close' type="button" style={{ boxShadow: 'none' }} onClick={() => closeAlert('light')}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                )}
                {alerts.dark && (
                    <div className="alert alert-dark alert-dismissible fade show">
                        <p>
                            <strong>Dark!</strong> This is a dark alert—check it out!
                        </p>
                        <IconButton className='btn-close' type="button" style={{ boxShadow: 'none' }} onClick={() => closeAlert('dark')}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DismissingWithAnimation;
