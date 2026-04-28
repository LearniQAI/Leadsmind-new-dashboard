"use client"
import useCountdown from '@/hooks/useCountdown';
import React from 'react';

const ComingSoonMain: React.FC = () => {
    const timeLeft = useCountdown('2030-07-14T00:00:00');

    return (
        <div className="container-xxl">
            {/* -- Coming soon area start -- */}
            <div className="authentication-wrapper basic-authentication coming-soon">
                <div className="card__wrapper">
                    <div className="coming-soon-wrapper text-center">
                        <h2 className="mb-[20px]">Coming Soon - HRM & CRM Dashboards</h2>
                        <p>We&apos;re working hard to bring you powerful HRM and CRM dashboards. Stay tuned for updates!</p>
                        <div className="countdown">
                            <p className="countdown-title">Launch Date:</p>
                            <span>
                                {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
                            </span>
                        </div>
                        <form className="coming-soon-form">
                            <input
                                className="form-control"
                                name="email"
                                type="email"
                                placeholder="Enter your email"
                                required
                                aria-label="Enter your email"
                            />
                            <button type="submit" className="btn btn-primary">Get Notified</button>
                        </form>
                    </div>
                </div>
            </div>
            {/* -- Coming soon area end -- */}
        </div>
    );
};

export default ComingSoonMain;
