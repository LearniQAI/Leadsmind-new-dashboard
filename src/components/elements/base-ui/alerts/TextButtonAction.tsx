"use client"
import { AlertType } from '@/interface';
import React, { useState } from 'react';

const TextButtonAction = () => {
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
                    <h5 className="card__heading-title">Text as Button action</h5>
                </div>
                <div className="dismiss-text">
                {alerts.primary && (
                    <div className="alert alert-primary inverse-bg inverse-primary alert-dismissible fade show">
                        <i className="icon-timer"></i>
                        <p>Your time is over after <b>5</b> minutes.</p>
                        <button className=" btn-text-close bg-primary" type="button" ><span onClick={() => closeAlert('primary')}>dismiss</span></button>
                    </div>
                )}
                   {alerts.secondary && (
                    <div className="alert alert-secondary inverse-bg inverse-secondary alert-dismissible fade show" >
                        <i className="icon-heart"></i>
                        <p>Oh snap! Change a few things up and submit again.</p>
                        <button className="btn-text-close bg-secondary" type="button"><span onClick={() => closeAlert('secondary')}>dismiss</span></button>
                    </div>
                   )}
                    {alerts.success && (
                    <div className="alert alert-success inverse-bg inverse-success alert-dismissible fade show" >
                        <i className="icon-circle-question"></i>
                        <p><b>Well done!</b> You successfully read this important alert message.</p>
                        <button className="btn-text-close bg-success" type="button" ><span onClick={() => closeAlert('success')}>dismiss</span></button>
                    </div>
                    )}
                     {alerts.info && (
                    <div className="alert alert-info inverse-bg inverse-info alert-dismissible fade show" >
                        <i className="icon-bell"></i>
                        <p><b>Welcome!</b> Start your day with some alerts.</p>
                        <button className="btn-text-close bg-info" type="button" ><span onClick={() => closeAlert('info')}>dismiss</span></button>
                    </div>
                     )}
                       {alerts.warning && (
                    <div className="alert alert-warning inverse-bg inverse-warning alert-dismissible fade show" >
                        <i className="icon-bell"></i>
                        <p><b>Congratulations!</b> Your product was added to the like list.</p>
                        <button className="btn-text-close bg-warning" type="button" ><span onClick={() => closeAlert('warning')}>dismiss</span></button>
                    </div>
                       )}
                        {alerts.danger && (
                    <div className="alert alert-danger inverse-bg inverse-danger alert-dismissible fade show" >
                        <i className="icon-thumbs-down"></i>
                        <p>Your <b>performance</b> is down this week.</p>
                        <button className="btn-text-close bg-danger" type="button" ><span onClick={() => closeAlert('danger')}>dismiss</span></button>
                    </div>
                        )}
                        {alerts.light && (
                    <div className="alert alert-light inverse-bg inverse-light alert-dismissible fade show" >
                        <i className="icon-triangle-exclamation txt-dark"></i>
                        <p>You can check in on some of those fields below.</p>
                        <button className="btn-text-close bg-light" type="button" onClick={() => closeAlert('light')}><span className=" text-dark dark:text-white"
                            >dismiss</span></button>
                    </div>
                        )}
                        {alerts.dark && (
                    <div className="alert alert-dark inverse-bg inverse-dark alert-dismissible fade show" >
                        <i className="icon-circle-exclamation"></i>
                        <p>You can check in on some of those fields below.</p>
                        <button className="btn-text-close bg-light" type="button" onClick={() => closeAlert('dark')}><span className=" text-dark dark:text-white"
                            >dismiss</span></button>
                    </div>
                        )}
                </div>
            </div>
        </>
    );
};

export default TextButtonAction;